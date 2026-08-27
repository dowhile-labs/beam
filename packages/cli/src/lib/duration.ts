import { BeamCliError } from "../errors";

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/i;

// Parses shorthand durations like "1h", "24h", "7d" into seconds. Kept
// intentionally simple (single unit, integer magnitude) to match the values
// the API and CLI --help both advertise.
export function parseDuration(input: string): number {
  const match = DURATION_PATTERN.exec(input.trim());
  if (!match) {
    throw new BeamCliError(
      "INVALID_INPUT",
      `Invalid --ttl value "${input}". Use a number followed by s, m, h, or d (e.g. 30m, 24h, 7d).`,
    );
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit.toLowerCase()];
}
