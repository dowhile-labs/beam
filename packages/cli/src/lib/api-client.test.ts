import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./api-client";
import { BeamCliError } from "../errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("posts to / with the given body and returns the parsed result", async () => {
    const sendResult = {
      id: "aB3dE5xZ",
      url: "https://beam.dowhilelabs.dev/aB3dE5xZ",
      expires_at: "2026-01-01T00:00:00.000Z",
      views_remaining: 1,
      created_at: "2025-12-31T00:00:00.000Z",
      size_bytes: 5,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, sendResult));

    const client = createClient({ baseUrl: "https://api.example.com" });
    const result = await client.send({ text: "hello" });

    expect(result).toEqual(sendResult);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "hello" }),
      }),
    );
  });

  it("strips trailing slashes from the base URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { exists: true }));
    const client = createClient({ baseUrl: "https://api.example.com///" });

    await client.info("aB3dE5xZ");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/aB3dE5xZ/info",
      expect.anything(),
    );
  });

  it("sends an Authorization header when an API key is provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { exists: true }));
    const client = createClient({
      baseUrl: "https://api.example.com",
      apiKey: "secret-key",
    });

    await client.info("aB3dE5xZ");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-key",
    );
  });

  it("throws a BeamCliError with the server's structured error on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        error: {
          code: "NOT_FOUND",
          message: "Beam not found or already consumed",
          retryable: false,
        },
      }),
    );

    const client = createClient({ baseUrl: "https://api.example.com" });

    await expect(client.get("aB3dE5xZ")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Beam not found or already consumed",
      retryable: false,
    });
  });

  it("falls back to INTERNAL when the error body is missing or unrecognized", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 500 }));

    const client = createClient({ baseUrl: "https://api.example.com" });

    await expect(client.get("aB3dE5xZ")).rejects.toMatchObject({
      code: "INTERNAL",
    });
  });

  it("wraps network failures as a retryable NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const client = createClient({ baseUrl: "https://api.example.com" });

    await expect(client.get("aB3dE5xZ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });

  it("is an instance of BeamCliError on failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const client = createClient({ baseUrl: "https://api.example.com" });

    await expect(client.get("aB3dE5xZ")).rejects.toBeInstanceOf(BeamCliError);
  });
});
