# Setting up Canva integration

The `cisco_canva_upload_icon` and `cisco_canva_build_diagram` tools use
Canva's public **Connect API**, which authenticates as a Canva user (OAuth),
not with a simple API key. This is a one-time setup, done by you, in your
browser — it can't be automated by an agent.

## 1. Create a Canva integration

1. Go to <https://www.canva.com/developers/> and sign in.
2. Create a new **Integration**.
3. Under **Authentication**, add this redirect URI:
   ```
   http://127.0.0.1:8787/callback
   ```
4. Under **Scopes**, enable at least:
   `asset:read`, `asset:write`, `design:content:read`, `design:content:write`,
   `design:meta:read`, `brandtemplate:content:read`, `brandtemplate:meta:read`.
5. Copy the **Client ID** and **Client Secret**.

## 2. Get a refresh token (one time)

From this package's root:

```bash
CANVA_CLIENT_ID=your_client_id CANVA_CLIENT_SECRET=your_client_secret \
  node scripts/canva-oauth-setup.mjs
```

This prints an authorization URL — open it, sign in, approve the requested
scopes. The script prints three lines back in your terminal:

```
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
CANVA_REFRESH_TOKEN=...
```

Refresh tokens don't expire on their own (only if you revoke the
integration), so this is a one-time step.

## 3. Configure the MCP server

Set all three as environment variables wherever the server runs, e.g. in
your MCP client config:

```json
{
  "mcpServers": {
    "cisco-network-diagrams": {
      "command": "npx",
      "args": ["-y", "cisco-network-diagrams-mcp-server"],
      "env": {
        "CANVA_CLIENT_ID": "...",
        "CANVA_CLIENT_SECRET": "...",
        "CANVA_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

`cisco_canva_upload_icon` and `cisco_canva_build_diagram` only register when
all three variables are present — without them the server runs normally with
just the icon-lookup tools.

## 4. Build a Brand Template for `cisco_canva_build_diagram`

The Connect API cannot place elements at arbitrary coordinates on a blank
canvas — that level of control only exists inside Canva's own editor/apps.
`cisco_canva_build_diagram` works by **autofilling a Brand Template** you
design once in the Canva UI:

1. In Canva, create a design with one **image placeholder** per device slot
   in your topology (e.g. 5 placeholders in a row for a 5-node diagram),
   and optionally a matching **text placeholder** under each for a label.
2. Save it as a **Brand Template** and name each placeholder field clearly
   (e.g. `device_1_icon`, `device_1_label`, `device_2_icon`, ...).
3. Copy the template's ID from its Canva URL.
4. Call `cisco_canva_build_diagram` with that `brand_template_id` and a
   `nodes` array mapping each Cisco icon id to its field names.

For a one-off diagram where building a template first isn't worth it, use
Canva's own AI design tools/connector directly instead (generate a design,
then place the Cisco icons — this is how the demo diagram in this project's
README was built).
