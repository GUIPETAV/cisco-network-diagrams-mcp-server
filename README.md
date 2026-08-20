# cisco-network-diagrams-mcp-server

MCP server exposing the 308 official icons from the **Cisco Systems
Corporate Iconography** package — the free-to-use icon set Cisco itself
distributes for diagrams and materials — so an LLM can look up the right
icon and fetch it as an image while building a network topology diagram.

All icons are shipped pre-converted from Cisco's original CMYK JPEGs to
**RGB PNG**. The CMYK originals render blank, discolored, or cropped in most
web/collaborative tools (Miro, Figma, FigJam, browsers) — this fixes that at
the source, and the PNGs are ~4x smaller too.

## Tools

| Tool | Description |
|---|---|
| `cisco_list_categories` | List the 7 catalog categories with icon counts. |
| `cisco_search_icons` | Keyword search across id/name/description (metadata only). |
| `cisco_list_icons` | Paginated listing, optionally filtered by category or curated-only. |
| `cisco_get_icon` | Fetch one icon's metadata **and** its RGB PNG image by id. |

29 of the 308 icons are **curated**: the equipment most common in
classroom/enterprise topologies (router, switch, firewall, server, access
point, cloud, etc.), annotated with `glossary_name`, `function`, and
`when_to_use` in addition to the base `description` every icon has.

## Installation

```bash
npm install -g cisco-network-diagrams-mcp-server
```

Or run without installing:

```bash
npx cisco-network-diagrams-mcp-server
```

## Usage with an MCP client

Add to your client's MCP server config (e.g. Claude Desktop's
`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cisco-network-diagrams": {
      "command": "npx",
      "args": ["-y", "cisco-network-diagrams-mcp-server"]
    }
  }
}
```

## Placing icons on a canvas

The icons are **not square** — e.g. `router` is ~77×52 px. When placing the
image returned by `cisco_get_icon` onto a fixed-size node (Figma, FigJam,
Miro, etc.), use a **`FIT`** scale mode, never `FILL` — `FILL` stretches or
crops non-square icons.

## License

The icons are Cisco's registered trademark artwork. Cisco authorizes free
use in diagrams and materials, unaltered (no redrawing, recoloring the
artwork, or distorting proportions). The CMYK→RGB conversion in this package
is a technical compatibility fix (same color, different color space), not a
visual alteration.

This package's own code is MIT-licensed; the icon artwork itself remains
Cisco's property under Cisco's usage terms.
