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

describe("GET /llms.txt", () => {
  it("serves an llms.txt-spec document as plain text", async () => {
    const res = await app.inject({ method: "GET", url: "/llms.txt" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toMatch(/^# beam\n/);
    expect(res.body).toContain("## Getting started");
    expect(res.body).toContain("https://github.com/dowhile-labs/beam");
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

describe("content negotiation on GET /:id", () => {
  it("returns JSON by default (no Accept header preference)", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/",
      payload: { text: "json by default" },
    });
    const { id } = create.json();

    const res = await app.inject({ method: "GET", url: `/${id}` });
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.json()).toMatchObject({ text: "json by default" });
  });

  it("returns plain text when Accept: text/plain", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/",
      payload: { text: "plain text please" },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "GET",
      url: `/${id}`,
      headers: { accept: "text/plain" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toBe("plain text please");
  });

  it("returns an HTML page when Accept: text/html (browser-like)", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/",
      payload: { text: "<script>alert(1)</script>" },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "GET",
      url: `/${id}`,
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(res.body).not.toContain("<script>alert(1)</script>");
  });

  it("returns an HTML error page for a missing id when Accept: text/html", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/doesNotExist",
      headers: { accept: "text/html" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("not found");
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
