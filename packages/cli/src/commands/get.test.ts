import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeamClient, GetResult } from "../lib/api-client";
import { runGet } from "./get";
import { EXIT_CODES } from "../exit-codes";

function fakeClient(overrides: Partial<BeamClient> = {}): BeamClient {
  return {
    send: vi.fn(),
    get: vi.fn(),
    info: vi.fn(),
    ...overrides,
  };
}

const getResult: GetResult = {
  text: "hello world",
  views_remaining: 0,
  created_at: "2025-12-31T00:00:00.000Z",
  expires_at: "2026-01-01T00:00:00.000Z",
};

describe("runGet", () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the beam by id and writes its text to stdout", async () => {
    const get = vi.fn().mockResolvedValue(getResult);
    const client = fakeClient({ get });

    const code = await runGet("aB3dE5xZ", client, { json: false });

    expect(get).toHaveBeenCalledWith("aB3dE5xZ");
    expect(process.stdout.write).toHaveBeenCalledWith("hello world\n");
    expect(code).toBe(EXIT_CODES.SUCCESS);
  });

  it("prints machine-readable JSON including the id in --json mode", async () => {
    const client = fakeClient({ get: vi.fn().mockResolvedValue(getResult) });

    await runGet("aB3dE5xZ", client, { json: true });

    expect(process.stdout.write).toHaveBeenCalledWith(
      `${JSON.stringify({ id: "aB3dE5xZ", ...getResult })}\n`,
    );
  });

  it("does not append an extra newline if the text already ends with one", async () => {
    const client = fakeClient({
      get: vi.fn().mockResolvedValue({ ...getResult, text: "hello\n" }),
    });

    await runGet("aB3dE5xZ", client, { json: false });

    expect(process.stdout.write).toHaveBeenCalledWith("hello\n");
  });
});
