import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { IconEntry } from "../types.js";

const ListIconsInputSchema = z.object({
  curated_only: z.boolean()
    .default(true)
    .describe("If true (default), list only the 29 curated icons — common classroom/enterprise equipment with full pedagogical context. Set false to list the entire 308-icon catalog."),
  category: z.string()
    .optional()
    .describe("Optional category id to filter by (see cisco_list_categories for valid ids)."),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of results to return (default 50)."),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip, for pagination through the full catalog.")
}).strict();

type ListIconsInput = z.infer<typeof ListIconsInputSchema>;

function summarize(icon: IconEntry) {
  return {
    id: icon.id,
    name: icon.glossary_name ?? icon.name,
    category: icon.category,
    curated: icon.curated,
    description: icon.description
  };
}

export function registerListIconsTool(server: McpServer): void {
  server.registerTool(
    "cisco_list_icons",
    {
      title: "List Cisco Network Icons",
      description: `List icons from the 308-icon Cisco Systems Corporate Iconography catalog, optionally filtered by category, with pagination.

Defaults to curated_only=true, returning the 29 icons most relevant for teaching/enterprise network diagrams (router, switch, firewall, server, access point, cloud, etc.). Set curated_only=false to browse the full catalog (legacy/specific Cisco products, generic devices, people/buildings/phones icons).

Does NOT return image bytes — call cisco_get_icon with an id from the results to fetch the actual image.

Args:
  - curated_only (boolean, default true): restrict to the 29 curated icons
  - category (string, optional): filter by category id (see cisco_list_categories)
  - limit (number, default 50, max 100): page size
  - offset (number, default 0): pagination offset

Returns JSON:
{
  "total": number,
  "count": number,
  "offset": number,
  "results": [
    { "id": string, "name": string, "category": string, "curated": boolean, "description": string }
  ],
  "has_more": boolean,
  "next_offset": number | null
}`,
      inputSchema: ListIconsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: ListIconsInput) => {
      const all = iconStore.list({
        curatedOnly: params.curated_only,
        category: params.category
      });

      const page = all.slice(params.offset, params.offset + params.limit);
      const hasMore = params.offset + page.length < all.length;

      const output = {
        total: all.length,
        count: page.length,
        offset: params.offset,
        results: page.map(summarize),
        has_more: hasMore,
        next_offset: hasMore ? params.offset + page.length : null
      };

      let text = JSON.stringify(output, null, 2);
      if (text.length > CHARACTER_LIMIT) {
        const half = Math.max(1, Math.floor(page.length / 2));
        const trimmed = page.slice(0, half);
        output.results = trimmed.map(summarize);
        output.count = trimmed.length;
        output.has_more = true;
        output.next_offset = params.offset + trimmed.length;
        text = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text", text }],
        structuredContent: output
      };
    }
  );
}
