# Beam

Ephemeral text transport for humans and AI agents. Post text, get a short-lived
link back; the payload is encrypted at rest, capped by size/TTL/view-count,
and deleted automatically once consumed or expired.

## Status

Day 1 of the build: the API is live.

- **API**: https://beam.dowhilelabs.dev
- **Health check**: https://beam.dowhilelabs.dev/health

## Packages

- `packages/api` — Fastify + Redis backend (encryption, rate limiting,
  structured errors)

## Development

```bash
pnpm install
pnpm run dev:api
```

See `packages/api/package.json` for the full script list (`test`, `lint`,
`typecheck`, `format`).
