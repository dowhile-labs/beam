# @dowhilelabs/beam

[![npm version](https://img.shields.io/npm/v/@dowhilelabs/beam)](https://www.npmjs.com/package/@dowhilelabs/beam)
[![npm downloads](https://img.shields.io/npm/dm/@dowhilelabs/beam)](https://www.npmjs.com/package/@dowhilelabs/beam)
[![license](https://img.shields.io/npm/l/@dowhilelabs/beam)](../../LICENSE)

Send text, get a link. Open the link once, the text is gone.

```
$ beam "meet me at gate 12, 5pm"
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

## Install

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
cat file.txt | beam       beam a whole file's contents
beam                      no argument, no stdin pipe: type text, then Ctrl+D to send
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

### Recipes

```
echo "$SECRET" | beam                # secret from an env var, not a CLI arg
cat notes.txt | beam --views 5 --ttl 7d  # share a file, 5 views, expires in a week
beam J5o2CRYw                        # fetch + consume a view
beam --json "hello" | jq -r .url     # scriptable output
```

> Prefer stdin over passing secrets as a CLI argument — arguments can leak
> into shell history and process listings (`ps`). `echo "$SECRET" | beam`
> or `beam < secret.txt` avoid that.

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

See [`packages/mcp`](https://github.com/dowhile-labs/beam/tree/main/packages/mcp)
for connecting the MCP server, and
[`skills/beam/SKILL.md`](https://github.com/dowhile-labs/beam/blob/main/skills/beam/SKILL.md)
for using the CLI/API from an agent that works over shell instead.

## Links

- [Source & API docs](https://github.com/dowhile-labs/beam)
- [Live server](https://beam.dowhilelabs.dev)

## License

MIT
