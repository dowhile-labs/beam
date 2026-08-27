import "dotenv/config";
import Fastify from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v3";
import { createBeamClient, BeamApiError } from "./beam-client";

const BEAM_API_URL = process.env.BEAM_API_URL ?? "https://beam.dowhilelabs.dev";
const PORT = Number(process.env.PORT ?? 3100);

const client = createBeamClient(BEAM_API_URL);

function buildServer(): McpServer {
  const server = new McpServer({ name: "beam", version: "0.1.0" });

  server.registerTool(
    "beam_send",
    {
      description:
        "Send text through beam and get back a one-time (or view-limited) link. " +
        "Use this instead of printing secrets, tokens, or long output inline " +
        "when handing something off to a human or another agent.",
      inputSchema: {
        text: z.string().min(1).max(100_000).describe("The text to beam."),
        views: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Views allowed before it self-destructs. Default 1."),
        ttl: z
          .number()
          .int()
          .min(60)
          .max(7 * 24 * 60 * 60)
          .optional()
          .describe("Expiry in seconds. Default 86400 (24h), max 7 days."),
      },
    },
    async ({ text, views, ttl }) => {
      try {
        const result = await client.send({ text, views, ttl });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "beam_get",
    {
      description:
        "Retrieve a beam by id. This CONSUMES a view — the beam's text is " +
        "deleted once its view count or TTL runs out, so only call this when " +
        "you actually intend to read it now.",
      inputSchema: {
        id: z.string().min(1).describe("The beam id (from a beam URL)."),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.get(id);
        return {
          content: [{ type: "text", text: JSON.stringify({ id, ...result }) }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "beam_info",
    {
      description:
        "Check whether a beam still exists (and its remaining views/expiry) " +
        "WITHOUT consuming a view. Use this to check status before deciding " +
        "whether to fetch it with beam_get.",
      inputSchema: {
        id: z.string().min(1).describe("The beam id (from a beam URL)."),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.info(id);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

function toolError(error: unknown): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  const message =
    error instanceof BeamApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok" }));

  // Stateless mode: a fresh McpServer + transport per request. This avoids
  // holding session state in memory, which matters because this service can
  // be restarted/scaled without clients noticing broken sessions.
  app.post("/mcp", async (request, reply) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    reply.raw.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });

  const methodNotAllowed = async (
    _request: unknown,
    reply: { code: (code: number) => { send: (body: unknown) => void } },
  ): Promise<void> => {
    reply.code(405).send({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
