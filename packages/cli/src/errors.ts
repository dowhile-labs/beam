import { EXIT_CODES } from "./exit-codes";

// Matches the API's error codes (see packages/api/src/lib/errors.ts) plus one
// CLI-only addition, NETWORK_ERROR, for connectivity failures that never made
// it to the server.
export type CliErrorCode =
  | "NOT_FOUND"
  | "EXPIRED"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "TOO_LARGE"
  | "NETWORK_ERROR"
  | "INTERNAL";

export class BeamCliError extends Error {
  code: CliErrorCode;
  retryable: boolean;

  constructor(code: CliErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "BeamCliError";
    this.code = code;
    this.retryable = retryable;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}

export function toCliError(error: unknown): BeamCliError {
  if (error instanceof BeamCliError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new BeamCliError("INTERNAL", message);
}

export function exitCodeFor(error: BeamCliError): number {
  switch (error.code) {
    case "NOT_FOUND":
    case "EXPIRED":
      return EXIT_CODES.NOT_FOUND;
    case "RATE_LIMITED":
      return EXIT_CODES.RATE_LIMITED;
    case "INVALID_INPUT":
    case "TOO_LARGE":
      return EXIT_CODES.INVALID_INPUT;
    case "NETWORK_ERROR":
      return EXIT_CODES.NETWORK_ERROR;
    case "INTERNAL":
    default:
      return EXIT_CODES.GENERIC_ERROR;
  }
}
