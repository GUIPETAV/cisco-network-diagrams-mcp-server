#!/usr/bin/env node
/**
 * One-time helper: completes the Canva Connect API OAuth authorization-code
 * flow (with PKCE) in your browser and prints the resulting refresh token.
 *
 * Usage:
 *   CANVA_CLIENT_ID=xxx CANVA_CLIENT_SECRET=yyy node scripts/canva-oauth-setup.mjs
 *
 * Requires the integration's redirect URI (in the Canva Developer Portal) to
 * include: http://127.0.0.1:8787/callback
 *
 * See SETUP_CANVA.md for the full walkthrough.
 */

import http from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";

const CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:8787/callback";
const SCOPES = [
  "asset:read",
  "asset:write",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "brandtemplate:content:read",
  "brandtemplate:meta:read"
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERROR: set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET environment variables first.");
  console.error("Get these by creating an integration at https://www.canva.com/developers/");
  process.exit(1);
}

function base64url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const codeVerifier = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
const state = base64url(crypto.randomBytes(16));

const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end();
    return;
  }

  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code || returnedState !== state) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization failed: ${error ?? "missing code or state mismatch"}`);
    console.error("Authorization failed:", error ?? "missing code or state mismatch");
    server.close();
    process.exit(1);
  }

  try {
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(JSON.stringify(tokenBody));
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Authorization complete — you can close this tab and return to the terminal.");

    console.log("\nSuccess! Add these to your environment (e.g. .env, or your MCP client's server config):\n");
    console.log(`CANVA_CLIENT_ID=${CLIENT_ID}`);
    console.log(`CANVA_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`CANVA_REFRESH_TOKEN=${tokenBody.refresh_token}\n`);
    console.log("The refresh token does not expire on its own (only if revoked), so this is a one-time setup.");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Token exchange failed — see terminal for details.");
    console.error("Token exchange failed:", err);
  } finally {
    server.close();
  }
});

server.listen(8787, () => {
  console.log("Open this URL in your browser to authorize this MCP server against your Canva account:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for you to complete the authorization in the browser...");
});
