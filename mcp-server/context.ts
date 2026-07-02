// Phase 2 data builders for the MCP resources.
//
// These functions assemble the read-only "context" the AI pulls (a whole property with its
// children, a property's progress score, a portfolio snapshot). They follow the same rule as
// the Phase 1 tool: reuse the transport-pure `lib/services/*` functions (each takes an explicit
// Ctx) plus the PURE derivation helpers (computeProgressDetails / computeStats / computeKpis).
//
// Why we do NOT reuse lib/data/derivations/{ai-context,portfolio-snapshot}.ts directly:
// those call `requireCtx()` internally (Clerk-coupled) and `lib/data/properties.ts` wraps
// Next's `unstable_cache`. Neither can run in this plain Node process. So we rebuild the same
// shape here from the ctx-taking services — no new business logic, just wiring.
import type { Ctx } from "@/lib/services/_mapping";
import { getProperty } from "@/lib/services/properties";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listDocuments } from "@/lib/services/documents";
import { listExpenses } from "@/lib/services/expenses";
import { listFolders } from "@/lib/services/folders";
import { listProperties } from "@/lib/services/properties";

import { computeProgressDetails, type ProgressContext } from "@/lib/data/derivations/progress";
import { computeStats, computeKpis } from "@/lib/data/derivations/portfolio";
import { formatCurrency } from "@/lib/format";
import type { Property, PropertyListItem } from "@/lib/data/types/property";
import type { ProgressDetails } from "@/lib/data/types/progress";
import type { PortfolioStats, PortfolioKpis } from "@/lib/data/derivations/portfolio";

// ── valgate://property/{id} ────────────────────────────────────────────────
// One fetch returns the property plus every child list, scoped to that property. This is the
// design-law payoff: it replaces ~10 would-be "list_x" tools with a single addressable resource.

export type PropertyResource = {
  property: Property;
  leases: unknown[];
  tenants: unknown[];
  payments: unknown[];
  valuations: unknown[];
  ownershipRecords: unknown[];
  coOwners: unknown[];
  ownershipDocuments: unknown[];
  safetyRisks: unknown[];
  inspections: unknown[];
  certifications: unknown[];
  emergencyContacts: unknown[];
  estateAssignments: unknown[];
  maintenanceItems: unknown[];
  documents: unknown[];
  expenses: unknown[];
  folders: unknown[];
};

// Returns null when the property does not exist in this org (so the caller can 404 cleanly).
export async function buildPropertyResource(ctx: Ctx, id: string): Promise<PropertyResource | null> {
  const property = await getProperty(ctx, id);
  if (!property) {
    return null;
  }

  // Every child list is org-scoped by the service and filtered to this property id.
  // Fetch them in parallel — the resource is one property's whole picture.
  const [
    leases,
    tenants,
    payments,
    valuations,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    maintenanceItems,
    documents,
    expenses,
    folders,
  ] = await Promise.all([
    listLeases(ctx, id),
    listTenants(ctx, id),
    listPayments(ctx, id),
    listPropertyValuations(ctx, id),
    listOwnershipRecords(ctx, id),
    listCoOwners(ctx, id),
    listOwnershipDocuments(ctx, id),
    listSafetyRisks(ctx, id),
    listInspections(ctx, id),
    listCertifications(ctx, id),
    listEmergencyContacts(ctx, id),
    listEstateAssignments(ctx, id),
    listMaintenanceItems(ctx, id),
    listDocuments(ctx, id),
    listExpenses(ctx, id),
    listFolders(ctx, id),
  ]);

  return {
    property,
    leases,
    tenants,
    payments,
    valuations,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    maintenanceItems,
    documents,
    expenses,
    folders,
  };
}

// ── valgate://property/{id}/progress ────────────────────────────────────────
// The pillar-by-pillar completeness score (Location, Financials, Rental, …). We build the
// ProgressContext from the same ctx-taking services, then hand it to the PURE
// computeProgressDetails() — the identical function the website uses to render the progress modal.

export async function buildPropertyProgress(ctx: Ctx, id: string): Promise<ProgressDetails | null> {
  const property = await getProperty(ctx, id);
  if (!property) {
    return null;
  }

  const [
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    documents,
  ] = await Promise.all([
    listLeases(ctx, id),
    listTenants(ctx, id),
    listPayments(ctx, id),
    listOwnershipRecords(ctx, id),
    listCoOwners(ctx, id),
    listOwnershipDocuments(ctx, id),
    listPropertyValuations(ctx, id),
    listSafetyRisks(ctx, id),
    listInspections(ctx, id),
    listCertifications(ctx, id),
    listEmergencyContacts(ctx, id),
    listEstateAssignments(ctx, id),
    listDocuments(ctx, id),
  ]);

  const progressContext: ProgressContext = {
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments: estateAssignments,
    documents,
  };

  return computeProgressDetails(property, progressContext);
}

// ── valgate://portfolio/snapshot ────────────────────────────────────────────
// One-call overview: per-property progress list + portfolio stats + KPIs. This mirrors
// lib/data/derivations/portfolio-snapshot.ts:getPortfolioSnapshot() but sources data through
// the ctx services (instead of requireCtx + the Next cache), then reuses the SAME pure
// computeStats / computeKpis / computeProgressDetails helpers. No new maths lives here.

export type PortfolioSnapshotResource = {
  properties: PropertyListItem[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
};

function toListItem(property: Property, progressContext: ProgressContext): PropertyListItem {
  const details = computeProgressDetails(property, progressContext);
  return {
    id: property.id,
    name: property.name,
    code: property.code,
    type: property.type,
    province: property.province,
    status: property.status,
    buy: property.buyNumeric ? formatCurrency(property.buyNumeric) : "—",
    buyNumeric: property.buyNumeric ?? 0,
    progress: details.score,
    progressDetails: details,
    totalArea: property.totalArea,
    title: property.title,
    isArchived: property.isArchived,
  };
}

export async function buildPortfolioSnapshot(ctx: Ctx): Promise<PortfolioSnapshotResource> {
  // Portfolio-wide fetch (no propertyId filter) — one query per entity, then compute locally.
  const [
    properties,
    payments,
    leases,
    valuations,
    tenants,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    documents,
  ] = await Promise.all([
    listProperties(ctx),
    listPayments(ctx),
    listLeases(ctx),
    listPropertyValuations(ctx),
    listTenants(ctx),
    listOwnershipRecords(ctx),
    listCoOwners(ctx),
    listOwnershipDocuments(ctx),
    listSafetyRisks(ctx),
    listInspections(ctx),
    listCertifications(ctx),
    listEmergencyContacts(ctx),
    listEstateAssignments(ctx),
    listDocuments(ctx),
  ]);

  const progressContext: ProgressContext = {
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments: estateAssignments,
    documents,
  };

  const activeProperties = properties.filter((p) => !p.isArchived);
  const archivedProperties = properties.filter((p) => p.isArchived);
  const activeListItems = activeProperties.map((p) => toListItem(p, progressContext));
  const archivedListItems = archivedProperties.map((p) => toListItem(p, progressContext));
  const stats = computeStats([...activeListItems, ...archivedListItems]);

  return {
    properties: activeListItems,
    stats,
    kpis: computeKpis(properties, payments, leases, stats.totalValue),
  };
}
