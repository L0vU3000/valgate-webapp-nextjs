import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clients, clientHandoffs, accessRequests } from "@/lib/db/schema";

/**
 * Every org id a manager controls, unioned from all sources that grant portfolio
 * access:
 *   - clients.orgId           — direct client records (seed data, manual creation)
 *   - clientHandoffs.orgId    — manager-led onboarding flow
 *   - approved accessRequests — owner-approved grants (also a real membership)
 *
 * This is the SINGLE source of truth for "which orgs can this manager act in".
 * loadProContext() renders the Pro cockpit from the first two; resolveCrossOrgCtx()
 * authorizes cross-org property views from this superset. Keeping both on the same
 * definition is what prevents a cockpit link from 404ing in the gate (the exact bug
 * where the gate checked only accessRequests while links came from clients/handoffs).
 */
export async function listManagedOrgIds(userId: string): Promise<Set<string>> {
  const [handoffRows, clientRows, grantRows] = await Promise.all([
    db
      .selectDistinct({ orgId: clientHandoffs.orgId })
      .from(clientHandoffs)
      .where(eq(clientHandoffs.managerUserId, userId)),
    db
      .select({ orgId: clients.orgId })
      .from(clients)
      .where(and(eq(clients.managerUserId, userId), isNotNull(clients.orgId))),
    db
      .select({ orgId: accessRequests.ownerOrgId })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.managerUserId, userId),
          eq(accessRequests.status, "approved"),
        ),
      ),
  ]);

  const orgIds = new Set<string>();
  for (const row of [...handoffRows, ...clientRows, ...grantRows]) {
    if (row.orgId) orgIds.add(row.orgId);
  }
  return orgIds;
}
