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
