import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { rows } = await db.execute(sql`SELECT now()`);
  console.log("Neon OK:", rows[0]?.now);
  process.exit(0); // Pool keeps the ws connection open otherwise
}

void main();
