#!/usr/bin/env node
/**
 * Run schema apply + SQL tests using embedded Postgres (no Docker/psql required).
 * Used when docker/psql are unavailable; also: npm run db:test:node
 */
import { PostgresMemoryServer } from "postgres-memory-server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCHEMA = path.join(ROOT, "docs/database/prototype/schema.sql");
const TESTS_DIR = path.join(ROOT, "scripts/db/tests");

const TEST_FILES = [
  "00_helpers.sql",
  "verify-catalog.sql",
  "constraints.sql",
  "flows/01_property_lifecycle.sql",
  "flows/02_lease_payment.sql",
  "flows/03_documents.sql",
  "flows/04_estate_successor.sql",
  "flows/05_clerk_membership_seed.sql",
];

async function runRulesTests(db) {
  const rulesDir = path.join(TESTS_DIR, "rules");
  let entries;
  try {
    entries = await readdir(rulesDir);
  } catch {
    return;
  }
  for (const name of entries.filter((f) => f.endsWith(".sql"))) {
    await runFile(db, path.join(rulesDir, name));
  }
}

async function runFile(db, filePath) {
  const label = path.basename(filePath);
  console.log(`\n━━━ ${label} ━━━`);
  await db.runSqlFile(filePath);
}

async function main() {
  console.log("→ Starting embedded PostgreSQL…");
  const db = await PostgresMemoryServer.createPostgres({
    database: "valgate_test",
  });

  try {
    console.log(`→ URI ${db.getUri().replace(/:[^:@]+@/, ":***@")}`);

    console.log("→ Resetting public schema…");
    await db.runSql(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log("→ Applying docs/database/prototype/schema.sql");
    await db.runSqlFile(SCHEMA);

    for (const rel of TEST_FILES) {
      await runFile(db, path.join(TESTS_DIR, rel));
    }

    await runRulesTests(db);

    console.log("\n✓ All database tests passed");
  } finally {
    await db.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
