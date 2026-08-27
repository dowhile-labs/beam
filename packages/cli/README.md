# @dowhilelabs/beam

Send text, get a link. Open the link once, the text is gone.

```
$ beam "the wifi password is hunter2"
✨ https://beam.dowhilelabs.dev/J5o2CRYw
Expires 2026-08-28T02:36:07Z · 1 view remaining
```

No accounts, no dashboard, nothing to clean up afterward. The server
encrypts the text at rest and deletes it after its view count or TTL runs
out, whichever comes first.

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

## Using this from an AI agent

See [`skills/beam/SKILL.md`](https://github.com/dowhile-labs/beam/blob/main/skills/beam/SKILL.md) —
covers when to reach for beam instead of printing a secret inline, the
`--json` output shape, and exit codes to branch on.

## Links

- [Source & API docs](https://github.com/dowhile-labs/beam)
- [Live server](https://beam.dowhilelabs.dev)

## License

MIT
