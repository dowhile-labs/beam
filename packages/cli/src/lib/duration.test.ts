import { describe, expect, it } from "vitest";
import { parseDuration } from "./duration";
import { BeamCliError } from "../errors";

describe("parseDuration", () => {
  it("parses seconds, minutes, hours, and days", () => {
    expect(parseDuration("30s")).toBe(30);
    expect(parseDuration("30m")).toBe(30 * 60);
    expect(parseDuration("24h")).toBe(24 * 60 * 60);
    expect(parseDuration("7d")).toBe(7 * 24 * 60 * 60);
  });

  it("is case-insensitive on the unit", () => {
    expect(parseDuration("24H")).toBe(24 * 60 * 60);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDuration("  1h  ")).toBe(3600);
  });

  it.each(["", "1", "h", "1x", "-1h", "1.5h"])(
    "rejects invalid input %j",
    (input) => {
      expect(() => parseDuration(input)).toThrow(BeamCliError);
    },
  );
});
