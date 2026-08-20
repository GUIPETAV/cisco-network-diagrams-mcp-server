import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";

const ListCategoriesInputSchema = z.object({}).strict();

export function registerListCategoriesTool(server: McpServer): void {
  server.registerTool(
    "cisco_list_categories",
    {
      title: "List Cisco Icon Categories",
      description: `List every category in the Cisco Systems Corporate Iconography catalog, with a human-readable label and how many icons fall into each.

Use this first to understand how the 308-icon catalog is organized before calling cisco_list_icons or cisco_search_icons with a category filter.

Args: none.

Returns JSON:
{
  "categories": [
    { "id": "routing_l3", "label": "Roteamento (Camada 3)", "icon_count": 12 }
  ]
}`,
      inputSchema: ListCategoriesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const categories = iconStore.getCategories();
      const allIcons = iconStore.list();
      const counts = new Map<string, number>();
      for (const icon of allIcons) {
        counts.set(icon.category, (counts.get(icon.category) ?? 0) + 1);
      }

      const output = {
        categories: Object.entries(categories).map(([id, label]) => ({
          id,
          label,
          icon_count: counts.get(id) ?? 0
        }))
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
}
