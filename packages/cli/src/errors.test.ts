import { describe, expect, it } from "vitest";
import { BeamCliError, exitCodeFor, toCliError } from "./errors";
import { EXIT_CODES } from "./exit-codes";

describe("exitCodeFor", () => {
  it.each([
    ["NOT_FOUND", EXIT_CODES.NOT_FOUND],
    ["EXPIRED", EXIT_CODES.NOT_FOUND],
    ["RATE_LIMITED", EXIT_CODES.RATE_LIMITED],
    ["INVALID_INPUT", EXIT_CODES.INVALID_INPUT],
    ["TOO_LARGE", EXIT_CODES.INVALID_INPUT],
    ["NETWORK_ERROR", EXIT_CODES.NETWORK_ERROR],
    ["INTERNAL", EXIT_CODES.GENERIC_ERROR],
  ] as const)("maps %s to exit code %d", (code, expected) => {
    expect(exitCodeFor(new BeamCliError(code, "message"))).toBe(expected);
  });
});

describe("toCliError", () => {
  it("passes BeamCliError instances through unchanged", () => {
    const error = new BeamCliError("NOT_FOUND", "gone");
    expect(toCliError(error)).toBe(error);
  });

  it("wraps a plain Error as an INTERNAL BeamCliError", () => {
    const cliError = toCliError(new Error("boom"));
    expect(cliError).toBeInstanceOf(BeamCliError);
    expect(cliError.code).toBe("INTERNAL");
    expect(cliError.message).toBe("boom");
  });

  it("wraps a non-Error thrown value", () => {
    const cliError = toCliError("plain string");
    expect(cliError.code).toBe("INTERNAL");
    expect(cliError.message).toBe("plain string");
  });
});
