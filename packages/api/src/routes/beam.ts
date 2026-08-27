import type { FastifyInstance } from "fastify";
import { BeamError } from "../lib/errors";
import { createBeam, consumeBeam, getBeamInfo } from "../lib/store";
import { renderBeamHtml, renderErrorHtml } from "../lib/html-view";

interface CreateBeamBody {
  text?: unknown;
  views?: unknown;
  ttl?: unknown;
}

// Browsers send an Accept header that lists text/html (with a specific,
// non-wildcard preference); curl, fetch, and the CLI default to `*/*` or
// explicit application/json. This lets a single URL serve a human-friendly
// page in a browser while remaining a plain JSON API for everything else.
function wantsHtml(acceptHeader: string | undefined): boolean {
  if (!acceptHeader) return false;
  return acceptHeader.split(",").some((part) => {
    const type = part.split(";")[0]?.trim();
    return type === "text/html" || type === "application/xhtml+xml";
  });
}

function wantsPlainText(acceptHeader: string | undefined): boolean {
  if (!acceptHeader) return false;
  return acceptHeader.split(",").some((part) => {
    const type = part.split(";")[0]?.trim();
    return type === "text/plain";
  });
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
    const accept = request.headers.accept;

    if (wantsHtml(accept)) {
      // This page is destructive to view (self-destructs the beam) and may
      // render sensitive text, so it must never be cached or leak via
      // referrer headers, and inline script/style needs an explicit CSP
      // allowance since there's no external bundle to hash/nonce.
      reply.header("Cache-Control", "no-store");
      reply.header("Referrer-Policy", "no-referrer");
      reply.header(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      );

      try {
        const beam = await consumeBeam(request.params.id);
        return reply.type("text/html").send(renderBeamHtml(beam));
      } catch (error) {
        if (error instanceof BeamError) {
          return reply
            .code(error.status)
            .type("text/html")
            .send(renderErrorHtml(error));
        }
        throw error;
      }
    }

    const beam = await consumeBeam(request.params.id);
    if (wantsPlainText(accept)) {
      return reply.type("text/plain").send(beam.text);
    }
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
