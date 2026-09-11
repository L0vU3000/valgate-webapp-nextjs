import "server-only";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

// Neon serverless speaks WebSocket. A GitHub Actions Postgres service (and any
// other localhost Postgres) speaks ordinary TCP, so that driver cannot connect.
// node-postgres (`pg`) talks TCP, which is what the CI Postgres container understands.
type AppDb = ReturnType<typeof drizzleNeon<typeof schema>>;

let _db: AppDb | null = null;

// Returns true when DATABASE_URL points at a local Postgres we can reach over TCP.
// Throws if the URL cannot be parsed, so a typo fails at first use instead of
// hanging on a WebSocket connection that will never complete.
function isLocalPostgresUrl(url: string): boolean {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`DATABASE_URL is not a valid URL (${message})`);
  }
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

// Lazy connection: only create the pool when db is first accessed.
// This lets the server start in DEMO_MODE without a real DATABASE_URL.
function getDb(): AppDb {
  if (_db) return _db;

  const url = env.DATABASE_URL;
  if (isLocalPostgresUrl(url)) {
    const pool = new PgPool({ connectionString: url });
    _db = drizzlePg(pool, { schema }) as unknown as AppDb;
  } else {
    const pool = new NeonPool({ connectionString: url });
    _db = drizzleNeon(pool, { schema });
  }
  return _db;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
