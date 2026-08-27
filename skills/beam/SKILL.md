---
name: beam
description: Send a one-time-view secret or text snippet to a human (or another agent) and get back a short-lived URL, using the beam CLI. Use this whenever you need to hand off a password, API key, token, config value, log excerpt, or any other short-lived text outside the chat transcript, instead of printing it inline.
license: MIT
metadata:
  author: dowhile-labs
  version: "0.1.0"
allowed-tools: Bash(beam:*) Bash(npx:*)
---

# beam

`beam` sends text to `https://beam.dowhilelabs.dev` (or a self-hosted instance)
and returns a URL that can be opened exactly once (by default) before the
text is permanently deleted. Use it instead of pasting secrets directly into
a chat transcript, a file, or a log that will outlive the moment it's needed.

## When to use this

- The user needs a generated password, API key, token, or one-time code and
  shouldn't have it sitting in scrollback forever.
- You need to hand a value to a human outside of your own context (e.g. "here's
  your new database password") without it being logged in the conversation.
- You want to pass a short-lived value to another agent or script via a URL
  instead of stdin/stdout piping across process boundaries.

Do **not** use this for anything that must persist (it self-destructs), or
for large payloads (100 KB max).

## Install

```bash
npx @dowhilelabs/beam "text to send"
# or install once:
npm install -g @dowhilelabs/beam
```

No account or API key is required for default use.

## Send text

```bash
beam "the secret value"
```

Prints the URL to stdout, plus a terminal QR code (skip with `--no-qr`).
Reads from stdin if no argument is given — useful for piping command output
or a whole file, and also supports typed multi-line input:

```bash
generate-password | beam
cat notes.txt | beam --ttl 7d
beam                       # type/paste multiple lines, then Ctrl+D to send
```

### Flags

| Flag          | Meaning                                                 | Default    |
| ------------- | ------------------------------------------------------- | ---------- |
| `--views <n>` | number of times the link can be opened before it's gone | `1`        |
| `--ttl <dur>` | expiry, e.g. `30m`, `24h`, `7d`                         | `24h`      |
| `--json`      | print machine-readable JSON instead of human text       | off        |
| `--no-qr`     | skip the terminal QR code                               | off        |
| `--api <url>` | point at a different beam server                        | production |

## Retrieve text

Pass the 8-character beam ID (from the URL) instead of text:

```bash
beam aB3dE5xZ
```

This **consumes a view** — running it again after the last view returns exit
code 2 (not found/expired). Don't retrieve a beam speculatively; only do it
when you actually intend to use/display the value now.

## Scripting: always use `--json`

For any non-interactive/agent use, pass `--json` and parse stdout instead of
relying on the human-readable text, which may change:

```bash
beam --json "some secret"
# {"id":"aB3dE5xZ","url":"https://beam.dowhilelabs.dev/aB3dE5xZ","expires_at":"...","views_remaining":1,"created_at":"...","size_bytes":11}

beam --json aB3dE5xZ
# {"id":"aB3dE5xZ","text":"some secret","views_remaining":0,"created_at":"..."}
```

On error, `--json` prints a structured error object to stdout instead of a
colored message to stderr:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Beam not found or already consumed",
    "retryable": false
  }
}
```

## Exit codes

Branch on these instead of parsing error text:

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| `0`  | success                                    |
| `1`  | generic/internal error                     |
| `2`  | not found, expired, or already consumed    |
| `3`  | rate limited (safe to retry after a delay) |
| `4`  | invalid input (bad flag value, empty text) |
| `5`  | network error (couldn't reach the server)  |

```bash
beam "$SECRET" --json || echo "beam failed with exit code $?"
```

## Gotchas

- A beam is deleted after its last view **or** its TTL, whichever comes
  first — don't assume a link is still valid just because the TTL hasn't
  passed.
- Retrieving a beam is destructive. If you need to show the same value to
  multiple people/processes, send with `--views <n>` up front; you can't
  "undo" a consumed view.
- The CLI talks to a public production server by default
  (`https://beam.dowhilelabs.dev`). Override with `--api` or `BEAM_API_URL`
  if the user has their own instance.
