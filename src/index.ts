#!/usr/bin/env node
/**
 * MCP server for the Cisco Systems Corporate Iconography catalog.
 *
 * Exposes the 308 official Cisco network icons (converted from the
 * original CMYK JPEGs to RGB PNG, fixing blank/cropped rendering in
 * Miro, Figma, and FigJam) as MCP tools: search, list, and fetch by id.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListCategoriesTool } from "./tools/listCategories.js";
import { registerSearchIconsTool } from "./tools/searchIcons.js";
import { registerListIconsTool } from "./tools/listIcons.js";
import { registerGetIconTool } from "./tools/getIcon.js";

const server = new McpServer({
  name: "cisco-network-diagrams-mcp-server",
  version: "1.0.0"
});

registerListCategoriesTool(server);
registerSearchIconsTool(server);
registerListIconsTool(server);
registerGetIconTool(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("cisco-network-diagrams-mcp-server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
