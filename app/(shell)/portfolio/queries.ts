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
import { formatCurrency } from "@/lib/format";
import {
  computeStats,
  computeKpis,
  type PortfolioStats,
  type PortfolioKpis,
} from "@/lib/data/derivations/portfolio";
import { computeProgressDetails, type ProgressContext } from "@/lib/data/derivations/progress";
import type { Property, PropertyListItem } from "@/lib/data/types/property";

export type { PortfolioStats, PortfolioKpis };

export type PortfolioPageData = {
  properties: PropertyListItem[];
  archivedProperties: PropertyListItem[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
  archivedCount: number;
  soldCount: number;
  showArchived: boolean;
};

function toListItem(p: Property, ctx: ProgressContext): PropertyListItem {
  const details = computeProgressDetails(p, ctx);
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    province: p.province,
    status: p.status,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    buyNumeric: p.buyNumeric ?? 0,
    progress: details.score,
    progressDetails: details,
    totalArea: p.totalArea,
    title: p.title,
    isArchived: p.isArchived,
  };
}

export async function getPortfolioPageData(
  opts: { showArchived?: boolean } = {},
): Promise<PortfolioPageData> {
  const { showArchived = false } = opts;
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

  const activeProperties = properties.filter((p) => !p.isArchived);
  const archivedProperties = properties.filter((p) => p.isArchived);
  const archivedCount = archivedProperties.length;

  const activeListItems = activeProperties.map((p) => toListItem(p, ctx));
  const archivedListItems = archivedProperties.map((p) => toListItem(p, ctx));
  const allListItems = [...activeListItems, ...archivedListItems];

  const soldCount = activeListItems.filter((p) => p.status === "Sold").length;
  const stats = computeStats(allListItems);

  return {
    properties: activeListItems,
    archivedProperties: archivedListItems,
    stats,
    kpis: computeKpis(properties, payments, leases, stats.totalValue),
    archivedCount,
    soldCount,
    showArchived,
  };
}
