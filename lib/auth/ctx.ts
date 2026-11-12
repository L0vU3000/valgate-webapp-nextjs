import "server-only"; // C1
import { cache } from "react";
import { demoCtxOrNull } from "@/lib/auth/demo-ctx";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations, organizationMemberships } from "@/lib/db/schema";
import { upsertOrg, upsertUser, upsertMembership, ourOrgId, ourUserId, normaliseRole } from "@/lib/services/identity-sync";
import { isManagerFromAccountType } from "@/lib/auth/account-type";
import type { Ctx } from "@/lib/services/_mapping";


// C2: the ONLY caller of auth(). Every action calls requireCtx(); services take Ctx.

async function resolveCtx(): Promise<Ctx> {
  const demoCtx = demoCtxOrNull();
  if (demoCtx) return demoCtx;

  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    // no null-org path (D14)
    throw new Error("unauthenticated");
  }

  // JIT: ensure mirror rows exist so ourOrgId/ourUserId resolvers find them.
  // Webhook is the authoritative steady-state writer; this bootstraps dev + handles missed events (D-J).
  const [existingUser] = await db.select({ id: users.id }).from(users)
    .where(eq(users.clerkUserId, userId)).limit(1);
  const [existingOrg] = await db.select({ id: organizations.id }).from(organizations)
    .where(eq(organizations.clerkOrgId, orgId)).limit(1);
  if (!existingUser || !existingOrg) {
    const clerkUser = await currentUser();
    await upsertUser({
      id: userId,
      primaryEmail: clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@pending.clerk`,
      displayName: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser?.imageUrl ?? null,
      // Read the accountType set at sign-up through the Zod enum. Missing or
      // unknown values parse as owner (isManager false), never as manager.
      isManager: isManagerFromAccountType(clerkUser?.unsafeMetadata?.accountType),
    });
    // ponytail: org name = Clerk id as placeholder; webhook fills in real name/slug
    await upsertOrg({ id: orgId, name: orgId, slug: null });
    await upsertMembership({ clerkOrgId: orgId, clerkUserId: userId, role: orgRole ?? "org:member" });
  } else {
    // Both mirrors exist but the membership row may not (missed organizationMembership.created):
    // web would work off the Clerk claim while /api/v1 and /mcp, which trust the mirror, 401.
    // Only a MISSING row is backfilled; a removed/suspended row is the webhook's verdict and a
    // stale session token must not resurrect it.
    const [membership] = await db.select({ status: organizationMemberships.status })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, existingUser.id), eq(organizationMemberships.orgId, existingOrg.id)))
      .limit(1);
    if (!membership) {
      await upsertMembership({ clerkOrgId: orgId, clerkUserId: userId, role: orgRole ?? "org:member" });
    }
  }

  return {
    userId: await ourUserId(userId),
    orgId: await ourOrgId(orgId),
    orgRole: normaliseRole(orgRole),
  };
}

// Memoized per server request: Clerk auth() + identity-sync DB checks run once per request instead of 3+; each new request gets a fresh memo (no cross-user leak).
export const requireCtx = cache(resolveCtx);

/**
 * requireCtx for shell layouts. A signed-in session with no active org (removed mid-session,
 * zero memberships, finalize without an org claim) goes to /login/tasks, which picks an org or
 * offers sign-out, instead of the error page whose "Back to home" repeats the failure.
 * Any other error (e.g. DEMO_MODE refused) still rethrows and fails closed.
 */
export async function requireShellCtx(): Promise<Ctx> {
  try {
    return await requireCtx();
  } catch (err) {
    if (isUnauthenticatedError(err)) redirect("/login/tasks");
    throw err;
  }
}

/**
 * True when requireCtx failed because there is no signed-in user (or no active org).
 *
 * JSON route handlers use this to return 401 instead of letting the thrown
 * "unauthenticated" error become a framework 500. Other errors (for example
 * DEMO_MODE refused in production) must NOT match, so they still fail closed.
 */
export function isUnauthenticatedError(err: unknown): boolean {
  return err instanceof Error && err.message === "unauthenticated";
}

/**
 * Session-cookie auth for JSON route handlers.
 *
 * Server Actions can let requireCtx() throw. Route handlers must answer with
 * JSON, so this wrapper catches the unauthenticated case and returns `{ ok: false }`
 * for the handler to turn into a 401. Any other error is rethrown.
 */
export async function resolveRouteCtx(): Promise<{ ok: true; ctx: Ctx } | { ok: false }> {
  try {
    const ctx = await requireCtx();
    return { ok: true, ctx };
  } catch (err) {
    if (isUnauthenticatedError(err)) return { ok: false };
    throw err;
  }
}

// Edge-level role gate (guide §5). Distinct from _crud's service-level requireMember.
const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 } as const;
export function requireRole(ctx: Ctx, min: keyof typeof RANK): void {
  if (RANK[ctx.orgRole] < RANK[min]) throw new Error("forbidden");
}

// D9 demo-write guard lives in _mapping.ts (no @clerk import) so the service layer stays
// transport-pure (C2); re-exported here for action/edge callers + the ctx test.
export { assertCanMutate } from "@/lib/services/_mapping";
