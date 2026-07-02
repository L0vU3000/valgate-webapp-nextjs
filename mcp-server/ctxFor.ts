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
import { organizationMemberships, organizations, users } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// Role seniority, most senior first. Used to pick a deterministic "primary" org for a multi-org
// user when the caller has not named one (see ctxFromMcpAuth). Higher number = more senior.
const ROLE_RANK: Record<Ctx["orgRole"], number> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

// Mirrors DEMO_CTX in lib/auth/ctx.ts:12. Safe because DEMO_MODE (or assertCanMutate) refuses
// writes at the service layer. Used by the stdio server for local dev.
export function ctxFor(): Ctx {
  return { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
}

// Options for resolving which org a Clerk user acts as (see ctxFromMcpAuth).
export type CtxResolveOptions = {
  // The org the caller explicitly asked to act in (e.g. a write tool's `orgId` argument). When
  // given it must be one of the user's own active memberships, or we refuse.
  requestedOrgId?: string;
  // When true, a multi-org user MUST have named an org — we will NOT fall back to a primary org.
  // Phase 4 writes set this: a create/update/delete must land in the org the caller intends, so
  // guessing is forbidden. Reads leave it false and accept the primary-org default below.
  requireExplicitOrg?: boolean;
};

// Phase 3: turn a Clerk user id (extracted from a validated OAuth token) into a real Ctx.
//
// A Clerk OAuth token identifies a *user*, not an org, but Valgate scopes all data by org — so
// we look up the user's active organization membership(s) to get the org id and role.
//
// Org selection (M2). The rule is: always DETERMINISTIC, never a random "first row".
//   - `requestedOrgId` given → it must be one of the user's own active memberships, else we refuse.
//     This is the explicit path Phase 4 (writes) uses, because a write must hit the org the caller
//     actually intends — guessing there would be dangerous.
//   - Single-org user, no org given → use their one membership.
//   - Multi-org user, no org given:
//       · reads (`requireExplicitOrg` false) → pick a stable "primary" org: the most senior role
//         first (owner > admin > member > viewer), tie-broken by org id. Safe for READS (the user
//         only ever sees orgs they already belong to) and it unblocks real multi-org users.
//       · writes (`requireExplicitOrg` true) → REFUSE. A write must never fall back to a guess.
//     Callers discover their options via the list_workspaces tool and pass requestedOrgId.
//
// When resolution fails (unknown user / no membership / requested an org they're not in) we throw
// the SAME generic "unauthenticated" error so the client can never tell which case it was; the
// specific reason is logged server-side (console.error) for our own debugging only. The one
// exception is the multi-org-write case, which throws "org_required" so a write tool can give the
// caller actionable guidance (call list_workspaces, pass orgId) rather than a bare auth failure.
export async function ctxFromMcpAuth(
  clerkUserId: string,
  options: CtxResolveOptions = {},
): Promise<Ctx> {
  const { requestedOrgId, requireExplicitOrg = false } = options;
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
    const match = memberships.find((membership) => membership.orgId === requestedOrgId);
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
  } else if (requireExplicitOrg) {
    // Multi-org user attempting a write with no org named. Refuse to guess — a write must land in
    // the org the caller intends. Distinct error so the tool can guide them to list_workspaces.
    console.warn(
      `[valgate-mcp] ctxFromMcpAuth: multi-org user ${userRow.id} must name an org for this action`,
    );
    throw new Error("org_required");
  } else {
    // Multi-org user, read with no org named: pick a stable primary. `memberships` is already
    // sorted by org id ascending, so this reduce is fully deterministic: keep the more senior
    // role, and on a role tie keep the earlier org id (the current `best`, since we walk ascending).
    selected = memberships.reduce((best, candidate) => {
      const candidateRank = ROLE_RANK[candidate.role as Ctx["orgRole"]];
      const bestRank = ROLE_RANK[best.role as Ctx["orgRole"]];
      return candidateRank > bestRank ? candidate : best;
    });
    console.warn(
      `[valgate-mcp] ctxFromMcpAuth: multi-org user ${userRow.id} defaulted to primary org ${selected.orgId} (${selected.role}); pass an explicit orgId to target another.`,
    );
  }

  // The membership role column already stores a normalised Ctx role
  // (upsertMembership writes normaliseRole(...)), so we use it directly.
  return {
    userId: userRow.id,
    orgId: selected.orgId,
    orgRole: selected.role as Ctx["orgRole"],
  };
}

// A single workspace (org) the user belongs to, as surfaced by the list_workspaces tool.
export type McpWorkspace = {
  orgId: string;
  name: string;
  role: Ctx["orgRole"];
};

// List every active workspace (org) the given Valgate user belongs to, with the org's display
// name and the user's role in it. Ordered by org id so the output is stable. This is what powers
// the list_workspaces tool: it lets a multi-org caller SEE all their orgs (nothing is hidden by
// the primary-org default in ctxFromMcpAuth) and learn the org ids to pass as an explicit target.
//
// Takes the internal USR-* id (which we already have on the resolved Ctx), so it works the same on
// both transports: the demo stdio Ctx and a real Clerk-authenticated Ctx.
export async function listWorkspacesForUser(userId: string): Promise<McpWorkspace[]> {
  const rows = await db
    .select({
      orgId: organizationMemberships.orgId,
      role: organizationMemberships.role,
      name: organizations.name,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.orgId))
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .orderBy(asc(organizationMemberships.orgId));

  return rows.map((row) => ({
    orgId: row.orgId,
    name: row.name,
    role: row.role as Ctx["orgRole"],
  }));
}
