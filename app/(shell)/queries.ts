import "server-only";
import { getProperties } from "@/lib/data/properties";
import { requireCtx } from "@/lib/auth/ctx";
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

export async function getHomePageData(): Promise<HomePageData> {
  const authCtx = await requireCtx();

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
    getProperties(),
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
