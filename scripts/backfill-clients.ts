// One-off script: create Drizzle clients rows for every portfolio org that predates
// the clients table. Self-contained — only imports DB + schema (no Clerk/Next.js chain).
// Safe to re-run — inserts use ON CONFLICT DO NOTHING.
//
// Usage: npm run backfill:clients

import { db } from "@/lib/db/client";
import { clientHandoffs, clients, idCounters, organizations, properties } from "@/lib/db/schema";
import { and, eq, inArray, sql, not, isNull } from "drizzle-orm";

// Mirrors lib/services/_mapping.ts nextId — same atomic counter, same id format.
async function nextId(collection: string): Promise<string> {
  const { rows } = await db.execute<{ next: number }>(
    sql`INSERT INTO id_counters (collection, next) VALUES (${collection}, 2)
        ON CONFLICT (collection) DO UPDATE SET next = id_counters.next + 1
        RETURNING next`,
  );
  const next = (rows[0] as { next: number } | undefined)?.next;
  if (next == null) throw new Error(`nextId: unknown collection "${collection}"`);
  return `${collection}-${String(next - 1).padStart(4, "0")}`;
}

// Mirrors lib/services/client-onboarding.ts
function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-600 text-white", "bg-indigo-600 text-white", "bg-violet-600 text-white",
  "bg-purple-600 text-white", "bg-teal-600 text-white", "bg-emerald-600 text-white",
  "bg-rose-600 text-white", "bg-amber-600 text-white",
];

function nameToAvatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

async function main() {
  // All distinct (manager, org) pairs from handoffs.
  const handoffOrgs = await db
    .selectDistinct({
      managerUserId: clientHandoffs.managerUserId,
      orgId: clientHandoffs.orgId,
    })
    .from(clientHandoffs);

  if (handoffOrgs.length === 0) {
    console.log("No handoff orgs found — nothing to backfill.");
    process.exit(0);
  }

  console.log(`Found ${handoffOrgs.length} (manager, org) pair(s) to check.`);

  // Find which (manager, orgId) pairs already have a clients row.
  const allOrgIds = [...new Set(handoffOrgs.map((r) => r.orgId))];
  const existing = await db
    .select({ managerUserId: clients.managerUserId, orgId: clients.orgId })
    .from(clients)
    .where(and(not(isNull(clients.orgId)), inArray(clients.orgId, allOrgIds)));

  const existingKeys = new Set(existing.map((r) => `${r.managerUserId}::${r.orgId}`));

  const missing = handoffOrgs.filter(
    (r) => !existingKeys.has(`${r.managerUserId}::${r.orgId}`),
  );

  console.log(`${missing.length} pair(s) need a clients row.`);
  if (missing.length === 0) {
    console.log("Already up to date.");
    process.exit(0);
  }

  // Fetch org names in one query.
  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, missing.map((r) => r.orgId)));

  const orgNameById = new Map(orgRows.map((r) => [r.id, r.name]));

  // Fetch primary email per org from first handoff.
  const emailRows = await db
    .select({ orgId: clientHandoffs.orgId, email: clientHandoffs.clientEmail })
    .from(clientHandoffs)
    .where(inArray(clientHandoffs.orgId, missing.map((r) => r.orgId)))
    .orderBy(clientHandoffs.createdAt);

  const emailByOrgId = new Map<string, string | null>();
  for (const r of emailRows) {
    if (!emailByOrgId.has(r.orgId)) emailByOrgId.set(r.orgId, r.email);
  }

  let inserted = 0;
  let skipped = 0;

  for (const { managerUserId, orgId } of missing) {
    const name = orgNameById.get(orgId) ?? orgId;
    const email = emailByOrgId.get(orgId) ?? null;
    const clientId = await nextId("CLI");

    const result = await db
      .insert(clients)
      .values({
        id: clientId,
        managerUserId,
        orgId,
        name,
        email,
        clientType: "Individual",
        initials: nameToInitials(name),
        avatarBg: nameToAvatarBg(name),
      })
      .onConflictDoNothing()
      .returning({ id: clients.id });

    if (result.length > 0) {
      // Stamp clientId on any properties in this org that lack one.
      await db
        .update(properties)
        .set({ clientId: result[0].id, updatedAt: new Date() })
        .where(and(eq(properties.orgId, orgId), isNull(properties.clientId)));

      console.log(`  ✓ Created ${result[0].id} for org ${orgId} (manager ${managerUserId})`);
      inserted++;
    } else {
      console.log(`  — Skipped org ${orgId} (conflict — already exists)`);
      skipped++;
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
