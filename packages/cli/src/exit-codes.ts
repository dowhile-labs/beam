// Predictable exit codes so scripts and AI agents can branch on CLI outcome
// without parsing stderr. Mirrors the contract documented in the API's
// structured error codes.
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERIC_ERROR: 1,
  NOT_FOUND: 2,
  RATE_LIMITED: 3,
  INVALID_INPUT: 4,
  NETWORK_ERROR: 5,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
