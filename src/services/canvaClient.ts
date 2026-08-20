/**
 * Minimal client for the Canva Connect API (https://www.canva.dev/docs/connect/).
 *
 * IMPORTANT — setup required before this works:
 * The Connect API authenticates as a Canva USER (three-legged OAuth), not as
 * a service account. There is no "just call the API with a key" path. Before
 * these tools can do anything you must:
 *
 *   1. Create an "Integration" at https://www.canva.com/developers/ to get a
 *      CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.
 *   2. Run the one-time authorization helper (`scripts/canva-oauth-setup.mjs`)
 *      to complete the OAuth consent flow in a browser and obtain a
 *      CANVA_REFRESH_TOKEN for your account.
 *   3. Set CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_REFRESH_TOKEN as
 *      environment variables wherever this MCP server runs.
 *
 * See SETUP_CANVA.md for the full walkthrough.
 *
 * Scope of what the public REST API can actually do (as opposed to Canva's
 * internal MCP connector, which supports arbitrary element-level editing):
 * it can upload assets, create/export designs, and run Autofill jobs against
 * a Brand Template that already has named placeholder fields. It CANNOT
 * place arbitrary shapes/lines/text at arbitrary coordinates — that level of
 * control isn't exposed outside Canva's own apps. cisco_canva_build_diagram
 * therefore targets a Brand Template with icon/text placeholders, not a
 * blank canvas.
 */

const AUTH_URL = "https://api.canva.com/rest/v1/oauth/token";
const API_BASE_URL = "https://api.canva.com/rest/v1";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

interface TokenState {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cachedToken: TokenState | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. This MCP server's Canva ` +
        `tools need Canva Connect API credentials — see SETUP_CANVA.md for how ` +
        `to create a Canva integration and obtain them.`
    );
  }
  return value;
}

async function refreshAccessToken(): Promise<TokenState> {
  const clientId = requireEnv("CANVA_CLIENT_ID");
  const clientSecret = requireEnv("CANVA_CLIENT_SECRET");
  const refreshToken = requireEnv("CANVA_REFRESH_TOKEN");

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Canva OAuth token refresh failed (${response.status}): ${body}. ` +
        `The refresh token may be expired or revoked — rerun scripts/canva-oauth-setup.mjs.`
    );
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 30_000 // refresh 30s early
  };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  cachedToken = await refreshAccessToken();
  return cachedToken.accessToken;
}

export async function canvaFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Canva API request failed: ${init.method ?? "GET"} ${path} -> ${response.status}: ${body}`);
  }
  return response;
}

async function pollJob<T>(
  path: string,
  jobKey: string,
  isDone: (job: any) => boolean,
  isFailed: (job: any) => boolean,
  extract: (job: any) => T
): Promise<T> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await canvaFetch(path);
    const body = (await response.json()) as any;
    const job = body[jobKey] ?? body;

    if (isFailed(job)) {
      throw new Error(`Canva job failed: ${JSON.stringify(job)}`);
    }
    if (isDone(job)) {
      return extract(job);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Canva job at ${path} did not complete within ${POLL_TIMEOUT_MS}ms.`);
}

/**
 * Uploads raw image bytes to the user's Canva account and returns the
 * resulting asset id, waiting for the (usually near-instant) async job.
 */
export async function uploadAsset(bytes: Buffer, name: string): Promise<string> {
  const metadata = Buffer.from(JSON.stringify({ name_base64: Buffer.from(name).toString("base64") })).toString(
    "base64"
  );

  const response = await canvaFetch("/asset-uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(name).toString("base64") })
    },
    body: bytes
  });
  void metadata; // metadata header sent directly above; kept for clarity of shape

  const body = (await response.json()) as { job: { id: string } };
  const jobId = body.job.id;

  return pollJob(
    `/asset-uploads/${jobId}`,
    "job",
    (job) => job.status === "success",
    (job) => job.status === "failed",
    (job) => job.asset.id
  );
}

/**
 * Runs a Canva Autofill job against a Brand Template, filling named text
 * and image placeholder fields, and waits for the resulting design.
 */
export async function autofillDesign(
  brandTemplateId: string,
  title: string,
  data: Record<string, { type: "text"; text: string } | { type: "image"; asset_id: string }>
): Promise<{ designId: string; editUrl: string; viewUrl: string }> {
  const response = await canvaFetch("/autofills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand_template_id: brandTemplateId, title, data })
  });

  const body = (await response.json()) as { job: { id: string } };
  const jobId = body.job.id;

  return pollJob(
    `/autofills/${jobId}`,
    "job",
    (job) => job.status === "success",
    (job) => job.status === "failed",
    (job) => ({
      designId: job.result.design.id,
      editUrl: job.result.design.urls.edit_url,
      viewUrl: job.result.design.urls.view_url
    })
  );
}
