# beam

Send text, get a link. Open the link once, the text is gone.

```
$ beam "the wifi password is hunter2"
✨ https://beam.dowhilelabs.dev/J5o2CRYw
Expires 2026-08-28T02:36:07Z · 1 view remaining
```

No accounts, no dashboard, nothing to clean up afterward. The server
encrypts the text at rest and deletes it after its view count or TTL runs
out, whichever comes first.

## Install the CLI

```
npx @dowhilelabs/beam "some text"
```

or install it once:

```
npm install -g @dowhilelabs/beam
```

## Usage

```
beam <text>              send text, print a beam link
beam <id>                fetch and print a beam's text (consumes a view)
echo "..." | beam         read text from stdin instead of an argument
```

| Flag          | Default                        | Description                            |
| ------------- | ------------------------------ | -------------------------------------- |
| `--views <n>` | `1`                            | views allowed before it self-destructs |
| `--ttl <dur>` | `24h`                          | expiry, e.g. `30m`, `24h`, `7d`        |
| `--no-qr`     | off                            | skip the terminal QR code              |
| `--json`      | off                            | print JSON instead of colored text     |
| `--api <url>` | `https://beam.dowhilelabs.dev` | point at a different beam server       |

Exit codes: `0` success, `1` generic error, `2` not found/expired, `3` rate
limited, `4` invalid input, `5` network error. Scripts and agents should
pass `--json` and branch on the exit code rather than parsing text output.

```
beam --json "hello"
{"id":"J5o2CRYw","url":"https://beam.dowhilelabs.dev/J5o2CRYw","expires_at":"2026-08-28T02:36:07.920Z","views_remaining":1,"created_at":"2026-08-27T02:36:07.920Z","size_bytes":5}
```

## API

Same thing over HTTP, if you'd rather not install anything:

```
curl -X POST https://beam.dowhilelabs.dev \
  -H 'content-type: application/json' \
  -d '{"text": "hello", "views": 1, "ttl": 86400}'
```

```
curl https://beam.dowhilelabs.dev/J5o2CRYw
```

`GET /:id` content-negotiates on `Accept`: JSON by default, plain text for
`text/plain`, or a small HTML page with a copy button for browsers.

| Endpoint    | Method | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| `/`         | POST   | create a beam, returns id/url/expiry               |
| `/:id`      | GET    | consume a beam (deletes it once views run out)     |
| `/:id/info` | GET    | check if a beam still exists, without consuming it |
| `/health`   | GET    | liveness/readiness check                           |

Limits: 100 KB text, 1–100 views, TTL up to 7 days, 60 requests/minute/IP.

## Using this from an AI agent

See [`skills/beam/SKILL.md`](skills/beam/SKILL.md) — covers when to reach
for beam instead of printing a secret inline, the `--json` output shape,
and exit codes to branch on.

## Self-hosting

The API is a Fastify service backed by Redis. Bring your own Redis, set
`ENCRYPTION_KEY` and `REDIS_URL`, and run it:

```
cd packages/api
pnpm install
pnpm run build && pnpm run start
```

See `packages/api/package.json` for the full script list and required
environment variables.

## Packages

- [`packages/api`](packages/api) — Fastify + Redis backend
- [`packages/cli`](packages/cli) — the `beam` CLI (`@dowhilelabs/beam`)

## Development

```
pnpm install
pnpm run dev:api   # API on :3000
pnpm run dev:cli   # run the CLI against dev/prod API
pnpm test          # both packages
```

## License

MIT
