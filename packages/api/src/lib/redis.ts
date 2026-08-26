import Redis from "ioredis";

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL environment variable is not set");
    }
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      // Upstash and most managed Redis providers require TLS on rediss://
      lazyConnect: false,
    });
  }
  return client;
}
