import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";
import { uploadAsset } from "../services/canvaClient.js";

const CanvaUploadIconInputSchema = z.object({
  id: z.string()
    .min(1)
    .describe("The Cisco icon id to upload, e.g. 'router', 'cisco_asa_5500'. Get this from cisco_search_icons or cisco_list_icons.")
}).strict();

type CanvaUploadIconInput = z.infer<typeof CanvaUploadIconInputSchema>;

export function registerCanvaUploadIconTool(server: McpServer): void {
  server.registerTool(
    "cisco_canva_upload_icon",
    {
      title: "Upload Cisco Icon to Canva",
      description: `Upload one Cisco network icon (RGB PNG) into the authenticated user's Canva account via the Canva Connect API, returning a Canva asset_id.

Requires CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_REFRESH_TOKEN to be configured — see SETUP_CANVA.md. Without them this tool fails with a clear setup error.

Use the returned asset_id as an image field value in cisco_canva_build_diagram, or in any other Canva Connect API call that accepts an asset_id (e.g. inserting into a design via Canva's own tooling).

Args:
  - id (string, required): exact icon id (case-sensitive)

Returns JSON: { "icon_id": string, "canva_asset_id": string }

Error Handling:
  - "Error: icon '<id>' not found" if the id doesn't exist in the catalog — call cisco_search_icons first.
  - "Missing required environment variable ..." if Canva credentials aren't configured — follow SETUP_CANVA.md.`,
      inputSchema: CanvaUploadIconInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CanvaUploadIconInput) => {
      const icon = iconStore.getById(params.id);
      if (!icon) {
        return {
          content: [{
            type: "text",
            text: `Error: icon '${params.id}' not found. Use cisco_search_icons or cisco_list_icons to find the correct id.`
          }],
          isError: true
        };
      }

      try {
        const bytes = Buffer.from(iconStore.readImageBase64(icon), "base64");
        const assetId = await uploadAsset(bytes, `cisco-${icon.id}.png`);
        const output = { icon_id: icon.id, canva_asset_id: assetId };
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
