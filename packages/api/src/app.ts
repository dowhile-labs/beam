import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { beamRoutes, isBeamError } from "./routes/beam";
import { BeamError } from "./lib/errors";
import { getRedis } from "./lib/redis";

export async function buildApp(): Promise<FastifyInstance> {
  // The API only ever receives traffic through the Cloudflare Tunnel, so
  // req.socket.remoteAddress is always the tunnel's internal address, not
  // the real client. trustProxy makes Fastify parse X-Forwarded-For for
  // request.ip; the rate limiter's keyGenerator below prefers
  // CF-Connecting-IP (set by Cloudflare's edge and not spoofable by the
  // client) so per-client limiting works instead of being shared globally.
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      const cfConnectingIp = request.headers["cf-connecting-ip"];
      return typeof cfConnectingIp === "string" ? cfConnectingIp : request.ip;
    },
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });

  app.get("/health", async (_request, reply) => {
    try {
      await getRedis().ping();
      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error, "Redis health check failed");
      return reply.code(503).send({ ok: false });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isBeamError(error)) {
      return reply.code(error.status).send(error.toJSON());
    }

    // Fastify's own errors (invalid JSON body, payload too large, rate
    // limiting, etc.) carry a statusCode but aren't BeamErrors. Map known
    // 4xx cases to our structured error contract instead of always 500.
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      const code = err.statusCode === 429 ? "RATE_LIMITED" : "INVALID_INPUT";
      return reply
        .code(err.statusCode)
        .send(
          new BeamError(
            code,
            err.message ?? "Invalid request",
            code === "RATE_LIMITED",
          ).toJSON(),
        );
    }

    app.log.error(error);
    return reply
      .code(500)
      .send(new BeamError("INTERNAL", "Internal server error").toJSON());
  });

  await app.register(beamRoutes);

  return app;
}
