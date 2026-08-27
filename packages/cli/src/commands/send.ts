import type { BeamClient } from "../lib/api-client";
import { parseDuration } from "../lib/duration";
import { renderQrTerminal } from "../lib/qr";
import { printJson, printSendSuccess } from "../lib/output";
import { BeamCliError } from "../errors";
import { EXIT_CODES } from "../exit-codes";

export interface SendOptions {
  views?: number;
  ttl?: string;
  json: boolean;
  qr: boolean;
}

export async function runSend(
  text: string,
  client: BeamClient,
  options: SendOptions,
): Promise<number> {
  if (text.length === 0) {
    throw new BeamCliError(
      "INVALID_INPUT",
      "No text provided. Pass text as an argument, pipe it via stdin, or type it interactively.",
    );
  }

  const ttl =
    options.ttl !== undefined ? parseDuration(options.ttl) : undefined;

  const result = await client.send({ text, views: options.views, ttl });

  if (options.json) {
    printJson(result);
    return EXIT_CODES.SUCCESS;
  }

  const qrBlock =
    options.qr && process.stdout.isTTY
      ? await renderQrTerminal(result.url)
      : undefined;

  printSendSuccess(result, qrBlock);
  return EXIT_CODES.SUCCESS;
}
