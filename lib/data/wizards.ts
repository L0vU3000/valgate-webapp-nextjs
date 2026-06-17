import "server-only";
import type { Ctx } from "@/lib/services/_mapping";
import { getProperty } from "@/lib/services/properties";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listSuccessors } from "@/lib/services/successors";
import { listDocuments } from "@/lib/services/documents";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Successor } from "@/lib/data/types/successor";
import type { Document } from "@/lib/data/types/document";

export async function getFinancialsWizardInitial(ctx: Ctx, propertyId: string): Promise<{
  property: Property | null;
  latestValuation: PropertyValuation | null;
}> {
  const property = await getProperty(ctx, propertyId);
  const sorted = (await listPropertyValuations(ctx, propertyId))
    .sort((a, b) => a.recordedAt - b.recordedAt);
  return { property, latestValuation: sorted.at(-1) ?? null };
}

export async function getLocationWizardInitial(ctx: Ctx, propertyId: string): Promise<{ property: Property | null }> {
  return { property: await getProperty(ctx, propertyId) };
}

export async function getRentalWizardInitial(ctx: Ctx, propertyId: string): Promise<{
  property: Property | null;
  activeLease: Lease | null;
  primaryTenant: Tenant | null;
  recentPayments: Payment[];
}> {
  const property = await getProperty(ctx, propertyId);
  const propertyLeases = await listLeases(ctx, propertyId);
  const activeLease = propertyLeases
    .filter((l) => l.stage === "Signed")
    .sort((a, b) => b.startDate - a.startDate)[0] ?? null;
  const tenants = await listTenants(ctx, propertyId);
  const primaryTenant = tenants[0] ?? null;
  const leaseIds = new Set(propertyLeases.map((l) => l.id));
  const recentPayments = (await listPayments(ctx))
    .filter((p) => p.leaseId != null && leaseIds.has(p.leaseId))
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);
  return { property, activeLease, primaryTenant, recentPayments };
}

export type OwnershipWizardInitial = {
  record: OwnershipRecord | null;
  coOwners: CoOwner[];
};

export async function getOwnershipWizardInitial(ctx: Ctx, propertyId: string): Promise<OwnershipWizardInitial> {
  const records = await listOwnershipRecords(ctx, propertyId);
  const coOwners = await listCoOwners(ctx, propertyId);
  return { record: records[0] ?? null, coOwners };
}

export type EstateWizardInitial = {
  property: Property | null;
  assignments: EstateAssignment[];
  successors: Successor[];
  allSuccessors: Successor[];
  estateDocuments: Document[];
};

export async function getEstateWizardInitial(ctx: Ctx, propertyId: string): Promise<EstateWizardInitial> {
  const property = await getProperty(ctx, propertyId);
  const assignments = await listEstateAssignments(ctx, propertyId);
  const allSuccessors = await listSuccessors(ctx);
  const successorIds = new Set(assignments.map((a) => a.successorId));
  const successors = allSuccessors.filter((s) => successorIds.has(s.id));
  const estateDocuments = (await listDocuments(ctx, propertyId)).filter((doc) => {
    const categoryMatch = (doc.category ?? "").toLowerCase() === "estate";
    const verifiesMatch =
      doc.verifies?.entityType === "estate-plan" && doc.verifies.entityId === propertyId;
    return categoryMatch || verifiesMatch;
  });
  return { property, assignments, successors, allSuccessors, estateDocuments };
}
