#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command, InvalidArgumentError } from "commander";
import pc from "picocolors";

import { createClient } from "./lib/api-client";
import { isStdinTTY, readStdin } from "./lib/stdin";
import { looksLikeBeamId } from "./lib/id";
import { printError, printJson } from "./lib/output";
import { runSend } from "./commands/send";
import { runGet } from "./commands/get";
import { BeamCliError, toCliError, exitCodeFor } from "./errors";
import { EXIT_CODES } from "./exit-codes";

const DEFAULT_API_URL = "https://beam.dowhilelabs.dev";

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseViews(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError(
      `--views must be a positive integer, got "${value}".`,
    );
  }
  return parsed;
}

interface ProgramOptions {
  views?: number;
  ttl?: string;
  json?: boolean;
  qr: boolean;
  api?: string;
}

async function main(
  value: string | undefined,
  options: ProgramOptions,
): Promise<number> {
  const apiUrl = options.api ?? process.env.BEAM_API_URL ?? DEFAULT_API_URL;
  const apiKey = process.env.BEAM_API_KEY;
  const client = createClient({ baseUrl: apiUrl, apiKey });
  const json = options.json ?? false;

  if (value !== undefined && looksLikeBeamId(value)) {
    return runGet(value, client, { json });
  }

  let text = value;
  if (text === undefined) {
    if (isStdinTTY()) {
      process.stderr.write(
        pc.dim(
          "Type your text, then press Ctrl+D (Ctrl+Z + Enter on Windows) to send:\n",
        ),
      );
    }
    text = await readStdin();
  }

  return runSend(text, client, {
    views: options.views,
    ttl: options.ttl,
    json,
    qr: options.qr,
  });
}

const program = new Command();

program
  .name("beam")
  .description(
    "Ephemeral text transport for humans and AI agents. Read once. Gone forever.\n\n" +
      "If <value> is an 8-character beam ID, it is retrieved; otherwise it is sent as text.",
  )
  .version(getVersion(), "-v, --version")
  .argument(
    "[value]",
    "text to send, or an 8-character beam ID to retrieve (reads stdin if omitted)",
  )
  .option(
    "--views <n>",
    "number of views before the beam disappears (default 1)",
    parseViews,
  )
  .option(
    "--ttl <duration>",
    "how long the beam lives, e.g. 30m, 24h, 7d (default 24h)",
  )
  .option("--no-qr", "skip the terminal QR code on send")
  .option("--json", "print machine-readable JSON output")
  .option("--api <url>", `Beam API base URL (default ${DEFAULT_API_URL})`)
  .action(async (value: string | undefined, options: ProgramOptions) => {
    try {
      process.exitCode = await main(value, options);
    } catch (error) {
      const cliError = toCliError(error);
      if (options.json) {
        printJson(cliError.toJSON());
      } else {
        printError(cliError);
      }
      process.exitCode = exitCodeFor(cliError);
    }
  });

program.exitOverride();

program.parseAsync(process.argv).catch((error) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "commander.helpDisplayed" || code === "commander.version") {
      process.exit(EXIT_CODES.SUCCESS);
    }
  }

  const cliError =
    error instanceof BeamCliError
      ? error
      : new BeamCliError(
          "INVALID_INPUT",
          error instanceof Error ? error.message : String(error),
        );
  printError(cliError);
  process.exit(exitCodeFor(cliError));
});
