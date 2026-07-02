// Phase 4 one-off: reconcile real-user FS client records into Drizzle before
// retiring the dual-write. Decisions (2026-07-02, approved):
//   - FS-only records are IMPORTED (non-destructive; delete via UI later if unwanted)
//   - Field drift: DB wins (FS records were never updated after creation)
//   - New columns (phone, preferred_contact, client_since, management_fee_pct) are
//     backfilled from FS ONLY where the DB value is NULL — never overwrites DB data.
//
// Idempotent: inserts use ON CONFLICT DO NOTHING, backfills only fill NULLs.
// Seed dirs (demo-user) are skipped — they are seed:neon input, not app data.
//
// Usage: npx tsx --conditions=react-server --env-file=.env.local scripts/reconcile-clients-once.ts

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clients, organizations } from "@/lib/db/schema";

type FsClient = {
  id: string;
  userId: string;
  name: string;
  clientType: string;
  orgId?: string | null;
  initials: string;
  avatarBg: string;
  email?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
  clientSince?: number | null;
  managementFeePct?: number | null;
  status?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
};

const SEED_USER_DIRS = new Set(["demo-user"]);
const USERS_ROOT = join(process.cwd(), "public", "data", "users");

// Read every real-user (non-seed) FS client record.
function loadRealFsClients(): FsClient[] {
  const result: FsClient[] = [];
  for (const userDir of readdirSync(USERS_ROOT)) {
    if (SEED_USER_DIRS.has(userDir)) continue;
    const clientsDir = join(USERS_ROOT, userDir, "clients");
    if (!existsSync(clientsDir)) continue;
    for (const clientId of readdirSync(clientsDir)) {
      const corePath = join(clientsDir, clientId, "core.json");
      if (!existsSync(corePath)) continue;
      result.push(JSON.parse(readFileSync(corePath, "utf8")) as FsClient);
    }
  }
  return result;
}

// Convert an FS millisecond timestamp to a Date, or null when absent.
function msToDate(ms: number | null | undefined): Date | null {
  return ms == null ? null : new Date(ms);
}

async function main() {
  const fsClients = loadRealFsClients();
  console.log(`Found ${fsClients.length} real-user FS client record(s).`);

  // Preload the org ids we might reference, to check FKs before inserting.
  const orgIds = [...new Set(fsClients.map((c) => c.orgId).filter((v): v is string => !!v))];
  const orgRows = orgIds.length
    ? await db.select({ id: organizations.id }).from(organizations).where(inArray(organizations.id, orgIds))
    : [];
  const knownOrgs = new Set(orgRows.map((r) => r.id));

  for (const fs of fsClients) {
    const existing = await db.select().from(clients).where(eq(clients.id, fs.id));

    if (existing.length === 0) {
      // FS-only record → import. Guard the org FK: import without orgId if the org is unknown.
      const orgId = fs.orgId && knownOrgs.has(fs.orgId) ? fs.orgId : null;
      if (fs.orgId && !orgId) {
        console.log(`  ⚠ ${fs.id}: org ${fs.orgId} not in DB — importing without orgId`);
      }
      await db
        .insert(clients)
        .values({
          id: fs.id,
          managerUserId: fs.userId,
          orgId,
          name: fs.name,
          email: fs.email ?? null,
          clientType: fs.clientType === "Corporate" ? "Corporate" : "Individual",
          status: (fs.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active",
          initials: fs.initials,
          avatarBg: fs.avatarBg,
          phone: fs.phone ?? null,
          preferredContact: fs.preferredContact ?? null,
          clientSince: msToDate(fs.clientSince),
          managementFeePct: fs.managementFeePct ?? null,
          createdAt: msToDate(fs.createdAt) ?? undefined,
          updatedAt: msToDate(fs.updatedAt) ?? undefined,
        })
        .onConflictDoNothing();
      console.log(`  ✓ Imported ${fs.id} ("${fs.name}")`);
      continue;
    }

    // Row exists → backfill ONLY the new columns, and only where DB is NULL.
    const row = existing[0];
    const patch: Partial<typeof clients.$inferInsert> = {};
    if (row.phone == null && fs.phone != null) patch.phone = fs.phone;
    if (row.preferredContact == null && fs.preferredContact != null) patch.preferredContact = fs.preferredContact;
    if (row.clientSince == null && fs.clientSince != null) patch.clientSince = msToDate(fs.clientSince);
    if (row.managementFeePct == null && fs.managementFeePct != null) patch.managementFeePct = fs.managementFeePct;

    if (Object.keys(patch).length > 0) {
      await db.update(clients).set(patch).where(eq(clients.id, fs.id));
      console.log(`  ✓ Backfilled ${fs.id}: ${Object.keys(patch).join(", ")}`);
    } else {
      console.log(`  — ${fs.id}: nothing to backfill`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Reconcile failed:", err);
  process.exit(1);
});
