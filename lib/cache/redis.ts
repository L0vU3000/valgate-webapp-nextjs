import "server-only";
import { Redis } from "@upstash/redis";

// Create an Upstash Redis client using the HTTP REST API.
// The REST client is designed for serverless — it makes one HTTP request per command,
// so there is no TCP connection pool to manage across function invocations.
//
// Returns null when the env vars are unset. This lets the app start and run locally
// without an Upstash account — all caching helpers check for null and skip to the
// raw service when it is missing. Set UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN in Vercel env vars (or .env.local) to enable caching.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;
