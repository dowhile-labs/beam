import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBeamClient, BeamApiError } from "./beam-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createBeamClient", () => {
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

    const client = createBeamClient("https://api.example.com");
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

  it("gets /:id and returns the parsed result", async () => {
    const getResult = {
      text: "hello world",
      views_remaining: 0,
      created_at: "2025-12-31T00:00:00.000Z",
      expires_at: "2026-01-01T00:00:00.000Z",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, getResult));

    const client = createBeamClient("https://api.example.com");
    const result = await client.get("aB3dE5xZ");

    expect(result).toEqual(getResult);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/aB3dE5xZ",
      expect.anything(),
    );
  });

  it("throws a BeamApiError with the server's message on non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        error: { code: "NOT_FOUND", message: "Beam not found" },
      }),
    );

    const client = createBeamClient("https://api.example.com");

    await expect(client.get("missing")).rejects.toMatchObject({
      message: "Beam not found",
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("is an instance of BeamApiError on non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        error: { code: "NOT_FOUND", message: "Beam not found" },
      }),
    );

    const client = createBeamClient("https://api.example.com");

    await expect(client.get("missing")).rejects.toBeInstanceOf(BeamApiError);
  });

  it("wraps network failures as a BeamApiError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const client = createBeamClient("https://api.example.com");

    await expect(client.info("aB3dE5xZ")).rejects.toBeInstanceOf(BeamApiError);
  });
});
