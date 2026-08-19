import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

// Lazy connection: only create pool when db is first accessed.
// This lets the server start in DEMO_MODE without a real DATABASE_URL.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

function getDb() {
  if (!_db) {
    _pool = new Pool({ connectionString: env.DATABASE_URL });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
