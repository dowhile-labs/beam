import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { getRedis } from "./lib/redis";

// The API only ever receives traffic through the Cloudflare Tunnel, so every
// request arrives from the same internal socket address. These tests make
// sure per-client rate limiting still works by keying off CF-Connecting-IP
// (or X-Forwarded-For via trustProxy) instead of the shared tunnel address.
describe("rate limiting behind a proxy", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await getRedis().quit();
  });

  it("tracks rate limits per CF-Connecting-IP, not per socket", async () => {
    const requestFrom = (ip: string) =>
      app.inject({
        method: "GET",
        url: "/health",
        headers: { "cf-connecting-ip": ip },
      });

    const clientA = await requestFrom("203.0.113.1");
    const clientB = await requestFrom("203.0.113.2");

    expect(clientA.statusCode).toBe(200);
    expect(clientB.statusCode).toBe(200);
    // Two different CF-Connecting-IP values must not share one counter: each
    // should still have close to the full 60/min quota remaining, not one
    // shared/halved quota.
    const remainingA = Number(clientA.headers["x-ratelimit-remaining"]);
    const remainingB = Number(clientB.headers["x-ratelimit-remaining"]);
    expect(remainingA).toBe(59);
    expect(remainingB).toBe(59);
  });

  it("falls back to request.ip when CF-Connecting-IP is absent", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
  });
});
