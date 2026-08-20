# cisco-network-diagrams-mcp-server

MCP server that gives LLMs and MCP-compatible tools access to the 308 official icons from the **Cisco Systems Corporate Iconography** package.

The goal of this project is simple: make it easy to find the right Cisco icon for a network diagram and fetch it as a ready-to-use image.

## What this project does

This server provides four MCP tools:

- `cisco_list_categories` — shows how the catalog is organized
- `cisco_search_icons` — searches icons by keyword
- `cisco_list_icons` — lists icons with pagination and filters
- `cisco_get_icon` — returns the icon metadata and the PNG image

In practice, the flow is usually:

1. List the categories if you want to understand the catalog structure.
2. Search for the icon you need.
3. Fetch the icon image by its exact id.
4. Place the image in your diagram tool.

## Why this package exists

Cisco originally distributes these icons as CMYK JPEGs. In many modern tools, those files can appear blank, cropped, or with the wrong colors.

To avoid that problem, this package ships the icons already converted to **RGB PNG**. This keeps the visual result compatible with common tools like:

- Figma
- FigJam
- Miro
- Browsers
- Other collaborative whiteboard tools

The PNG files are also smaller and easier to handle.

## Available tools

| Tool | What it does | When to use it |
|---|---|---|
| `cisco_list_categories` | Lists the 7 catalog categories with their icon counts. | When you want to understand how the catalog is grouped. |
| `cisco_search_icons` | Searches by id, name, and description. Returns metadata only. | When you know the concept but not the exact icon id. |
| `cisco_list_icons` | Lists icons with pagination and optional filters. | When you want to browse icons in a category or the curated subset. |
| `cisco_get_icon` | Returns the icon metadata plus the PNG image. | When you already know the exact icon id. |

## Curated icons

Out of the 308 icons, **29 are curated**.

These are the icons most useful for classroom, documentation, and enterprise network diagrams, such as:

- router
- switch
- firewall
- server
- access point
- cloud

Curated icons also include extra educational metadata:

- `glossary_name`
- `function`
- `when_to_use`

This makes them easier to understand, especially for people who are still learning network architecture.

## Installation

### Global install

```bash
npm install -g cisco-network-diagrams-mcp-server
```

### Run without installing

```bash
npx cisco-network-diagrams-mcp-server
```

## Usage with an MCP client

To use this server in an MCP client, add it to your configuration.

Example for Claude Desktop:

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

## Example workflow

### 1) Find an icon

If you need a firewall icon, search first:

- query: `firewall`

If you want a broader result, you can try:

- `router`
- `switch`
- `wireless router`
- `cloud`
- `access point`

### 2) Fetch the image

After finding the correct id, call `cisco_get_icon` with that id.

Example:

- id: `router`

The tool returns:

- the PNG image
- the metadata for that icon

### 3) Place it in your diagram

The icons are **not square**.

For example, `router` is approximately **77×52 px**. Because of that, when placing the image in Figma, FigJam, Miro, or a similar tool, use **FIT** instead of **FILL**.

Why?

- `FIT` preserves the original proportions
- `FILL` can crop or distort the icon

## Practical tips

- Use `cisco_list_categories` if you want to explore the catalog from the start.
- Use `cisco_search_icons` when you know the concept but not the exact id.
- Use `cisco_get_icon` only after you already have the exact id.
- If a search in Portuguese returns nothing, try the English equivalent.
- If you are browsing the full catalog, remember that the curated set is usually the best starting point.

## License

The icons are Cisco's registered trademark artwork. Cisco authorizes free use in diagrams and materials, as long as the artwork is not redrawn, recolored, or distorted.

The CMYK to RGB conversion in this package is only a technical compatibility fix so the icons render correctly in modern tools.

This package's code is MIT-licensed, but the icon artwork itself remains Cisco's property under Cisco's usage terms.
