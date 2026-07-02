import "server-only";
import { and, eq, inArray, notInArray, isNotNull, sql, countDistinct } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientHandoffs, clients, organizations, properties } from "@/lib/db/schema";
import { nextId, type Ctx } from "@/lib/services/_mapping";
import * as clientsDb from "@/lib/data/db/clients";
import { getFsUserId } from "@/lib/data/auth-shim";
import { logger } from "@/lib/logger";

// Cap: a manager cannot have more than this many unconfirmed client portfolios.
// "Unconfirmed" = the client has not accepted yet — this covers drafts (not invited
// at all), pending invites, and bounced invites. Accepted portfolios don't count.
export const MAX_UNCONFIRMED_CLIENTS = 20;

/**
 * Counts this manager's client portfolios that the client hasn't accepted yet.
 *
 * A portfolio becomes "confirmed" only once one of its client_handoffs is accepted.
 * We therefore count the manager's active client portfolios (rows in `clients` that
 * are backed by an org) and subtract the ones whose org already has an accepted
 * handoff. This deliberately includes DRAFT portfolios that have no handoff row at
 * all, so a manager can't create unlimited backing orgs by never inviting anyone.
 *
 * Two small queries (instead of one correlated subquery) keep the intent readable;
 * the row counts here are tiny (capped at MAX_UNCONFIRMED_CLIENTS), so the extra
 * round-trip is negligible.
 */
export async function countUnconfirmedClients(managerUserId: string): Promise<number> {
  // Step 1: find every org this manager has where the client already accepted.
  // These are "confirmed" and must be excluded from the count.
  const acceptedRows = await db
    .select({ orgId: clientHandoffs.orgId })
    .from(clientHandoffs)
    .where(
      and(
        eq(clientHandoffs.managerUserId, managerUserId),
        eq(clientHandoffs.status, "accepted"),
      ),
    );
  const acceptedOrgIds = acceptedRows.map((r) => r.orgId);

  // Step 2: count this manager's active, org-backed client portfolios, excluding the
  // accepted ones. notInArray is only applied when there is something to exclude —
  // an empty list would make the SQL "NOT IN ()" which behaves inconsistently.
  const conditions = [
    eq(clients.managerUserId, managerUserId),
    isNotNull(clients.orgId),
    eq(clients.status, "active"),
  ];
  if (acceptedOrgIds.length > 0) {
    conditions.push(notInArray(clients.orgId, acceptedOrgIds));
  }

  const [row] = await db
    .select({ count: countDistinct(clients.orgId) })
    .from(clients)
    .where(and(...conditions));
  return row?.count ?? 0;
}

// Every portfolio org a manager onboarded a client into (the handoff path).
// The access-request based listManagedAccounts does NOT include these, so the
// owner shell uses this to recognise "manager viewing as client" for onboarded
// portfolios — both for the context banner and the client-view glow.
export async function listManagerClientOrgs(
  ctx: Ctx,
): Promise<Array<{ orgId: string; clerkOrgId: string; name: string }>> {
  return db
    .selectDistinct({
      orgId: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
    })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.managerUserId, ctx.userId));
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

// Derives short initials from a display name (up to 2 chars, uppercase).
// Exported so server actions (e.g. updateClient) reuse the same derivation
// instead of keeping a third copy of it.
export function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

// Deterministic colour slot derived from the portfolio name.
const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-indigo-600 text-white",
  "bg-violet-600 text-white",
  "bg-purple-600 text-white",
  "bg-teal-600 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-600 text-white",
  "bg-amber-600 text-white",
];

export function nameToAvatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Shared dual-write helper ─────────────────────────────────────────────────

/**
 * Creates a Drizzle clients row (canonical) and a best-effort FS mirror record,
 * both sharing the same CLI-xxxx id.
 *
 * Idempotent: if a row already exists for this (managerUserId, orgId) pair
 * (non-null orgId only), the insert is a no-op and the existing id is returned.
 * orgId=null (manual wizard clients) always inserts a new row — no unique constraint applies.
 *
 * Exported so actions.ts can route the manual-wizard create through Neon too.
 */
export async function createClientRecord(
  managerUserId: string,
  orgId: string | null,
  name: string,
  email: string | undefined,
  fsUserId: string,
): Promise<string> {
  const clientId = await nextId("CLI");
  const initials = nameToInitials(name);
  const avatarBg = nameToAvatarBg(name);
  const now = Date.now();

  // Neon insert — canonical. ON CONFLICT on the partial unique index (non-null orgId)
  // is a no-op; returning() gives us the inserted id (empty array = conflict occurred).
  const inserted = await db
    .insert(clients)
    .values({
      id: clientId,
      managerUserId,
      orgId,
      name,
      email: email ?? null,
      clientType: "Individual",
      initials,
      avatarBg,
    })
    .onConflictDoNothing()
    .returning({ id: clients.id });

  // If insert was a no-op (conflict on unique index), fetch the existing row's id.
  let canonicalId = inserted[0]?.id;
  if (canonicalId === undefined && orgId !== null) {
    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.managerUserId, managerUserId), eq(clients.orgId, orgId)))
      .limit(1);
    canonicalId = existing?.id ?? clientId;
  }
  if (canonicalId === undefined) {
    canonicalId = clientId;
  }

  // FS mirror — best-effort only. Neon is the canonical store from here on.
  try {
    await clientsDb.create(
      fsUserId,
      {
        userId: fsUserId,
        name,
        clientType: "Individual",
        initials,
        avatarBg,
        email,
        orgId: orgId ?? undefined,
        clientSince: now,
      },
      canonicalId,
    );
  } catch (err) {
    logger.error("createClientRecord: FS mirror write failed (non-fatal)", { error: String(err) });
  }

  return canonicalId;
}

// ─── Stamp properties in an org with a clientId ───────────────────────────────

export async function stampClientIdOnOrgProperties(orgId: string, clientId: string): Promise<void> {
  await db
    .update(properties)
    .set({ clientId, updatedAt: new Date() })
    .where(and(eq(properties.orgId, orgId), sql`${properties.clientId} IS NULL`));
}

// ─── One-off backfill ─────────────────────────────────────────────────────────

/**
 * Creates a Drizzle clients row + FS client record for every portfolio org that
 * belongs to this manager but doesn't have a linked client yet.
 * Also stamps clientId on properties in those orgs that lack one.
 *
 * Idempotent — safe to call multiple times; existing rows are skipped.
 * Designed to run once from the /pro/clients page on first load after deploy.
 */
export async function backfillClientsForHandoffs(ctx: Ctx): Promise<void> {
  // Find all orgs this manager has handoffs for.
  const handoffOrgs = await db
    .selectDistinct({ orgId: clientHandoffs.orgId, orgName: organizations.name })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.managerUserId, ctx.userId));

  if (handoffOrgs.length === 0) return;

  // Find which orgs already have a Drizzle clients row.
  const existingOrgIds = new Set(
    (
      await db
        .select({ orgId: clients.orgId })
        .from(clients)
        .where(
          and(
            eq(clients.managerUserId, ctx.userId),
            inArray(
              clients.orgId,
              handoffOrgs.map((r) => r.orgId),
            ),
          ),
        )
    )
      .map((r) => r.orgId)
      .filter((id): id is string => id !== null),
  );

  const fsUserId = getFsUserId(ctx.userId);

  for (const { orgId, orgName } of handoffOrgs) {
    if (existingOrgIds.has(orgId)) continue;

    // Get the primary email from the first handoff for this org.
    const [firstHandoff] = await db
      .select({ clientEmail: clientHandoffs.clientEmail })
      .from(clientHandoffs)
      .where(eq(clientHandoffs.orgId, orgId))
      .orderBy(clientHandoffs.createdAt)
      .limit(1);

    try {
      const clientId = await createClientRecord(
        ctx.userId,
        orgId,
        orgName,
        firstHandoff?.clientEmail,
        fsUserId,
      );
      await stampClientIdOnOrgProperties(orgId, clientId);
    } catch (err) {
      // Best-effort: log and continue so one bad org doesn't block the rest.
      logger.error("backfillClientsForHandoffs: failed for org", { orgId, error: String(err) });
    }
  }
}
