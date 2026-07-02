// Phase 4 pre-flight: compare every filesystem client record (public/data/users/*/clients/*/core.json)
// against the Drizzle clients table. Read-only — makes no changes to either side.
//
// Reports three things:
//   1. FS clients with no Drizzle row (blocks dual-write retirement)
//   2. Field mismatches where both sides have the column
//   3. FS-only fields that have NO Drizzle column yet (phone, preferredContact,
//      clientSince, managementFeePct) — these need schema columns before the FS
//      side can be retired, or the data is lost.
//
// Usage: npm run verify:clients-parity
// Exit code 0 = full parity (safe to retire dual-write), 1 = mismatches found.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db/client";
import { clients } from "@/lib/db/schema";

// Shape of the filesystem client record (core.json).
type FsClient = {
  id: string;
  userId: string;
  name: string;
  clientType: string;
  initials: string;
  avatarBg: string;
  email?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
  clientSince?: number | null;
  managementFeePct?: number | null;
  status?: string | null;
};

// These previously had no DB column; migration 0023 added them, so they are now
// compared field-by-field like everything else (see the diffs block below).

const USERS_ROOT = join(process.cwd(), "public", "data", "users");

// demo-user is the read-only seed corpus — its records are the INPUT to seed:neon,
// not dual-written app data, so "missing in DB" is expected there and only reported
// informationally. Real users (Clerk-mapped FS dirs like USR-0079) must have parity.
const SEED_USER_DIRS = new Set(["demo-user"]);

// Read every FS client record across every user directory.
function loadFsClients(): FsClient[] {
  const result: FsClient[] = [];
  if (!existsSync(USERS_ROOT)) {
    console.error(`FS users root not found: ${USERS_ROOT}`);
    process.exit(1);
  }
  for (const userDir of readdirSync(USERS_ROOT)) {
    const clientsDir = join(USERS_ROOT, userDir, "clients");
    if (!existsSync(clientsDir)) continue;
    for (const clientId of readdirSync(clientsDir)) {
      const corePath = join(clientsDir, clientId, "core.json");
      if (!existsSync(corePath)) continue;
      try {
        const parsed = JSON.parse(readFileSync(corePath, "utf8")) as FsClient;
        result.push(parsed);
      } catch (err) {
        console.error(`  ✗ Unreadable JSON: ${corePath} — ${(err as Error).message}`);
      }
    }
  }
  return result;
}

async function main() {
  const fsClients = loadFsClients();
  console.log(`Found ${fsClients.length} FS client record(s) under ${USERS_ROOT}`);

  const dbRows = await db.select().from(clients);
  console.log(`Found ${dbRows.length} Drizzle clients row(s)\n`);
  const dbById = new Map(dbRows.map((r) => [r.id, r]));

  let missing = 0;
  let mismatched = 0;

  for (const fs of fsClients) {
    const isSeed = SEED_USER_DIRS.has(fs.userId);
    const row = dbById.get(fs.id);

    if (!row) {
      if (isSeed) {
        console.log(`ℹ seed-only (expected): ${fs.id} ("${fs.name}", fs user ${fs.userId})`);
      } else {
        console.log(`✗ MISSING in DB: ${fs.id} ("${fs.name}", fs user ${fs.userId})`);
        missing++;
      }
      continue;
    }

    // A seed record whose id happens to collide with a real DB row is not drift —
    // FS ids are scoped per user dir while DB ids are global. Skip field comparison.
    if (isSeed) {
      console.log(`ℹ seed id collides with DB row (ignored): ${fs.id}`);
      continue;
    }

    // Compare the columns both sides share. Status is case-insensitive because
    // FS uses "Inactive"/"Active" while the DB enum is "inactive"/"active".
    const diffs: string[] = [];
    if (row.name !== fs.name) diffs.push(`name: db="${row.name}" fs="${fs.name}"`);
    if ((row.email ?? null) !== (fs.email ?? null)) diffs.push(`email: db="${row.email}" fs="${fs.email}"`);
    if (row.clientType !== fs.clientType) diffs.push(`clientType: db="${row.clientType}" fs="${fs.clientType}"`);
    if (row.initials !== fs.initials) diffs.push(`initials: db="${row.initials}" fs="${fs.initials}"`);
    if (row.avatarBg !== fs.avatarBg) diffs.push(`avatarBg: db="${row.avatarBg}" fs="${fs.avatarBg}"`);
    // Only compare status when the FS record actually stored one — older FS records
    // have no status field, and that absence is not drift.
    if (fs.status != null && row.status !== fs.status.toLowerCase()) {
      diffs.push(`status: db="${row.status}" fs="${fs.status.toLowerCase()}"`);
    }
    // Columns added by migration 0023 — compare where the FS side holds a value.
    if (fs.phone != null && row.phone !== fs.phone) diffs.push(`phone: db="${row.phone}" fs="${fs.phone}"`);
    if (fs.preferredContact != null && row.preferredContact !== fs.preferredContact) {
      diffs.push(`preferredContact: db="${row.preferredContact}" fs="${fs.preferredContact}"`);
    }
    if (fs.clientSince != null && row.clientSince?.getTime() !== fs.clientSince) {
      diffs.push(`clientSince: db="${row.clientSince?.toISOString()}" fs="${new Date(fs.clientSince).toISOString()}"`);
    }
    if (fs.managementFeePct != null && row.managementFeePct !== fs.managementFeePct) {
      diffs.push(`managementFeePct: db="${row.managementFeePct}" fs="${fs.managementFeePct}"`);
    }

    if (diffs.length > 0) {
      console.log(`✗ MISMATCH ${fs.id}:`);
      for (const d of diffs) console.log(`    ${d}`);
      mismatched++;
    }

  }

  // DB rows with no FS record are fine (DB is the retirement target), but list
  // them so the report shows the full picture.
  const fsRealIds = new Set(fsClients.filter((c) => !SEED_USER_DIRS.has(c.userId)).map((c) => c.id));
  const dbOnly = dbRows.filter((r) => !fsRealIds.has(r.id));
  if (dbOnly.length > 0) {
    console.log(`\nℹ DB-only rows (ok — DB is the target):`);
    for (const r of dbOnly) console.log(`    ${r.id} ("${r.name}", manager ${r.managerUserId})`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`FS records:        ${fsClients.length}`);
  console.log(`Missing in DB:     ${missing}`);
  console.log(`Field mismatches:  ${mismatched}`);

  const ok = missing === 0 && mismatched === 0;
  console.log(ok ? "\n✓ Row/field parity OK" : "\n✗ Parity FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Parity check failed to run:", err);
  process.exit(1);
});
