import "dotenv/config";
import { buildApp } from "./app";

async function main() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
