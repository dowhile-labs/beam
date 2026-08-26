import { afterAll, describe, expect, it } from "vitest";
import {
  createBeam,
  consumeBeam,
  getBeamInfo,
  MAX_TEXT_BYTES,
  MAX_VIEWS,
  MAX_TTL_SECONDS,
} from "./store";
import { BeamError } from "./errors";
import { getRedis } from "./redis";

afterAll(async () => {
  await getRedis().quit();
});

describe("createBeam validation", () => {
  it("rejects missing text", async () => {
    await expect(createBeam({ text: "" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("rejects text larger than the max size", async () => {
    const tooLarge = "a".repeat(MAX_TEXT_BYTES + 1);
    await expect(createBeam({ text: tooLarge })).rejects.toMatchObject({
      code: "TOO_LARGE",
    });
  });

  it("rejects out-of-range views", async () => {
    await expect(
      createBeam({ text: "hi", views: MAX_VIEWS + 1 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createBeam({ text: "hi", views: 0 })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("rejects out-of-range ttl", async () => {
    await expect(
      createBeam({ text: "hi", ttl: MAX_TTL_SECONDS + 1 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("beam lifecycle", () => {
  it("creates, views info, then consumes a single-view beam", async () => {
    const beam = await createBeam({ text: "hello world" });
    expect(beam.id).toHaveLength(8);
    expect(beam.views_remaining).toBe(1);

    const info = await getBeamInfo(beam.id);
    expect(info).toMatchObject({ exists: true, views_remaining: 1 });

    const consumed = await consumeBeam(beam.id);
    expect(consumed.text).toBe("hello world");
    expect(consumed.views_remaining).toBe(0);

    await expect(consumeBeam(beam.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("supports multiple views before self-destructing", async () => {
    const beam = await createBeam({ text: "multi view", views: 2 });

    const first = await consumeBeam(beam.id);
    expect(first.views_remaining).toBe(1);

    const second = await consumeBeam(beam.id);
    expect(second.views_remaining).toBe(0);

    await expect(consumeBeam(beam.id)).rejects.toBeInstanceOf(BeamError);
  });

  it("expires beams after their ttl elapses", async () => {
    const beam = await createBeam({ text: "short lived", ttl: 1 });

    await new Promise((resolve) => setTimeout(resolve, 1300));

    await expect(consumeBeam(beam.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns NOT_FOUND info for a beam that never existed", async () => {
    await expect(getBeamInfo("doesNotExist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
