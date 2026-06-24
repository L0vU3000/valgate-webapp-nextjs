import "server-only"; // C1: never bundle DB access (or the Clerk secret key) into a client component
import { randomInt } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  users,
  organizations,
  organizationMemberships,
  accessRequests,
  properties,
  notifications,
} from "@/lib/db/schema";
import { nextId, assertCanMutate } from "@/lib/services/_mapping";
import type { Ctx } from "@/lib/services/_mapping";
import { roleAtLeast } from "@/lib/services/_mapping";
import { upsertMembership } from "@/lib/services/identity-sync";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Pro-2.x manager ⇄ owner access. CROSS-ORG by design: a manager (a user) targets
// an owner organisation they are not yet a member of, so these queries are keyed on
// manager_user_id + owner_org_id — NOT the org-scoped _crud helpers (which only ever
// touch ctx.orgId). The one architectural rule that shapes this file:
//
//   A "grant" is a real CLERK organization membership, not just a Neon row.
//   approveAccessRequest() calls clerkClient().organizations.createOrganizationMembership
//   so the manager can setActive() into the org; we ALSO mirror it into Neon
//   immediately (don't wait for the webhook) so listManagedAccounts() is instant.
//   This is the only place in the app that writes to Clerk.
//
// Permission mapping (locked, plan §2):
//   requested "view" → Clerk role "org:viewer" → Neon mirror role "viewer"
//   requested "full" → Clerk role "org:admin"  → Neon mirror role "owner"
//     (the built-in Clerk admin role; normaliseRole() collapses org:admin → owner.
//      Capability-wise owner ⊇ admin, so a "full" manager can fully mutate the org.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An error whose message is SAFE to show the end user (e.g. "No account matches
 * that invite code."). The action layer surfaces `AccessError.message` directly and
 * turns every *other* thrown error into a generic string — so an unexpected DB error
 * never leaks its details to the client (security rule C5).
 */
export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}

// Maps a requested access level to the Clerk role string we grant.
function clerkRoleForLevel(level: "view" | "full"): "org:viewer" | "org:admin" {
  return level === "full" ? "org:admin" : "org:viewer";
}

// A human label for an access level, for notification copy.
function levelLabel(level: "view" | "full"): string {
  return level === "full" ? "full" : "view";
}

/**
 * Writes ONE in-app notification row (category "ACCESS").
 *
 * This is cross-org by nature — the recipient's org (e.g. the owner org) is usually
 * NOT ctx.orgId — so we insert directly rather than through the org-scoped
 * createNotification (which would force orgId = ctx.orgId). The notifications panel
 * filters by org_id, so a row is visible to a user once that org is their active org.
 *
 * Callers MUST wrap this in try/catch: a notification is a side effect, never a
 * reason to fail (or roll back) the access flow that triggered it.
 */
async function insertAccessNotification(input: {
  orgId: string;
  userId: string;
  title: string;
  description: string;
  linkTo: string;
}): Promise<void> {
  const id = await nextId("NOTIF");
  await db.insert(notifications).values({
    id,
    orgId: input.orgId,
    userId: input.userId,
    category: "ACCESS",
    title: input.title,
    description: input.description,
    read: false,
    linkTo: input.linkTo,
  });
}

/**
 * Returns true when the signed-in user is flagged as a portfolio Manager.
 *
 * Reads users.is_manager for ctx.userId (the internal USR-id resolved by
 * requireCtx). Owners default to false, so existing accounts are unaffected.
 *
 * What could go wrong: if the user row is somehow missing we return false
 * (safe default — treat as a normal owner) rather than throwing, so a missing
 * mirror row never hard-errors a page load.
 */
export async function getIsManager(ctx: Ctx): Promise<boolean> {
  const [row] = await db
    .select({ isManager: users.isManager })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);

  return row?.isManager ?? false;
}

// Throws "forbidden" unless the caller is a Manager. Mirrors requireRole's contract
// (throw a generic string the action layer turns into a safe message).
async function requireManager(ctx: Ctx): Promise<void> {
  const isManager = await getIsManager(ctx);
  if (!isManager) throw new Error("forbidden");
}

// ─── Manager side ────────────────────────────────────────────────────────────

// One managed-account row for the manager's dashboard rollup.
export type ManagedAccount = {
  orgId: string;
  clerkOrgId: string;
  name: string;
  role: "viewer" | "owner" | "admin" | "member"; // Neon mirror role on the grant
  level: "view" | "full"; // what the manager originally requested
  lastActivityAt: Date | null;
  propertyCount: number;
};

// One of the manager's own access requests (pending or decided), for the
// "Add account" screen's status list.
export type MyAccessRequest = {
  id: string;
  ownerOrgId: string;
  ownerOrgName: string;
  requestedLevel: "view" | "full";
  status: "pending" | "approved" | "denied";
  createdAt: Date;
  decidedAt: Date | null;
};

/**
 * Manager requests access to an owner organisation by its invite code.
 *
 * Flow: resolve the org by invite_code → reject if the code is unknown, if it is
 * an org the manager already belongs to, or if a request already exists for this
 * (owner, manager) pair → allocate an ARQ id → insert a pending access_requests row.
 *
 * The unique index uq_access_req_owner_manager (owner_org_id, manager_user_id) is
 * the backstop: only one request per pair ever exists, so a duplicate insert is
 * caught and surfaced as a generic "already requested" error.
 *
 * In-app notification: every active owner/admin of the target org gets an "ACCESS"
 * notification (best-effort — it never fails the request). They also see the request
 * in their pending inbox (Settings → Managers).
 *
 * What could go wrong: a bad/unknown code → "No account matches that invite code.";
 * requesting your own (or an already-granted) org → "You already have access to
 * that account."; a second request → "You've already requested access to that
 * account." Every failure is a thrown Error with a safe message; nothing leaks.
 */
export async function requestAccess(
  ctx: Ctx,
  inviteCode: string,
  level: "view" | "full",
): Promise<{ requestId: string }> {
  assertCanMutate(); // D9 — refuse writes in DEMO_MODE
  await requireManager(ctx);

  // Discovery is code-based: find the owner org whose invite_code matches.
  const trimmedCode = inviteCode.trim();
  const [ownerOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.inviteCode, trimmedCode))
    .limit(1);

  if (!ownerOrg) {
    throw new AccessError("No account matches that invite code.");
  }

  // Reject if the manager already has an active membership in that org (this also
  // covers "your own home org", where the manager is owner/admin).
  const [existingMembership] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, ownerOrg.id),
        eq(organizationMemberships.userId, ctx.userId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (existingMembership) {
    throw new AccessError("You already have access to that account.");
  }

  // Reject if a request already exists for this (owner, manager) pair — the unique
  // index allows only one, regardless of its current status.
  const [existingRequest] = await db
    .select({ id: accessRequests.id, status: accessRequests.status })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.ownerOrgId, ownerOrg.id),
        eq(accessRequests.managerUserId, ctx.userId),
      ),
    )
    .limit(1);

  if (existingRequest) {
    throw new AccessError("You've already requested access to that account.");
  }

  // Allocate the prefixed id and insert the pending request.
  const requestId = await nextId("ARQ");
  try {
    await db.insert(accessRequests).values({
      id: requestId,
      managerUserId: ctx.userId,
      ownerOrgId: ownerOrg.id,
      requestedLevel: level,
      status: "pending",
      inviteCode: trimmedCode,
    });
  } catch (err) {
    // Backstop: a race could slip past the pre-check and hit the unique index.
    logger.error("requestAccess: insert failed", { error: String(err) });
    throw new AccessError("You've already requested access to that account.");
  }

  // Notify the owner org's admins. Best-effort: a notification failure must never
  // fail the request the manager just successfully made.
  try {
    const [manager] = await db
      .select({ name: users.displayName, email: users.primaryEmail })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    const managerLabel = manager?.name ?? manager?.email ?? "A manager";

    const admins = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.orgId, ownerOrg.id),
          eq(organizationMemberships.status, "active"),
          inArray(organizationMemberships.role, ["owner", "admin"]),
        ),
      );

    for (const admin of admins) {
      await insertAccessNotification({
        orgId: ownerOrg.id,
        userId: admin.userId,
        title: "New access request",
        description: `${managerLabel} requested ${levelLabel(level)} access to your account.`,
        linkTo: "/settings",
      });
    }
  } catch (err) {
    logger.error("requestAccess: notification failed", { error: String(err) });
  }

  return { requestId };
}

/**
 * Lists the owner accounts a manager has been granted access to.
 *
 * Source of truth for "granted" = an approved access_requests row joined to the
 * manager's still-active membership in that owner org. Keying on the approved
 * request (not just the membership) excludes the manager's own home org, which has
 * no access_request, and gives us the originally requested level for the badge.
 *
 * Property counts are fetched in a single grouped query over the granted orgs
 * (no per-row N+1, no heavy aggregation — plan §3).
 *
 * What could go wrong: nothing destructive — read-only. A manager with no grants
 * gets an empty array.
 */
export async function listManagedAccounts(ctx: Ctx): Promise<ManagedAccount[]> {
  // Soft guard: a non-manager (e.g. an owner) simply has no managed accounts, so we
  // return an empty list rather than throwing — keeps mixed-context pages robust.
  if (!(await getIsManager(ctx))) return [];

  const rows = await db
    .select({
      orgId: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
      role: organizationMemberships.role,
      level: accessRequests.requestedLevel,
      lastActivityAt: organizationMemberships.updatedAt,
    })
    .from(accessRequests)
    .innerJoin(organizations, eq(organizations.id, accessRequests.ownerOrgId))
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.orgId, accessRequests.ownerOrgId),
        eq(organizationMemberships.userId, accessRequests.managerUserId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .where(
      and(
        eq(accessRequests.managerUserId, ctx.userId),
        eq(accessRequests.status, "approved"),
      ),
    )
    .orderBy(desc(organizationMemberships.updatedAt));

  if (rows.length === 0) return [];

  // One grouped count over all granted orgs — avoids an N+1 per account.
  const orgIds = rows.map((r) => r.orgId);
  const counts = await db
    .select({
      orgId: properties.orgId,
      count: sql<number>`count(*)::int`,
    })
    .from(properties)
    .where(inArray(properties.orgId, orgIds))
    .groupBy(properties.orgId);

  const countByOrg = new Map(counts.map((c) => [c.orgId, c.count]));

  return rows.map((r) => ({
    orgId: r.orgId,
    clerkOrgId: r.clerkOrgId,
    name: r.name,
    role: r.role,
    level: r.level,
    lastActivityAt: r.lastActivityAt,
    propertyCount: countByOrg.get(r.orgId) ?? 0,
  }));
}

/**
 * Lists the manager's own access requests (pending + decided), newest first,
 * with the target owner org's display name — drives the "Add account" status list.
 *
 * Read-only; a manager who has never requested anything gets an empty array.
 */
export async function listMyAccessRequests(ctx: Ctx): Promise<MyAccessRequest[]> {
  // Soft guard (see listManagedAccounts): a non-manager has no requests.
  if (!(await getIsManager(ctx))) return [];

  const rows = await db
    .select({
      id: accessRequests.id,
      ownerOrgId: accessRequests.ownerOrgId,
      ownerOrgName: organizations.name,
      requestedLevel: accessRequests.requestedLevel,
      status: accessRequests.status,
      createdAt: accessRequests.createdAt,
      decidedAt: accessRequests.decidedAt,
    })
    .from(accessRequests)
    .innerJoin(organizations, eq(organizations.id, accessRequests.ownerOrgId))
    .where(eq(accessRequests.managerUserId, ctx.userId))
    .orderBy(desc(accessRequests.createdAt));

  return rows;
}

// ─── Owner side ──────────────────────────────────────────────────────────────

// One pending request in the owner's inbox.
export type PendingRequest = {
  id: string;
  managerUserId: string;
  managerName: string;
  managerEmail: string;
  requestedLevel: "view" | "full";
  createdAt: Date;
};

// One manager that currently has access to the owner org.
export type GrantedManager = {
  userId: string;
  name: string;
  email: string;
  role: "viewer" | "owner" | "admin" | "member"; // Neon mirror role on the grant
  level: "view" | "full"; // what they originally requested
  grantedAt: Date | null;
};

// Throws "forbidden" unless the caller can administer the org. Owners are stored as
// "owner"; admins as "admin" — both clear the admin rank, members/viewers do not.
function requireOwnerAdmin(ctx: Ctx): void {
  if (!roleAtLeast(ctx.orgRole, "admin")) throw new Error("forbidden");
}

// Unambiguous invite-code alphabet: no 0/O, 1/I/L — easy to read aloud and type.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;

// Generates a random 8-char invite code from the unambiguous alphabet.
// ponytail: no uniqueness index on organizations.invite_code — collision odds for an
// 8-char code over a 30-glyph alphabet are ~1 in 6.5e11, negligible for this POC.
// Add a unique index + retry loop if invite codes ever become high-volume.
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Returns the owner org's current invite code without generating one if absent.
 *
 * Safe to call during render — no writes, no assertCanMutate. Returns null when
 * the owner has not yet generated a code. Used by the Settings page to display
 * the current code; code generation is deferred to an explicit action.
 */
export async function getInviteCode(ctx: Ctx): Promise<string | null> {
  requireOwnerAdmin(ctx);

  const [org] = await db
    .select({ inviteCode: organizations.inviteCode })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);

  return org?.inviteCode ?? null;
}

/**
 * Returns the owner org's invite code, generating + persisting one on first use.
 *
 * The code is reusable and stable — a manager presents it via requestAccess. One
 * code per org (decision §11.4); regenerateInviteCode invalidates it.
 *
 * What could go wrong: a non-admin caller → "forbidden" (defence-in-depth on top
 * of the action-layer requireCtx). A missing org row → "unauthenticated" from the
 * resolver; never leaks details.
 */
export async function getOrCreateInviteCode(ctx: Ctx): Promise<string> {
  requireOwnerAdmin(ctx);
  assertCanMutate(); // D9 — refuse writes in DEMO_MODE (this can persist a new code)

  const [org] = await db
    .select({ inviteCode: organizations.inviteCode })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);

  if (org?.inviteCode) return org.inviteCode;

  const code = generateInviteCode();
  await db
    .update(organizations)
    .set({ inviteCode: code, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.orgId));

  return code;
}

/**
 * Replaces the owner org's invite code with a fresh one, invalidating the old code.
 *
 * Existing grants are untouched (they are memberships, not codes); only future
 * discovery uses the new code.
 */
export async function regenerateInviteCode(ctx: Ctx): Promise<string> {
  requireOwnerAdmin(ctx);
  assertCanMutate(); // D9 — refuse writes in DEMO_MODE

  const code = generateInviteCode();
  await db
    .update(organizations)
    .set({ inviteCode: code, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.orgId));

  return code;
}

/**
 * Lists the pending access requests for the owner's org, joined to the requesting
 * manager's display name + email — drives the approve/deny inbox.
 *
 * Scoped to ctx.orgId (the owner can only see requests for their own org).
 * Read-only; an owner with no pending requests gets an empty array.
 */
export async function listAccessRequestsForOwner(ctx: Ctx): Promise<PendingRequest[]> {
  requireOwnerAdmin(ctx);

  const rows = await db
    .select({
      id: accessRequests.id,
      managerUserId: accessRequests.managerUserId,
      managerName: users.displayName,
      managerEmail: users.primaryEmail,
      requestedLevel: accessRequests.requestedLevel,
      createdAt: accessRequests.createdAt,
    })
    .from(accessRequests)
    .innerJoin(users, eq(users.id, accessRequests.managerUserId))
    .where(
      and(
        eq(accessRequests.ownerOrgId, ctx.orgId),
        eq(accessRequests.status, "pending"),
      ),
    )
    .orderBy(desc(accessRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    managerUserId: r.managerUserId,
    managerName: r.managerName ?? r.managerEmail, // fall back to email if no display name
    managerEmail: r.managerEmail,
    requestedLevel: r.requestedLevel,
    createdAt: r.createdAt,
  }));
}

/**
 * Lists the managers that currently have access to the owner's org — the approved
 * requests joined to a still-active membership, plus the manager's name/email and
 * the level they were granted at. Drives the "Managers with access" table.
 *
 * Scoped to ctx.orgId. Read-only; an empty array when no managers have access.
 */
export async function listManagersForOwner(ctx: Ctx): Promise<GrantedManager[]> {
  requireOwnerAdmin(ctx);

  const rows = await db
    .select({
      userId: users.id,
      name: users.displayName,
      email: users.primaryEmail,
      role: organizationMemberships.role,
      level: accessRequests.requestedLevel,
      grantedAt: accessRequests.decidedAt,
    })
    .from(accessRequests)
    .innerJoin(users, eq(users.id, accessRequests.managerUserId))
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.orgId, accessRequests.ownerOrgId),
        eq(organizationMemberships.userId, accessRequests.managerUserId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .where(
      and(
        eq(accessRequests.ownerOrgId, ctx.orgId),
        eq(accessRequests.status, "approved"),
      ),
    )
    .orderBy(desc(accessRequests.decidedAt));

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name ?? r.email,
    email: r.email,
    role: r.role,
    level: r.level,
    grantedAt: r.grantedAt,
  }));
}

/**
 * Approves a pending access request and creates the real grant.
 *
 * The grant is a CLERK organization membership (so the manager can setActive() into
 * the org). We then mirror it into Neon immediately via upsertMembership (don't wait
 * for the organizationMembership.created webhook — the webhook is the authoritative
 * steady-state writer, but mirroring now makes listManagedAccounts instant and is
 * idempotent with the webhook's later upsert). Finally we flip the request to
 * approved and stamp who/when.
 *
 * Ownership is enforced: the request must belong to ctx.orgId and still be pending.
 *
 * What could go wrong:
 *  - request not found / wrong org / already decided → "Request not found." (no leak).
 *  - Clerk already has the membership (a retry after a half-finished approve) →
 *    treated as success: we skip the create, still mirror + flip the status.
 *  - any other Clerk failure → "Could not approve this request." and nothing is
 *    committed (we create the Clerk membership BEFORE writing Neon, so a Clerk
 *    failure leaves the request pending and retryable).
 *
 * ponytail: the two Neon writes (mirror + status flip) are not wrapped in a single
 * db.transaction because upsertMembership owns its own statement; on a partial
 * failure the approve is safely retryable (the membership upsert is idempotent and
 * the status flip is a no-op once approved). Wrap both in a tx if approve ever needs
 * to be strictly atomic.
 */
export async function approveAccessRequest(ctx: Ctx, requestId: string): Promise<void> {
  requireOwnerAdmin(ctx);
  assertCanMutate(); // D9 — refuse writes in DEMO_MODE

  // Load the request and verify it belongs to this org and is still pending.
  const [request] = await db
    .select({
      id: accessRequests.id,
      managerUserId: accessRequests.managerUserId,
      ownerOrgId: accessRequests.ownerOrgId,
      requestedLevel: accessRequests.requestedLevel,
      status: accessRequests.status,
    })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.id, requestId),
        eq(accessRequests.ownerOrgId, ctx.orgId),
        eq(accessRequests.status, "pending"),
      ),
    )
    .limit(1);

  if (!request) {
    throw new AccessError("Request not found.");
  }

  // Resolve the Clerk external ids we need for createOrganizationMembership.
  const [ownerOrg] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, request.ownerOrgId))
    .limit(1);
  const [manager] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, request.managerUserId))
    .limit(1);

  if (!ownerOrg || !manager) {
    logger.error("approveAccessRequest: missing org/user mirror row", { requestId });
    throw new AccessError("Could not approve this request.");
  }

  const clerkRole = clerkRoleForLevel(request.requestedLevel);

  // 1. Create the real Clerk membership — THE grant. This is what lets the manager
  //    setActive() into the owner org. Writing only the Neon mirror would be a bug.
  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationMembership({
      organizationId: ownerOrg.clerkOrgId,
      userId: manager.clerkUserId,
      role: clerkRole,
    });
  } catch (err) {
    // A membership that already exists (retry after a partial approve) is fine —
    // fall through to mirror + status flip. Anything else is a real failure.
    const alreadyMember =
      err instanceof Error && /already a member|already exists/i.test(err.message);
    if (!alreadyMember) {
      logger.error("approveAccessRequest: clerk createOrganizationMembership failed", {
        error: String(err),
      });
      throw new AccessError("Could not approve this request.");
    }
  }

  // 2. Mirror the membership into Neon now (idempotent with the webhook).
  await upsertMembership({
    clerkOrgId: ownerOrg.clerkOrgId,
    clerkUserId: manager.clerkUserId,
    role: clerkRole,
  });

  // 3. Flip the request to approved and stamp who/when.
  await db
    .update(accessRequests)
    .set({
      status: "approved",
      decidedByUserId: ctx.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accessRequests.id, request.id));

  // 4. Notify the manager. Scoped to the owner org — the manager now has a membership
  // there, so it surfaces when they switch into the account. Best-effort.
  try {
    const [ownerOrgRow] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, request.ownerOrgId))
      .limit(1);
    await insertAccessNotification({
      orgId: request.ownerOrgId,
      userId: request.managerUserId,
      title: "Access approved",
      description: `You now have ${levelLabel(request.requestedLevel)} access to ${
        ownerOrgRow?.name ?? "the account"
      }.`,
      linkTo: "/",
    });
  } catch (err) {
    logger.error("approveAccessRequest: notification failed", { error: String(err) });
  }
}

/**
 * Denies a pending access request. No membership is created — the request is simply
 * stamped denied with who/when. Ownership is enforced exactly as in approve.
 *
 * In-app notification: NO notifications row is written for a denial. The notifications
 * panel is org-scoped, and a denied manager has no membership in the owner org, so an
 * owner-org notification would be undeliverable to them. The manager instead sees the
 * "denied" status in their "Add account" request list (listMyAccessRequests).
 *
 * What could go wrong: request not found / wrong org / already decided →
 * "Request not found." (no leak).
 */
export async function denyAccessRequest(ctx: Ctx, requestId: string): Promise<void> {
  requireOwnerAdmin(ctx);
  assertCanMutate(); // D9 — refuse writes in DEMO_MODE

  const result = await db
    .update(accessRequests)
    .set({
      status: "denied",
      decidedByUserId: ctx.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accessRequests.id, requestId),
        eq(accessRequests.ownerOrgId, ctx.orgId),
        eq(accessRequests.status, "pending"),
      ),
    )
    .returning({ id: accessRequests.id });

  // A 0-row update means the request didn't exist, wasn't ours, or was already decided.
  if (result.length === 0) {
    throw new AccessError("Request not found.");
  }
}
