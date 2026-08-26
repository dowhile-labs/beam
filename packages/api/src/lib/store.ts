import { getRedis } from "./redis";
import { encrypt, decrypt } from "./crypto";
import { generateId } from "./nanoid";
import { BeamError } from "./errors";

export const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h
export const MAX_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d
export const DEFAULT_VIEWS = 1;
export const MAX_VIEWS = 100;
export const MAX_TEXT_BYTES = 100 * 1024; // 100 KB

interface StoredBeam {
  ciphertext: string;
  views_remaining: number;
  created_at: string;
}

export interface CreateBeamInput {
  text: string;
  views?: number;
  ttl?: number;
}

export interface CreatedBeam {
  id: string;
  expires_at: string;
  views_remaining: number;
  created_at: string;
  size_bytes: number;
}

export interface ConsumedBeam {
  text: string;
  views_remaining: number;
  created_at: string;
}

export interface BeamInfo {
  exists: boolean;
  views_remaining: number;
  expires_at: string;
}

function keyFor(id: string): string {
  return `beam:${id}`;
}

function validateCreateInput(input: CreateBeamInput): {
  views: number;
  ttl: number;
} {
  if (typeof input.text !== "string" || input.text.length === 0) {
    throw new BeamError("INVALID_INPUT", "text is required");
  }

  const sizeBytes = Buffer.byteLength(input.text, "utf8");
  if (sizeBytes > MAX_TEXT_BYTES) {
    throw new BeamError(
      "TOO_LARGE",
      `text exceeds max size of ${MAX_TEXT_BYTES} bytes`,
    );
  }

  const views = input.views ?? DEFAULT_VIEWS;
  if (!Number.isInteger(views) || views < 1 || views > MAX_VIEWS) {
    throw new BeamError(
      "INVALID_INPUT",
      `views must be an integer between 1 and ${MAX_VIEWS}`,
    );
  }

  const ttl = input.ttl ?? DEFAULT_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TTL_SECONDS) {
    throw new BeamError(
      "INVALID_INPUT",
      `ttl must be an integer between 1 and ${MAX_TTL_SECONDS} seconds`,
    );
  }

  return { views, ttl };
}

export async function createBeam(input: CreateBeamInput): Promise<CreatedBeam> {
  const { views, ttl } = validateCreateInput(input);

  const id = generateId();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttl * 1000);

  const stored: StoredBeam = {
    ciphertext: encrypt(input.text),
    views_remaining: views,
    created_at: createdAt.toISOString(),
  };

  const redis = getRedis();
  await redis.set(keyFor(id), JSON.stringify(stored), "EX", ttl);

  return {
    id,
    expires_at: expiresAt.toISOString(),
    views_remaining: views,
    created_at: stored.created_at,
    size_bytes: Buffer.byteLength(input.text, "utf8"),
  };
}

// Atomically read a beam, decrement its remaining views, and delete it once
// exhausted. Returns null when the beam doesn't exist (missing, expired, or
// already fully consumed).
const CONSUME_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return false
end
local data = cjson.decode(raw)
data.views_remaining = data.views_remaining - 1
if data.views_remaining <= 0 then
  redis.call('DEL', KEYS[1])
else
  local ttl = redis.call('TTL', KEYS[1])
  redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ttl)
end
return cjson.encode(data)
`;

export async function consumeBeam(id: string): Promise<ConsumedBeam> {
  const redis = getRedis();
  const result = (await redis.eval(CONSUME_SCRIPT, 1, keyFor(id))) as
    string | null;

  if (!result) {
    throw new BeamError("NOT_FOUND", "Beam not found or already consumed");
  }

  const data = JSON.parse(result) as StoredBeam;
  return {
    text: decrypt(data.ciphertext),
    views_remaining: data.views_remaining,
    created_at: data.created_at,
  };
}

export async function getBeamInfo(id: string): Promise<BeamInfo> {
  const redis = getRedis();
  const [raw, ttl] = await Promise.all([
    redis.get(keyFor(id)),
    redis.ttl(keyFor(id)),
  ]);

  if (!raw || ttl < 0) {
    throw new BeamError("NOT_FOUND", "Beam not found or already consumed");
  }

  const data = JSON.parse(raw) as StoredBeam;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  return {
    exists: true,
    views_remaining: data.views_remaining,
    expires_at: expiresAt.toISOString(),
  };
}
