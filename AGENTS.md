# AGENTS.md

Instructions for AI coding agents (and humans) working on the `beam` monorepo
itself. If you're looking for how to _use_ the `beam` CLI/API/MCP server as a
tool, see [`skills/beam/SKILL.md`](skills/beam/SKILL.md) instead — this file
is about contributing code to this repo.

## What this is

`beam` is an ephemeral text transport: send text, get a link, the link works
once (or N times) before the text is deleted for good. Three packages, one
pnpm workspace, one Redis-backed API:

| Package                        | What it is                                                                                    | Deployed at            |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------- |
| [`packages/api`](packages/api) | Fastify + Redis backend, the source of truth                                                  | `beam.dowhilelabs.dev` |
| [`packages/cli`](packages/cli) | `@dowhilelabs/beam` — the `beam` CLI, calls the API over HTTP                                 | published to npm       |
| [`packages/mcp`](packages/mcp) | MCP server, exposes `beam_send`/`beam_get`/`beam_info` as tools, also calls the API over HTTP | `mcp.dowhilelabs.dev`  |

`packages/cli` and `packages/mcp` are both thin clients over the same public
HTTP API — neither talks to Redis directly. If you're adding a feature that
needs new data or behavior, it almost always starts in `packages/api`.

## Setup

```bash
pnpm install
docker compose up -d          # starts Redis + the API locally
cp .env.example .env          # then set ENCRYPTION_KEY (see below)
```

Generate an `ENCRYPTION_KEY` (32-byte hex, required by the API):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run things per-package during development:

```bash
pnpm run dev:api    # API on :3000, watch mode
pnpm run dev:cli    # run the CLI against dev/prod API
pnpm run dev:mcp    # MCP server on :3100
```

## Before you're done: validate

Run these from the repo root before considering any change complete. All of
them run recursively across every package:

```bash
pnpm run lint          # eslint
pnpm run format:check  # prettier --check
pnpm run typecheck     # tsc --noEmit, per package
pnpm run test          # vitest, per package
pnpm run build         # tsup, per package
```

`packages/api` tests need a reachable Redis — `docker compose up -d redis`
first, or the tests will fail with connection errors.

CI (`.github/workflows/ci.yml`) runs the exact same five steps, plus commit
message linting on pull requests. If it's not green locally, it won't be
green in CI either.

## Commit messages: Conventional Commits, enforced

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/)
via commitlint + a husky `commit-msg` hook — non-conforming commits are
rejected locally, and CI re-checks on pull requests.

```
<type>(<scope>): <description>

[optional body]
```

Common types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`.
Scope is usually the package: `feat(cli): ...`, `fix(api): ...`,
`docs(mcp): ...`. Keep the description in the imperative mood, lowercase,
no trailing period.

## Conventions

- **TypeScript, strict mode, CommonJS output** (`tsup` bundles each
  package's entrypoint to `dist/`). No relative imports across packages —
  `packages/cli` and `packages/mcp` both vendor their own small HTTP client
  (`lib/api-client.ts` / `beam-client.ts`) rather than depending on
  `packages/api`.
- **Prettier is the formatting authority** — don't hand-format, run
  `pnpm run format` (or `format:check` to verify without writing).
- **No unrelated refactors in a change.** Keep diffs scoped to what was
  asked; this is a small, deliberately simple codebase.
- **Every behavior change needs a test.** Look at the existing `*.test.ts`
  next to the file you're changing for the pattern to follow (vitest,
  `describe`/`it`, fakes over mocking frameworks).
- **Secrets/config never get committed.** `.env` is gitignored; add new
  required variables to `.env.example` (with a comment, no real value) and
  to the relevant package's README.

## Where things live

- `packages/api/src/routes/beam.ts` — HTTP routes, content negotiation for
  `GET /:id` (JSON default, plain text via `Accept`, HTML for browsers)
- `packages/api/src/lib/store.ts` — Redis storage, atomic view-consumption
  via a Lua script (`CONSUME_SCRIPT`)
- `packages/api/src/lib/crypto.ts` — AES-256-GCM encryption at rest
- `packages/api/src/lib/html-view.ts` — the browser HTML view
- `packages/cli/src/cli.ts` — commander entrypoint, exit codes 0–5
- `packages/cli/src/commands/` — `send`/`get` command implementations
- `packages/mcp/src/server.ts` — MCP tool definitions (`beam_send`,
  `beam_get`, `beam_info`) over Streamable HTTP, stateless (fresh
  `McpServer` per request)
- `skills/beam/SKILL.md` — agent-facing usage docs (not this file)

## Deployment

Not something an agent should do unprompted — the home-server deploy
pipeline (Cloudflare Tunnel + auto-deploy webhook) is out of scope for a
code change. If a change needs new environment variables or a new exposed
port, call it out explicitly rather than assuming deployment config.
