import { describe, expect, it } from "vitest";
import { generateId } from "./nanoid";

describe("generateId", () => {
  it("generates an 8-character id", () => {
    expect(generateId()).toHaveLength(8);
  });

  it("only uses mixed alphanumeric characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateId()).toMatch(/^[0-9A-Za-z]{8}$/);
    }
  });

  it("generates unique ids across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    expect(ids.size).toBe(1000);
  });
});
