import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations, users, organizationMemberships } from "@/lib/db/schema";
import { nextId } from "@/lib/services/_mapping";
import type { Ctx } from "@/lib/services/_mapping";

// The ONLY writer of identity tables. Both the webhook handler and requireCtx (JIT) call
// these functions — single upsert code path, webhook is authoritative steady-state. (D-J)

export function normaliseRole(r: string | null | undefined): Ctx["orgRole"] {
  if (r === "org:admin") return "owner";
  if (r === "org:member") return "member";
  if (r === "admin") return "admin";
  if (r === "viewer") return "viewer";
  // Clerk custom roles conventionally use the "org:" prefix (e.g. "org:viewer").
  // Handle both naming styles so the dashboard role key and the app role name
  // can differ without breaking normalisation.
  if (r === "org:viewer") return "viewer";
  return "member"; // unknown → member, never throw (D-I)
}

export async function upsertOrg(data: { id: string; name: string; slug?: string | null }): Promise<void> {
  await db.insert(organizations)
    .values({ id: await nextId("ORG"), clerkOrgId: data.id, name: data.name, slug: data.slug ?? null })
    .onConflictDoUpdate({
      target: organizations.clerkOrgId,
      set: { name: data.name, slug: data.slug ?? null, updatedAt: new Date() },
    });
}

export async function upsertUser(data: {
  id: string;           // Clerk user_… id
  primaryEmail: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  // Optional: only honoured on first INSERT. Once set (true or false), subsequent
  // upserts leave is_manager alone so the user can toggle it from Settings without
  // it being overwritten by a later webhook replay.
  isManager?: boolean;
}): Promise<void> {
  await db.insert(users)
    .values({
      id: await nextId("USR"),
      clerkUserId: data.id,
      primaryEmail: data.primaryEmail,
      displayName: data.displayName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      isManager: data.isManager ?? false,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      // is_manager is intentionally omitted here — first-write wins (sticky).
      // The user's Settings toggle or a deliberate admin change are the only
      // things that should flip it after the account is created.
      set: {
        primaryEmail: data.primaryEmail,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        updatedAt: new Date(),
      },
    });
}

/**
 * Updates is_manager for the given Clerk user id.
 *
 * Called ONLY by the setManagerMode server action, which resolves the Clerk
 * user id from auth() — never from untrusted input — so the caller can only
 * update their own row (IDOR protection lives in the action layer).
 *
 * What could go wrong: if the user row doesn't exist yet (missed create event),
 * the update silently no-ops rather than throwing — the flag just stays false,
 * which is the safe default.
 */
export async function setUserIsManager(clerkUserId: string, isManager: boolean): Promise<void> {
  await db.update(users)
    .set({ isManager, updatedAt: new Date() })
    .where(eq(users.clerkUserId, clerkUserId));
}

export async function upsertMembership(data: {
  clerkOrgId: string;
  clerkUserId: string;
  role: string;
}): Promise<void> {
  const orgId = await ourOrgId(data.clerkOrgId);
  const userId = await ourUserId(data.clerkUserId);
  await db.insert(organizationMemberships)
    .values({ id: await nextId("MEM"), orgId, userId, role: normaliseRole(data.role), status: "active" })
    .onConflictDoUpdate({
      target: [organizationMemberships.orgId, organizationMemberships.userId],
      set: { role: normaliseRole(data.role), status: "active", updatedAt: new Date() },
    });
}

export async function removeMembership(data: { clerkOrgId: string; clerkUserId: string }): Promise<void> {
  const orgId = await ourOrgId(data.clerkOrgId);
  const userId = await ourUserId(data.clerkUserId);
  await db.update(organizationMemberships)
    .set({ status: "removed", removedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(organizationMemberships.orgId, orgId), eq(organizationMemberships.userId, userId)));
}

// Clerk deleted the org/user (M2). Never hard-delete the mirror row — domain rows FK to org_id
// and we never delete tenant data. Just mark memberships removed so the mirror reflects lost
// access. No-op if the org/user was never mirrored (missed create → nothing to deactivate).
export async function deactivateOrg(clerkOrgId: string): Promise<void> {
  const [row] = await db.select({ id: organizations.id }).from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId)).limit(1);
  if (!row) return;
  await db.update(organizationMemberships)
    .set({ status: "removed", removedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizationMemberships.orgId, row.id));
}

export async function deactivateUser(clerkUserId: string): Promise<void> {
  const [row] = await db.select({ id: users.id }).from(users)
    .where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!row) return;
  await db.update(organizationMemberships)
    .set({ status: "removed", removedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizationMemberships.userId, row.id));
}

// Resolve Clerk external id → our ORG-*/USR-* id.
// Throw "unauthenticated" (not a leak — C5) if the row doesn't exist.

export async function ourOrgId(clerkOrgId: string): Promise<string> {
  const [row] = await db.select({ id: organizations.id }).from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId)).limit(1);
  if (!row) throw new Error("unauthenticated");
  return row.id;
}

export async function ourUserId(clerkUserId: string): Promise<string> {
  const [row] = await db.select({ id: users.id }).from(users)
    .where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!row) throw new Error("unauthenticated");
  return row.id;
}
