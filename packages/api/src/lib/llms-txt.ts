// Served at GET /llms.txt — https://llmstxt.org/ spec: an H1 title, an
// optional blockquote summary, freeform context, then H2-delimited link
// lists. Kept as a plain string (not read from disk) so it ships inside
// the compiled dist/ output with no extra build step.
export const LLMS_TXT = `# beam

> Ephemeral text transport: send text, get a URL, open it once and the text
> is gone. No accounts, nothing to clean up. Built for humans and AI agents
> handing off secrets, tokens, or short-lived text outside a chat transcript.

Text is encrypted at rest and deleted once its view count or TTL runs out,
whichever comes first. Default is 1 view, 24h TTL; max 100 KB text, 100
views, 7 day TTL. Rate limit: 60 requests/minute/IP.

## Getting started

- [Project README](https://github.com/dowhile-labs/beam/blob/main/README.md): overview, CLI usage, HTTP API, self-hosting
- [Live server](https://beam.dowhilelabs.dev): the hosted production instance

## For AI agents

- [SKILL.md](https://github.com/dowhile-labs/beam/blob/main/skills/beam/SKILL.md): when and how to use the \`beam\` CLI/API from an agent, JSON output shape, exit codes
- [MCP server](https://mcp.dowhilelabs.dev/mcp): Streamable HTTP endpoint exposing \`beam_send\`, \`beam_get\`, \`beam_info\` as native MCP tools
- [MCP package docs](https://github.com/dowhile-labs/beam/blob/main/packages/mcp/README.md): MCP server setup and tool schemas

## HTTP API

- [API package docs](https://github.com/dowhile-labs/beam/blob/main/packages/api/README.md): endpoints, env vars, limits

## Contributing

- [AGENTS.md](https://github.com/dowhile-labs/beam/blob/main/AGENTS.md): repo layout, setup, validation commands, and conventions for agents/contributors making changes to this codebase
`;
