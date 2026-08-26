import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { beamRoutes, isBeamError } from "./routes/beam";
import { BeamError } from "./lib/errors";
import { getRedis } from "./lib/redis";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
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

    app.log.error(error);
    return reply
      .code(500)
      .send(new BeamError("INTERNAL", "Internal server error").toJSON());
  });

  await app.register(beamRoutes);

  return app;
}
