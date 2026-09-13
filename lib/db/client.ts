import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

// ── Local development only ──────────────────────────────────────────────────
// The Neon serverless driver talks to a hosted Neon endpoint over a secure
// WebSocket. For local development (e.g. the Cloud Agent dev environment) there
// is no hosted Neon — just a plain local Postgres. When the opt-in environment
// variable NEON_LOCAL_PROXY_HOST is set (for example "127.0.0.1:5433"), we point
// the driver at a local WebSocket→TCP proxy (neondatabase/wsproxy) that forwards
// the raw Postgres protocol to the local database.
//
// This block is fully OPT-IN. When NEON_LOCAL_PROXY_HOST is unset — production,
// preview, and any normal run against a real Neon DATABASE_URL — none of this
// executes and the driver behaves exactly as before.
const localProxyHost = process.env.NEON_LOCAL_PROXY_HOST;
if (localProxyHost) {
  // Route every connection through the local proxy, telling it (via the
  // ?address query string) which Postgres host:port to forward to. The host and
  // port come from DATABASE_URL.
  neonConfig.wsProxy = (host, port) => `${localProxyHost}/v1?address=${host}:${port}`;
  // A local proxy speaks plain ws:// (no TLS), and a local Postgres does not do
  // the Neon-style TLS-over-WebSocket or SCRAM connection pipelining handshakes.
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

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
    return Reflect.get(getDb(), prop);
  },
});
