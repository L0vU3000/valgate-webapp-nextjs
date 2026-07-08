import "server-only";
// On-behalf routing for the Pro book-page write actions (align-client-manager-parity Phase 2).
//
// A manager's book pages aggregate entities from TWO places (see loadProContext):
//   • the manager's OWN org — their own portfolio + draft clients whose properties are
//     tagged with a clientId but have no separate org yet;
//   • ACCEPTED clients' own orgs — reached through an org membership grant.
//
// Every mutation must be resolved server-side to the org that actually owns the row:
//   • own-org / draft            → direct write under the manager's ctx (they ARE the owner).
//   • accepted client's own org  → the audited change_requests path (full grant auto-applies,
//                                   viewer grant proposes) via proposeChangeAction.
//
// The owning org is read from the row itself (never client-supplied), and checked against the
// manager's managed set — this is also the IDOR guard: a row in an org the manager neither
// owns nor manages resolves to null and the action refuses.
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clients } from "@/lib/db/schema";
import { requireCtx } from "@/lib/auth/ctx";
import { getMembershipRole } from "@/lib/services/portfolio-members";
import { roleAtLeast, type Ctx } from "@/lib/services/_mapping";

export type OnBehalf =
  // Own portfolio / draft client — read + write directly under this ctx.
  | { audited: false; ctx: Ctx }
  // Accepted client — read under readCtx (scoped to the client's org); WRITE must go through
  // proposeChangeAction(clientId, …) so it lands in the ledger. canWrite reflects the grant.
  | { audited: true; clientId: string; readCtx: Ctx; canWrite: boolean };

// orgId → clientId for every accepted client this manager owns (orgId not null).
async function managedClientOrgs(managerUserId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ orgId: clients.orgId, clientId: clients.id })
    .from(clients)
    .where(and(eq(clients.managerUserId, managerUserId), isNotNull(clients.orgId)));
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.orgId) map.set(r.orgId, r.clientId);
  }
  return map;
}

// Build the routing decision from a resolved owning orgId.
async function fromOwningOrg(authCtx: Ctx, owningOrgId: string): Promise<OnBehalf | null> {
  // The manager's own org (own portfolio + draft clients) → direct write.
  if (owningOrgId === authCtx.orgId) {
    return { audited: false, ctx: authCtx };
  }
  // An accepted client the manager manages → audited path.
  const managed = await managedClientOrgs(authCtx.userId);
  const clientId = managed.get(owningOrgId);
  if (!clientId) {
    // Neither the manager's own org nor one they manage → not authorized to touch it.
    return null;
  }
  const grantRole = await getMembershipRole(owningOrgId, authCtx.userId);
  const orgRole = grantRole ?? "viewer"; // absent grant floors to viewer (never write-capable)
  return {
    audited: true,
    clientId,
    readCtx: { userId: authCtx.userId, orgId: owningOrgId, orgRole },
    canWrite: roleAtLeast(orgRole, "admin"),
  };
}

// Resolve routing from a row that carries an orgId column (safety risk, payment, lease,
// maintenance item, property). Returns null when the row does not exist or the manager
// has no claim on its org (→ the action returns a generic "not found" error).
//
// `table` is typed loosely because Drizzle's generic table types don't unify across the
// distinct schemas; every caller passes a table that has `id` + `orgId` columns.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveOnBehalfForRow(table: any, id: string): Promise<OnBehalf | null> {
  const authCtx = await requireCtx();
  const [row] = await db
    .select({ orgId: table.orgId })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (!row) return null;
  return fromOwningOrg(authCtx, row.orgId as string);
}
