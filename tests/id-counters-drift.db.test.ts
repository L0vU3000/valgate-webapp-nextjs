// TM1-74: Regression guard for id_counters drift.
//
// The seed script writes id_counters with the max suffix found across fixture data.
// If the upsert strategy regresses (e.g. onConflictDoNothing instead of greatest()),
// the counter can freeze at an older value while tables accumulate rows with higher
// suffixes. nextId() then returns an already-used id → duplicate-key crash.
//
// This test queries every table with prefixed IDs, extracts the highest suffix per
// prefix, then asserts id_counters.next > max_suffix. It runs as part of `npm run test:db`
// so drift is caught before it causes cryptic pkey violations in other tests.

import { describe, it, expect, vi } from "vitest";

// Mock lib/env before any other imports that might load it.
vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CLERK_SECRET_KEY: "demo-no-clerk",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
  },
}));

import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

// Tables with prefixed IDs (PREFIX-NNNN pattern). This list mirrors what the seed
// script can write; add new prefixed-id tables here as the schema grows.
const TABLES_WITH_PREFIXED_IDS = [
  "organizations",
  "users",
  "organization_memberships",
  "clients",
  "client_handoffs",
  "properties",
  "land_parcels",
  "property_valuations",
  "tenants",
  "leases",
  "payments",
  "expenses",
  "folders",
  "documents",
  "inspections",
  "certifications",
  "safety_risks",
  "emergency_contacts",
  "maintenance_items",
  "co_owners",
  "ownership_records",
  "ownership_documents",
  "ownership_history",
  "successors",
  "successor_property_assignments",
  "estate_activity_events",
  "professionals",
  "user_profiles",
  "notifications",
  "notification_preferences",
  "pillar_verifications",
  "verification_evidence",
  "verification_events",
  "ai_sessions",
  "ai_messages",
  "access_requests",
  "change_requests",
] as const;

type MaxSuffixRow = { prefix: string; max_suffix: number };
type CounterRow = { collection: string; next: number };

describe("id_counters drift guard (TM1-74)", () => {
  it("every id_counters.next > max existing suffix for that prefix", async () => {
    // 1. Gather max suffix per prefix across all prefixed-id tables.
    // The regex extracts PREFIX from "PREFIX-NNNN" and casts NNNN to integer.
    // Tables that don't exist (schema not migrated) are silently skipped.
    const maxByPrefix = new Map<string, number>();

    for (const table of TABLES_WITH_PREFIXED_IDS) {
      try {
        const rows = await db.execute<MaxSuffixRow>(sql.raw(`
          SELECT
            substring(id FROM '^([A-Z]+)-') AS prefix,
            MAX(CAST(substring(id FROM '-([0-9]+)$') AS INTEGER)) AS max_suffix
          FROM "${table}"
          WHERE id ~ '^[A-Z]+-[0-9]+$'
          GROUP BY prefix
        `));

        for (const row of rows.rows) {
          if (row.prefix && row.max_suffix != null) {
            const current = maxByPrefix.get(row.prefix) ?? 0;
            maxByPrefix.set(row.prefix, Math.max(current, row.max_suffix));
          }
        }
      } catch {
        // Table doesn't exist or query failed — skip silently.
        // This handles schema drift where a table in the list hasn't been migrated yet.
      }
    }

    // 2. Read all id_counters rows.
    const countersResult = await db.execute<CounterRow>(
      sql`SELECT collection, next FROM id_counters`
    );
    const counters = new Map<string, number>();
    for (const row of countersResult.rows) {
      counters.set(row.collection, row.next);
    }

    // 3. For every prefix we found in the data, verify the counter is ahead.
    const violations: string[] = [];

    for (const [prefix, maxSuffix] of maxByPrefix) {
      const counterNext = counters.get(prefix);

      if (counterNext === undefined) {
        // Counter doesn't exist at all — nextId() would auto-init at 2, which is
        // fine if max_suffix < 2, but a problem otherwise.
        if (maxSuffix >= 1) {
          violations.push(
            `${prefix}: no counter row, but max suffix is ${maxSuffix} (nextId would start at 1)`
          );
        }
      } else if (counterNext <= maxSuffix) {
        violations.push(
          `${prefix}: counter.next=${counterNext} but max suffix in tables is ${maxSuffix} (would collide)`
        );
      }
    }

    // 4. Fail with a clear message if any prefix is at risk of collision.
    if (violations.length > 0) {
      throw new Error(
        `id_counters drift detected — the following prefixes would collide on nextId():\n` +
          violations.map((v) => `  • ${v}`).join("\n") +
          `\n\nFix: re-run seed with an upsert that uses greatest(current, new), not onConflictDoNothing.`
      );
    }

    // If we reach here, all counters are safely ahead of their max suffixes.
    expect(violations).toHaveLength(0);
  });

  it("id_counters table exists and has at least one row", async () => {
    // Sanity check: if the table is empty, nextId() would auto-init counters, but
    // the drift guard above would pass vacuously. This catches a completely missing
    // seed (the guard itself only catches partial drift).
    const result = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM id_counters`
    );
    const count = Number(result.rows[0]?.count ?? 0);
    expect(count).toBeGreaterThan(0);
  });
});
