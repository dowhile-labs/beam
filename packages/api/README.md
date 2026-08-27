# @dowhilelabs/api

The beam API — a Fastify service backed by Redis. Encrypts text at rest,
deletes it once its view count or TTL runs out, and content-negotiates
`GET /:id` into JSON, plain text, or a small HTML page depending on `Accept`.

Live at `https://beam.dowhilelabs.dev`. See the [root README](../../README.md#api)
for the HTTP API reference table.

## Run it yourself

```
cd packages/api
pnpm install
pnpm run build && pnpm run start
```

| Env var           | Default                 | Description                                        |
| ----------------- | ----------------------- | -------------------------------------------------- |
| `REDIS_URL`       | —                       | Redis connection string (required)                 |
| `ENCRYPTION_KEY`  | —                       | 32-byte hex key for AES-256-GCM at rest (required) |
| `BEAM_WEB_ORIGIN` | `http://localhost:3001` | origin used to build shareable beam URLs           |
| `PORT`            | `3000`                  | port to listen on                                  |

Generate an `ENCRYPTION_KEY`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development

```
pnpm --filter @dowhilelabs/api dev    # watch mode, tsx
pnpm --filter @dowhilelabs/api test   # vitest, needs a reachable Redis
```

`docker compose up -d` from the repo root starts Redis, the API, and the MCP
server together for local development.

## Structure

- `src/routes/beam.ts` — `POST /`, `GET /:id`, `GET /:id/info`, `GET /health`
- `src/lib/store.ts` — Redis-backed storage, atomic consume via Lua script
- `src/lib/crypto.ts` — AES-256-GCM encryption at rest
- `src/lib/html-view.ts` — the browser-facing HTML view for `GET /:id`

## License

MIT
