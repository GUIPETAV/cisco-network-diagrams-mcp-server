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
import { registerCanvaUploadIconTool } from "./tools/canvaUploadIcon.js";
import { registerCanvaBuildDiagramTool } from "./tools/canvaBuildDiagram.js";

const server = new McpServer({
  name: "cisco-network-diagrams-mcp-server",
  version: "1.1.0"
});

registerListCategoriesTool(server);
registerSearchIconsTool(server);
registerListIconsTool(server);
registerGetIconTool(server);

// Canva tools only register when Canva Connect API credentials are present —
// see SETUP_CANVA.md. Without them, the server still works fully for icon
// lookup and for Miro/Figma/FigJam workflows driven by the calling agent.
if (process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET && process.env.CANVA_REFRESH_TOKEN) {
  registerCanvaUploadIconTool(server);
  registerCanvaBuildDiagramTool(server);
  console.error("Canva credentials found — cisco_canva_upload_icon and cisco_canva_build_diagram enabled.");
} else {
  console.error(
    "Canva credentials not set (CANVA_CLIENT_ID/CANVA_CLIENT_SECRET/CANVA_REFRESH_TOKEN) — " +
      "Canva tools disabled. See SETUP_CANVA.md to enable them."
  );
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("cisco-network-diagrams-mcp-server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
