import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import {
  findIdCounterDrift,
  rememberMaxSuffix,
  nextCounterValue,
} from "@/lib/db/id-counters-guard";

// scripts/check-id-counters.ts — catch id_counter drift BEFORE it breaks writes.
//
// TM1-74 fixed the seed path (assertIdCountersAheadOfSuffixes in seed-neon.ts) but
// nothing checked the live database. On 2026-09-23 production had PROP.next=30 while
// the highest row was PROP-0038, so nextId() returned PROP-0029 and EVERY property
// create died on properties_pkey (23505) and surfaced as a generic 500. The seed
// guard never runs against prod, so the drift went unnoticed until a create failed.
//
// Read-only. Never repairs. Exit 1 on drift so it can gate a deploy.
//
//   npm run db:check-counters

/** Every table whose `id` holds a PREFIX-NNNN value allocated by nextId(). */
const SCANNED_TABLES = [
  "ai_sessions", "ai_messages", "certifications", "client_handoffs", "clients",
  "co_owners", "documents", "emergency_contacts", "estate_activity_events",
  "expenses", "folders", "inspections", "land_parcels", "leases",
  "maintenance_items", "notifications", "notification_preferences",
  "organization_memberships", "organizations", "ownership_documents",
  "ownership_history", "ownership_records", "payments", "professionals",
  "properties", "property_valuations", "safety_risks", "successors",
  "successor_property_assignments", "tenants", "users",
] as const;

async function main() {
  const maxByPrefix = new Map<string, number>();
  const sourceTable = new Map<string, string>();
  const scanned: string[] = [];

  for (const table of SCANNED_TABLES) {
    let rows: { id: unknown }[];
    try {
      // Only PREFIX-NNNN ids matter; everything else (UUIDs, "demo-user") is ignored
      // by parsePrefixedId inside rememberMaxSuffix.
      const result = await db.execute<{ id: unknown }>(
        sql`SELECT id FROM ${sql.identifier(table)} WHERE id ~ '^[A-Z]+-[0-9]+$'`,
      );
      rows = result.rows ?? [];
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`  ! could not scan ${table}: ${detail}`);
      continue;
    }
    scanned.push(table);
    for (const row of rows) {
      const id = String(row.id);
      // rememberMaxSuffix is silent about which table held the max; track it for the report.
      const before = maxByPrefix.get(id.split("-")[0] ?? "");
      rememberMaxSuffix(maxByPrefix, id);
      const prefix = id.split("-")[0] ?? "";
      if ((maxByPrefix.get(prefix) ?? 0) !== before) sourceTable.set(prefix, table);
    }
  }

  const { rows: counterRows } = await db.execute<{ collection: string; next: number }>(
    sql`SELECT collection, next FROM id_counters`,
  );
  const counterNextByPrefix = new Map<string, number>();
  for (const row of counterRows ?? []) {
    counterNextByPrefix.set(row.collection, Number(row.next));
  }

  const drifts = findIdCounterDrift(maxByPrefix, counterNextByPrefix);

  console.log(`id_counters drift check — ${scanned.length} tables scanned, ${maxByPrefix.size} prefixes in use`);
  for (const prefix of [...maxByPrefix.keys()].sort()) {
    const max = maxByPrefix.get(prefix) ?? 0;
    const next = counterNextByPrefix.get(prefix);
    const flagged = drifts.some((d) => d.prefix === prefix);
    console.log(
      `  ${flagged ? "DRIFT" : "   ok"}  ${prefix.padEnd(6)} next=${String(next ?? "MISSING").padStart(6)}  max=${String(max).padStart(5)}  (${sourceTable.get(prefix) ?? "?"})`,
    );
  }

  if (drifts.length === 0) {
    console.log("\n✓ every counter is strictly ahead of the highest id in use — nextId() cannot collide");
    process.exit(0);
  }

  console.error(`\n✗ ${drifts.length} drifting counter(s). nextId() will return an id that already exists,`);
  console.error("  so the next create on that table fails with a 23505 and surfaces as a 500.\n");
  for (const d of drifts) {
    const wouldAllocate = `${d.prefix}-${String((d.counterNext ?? 1) - 1).padStart(4, "0")}`;
    console.error(`  ${d.message}`);
    console.error(`      → next create would ask for ${wouldAllocate}`);
    console.error(
      `      → fix: UPDATE id_counters SET next = ${nextCounterValue(d.maxSuffix)} WHERE collection = '${d.prefix}';`,
    );
  }
  console.error("\n  (greatest(current, target) if other writers may be active — never move a counter backwards.)");
  process.exit(1);
}

void main();
