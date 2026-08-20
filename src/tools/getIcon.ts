import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";

const GetIconInputSchema = z.object({
  id: z.string()
    .min(1)
    .describe("The icon id, e.g. 'router', 'cisco_asa_5500', 'multilayer_switch'. Get this from cisco_search_icons or cisco_list_icons — do not guess ids.")
}).strict();

type GetIconInput = z.infer<typeof GetIconInputSchema>;

export function registerGetIconTool(server: McpServer): void {
  server.registerTool(
    "cisco_get_icon",
    {
      title: "Get Cisco Icon Image",
      description: `Fetch one Cisco network icon by id: its full metadata plus the actual image (PNG, RGB — pre-converted from Cisco's original CMYK JPEGs, which render blank or with wrong colors in most web/collaborative tools like Miro or Figma/FigJam).

Use this after cisco_search_icons or cisco_list_icons has told you the exact id you need. The image is returned as an embedded PNG you can place directly into a Miro board, Figma/FigJam file, or document.

Args:
  - id (string, required): exact icon id (case-sensitive), e.g. "router", "cisco_asa_5500"

Returns:
  - An image content block (PNG, RGB) — pass its dimensions to a 'FIT' scale mode when placing on a canvas; the icons are NOT square (e.g. "router" is ~77x52), so a 'FILL' scale mode will crop or distort it.
  - A text block with the icon's metadata (name, category, curated flag, description, and — for curated icons — glossary_name/function/when_to_use).

Error Handling:
  - Returns "Error: icon '<id>' not found" if the id doesn't exist. Call cisco_search_icons first to find the correct id — don't retry with guessed variations.`,
      inputSchema: GetIconInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: GetIconInput) => {
      const icon = iconStore.getById(params.id);
      if (!icon) {
        return {
          content: [{
            type: "text",
            text: `Error: icon '${params.id}' not found. Use cisco_search_icons or cisco_list_icons to find the correct id — ids are case-sensitive and use underscores (e.g. "cisco_asa_5500", not "Cisco ASA 5500").`
          }],
          isError: true
        };
      }

      const base64 = iconStore.readImageBase64(icon);
      const metadata = {
        id: icon.id,
        name: icon.glossary_name ?? icon.name,
        category: icon.category,
        curated: icon.curated,
        description: icon.description,
        ...(icon.function ? { function: icon.function } : {}),
        ...(icon.when_to_use ? { when_to_use: icon.when_to_use } : {})
      };

      return {
        content: [
          { type: "image", data: base64, mimeType: "image/png" },
          { type: "text", text: JSON.stringify(metadata, null, 2) }
        ],
        structuredContent: metadata
      };
    }
  );
}
