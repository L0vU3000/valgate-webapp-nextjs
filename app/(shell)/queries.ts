import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
import { listProperties } from "@/lib/services/properties";
import { listPayments } from "@/lib/services/payments";
import { listLeases } from "@/lib/services/leases";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listTenants } from "@/lib/services/tenants";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listDocuments } from "@/lib/services/documents";
import {
  computeStats,
  type PortfolioStats,
} from "@/lib/data/derivations/portfolio";
import {
  computeProgress,
  type ProgressContext,
} from "@/lib/data/derivations/progress";
import type { Property, TitleVariant } from "@/lib/data/properties";
import type { Document } from "@/lib/data/types/document";
import { formatCurrency } from "@/lib/format";

export type { Property, TitleVariant, PortfolioStats };

export type HomeProperty = Property & { buy: string; progress: number };

export type HomePageData = {
  properties: HomeProperty[];
  portfolioStats: PortfolioStats;
  documents: Document[];
};

// Pass a `ctx` to render the owner home view scoped to *another* org — e.g. the
// manager's read-only "View as client" preview, which builds a client-scoped Ctx
// instead of the caller's own session. Omit it for the normal owner request.
export async function getHomePageData(ctxOverride?: Ctx): Promise<HomePageData> {
  const authCtx = ctxOverride ?? (await requireCtx());

  const [
    properties,
    payments,
    leases,
    allValuations,
    tenants,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments,
    documents,
  ] = await Promise.all([
    listProperties(authCtx),
    listPayments(authCtx),
    listLeases(authCtx),
    listPropertyValuations(authCtx),
    listTenants(authCtx),
    listOwnershipRecords(authCtx),
    listCoOwners(authCtx),
    listOwnershipDocuments(authCtx),
    listSafetyRisks(authCtx),
    listInspections(authCtx),
    listCertifications(authCtx),
    listEmergencyContacts(authCtx),
    listEstateAssignments(authCtx),
    listDocuments(authCtx),
  ]);

  const ctx: ProgressContext = {
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations: allValuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments,
    documents,
  };

  const items: HomeProperty[] = properties.map((p) => ({
    ...p,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    progress: computeProgress(p, ctx),
  }));

  return {
    properties: items,
    portfolioStats: computeStats(items),
    documents,
  };
}
