import "server-only";
import { getProperties } from "@/lib/data/properties";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import * as propertyValuationsDb from "@/lib/data/db/property-valuations";
import * as tenantsDb from "@/lib/data/db/tenants";
import * as ownershipRecordsDb from "@/lib/data/db/ownership-records";
import * as coOwnersDb from "@/lib/data/db/co-owners";
import * as ownershipDocumentsDb from "@/lib/data/db/ownership-documents";
import * as safetyRisksDb from "@/lib/data/db/safety-risks";
import * as inspectionsDb from "@/lib/data/db/inspections";
import * as certificationsDb from "@/lib/data/db/certifications";
import * as emergencyContactsDb from "@/lib/data/db/emergency-contacts";
import * as successorAssignmentsDb from "@/lib/data/db/successor-property-assignments";
import * as documentsDb from "@/lib/data/db/documents";
import { getCurrentUserId } from "@/lib/data/auth-shim";
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
  const userId = getCurrentUserId();

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
    paymentsDb.list(userId),
    leasesDb.list(userId),
    propertyValuationsDb.list(userId),
    tenantsDb.list(userId),
    ownershipRecordsDb.list(userId),
    coOwnersDb.list(userId),
    ownershipDocumentsDb.list(userId),
    safetyRisksDb.list(userId),
    inspectionsDb.list(userId),
    certificationsDb.list(userId),
    emergencyContactsDb.list(userId),
    successorAssignmentsDb.list(userId),
    documentsDb.list(userId),
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
    kpis: computeKpis(properties, payments, leases, allValuations, stats.totalValue),
    archivedCount,
    soldCount,
    showArchived,
  };
}
