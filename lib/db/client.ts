import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Neon's serverless pooler drops server-side connections after a short idle.
  // Close our idle connections first (10s) so the pool never hands out a socket
  // Neon has already killed — that stale socket is what surfaced as "Failed query".
  idleTimeoutMillis: 10_000,
  // Fail fast if a fresh connection can't be opened, instead of hanging the request.
  connectionTimeoutMillis: 10_000,
});

// Documented Neon guidance: a dropped idle connection emits an 'error' on the pool.
// Without this listener the event is unhandled and can take down the process; with it,
// the dead client is discarded and the next query gets a fresh connection.
pool.on("error", (err: Error) => {
  console.error("[db] idle pool connection error (will reconnect):", err.message);
});

export const db = drizzle(pool, { schema }); // D1: WebSocket Pool driver — transactions needed
