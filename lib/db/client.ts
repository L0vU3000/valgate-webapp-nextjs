import "server-only";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { Pool as NodePool } from "pg";
import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

// ponytail: a local Postgres (dev/`npm run test:db`) speaks plain TCP — the Neon driver
// forces WS+TLS against it and dies with `EPROTO ... tlsv1 alert internal error`. Switch
// drivers on the host rather than running a wsproxy container alongside every dev box.
// Upgrade path: drop this branch if local dev moves to a Neon branch URL.
const isLocalPg = (url: string) => /@(localhost|127\.0\.0\.1|\[::1\]):/.test(url);

// Lazy connection: only create pool when db is first accessed.
// This lets the server start in DEMO_MODE without a real DATABASE_URL.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!_db) {
    _db = isLocalPg(env.DATABASE_URL)
      ? (drizzleNode(new NodePool({ connectionString: env.DATABASE_URL }), {
          schema,
        }) as unknown as ReturnType<typeof drizzle<typeof schema>>)
      : drizzle(new NeonPool({ connectionString: env.DATABASE_URL }), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
