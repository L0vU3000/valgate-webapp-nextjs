import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/services/_mapping";
import { db } from "@/lib/db/client";
import { idCounters, properties } from "@/lib/db/schema";
import { createProperty } from "@/lib/services/properties";

// ---------------------------------------------------------------------------
// Live-DB regression test for TM1-125.
//
// The production failure was `duplicate key value violates unique constraint
// "properties_pkey"` on EVERY create, caused by `id_counters.next` sitting
// behind `MAX(properties.id)`. The unit test in `_mapping.nextid.test.ts`
// asserts the *shape* of the emitted SQL (it contains `GREATEST`, it contains
// the table name). Necessary, but not sufficient: a string assertion cannot
// prove the SQL is valid Postgres, cannot prove `split_part`/`CAST`/the
// anchored regex behave, and cannot prove a real create then succeeds.
//
// This test proves the ticket's actual acceptance criterion against a real DB:
// with the counter deliberately behind, `createProperty` returns an id strictly
// greater than every existing PROP id — instead of colliding. It FAILS on the
// pre-fix implementation, which is the point.
//
// Gated on DATABASE_URL (see vitest.config.db.ts): a laptop without a DB
// no-ops cleanly; CI provisions postgres:16 and forbids the no-op.
// ---------------------------------------------------------------------------

const HAS_DB = !!process.env.DATABASE_URL;

// The seeded demo owner. Its org row exists, so the org_id FK is satisfied.
const ctx: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

/** Highest numeric PROP suffix actually present, or 0. */
async function maxPropSuffix(): Promise<number> {
  const { rows } = await db.execute<{ max_suffix: number | null }>(
    sql`SELECT MAX(CAST(split_part(id, '-', 2) AS INTEGER)) AS max_suffix
        FROM properties WHERE id ~ '^PROP-[0-9]+$'`,
  );
  return rows[0]?.max_suffix ?? 0;
}

describe.skipIf(!HAS_DB)("nextId reconciles against the properties table (live DB)", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(properties).where(eq(properties.id, id)).catch(() => {});
    }
    // Leave the dev DB usable: point the counter past the real max.
    const max = await maxPropSuffix().catch(() => 0);
    await db
      .update(idCounters)
      .set({ next: max + 2 })
      .where(eq(idCounters.collection, "PROP"))
      .catch(() => {});
  });

  it("hands out an id above the real max even when the counter is behind", async () => {
    const realMax = await maxPropSuffix();

    // Sabotage the counter to sit BELOW the data — the production drift
    // condition. Pre-fix, nextId() returns 2 here and the insert collides on
    // properties_pkey, which is exactly the prod 500.
    await db
      .insert(idCounters)
      .values({ collection: "PROP", next: 2 })
      .onConflictDoUpdate({ target: idCounters.collection, set: { next: 2 } });

    const created = await createProperty(ctx, {
      name: "TM1-125 Drift Regression",
      type: "multi-unit",
      status: "Vacant",
      lat: 0,
      lng: 0,
      buyNumeric: 0,
      totalArea: "0",
      title: "—",
    } as never);

    createdIds.push(created.id);

    const suffix = Number(created.id.split("-")[1]);
    expect(created.id).toMatch(/^PROP-\d{4}$/);
    expect(Number.isFinite(suffix)).toBe(true);
    // The acceptance criterion: strictly above every pre-existing id, so the
    // create cannot have succeeded by luck.
    expect(suffix).toBeGreaterThan(realMax);
  });

  it("leaves the stored counter ahead of the data, so the next allocate is safe", async () => {
    const { rows } = await db.execute<{ next: number }>(
      sql`SELECT next FROM id_counters WHERE collection = 'PROP'`,
    );
    const next = rows[0]?.next ?? 0;
    const max = await maxPropSuffix();

    // After any allocate the counter must be ahead of the data. That is what
    // makes the wedge unable to outlive a single request.
    expect(next).toBeGreaterThan(max);
  });
});
