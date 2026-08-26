// Test defaults so the suite can run without a `.env` file. Store/route
// integration tests additionally require a reachable Redis instance
// (defaults to the local docker-compose instance on localhost:6379).
process.env.ENCRYPTION_KEY ??=
  "0000000000000000000000000000000000000000000000000000000000000000".slice(
    0,
    64,
  );
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.BEAM_WEB_ORIGIN ??= "http://localhost:3001";
