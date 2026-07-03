import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizationMemberships } from "@/lib/db/schema";
import { ourUserId } from "@/lib/services/identity-sync";
import type { Ctx } from "@/lib/services/_mapping";

// Build a Valgate Ctx for an MCP request authenticated by Clerk.
//
// Why this exists separately from requireCtx(): the web app gets the active organization from the
// Clerk *session* (auth()), but an MCP OAuth token identifies a USER only — it carries no active
// org. So here we take the Clerk user id from the token and resolve the org ourselves from the
// user's membership rows (the same tables requireCtx keeps in sync).
//
// v1 rule: a user acts in their PRIMARY org — the earliest active membership. Multi-org selection
// (e.g. an org argument on each tool) can come later; see docs/MCP implementation/05-vercel-deploy-plan.md §8.1.
export async function ctxForClerkUser(clerkUserId: string): Promise<Ctx> {
  // Map the external Clerk user id to our internal USR-id. Throws "unauthenticated" if this user
  // has no mirror row yet (i.e. has never signed in to Valgate) — fail closed, never guess.
  const userId = await ourUserId(clerkUserId);

  // Pick the user's primary active org: earliest joined wins, tie-broken by membership id so the
  // choice is deterministic.
  const [membership] = await db
    .select({
      orgId: organizationMemberships.orgId,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .orderBy(asc(organizationMemberships.joinedAt), asc(organizationMemberships.id))
    .limit(1);

  if (!membership) {
    throw new Error("no active organization for user");
  }

  // The DB role enum (owner/admin/member/viewer) already matches Ctx["orgRole"] — no mapping needed.
  return { userId, orgId: membership.orgId, orgRole: membership.role };
}
