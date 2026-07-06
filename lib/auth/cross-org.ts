import "server-only";
import { cache } from "react";
import { requireCtx } from "@/lib/auth/ctx";
import { getIsManager } from "@/lib/services/managers";
import { listManagedOrgIds } from "@/lib/services/managed-orgs";
import type { Ctx } from "@/lib/services/_mapping";

// Resolves the effective viewer Ctx for a property request that may carry a
// ?orgId= param pointing at a client's org. `isCrossOrg` is the authorization
// verdict: it is true ONLY when the caller is a manager who actually has access
// to the requested org. Callers MUST branch on this flag (not on the raw param)
// before doing any cross-org read — otherwise a hostile ?orgId= would leak data.
export const resolveCrossOrgCtx = cache(async (
  requestedOrgId?: string,
): Promise<{ ctx: Ctx; isCrossOrg: boolean }> => {
  const ctx = await requireCtx();
  if (!requestedOrgId || requestedOrgId === ctx.orgId) {
    return { ctx, isCrossOrg: false };
  }

  const isManager = await getIsManager(ctx);
  if (!isManager) return { ctx, isCrossOrg: false };

  // Authorize against every org the manager controls (clients + handoffs +
  // approved grants) — the same set the Pro cockpit renders links from, so a
  // link it shows can never be denied here.
  const managedOrgIds = await listManagedOrgIds(ctx.userId);
  if (!managedOrgIds.has(requestedOrgId)) return { ctx, isCrossOrg: false };

  return {
    ctx: {
      userId: ctx.userId,
      orgId: requestedOrgId,
      orgRole: "viewer",
    },
    isCrossOrg: true,
  };
});