// GOAL (C9): the live schema matches the B1 spec — 34 tables, org_id on every domain
// table, all enum types present, FKs wired. Exits non-zero on any mismatch.
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

const EXPECTED_TABLES = 34;
const EXPECTED_ENUMS = 37;
// 27 domain tables (all carry org_id NOT NULL per C3/D14) — the universal-org_id check.
const DOMAIN_TABLES = [
  "properties", "land_parcels", "property_valuations",
  "tenants", "leases", "payments", "expenses",
  "folders", "documents",
  "inspections", "certifications", "safety_risks", "emergency_contacts", "maintenance_items",
  "co_owners", "ownership_records", "ownership_documents", "ownership_history",
  "successors", "successor_property_assignments", "estate_activity_events",
  "professionals", "user_profiles",
  "notifications", "notification_preferences",
  "ai_sessions", "ai_messages",
];

const fails: string[] = [];
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "✓" : "✗"} ${label} — ${detail}`);
  if (!ok) fails.push(label);
}

async function main() {
  const tables = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const names = new Set(tables.rows.map((r) => r.table_name as string));
  // __drizzle_migrations lives in the drizzle schema, so it won't be counted here.
  check("table count", tables.rows.length === EXPECTED_TABLES, `${tables.rows.length} (want ${EXPECTED_TABLES})`);

  const missing = DOMAIN_TABLES.filter((t) => !names.has(t));
  check("domain tables present", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : "all 27");

  const orgCols = await db.execute(sql`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'org_id' AND is_nullable = 'NO'
  `);
  const orgTables = new Set(orgCols.rows.map((r) => r.table_name as string));
  const noOrg = DOMAIN_TABLES.filter((t) => !orgTables.has(t));
  check("org_id NOT NULL on all domain tables", noOrg.length === 0, noOrg.length ? `missing: ${noOrg.join(", ")}` : "27/27");

  const enums = await db.execute(sql`
    SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  `);
  check("enum types", enums.rows.length >= EXPECTED_ENUMS, `${enums.rows.length} (want >= ${EXPECTED_ENUMS})`);

  const fks = await db.execute(sql`
    SELECT count(*)::int AS n FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
  `);
  const fkCount = fks.rows[0]?.n as number;
  check("foreign keys", fkCount >= 50, `${fkCount} FKs`);

  const pgcrypto = await db.execute(sql`SELECT 1 AS ok FROM pg_extension WHERE extname = 'pgcrypto'`);
  check("pgcrypto extension", pgcrypto.rows.length === 1, pgcrypto.rows.length ? "enabled" : "MISSING");

  if (fails.length) {
    console.error(`\nFAILED: ${fails.join(", ")}`);
    process.exit(1);
  }
  console.log("\nschema-assert PASS");
  process.exit(0);
}

void main();
