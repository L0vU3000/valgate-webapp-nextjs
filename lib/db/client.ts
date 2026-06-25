import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws; // REQUIRED in Node (no native WebSocket)

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema }); // D1: WebSocket Pool driver — transactions needed
