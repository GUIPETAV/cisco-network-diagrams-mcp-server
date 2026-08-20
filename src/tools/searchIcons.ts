import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconStore } from "../services/iconStore.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { IconEntry } from "../types.js";

const SearchIconsInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(100, "Query must not exceed 100 characters")
    .describe("Search term to match against icon id, name, and description. Cisco's original names are in English (e.g. 'router', 'firewall', 'switch') — if a Portuguese/Spanish term returns nothing, retry with the likely English equivalent."),
  curated_only: z.boolean()
    .default(false)
    .describe("If true, only search the 29 curated icons (common classroom/enterprise equipment with full pedagogical context: function, when_to_use). Default false searches the full 308-icon catalog."),
  category: z.string()
    .optional()
    .describe("Optional category id to restrict the search to (see cisco_list_categories for valid ids, e.g. 'routing_l3', 'security')."),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of results to return (default 20).")
}).strict();

type SearchIconsInput = z.infer<typeof SearchIconsInputSchema>;

function summarize(icon: IconEntry) {
  return {
    id: icon.id,
    name: icon.glossary_name ?? icon.name,
    category: icon.category,
    curated: icon.curated,
    description: icon.description
  };
}

export function registerSearchIconsTool(server: McpServer): void {
  server.registerTool(
    "cisco_search_icons",
    {
      title: "Search Cisco Network Icons",
      description: `Search the 308 official Cisco Systems Corporate Iconography icons by keyword. Matches against the icon's id, name, and description text.

This tool does NOT return image bytes — it returns lightweight metadata so you can identify the right icon id, then call cisco_get_icon with that id to fetch the actual image. Use this whenever the user asks "what icon represents X" or before assembling a diagram.

Args:
  - query (string, required): search term, e.g. "firewall", "roteador", "switch"
  - curated_only (boolean, default false): restrict to the 29 curated, pedagogically-annotated icons
  - category (string, optional): restrict to one category id (see cisco_list_categories)
  - limit (number, default 20, max 50): maximum results

Returns JSON:
{
  "query": string,
  "total_matches": number,
  "count": number,
  "results": [
    { "id": string, "name": string, "category": string, "curated": boolean, "description": string }
  ],
  "truncated": boolean
}

Examples:
  - Use when: "que ícone eu uso pra representar um firewall?" -> query="firewall"
  - Use when: "preciso do ícone genérico de roteador wireless" -> query="wireless router"
  - Don't use when: you already know the exact id (use cisco_get_icon directly)

Error Handling:
  - Returns an empty "results" array (not an error) when nothing matches — suggest the user try an English equivalent or a generic fallback icon (e.g. "generic_gateway", "generic_processor").`,
      inputSchema: SearchIconsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: SearchIconsInput) => {
      const matches = iconStore.search(params.query, {
        curatedOnly: params.curated_only,
        category: params.category
      });

      const limited = matches.slice(0, params.limit);
      const output = {
        query: params.query,
        total_matches: matches.length,
        count: limited.length,
        results: limited.map(summarize),
        truncated: matches.length > limited.length
      };

      let text = JSON.stringify(output, null, 2);
      if (text.length > CHARACTER_LIMIT) {
        const half = Math.max(1, Math.floor(limited.length / 2));
        output.results = limited.slice(0, half).map(summarize);
        output.count = output.results.length;
        output.truncated = true;
        text = JSON.stringify(output, null, 2);
      }

      if (matches.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No icons found matching '${params.query}'. Try an English equivalent (Cisco's catalog is in English) or a generic fallback like "generic_gateway", "generic_appliance", or "generic_processor".`
          }],
          structuredContent: output
        };
      }

      return {
        content: [{ type: "text", text }],
        structuredContent: output
      };
    }
  );
}
