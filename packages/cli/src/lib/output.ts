import pc from "picocolors";
import type { GetResult, SendResult } from "./api-client";
import type { BeamCliError } from "../errors";

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function printSendSuccess(result: SendResult, qrBlock?: string): void {
  console.log(`${pc.green("✨")} ${pc.bold(result.url)}`);
  console.log(
    pc.dim(
      `Expires ${result.expires_at} · ${pluralize(result.views_remaining, "view")} remaining`,
    ),
  );
  if (qrBlock) {
    console.log(`\n${qrBlock}`);
  }
}

export function printGetSuccess(id: string, result: GetResult): void {
  if (process.stdout.isTTY) {
    console.log(
      pc.dim(`Beam ${id} · ${pluralize(result.views_remaining, "view")} left`),
    );
    console.log("");
  }
  process.stdout.write(
    result.text.endsWith("\n") ? result.text : `${result.text}\n`,
  );
  if (process.stdout.isTTY && result.views_remaining === 0) {
    console.log(pc.dim("💥 This beam has faded."));
  }
}

export function printError(error: BeamCliError): void {
  console.error(`${pc.red("✖")} ${error.message}`);
}
