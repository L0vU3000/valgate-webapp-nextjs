import "server-only"; // C1
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { upsertOrg, upsertUser, upsertMembership, ourOrgId, ourUserId, normaliseRole } from "@/lib/services/identity-sync";
import type { Ctx } from "@/lib/services/_mapping";

// C2: the ONLY caller of auth(). Every action calls requireCtx(); services take Ctx.

const DEMO_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

async function resolveCtx(): Promise<Ctx> {
  if (env.DEMO_MODE) {
    // DEMO_CTX grants unauthenticated ORG-0001 owner access — refuse it anywhere real auth could
    // exist: production, or a real Clerk key configured (DEMO_MODE left on by mistake). (M1, D9)
    if (process.env.NODE_ENV === "production") throw new Error("DEMO_MODE refused in production");
    if (env.CLERK_SECRET_KEY && env.CLERK_SECRET_KEY !== "sk_test_placeholder")
      throw new Error("DEMO_MODE refused when a real CLERK_SECRET_KEY is set");
    return DEMO_CTX;
  }

  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) throw new Error("unauthenticated"); // no null-org path (D14)

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
      // Read the accountType set at sign-up; if absent, default is owner (false).
      isManager: clerkUser?.unsafeMetadata?.accountType === "manager",
    });
    // ponytail: org name = Clerk id as placeholder; webhook fills in real name/slug
    await upsertOrg({ id: orgId, name: orgId, slug: null });
    await upsertMembership({ clerkOrgId: orgId, clerkUserId: userId, role: orgRole ?? "org:member" });
  }

  return {
    userId: await ourUserId(userId),
    orgId: await ourOrgId(orgId),
    orgRole: normaliseRole(orgRole),
  };
}

// Memoized per server request: Clerk auth() + identity-sync DB checks run once per request instead of 3+; each new request gets a fresh memo (no cross-user leak).
export const requireCtx = cache(resolveCtx);

// Edge-level role gate (guide §5). Distinct from _crud's service-level requireMember.
const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 } as const;
export function requireRole(ctx: Ctx, min: keyof typeof RANK): void {
  if (RANK[ctx.orgRole] < RANK[min]) throw new Error("forbidden");
}

// D9 demo-write guard lives in _mapping.ts (no @clerk import) so the service layer stays
// transport-pure (C2); re-exported here for action/edge callers + the ctx test.
export { assertCanMutate } from "@/lib/services/_mapping";
