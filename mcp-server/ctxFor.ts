// The MCP auth seam (Phase 1 readiness gap W1). Two ways to build a Valgate Ctx:
//
//   ctxFor()            — Phase 1/2: a hardcoded demo identity for the local stdio server.
//   ctxFromMcpAuth(id)  — Phase 3: a real Ctx resolved from a Clerk-authenticated user id.
//
// Neither touches the web request directly — that is the whole point of the seam. The HTTP
// route validates the Clerk OAuth token (see app/mcp/route.ts) and hands us just the Clerk
// user id; we turn that into { userId, orgId, orgRole } using the same identity tables the
// website uses. Services then apply org-scoping and role checks for free.
import { and, asc, eq } from "drizzle-orm";
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
// we look up the user's active organization membership(s) to get the org id and role.
//
// Org selection (M2 — must be deterministic, never a guess):
//   - Single-org user  → we use their one active membership.
//   - Multi-org user   → we require the CALLER to say which org it means, via `requestedOrgId`,
//                        and we validate that id against the user's own active memberships. If a
//                        multi-org user does NOT supply an org, we refuse rather than silently
//                        pick one — picking "the first row" is non-deterministic and, once writes
//                        land in Phase 4, would let a write hit the wrong workspace.
//   - `requestedOrgId` also works for single-org users (it must still match their membership).
//
// Every failure throws the SAME generic "unauthenticated" error so the client can never tell
// whether the user was missing, had no membership, or asked for an org it doesn't belong to.
// The specific reason is logged server-side (via console.error) for our own debugging only.
//
// `requestedOrgId` is optional today because the stdio path and the current HTTP path do not yet
// pass one; Phase 4 (writes) will thread an explicit org through from the client. Until then,
// multi-org callers are safely blocked instead of served an arbitrary org.
export async function ctxFromMcpAuth(
  clerkUserId: string,
  requestedOrgId?: string,
): Promise<Ctx> {
  // 1) Clerk user id → our internal USR-* id.
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) {
    console.error("[valgate-mcp] ctxFromMcpAuth: no Valgate user for the given Clerk user id");
    throw new Error("unauthenticated");
  }

  // 2) ALL of the user's active memberships, ordered deterministically by org id so that any
  //    "first row" behaviour is stable across requests (no reliance on the DB's default order).
  const memberships = await db
    .select({ orgId: organizationMemberships.orgId, role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userRow.id),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .orderBy(asc(organizationMemberships.orgId));

  if (memberships.length === 0) {
    console.error("[valgate-mcp] ctxFromMcpAuth: user has no active org membership");
    throw new Error("unauthenticated");
  }

  // 3) Pick exactly one membership — deterministically.
  let selected: (typeof memberships)[number];

  if (requestedOrgId) {
    // The caller named an org. It must be one the user actually belongs to (and is active in);
    // otherwise this is an attempt to act on an org outside the user's access → refuse.
    const match = memberships.find((m) => m.orgId === requestedOrgId);
    if (!match) {
      console.error(
        "[valgate-mcp] ctxFromMcpAuth: requested org is not an active membership for this user",
      );
      throw new Error("unauthenticated");
    }
    selected = match;
  } else if (memberships.length === 1) {
    // Single-org user, no ambiguity: use their only membership.
    selected = memberships[0];
  } else {
    // Multi-org user with no org specified. Do NOT guess — that would be non-deterministic and
    // unsafe for writes. The caller must supply requestedOrgId once that channel exists (Phase 4).
    console.error(
      "[valgate-mcp] ctxFromMcpAuth: user belongs to multiple orgs but no org was specified",
    );
    throw new Error("unauthenticated");
  }

  // The membership role column already stores a normalised Ctx role
  // (upsertMembership writes normaliseRole(...)), so we use it directly.
  return {
    userId: userRow.id,
    orgId: selected.orgId,
    orgRole: selected.role as Ctx["orgRole"],
  };
}
