import type { FastifyInstance } from "fastify";
import { BeamError } from "../lib/errors";
import { createBeam, consumeBeam, getBeamInfo } from "../lib/store";

interface CreateBeamBody {
  text?: unknown;
  views?: unknown;
  ttl?: unknown;
}

export async function beamRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateBeamBody }>("/", async (request, reply) => {
    const { text, views, ttl } = request.body ?? {};

    const beam = await createBeam({
      text: text as string,
      views: views as number | undefined,
      ttl: ttl as number | undefined,
    });

    const webOrigin = process.env.BEAM_WEB_ORIGIN ?? "http://localhost:3001";

    return reply.code(201).send({
      id: beam.id,
      url: `${webOrigin}/${beam.id}`,
      expires_at: beam.expires_at,
      views_remaining: beam.views_remaining,
      created_at: beam.created_at,
      size_bytes: beam.size_bytes,
    });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const beam = await consumeBeam(request.params.id);
    return reply.send(beam);
  });

  app.get<{ Params: { id: string } }>("/:id/info", async (request, reply) => {
    const info = await getBeamInfo(request.params.id);
    return reply.send(info);
  });
}

export function isBeamError(error: unknown): error is BeamError {
  return error instanceof BeamError;
}
