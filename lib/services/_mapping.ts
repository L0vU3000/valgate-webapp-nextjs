import "server-only"; // C1
import { getTableName, sql } from "drizzle-orm";
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
//
// TM1-125: when `table` is given, `next` is reconciled against it on every allocate instead of
// being blindly incremented. Incrementing alone trusts the counter to already be ahead of the
// data, and nothing enforces that: a counter that falls behind (hand-written row, import, a
// seed that missed a prefix) hands out colliding ids *forever*. Production died on
// `properties_pkey` with `PROP-0028 already exists` for exactly this reason. Taking
// `GREATEST(counter + 1, max-in-table + 2)` makes the drift self-heal on the next create, so
// the wedge cannot outlive one request. That also makes `lib/db/id-counters-guard.ts` (TM1-74)
// a seed-time check only — the request path can no longer collide, so it has nothing to guard.
//
// Pass `table` whenever the id becomes a row primary key. Omit it when the id is only a token
// (e.g. the `DOC` segment of a storage key) — there is no table to reconcile against, and an
// increment-only counter is already correct.
//
// Ceiling (TM1-73): this upsert row-locks the one id_counters row for `collection` until
// this statement commits, so creates serialize globally per entity type (all orgs share
// PROP). Fine at hundreds of creates/sec. If it ever binds: per-org counter rows, or UUIDs
// (see vault/resources/gotchas.md; activities already uses UUIDs for this reason).
export async function nextId(collection: string, table?: PgTable): Promise<string> {
  // The suffix is the numeric tail of an id for THIS prefix. Anchored on both ends so a
  // differently-prefixed id in the same table (or a non-numeric id) cannot inflate the max.
  const maxSuffixInTable = table
    ? sql`COALESCE((
        SELECT MAX(CAST(split_part(id, '-', 2) AS INTEGER)) + 2
        FROM ${sql.identifier(getTableName(table))}
        WHERE id ~ ${`^${collection}-[0-9]+$`}
      ), 0)`
    : sql`0`;

  const { rows } = await db.execute<{ next: number }>(
    sql`INSERT INTO id_counters (collection, next) VALUES (${collection}, 2)
        ON CONFLICT (collection) DO UPDATE SET next = GREATEST(
          id_counters.next + 1,
          ${maxSuffixInTable}
        )
        RETURNING next`,
  );
  const next = rows[0]?.next;
  if (next == null) throw new Error(`nextId: unknown collection "${collection}"`);
  return `${collection}-${String(next - 1).padStart(4, "0")}`;
}
