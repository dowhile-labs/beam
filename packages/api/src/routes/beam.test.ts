import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import { getRedis } from "../lib/redis";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  await getRedis().quit();
});

describe("GET /health", () => {
  it("reports ok when redis is reachable", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("POST /", () => {
  it("creates a beam and returns its metadata", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { text: "hello from route test" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      views_remaining: 1,
      size_bytes: Buffer.byteLength("hello from route test", "utf8"),
    });
    expect(body.id).toHaveLength(8);
    expect(body.url).toContain(body.id);
  });

  it("returns 400 INVALID_INPUT when text is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("returns 400 INVALID_INPUT (not 500) for malformed JSON body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/",
      headers: { "content-type": "application/json" },
      payload: "{not valid json",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});

describe("GET /:id and /:id/info", () => {
  it("round-trips a beam end to end and self-destructs after one view", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/",
      payload: { text: "round trip" },
    });
    const { id } = create.json();

    const info = await app.inject({ method: "GET", url: `/${id}/info` });
    expect(info.statusCode).toBe(200);
    expect(info.json()).toMatchObject({
      exists: true,
      views_remaining: 1,
    });

    const get = await app.inject({ method: "GET", url: `/${id}` });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toMatchObject({
      text: "round trip",
      views_remaining: 0,
    });

    const getAgain = await app.inject({ method: "GET", url: `/${id}` });
    expect(getAgain.statusCode).toBe(404);
    expect(getAgain.json()).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  it("returns 404 for an id that never existed", async () => {
    const res = await app.inject({ method: "GET", url: "/doesNotExist" });
    expect(res.statusCode).toBe(404);
  });
});
