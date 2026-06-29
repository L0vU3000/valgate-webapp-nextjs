import "server-only"; // C1
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { convertRowToDomain } from "@/lib/db/column-classifier";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

// C2: every service takes this explicit context first — never ambient auth().
export type Ctx = { userId: string; orgId: string; orgRole: "owner" | "admin" | "member" | "viewer" };

const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 } as const;
export const roleAtLeast = (r: Ctx["orgRole"], min: keyof typeof RANK): boolean => RANK[r] >= RANK[min];

// D9: writes refuse in DEMO_MODE so a hosted/shared demo stays read-only. The local-dev escape
// hatch (DEMO_ALLOW_WRITES=true) re-enables writes against your own dev DB. Lives here (not ctx.ts)
// so the service layer never pulls Clerk's server SDK into its dependency graph (C2).
export function assertCanMutate(): void {
  if (env.DEMO_MODE && !env.DEMO_ALLOW_WRITES) throw new Error("Demo is read-only");
}

// C6/C7: the single DB→FE conversion point — inverse of seed-neon.ts#toRow.
export function toDomain(table: PgTable, row: Record<string, unknown>): Record<string, unknown> {
  return convertRowToDomain(table, row);
}

// C8/D8: atomic prefixed-id counter. `collection` IS the id prefix (PROP, TEN, …); id_counters
// is seeded next=max+1 per prefix, so the just-allocated id is next-1. Exercised in B4.
// Self-initialises missing counter rows (next=2 → first id is PREFIX-0001) so new collections
// don't require a seed run to work in production.
export async function nextId(collection: string): Promise<string> {
  const { rows } = await db.execute<{ next: number }>(
    sql`INSERT INTO id_counters (collection, next) VALUES (${collection}, 2)
        ON CONFLICT (collection) DO UPDATE SET next = id_counters.next + 1
        RETURNING next`,
  );
  const next = rows[0]?.next;
  if (next == null) throw new Error(`nextId: unknown collection "${collection}"`);
  return `${collection}-${String(next - 1).padStart(4, "0")}`;
}
