import { describe, expect, it } from "vitest";
import { looksLikeBeamId } from "./id";

describe("looksLikeBeamId", () => {
  it("accepts exactly 8 alphanumeric characters", () => {
    expect(looksLikeBeamId("aB3dE5xZ")).toBe(true);
    expect(looksLikeBeamId("12345678")).toBe(true);
  });

  it("rejects wrong lengths", () => {
    expect(looksLikeBeamId("aB3dE5x")).toBe(false);
    expect(looksLikeBeamId("aB3dE5xZ9")).toBe(false);
    expect(looksLikeBeamId("")).toBe(false);
  });

  it("rejects non-alphanumeric characters", () => {
    expect(looksLikeBeamId("aB3d-5xZ")).toBe(false);
    expect(looksLikeBeamId("hello wo")).toBe(false);
  });

  it("rejects arbitrary text sent as-is", () => {
    expect(looksLikeBeamId("hello")).toBe(false);
    expect(looksLikeBeamId("sk_live_abc123")).toBe(false);
  });
});
