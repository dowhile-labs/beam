# @dowhilelabs/beam-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes [beam](https://github.com/dowhile-labs/beam)
as tools, for agents that speak MCP natively instead of shelling out to a CLI.

It's a thin proxy: every tool call turns into an HTTP request against the
public beam API. No state, no database — the beam API already owns storage
and expiry.

## Connect

```
https://beam-mcp.dowhilelabs.dev/mcp
```

Streamable HTTP, stateless (no session id required — every request is
independent). Point any MCP client at that URL.

## Tools

| Tool        | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| `beam_send` | Send text, get back a link. Args: `text`, `views?`, `ttl?` (seconds). |
| `beam_get`  | Fetch a beam by id. **Consumes a view.** Args: `id`.                  |
| `beam_info` | Check a beam's status without consuming a view. Args: `id`.           |

`beam_send` and `beam_get` return the same JSON shape as the HTTP API (see
the [root README](../../README.md#api)) as a text content block.

## Run it yourself

```
cd packages/mcp
pnpm install
pnpm run build && pnpm run start
```

| Env var        | Default                        | Description                     |
| -------------- | ------------------------------ | ------------------------------- |
| `BEAM_API_URL` | `https://beam.dowhilelabs.dev` | beam API this server proxies to |
| `PORT`         | `3100`                         | port to listen on               |

## Development

```
pnpm --filter @dowhilelabs/beam-mcp dev
```

## License

MIT
