import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
import {
  cachedListCertifications,
  cachedListInspections,
  cachedListSafetyRisks,
  cachedListProperties,
} from "@/lib/data/cached-reads";
import { buildComplianceSummary, type ComplianceSummary } from "@/lib/data/derivations/compliance";

export type { ComplianceSummary };

// `ctxOverride` lets the "view as client" preview (Phase 2) mount this same page
// under the client's org ctx; the default path resolves the signed-in owner.
export async function getComplianceData(ctxOverride?: Ctx): Promise<ComplianceSummary> {
  const ctx = ctxOverride ?? (await requireCtx());
  const [certifications, inspections, risks, properties] = await Promise.all([
    cachedListCertifications(ctx),
    cachedListInspections(ctx),
    cachedListSafetyRisks(ctx),
    cachedListProperties(ctx),
  ]);

  const propertyNames = new Map(properties.map((p) => [p.id, p.name]));

  // now = Date.now() at request time so expiry / overdue labels are always fresh.
  return buildComplianceSummary({ certifications, inspections, risks, propertyNames, now: Date.now() });
}
