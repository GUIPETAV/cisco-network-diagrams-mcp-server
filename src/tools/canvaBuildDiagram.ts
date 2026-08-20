import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";
import { uploadAsset, autofillDesign } from "../services/canvaClient.js";

const NodeSchema = z.object({
  icon_id: z.string().describe("Cisco icon id from cisco_search_icons/cisco_list_icons, e.g. 'router'."),
  image_field: z.string().describe("Name of the image placeholder field on the Brand Template this icon fills, e.g. 'device_1_icon'."),
  label_field: z.string().optional().describe("Optional name of a text placeholder field to fill with this node's label, e.g. 'device_1_label'."),
  label_text: z.string().optional().describe("Text for label_field, e.g. 'R-EDGE-01 — Roteador de borda'. Required if label_field is set.")
});

const CanvaBuildDiagramInputSchema = z.object({
  brand_template_id: z.string()
    .min(1)
    .describe("ID of a Canva Brand Template pre-built with named image/text placeholder fields — one image field per diagram node. Create this once in Canva's UI (Brand Templates) and reuse it for every diagram. The Connect API cannot place elements on a blank canvas at arbitrary coordinates; it can only autofill an existing template's fields."),
  title: z.string()
    .min(1)
    .max(200)
    .describe("Title for the generated Canva design."),
  nodes: z.array(NodeSchema)
    .min(1)
    .max(20)
    .describe("One entry per device in the diagram, mapping a Cisco icon to the template's placeholder field names.")
}).strict();

type CanvaBuildDiagramInput = z.infer<typeof CanvaBuildDiagramInputSchema>;

export function registerCanvaBuildDiagramTool(server: McpServer): void {
  server.registerTool(
    "cisco_canva_build_diagram",
    {
      title: "Build Network Diagram in Canva",
      description: `Build a network topology diagram in Canva by autofilling a pre-built Brand Template: uploads each node's Cisco icon and runs a Canva Autofill job that drops the icons (and optional labels) into the template's named placeholder fields.

IMPORTANT — this requires upfront one-time setup in Canva, done by a human in the Canva UI, not by this tool:
  1. Design a Brand Template with one image placeholder per device slot (and optionally matching text placeholders for labels) — e.g. a 5-node horizontal topology layout.
  2. Note the template's ID (from its Canva URL) and each placeholder field's name.
  3. Pass that brand_template_id and the field names here.

This tool does NOT draw connector lines between nodes or lay out an arbitrary number of devices — the template's fixed layout defines both. For a from-scratch diagram with no pre-built template, use the Cisco icons with Canva's own AI design tools directly instead (generate a design, then place icons manually) rather than this tool.

Requires CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_REFRESH_TOKEN — see SETUP_CANVA.md.

Args:
  - brand_template_id (string, required): the target Brand Template's id
  - title (string, required): title for the resulting design
  - nodes (array, required, 1-20 items): each { icon_id, image_field, label_field?, label_text? }

Returns JSON:
{
  "design_id": string,
  "edit_url": string,
  "view_url": string,
  "uploaded_icons": [{ "icon_id": string, "canva_asset_id": string }]
}

Error Handling:
  - "Error: icon '<id>' not found" if an icon_id doesn't exist — call cisco_search_icons first.
  - Canva API errors (e.g. unknown brand_template_id, unknown field name) propagate as "Error: Canva API request failed: ...— double-check the template id and field names in the Canva UI.`,
      inputSchema: CanvaBuildDiagramInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CanvaBuildDiagramInput) => {
      for (const node of params.nodes) {
        if (!iconStore.getById(node.icon_id)) {
          return {
            content: [{
              type: "text",
              text: `Error: icon '${node.icon_id}' not found. Use cisco_search_icons or cisco_list_icons to find the correct id.`
            }],
            isError: true
          };
        }
        if (node.label_field && !node.label_text) {
          return {
            content: [{
              type: "text",
              text: `Error: node for icon '${node.icon_id}' sets label_field='${node.label_field}' but no label_text.`
            }],
            isError: true
          };
        }
      }

      try {
        const uploadedIcons: { icon_id: string; canva_asset_id: string }[] = [];
        const data: Record<string, { type: "text"; text: string } | { type: "image"; asset_id: string }> = {};

        for (const node of params.nodes) {
          const icon = iconStore.getById(node.icon_id)!;
          const bytes = Buffer.from(iconStore.readImageBase64(icon), "base64");
          const assetId = await uploadAsset(bytes, `cisco-${icon.id}.png`);
          uploadedIcons.push({ icon_id: icon.id, canva_asset_id: assetId });
          data[node.image_field] = { type: "image", asset_id: assetId };
          if (node.label_field && node.label_text) {
            data[node.label_field] = { type: "text", text: node.label_text };
          }
        }

        const result = await autofillDesign(params.brand_template_id, params.title, data);
        const output = {
          design_id: result.designId,
          edit_url: result.editUrl,
          view_url: result.viewUrl,
          uploaded_icons: uploadedIcons
        };

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
