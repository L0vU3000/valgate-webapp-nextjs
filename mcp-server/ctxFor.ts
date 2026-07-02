// The MCP auth seam (Phase 1 readiness gap W1). Two ways to build a Valgate Ctx:
//
//   ctxFor()            — Phase 1/2: a hardcoded demo identity for the local stdio server.
//   ctxFromMcpAuth(id)  — Phase 3: a real Ctx resolved from a Clerk-authenticated user id.
//
// Neither touches the web request directly — that is the whole point of the seam. The HTTP
// route validates the Clerk OAuth token (see app/mcp/route.ts) and hands us just the Clerk
// user id; we turn that into { userId, orgId, orgRole } using the same identity tables the
// website uses. Services then apply org-scoping and role checks for free.
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizationMemberships, users } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// Mirrors DEMO_CTX in lib/auth/ctx.ts:12. Safe because DEMO_MODE (or assertCanMutate) refuses
// writes at the service layer. Used by the stdio server for local dev.
export function ctxFor(): Ctx {
  return { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
}

// Phase 3: turn a Clerk user id (extracted from a validated OAuth token) into a real Ctx.
//
// A Clerk OAuth token identifies a *user*, not an org, but Valgate scopes all data by org — so
// we look up the user's active organization membership to get the org id and role. For v1 we
// take the user's FIRST active membership. Multi-org users (a manager who belongs to several
// workspaces) would need the client to pass which org it wants; that is a later refinement and
// is noted in the Phase 3 plan. Throws "unauthenticated" if the user or a membership is missing
// (a generic error — never leaks which of the two was absent).
export async function ctxFromMcpAuth(clerkUserId: string): Promise<Ctx> {
  // 1) Clerk user id → our internal USR-* id.
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) {
    throw new Error("unauthenticated");
  }

  // 2) The user's first active org membership → org id + role.
  const [membership] = await db
    .select({ orgId: organizationMemberships.orgId, role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userRow.id),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);
  if (!membership) {
    throw new Error("unauthenticated");
  }

  // The membership role column already stores a normalised Ctx role
  // (upsertMembership writes normaliseRole(...)), so we use it directly.
  return {
    userId: userRow.id,
    orgId: membership.orgId,
    orgRole: membership.role as Ctx["orgRole"],
  };
}
