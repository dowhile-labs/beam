import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeamClient, SendResult } from "../lib/api-client";
import { runSend } from "./send";
import { BeamCliError } from "../errors";
import { EXIT_CODES } from "../exit-codes";

function fakeClient(overrides: Partial<BeamClient> = {}): BeamClient {
  return {
    send: vi.fn(),
    get: vi.fn(),
    info: vi.fn(),
    ...overrides,
  };
}

const sendResult: SendResult = {
  id: "aB3dE5xZ",
  url: "https://beam.dowhilelabs.dev/aB3dE5xZ",
  expires_at: "2026-01-01T00:00:00.000Z",
  views_remaining: 1,
  created_at: "2025-12-31T00:00:00.000Z",
  size_bytes: 5,
};

describe("runSend", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects empty text without calling the client", async () => {
    const client = fakeClient();

    await expect(
      runSend("", client, { json: false, qr: true }),
    ).rejects.toThrow(BeamCliError);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("sends text and parses --ttl into seconds", async () => {
    const send = vi.fn().mockResolvedValue(sendResult);
    const client = fakeClient({ send });

    const code = await runSend("hello", client, {
      views: 3,
      ttl: "24h",
      json: false,
      qr: false,
    });

    expect(send).toHaveBeenCalledWith({ text: "hello", views: 3, ttl: 86400 });
    expect(code).toBe(EXIT_CODES.SUCCESS);
  });

  it("prints machine-readable JSON in --json mode", async () => {
    const client = fakeClient({ send: vi.fn().mockResolvedValue(sendResult) });

    await runSend("hello", client, { json: true, qr: true });

    expect(process.stdout.write).toHaveBeenCalledWith(
      `${JSON.stringify(sendResult)}\n`,
    );
  });

  it("skips the QR code when stdout is not a TTY", async () => {
    const client = fakeClient({ send: vi.fn().mockResolvedValue(sendResult) });
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    await runSend("hello", client, { json: false, qr: true });

    const logged = vi.mocked(console.log).mock.calls.flat().join("\n");
    expect(logged).not.toContain("\u2588");
  });

  it("propagates duration parsing errors before calling the client", async () => {
    const send = vi.fn();
    const client = fakeClient({ send });

    await expect(
      runSend("hello", client, {
        ttl: "not-a-duration",
        json: false,
        qr: false,
      }),
    ).rejects.toThrow(BeamCliError);
    expect(send).not.toHaveBeenCalled();
  });
});
