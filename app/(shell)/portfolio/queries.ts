import "server-only";
import { getProperties } from "@/lib/data/properties";
import { requireCtx } from "@/lib/auth/ctx";
import { roleAtLeast } from "@/lib/services/_mapping";
// Cut 3: read through the cross-request cache layer (unstable_cache) instead of
// hitting the services directly. Same org-wide queries, now cached + tag-invalidated.
import {
  cachedListPayments,
  cachedListLeases,
  cachedListPropertyValuations,
  cachedListTenants,
  cachedListOwnershipRecords,
  cachedListCoOwners,
  cachedListOwnershipDocuments,
  cachedListSafetyRisks,
  cachedListInspections,
  cachedListCertifications,
  cachedListEmergencyContacts,
  cachedListEstateAssignments,
  cachedListDocuments,
} from "@/lib/data/cached-reads";
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
  // Whether the current user may hard-delete a property (admin/owner only). The server
  // enforces this independently in deletePropertyAction; this flag just lets the UI hide
  // the Delete menu item for lower roles so they never see a dead-end action.
  canDelete: boolean;
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
    cachedListPayments(authCtx),
    cachedListLeases(authCtx),
    cachedListPropertyValuations(authCtx),
    cachedListTenants(authCtx),
    cachedListOwnershipRecords(authCtx),
    cachedListCoOwners(authCtx),
    cachedListOwnershipDocuments(authCtx),
    cachedListSafetyRisks(authCtx),
    cachedListInspections(authCtx),
    cachedListCertifications(authCtx),
    cachedListEmergencyContacts(authCtx),
    cachedListEstateAssignments(authCtx),
    cachedListDocuments(authCtx),
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
    canDelete: roleAtLeast(authCtx.orgRole, "admin"),
  };
}
