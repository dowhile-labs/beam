# beam

[![npm version](https://img.shields.io/npm/v/@dowhilelabs/beam)](https://www.npmjs.com/package/@dowhilelabs/beam)
[![license](https://img.shields.io/npm/l/@dowhilelabs/beam)](LICENSE)

Send text, get a link. Open the link once, the text is gone.

```
$ beam "here's the summary from today's standup"
✨ https://beam.dowhilelabs.dev/J5o2CRYw
Expires 2026-08-28T02:36:07Z · 1 view remaining
```

## Why

Pasting a secret or a long block of context into a chat, ticket, or agent
prompt means it lives there forever, visible to anyone with access to that
history. `beam` gives you a one-time link instead: the server encrypts the
text at rest and deletes it after its view count or TTL runs out, whichever
comes first. No account, no dashboard, nothing to clean up afterward.

Unlike a gist or pastebin, nothing persists after it's read.

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

> Prefer stdin over passing secrets as a CLI argument — arguments can leak
> into shell history and process listings (`ps`). `echo "$SECRET" | beam`
> or `beam < secret.txt` avoid that.

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

| Endpoint    | Method | Description                                                       |
| ----------- | ------ | ----------------------------------------------------------------- |
| `/`         | POST   | create a beam, returns id/url/expiry                              |
| `/:id`      | GET    | consume a beam (deletes it once views run out)                    |
| `/:id/info` | GET    | check if a beam still exists, without consuming it                |
| `/health`   | GET    | liveness/readiness check                                          |
| `/llms.txt` | GET    | [llms.txt](https://llmstxt.org/) map of the project for AI agents |

Limits: 100 KB text, 1–100 views, TTL up to 7 days, 60 requests/minute/IP.

## Continue where you left off, on any device

If your agent has the beam MCP tools (`beam_send`/`beam_get`) available,
you can hand off context between sessions or machines with plain
language — no copy-pasting, no shared docs, no login on either side.

**Device A** (mid-conversation with your coding agent):

```
> beam what we've discussed for the next feature, I'll continue on another device
✨ https://beam.dowhilelabs.dev/J5o2CRYw
```

**Device B** (a fresh agent session, anywhere):

```
> read this beam and tell me where we left off: J5o2CRYw
```

The second agent picks up exactly where the first left off. Once read, the
beam is gone — nothing lingers on a server for anyone else to find.

## Using this from an AI agent

Fetch [`https://beam.dowhilelabs.dev/llms.txt`](https://beam.dowhilelabs.dev/llms.txt)
for a quick, agent-readable map of these docs
([llms.txt](https://llmstxt.org/) format).

See [`skills/beam/SKILL.md`](skills/beam/SKILL.md) — covers when to reach
for beam instead of printing a secret inline, the `--json` output shape,
and exit codes to branch on.

Agents that speak [MCP](https://modelcontextprotocol.io) instead of a shell
can connect to `https://beam-mcp.dowhilelabs.dev/mcp` (Streamable HTTP) and get
`beam_send`, `beam_get`, and `beam_info` as native tools — see
[`packages/mcp`](packages/mcp).

## Self-hosting

The API is a Fastify service backed by Redis. Bring your own Redis, set
`ENCRYPTION_KEY` and `REDIS_URL`, and run it:

```
cd packages/api
pnpm install
pnpm run build && pnpm run start
```

See [`packages/api`](packages/api) for the full environment variable list.

## Packages

- [`packages/api`](packages/api) — Fastify + Redis backend
- [`packages/cli`](packages/cli) — the `beam` CLI (`@dowhilelabs/beam`)
- [`packages/mcp`](packages/mcp) — MCP server exposing beam as tools over HTTP

## For AI coding agents working on this repo

See [`AGENTS.md`](AGENTS.md) for how the monorepo is laid out, how to run
tests locally, and conventions to follow when contributing code (as opposed
to [`skills/beam/SKILL.md`](skills/beam/SKILL.md), which teaches an agent
how to _use_ the `beam` CLI/API/MCP tools as an end user).

## Development

```
pnpm install
pnpm run dev:api   # API on :3000
pnpm run dev:cli   # run the CLI against dev/prod API
pnpm run dev:mcp   # MCP server on :3100
pnpm test          # all packages
```

## License

MIT

## Security

See [`SECURITY.md`](SECURITY.md) for how to report a vulnerability.
