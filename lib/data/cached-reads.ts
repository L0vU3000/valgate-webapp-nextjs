import "server-only";
import { unstable_cache } from "next/cache";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listExpenses } from "@/lib/services/expenses";
import { listDocuments } from "@/lib/services/documents";
import { listFolders } from "@/lib/services/folders";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listNotifications } from "@/lib/services/notifications";
import { getUserProfile } from "@/lib/services/user-profiles";
import type { Ctx } from "@/lib/services/_mapping";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Document } from "@/lib/data/types/document";
import type { Folder } from "@/lib/data/types/folder";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Notification } from "@/lib/data/types/notification";
import type { UserProfile } from "@/lib/data/types/user-profile";

function propertyKey(propertyId?: string): string {
  return propertyId ?? "__all__";
}

// Tag: leases
export function cachedListLeases(ctx: Ctx, propertyId?: string): Promise<Lease[]> {
  return unstable_cache(
    async () => listLeases(ctx, propertyId),
    ["leases", ctx.orgId, propertyKey(propertyId)],
    { tags: ["leases"] },
  )();
}

// Tag: tenants
export function cachedListTenants(ctx: Ctx, propertyId?: string): Promise<Tenant[]> {
  return unstable_cache(
    async () => listTenants(ctx, propertyId),
    ["tenants", ctx.orgId, propertyKey(propertyId)],
    { tags: ["tenants"] },
  )();
}

// Tag: payments
export function cachedListPayments(ctx: Ctx, propertyId?: string): Promise<Payment[]> {
  return unstable_cache(
    async () => listPayments(ctx, propertyId),
    ["payments", ctx.orgId, propertyKey(propertyId)],
    { tags: ["payments"] },
  )();
}

// Tag: expenses
export function cachedListExpenses(ctx: Ctx, propertyId?: string): Promise<Expense[]> {
  return unstable_cache(
    async () => listExpenses(ctx, propertyId),
    ["expenses", ctx.orgId, propertyKey(propertyId)],
    { tags: ["expenses"] },
  )();
}

// Tag: documents
export function cachedListDocuments(ctx: Ctx, propertyId?: string): Promise<Document[]> {
  return unstable_cache(
    async () => listDocuments(ctx, propertyId),
    ["documents", ctx.orgId, propertyKey(propertyId)],
    { tags: ["documents"] },
  )();
}

// Tag: folders
export function cachedListFolders(ctx: Ctx, propertyId?: string): Promise<Folder[]> {
  return unstable_cache(
    async () => listFolders(ctx, propertyId),
    ["folders", ctx.orgId, propertyKey(propertyId)],
    { tags: ["folders"] },
  )();
}

// Tag: maintenance-items
export function cachedListMaintenanceItems(
  ctx: Ctx,
  propertyId?: string,
): Promise<MaintenanceItem[]> {
  return unstable_cache(
    async () => listMaintenanceItems(ctx, propertyId),
    ["maintenance-items", ctx.orgId, propertyKey(propertyId)],
    { tags: ["maintenance-items"] },
  )();
}

// Tag: property-valuations
export function cachedListPropertyValuations(
  ctx: Ctx,
  propertyId?: string,
): Promise<PropertyValuation[]> {
  return unstable_cache(
    async () => listPropertyValuations(ctx, propertyId),
    ["property-valuations", ctx.orgId, propertyKey(propertyId)],
    { tags: ["property-valuations"] },
  )();
}

// Tag: ownership-records
export function cachedListOwnershipRecords(
  ctx: Ctx,
  propertyId?: string,
): Promise<OwnershipRecord[]> {
  return unstable_cache(
    async () => listOwnershipRecords(ctx, propertyId),
    ["ownership-records", ctx.orgId, propertyKey(propertyId)],
    { tags: ["ownership-records"] },
  )();
}

// Tag: co-owners
export function cachedListCoOwners(ctx: Ctx, propertyId?: string): Promise<CoOwner[]> {
  return unstable_cache(
    async () => listCoOwners(ctx, propertyId),
    ["co-owners", ctx.orgId, propertyKey(propertyId)],
    { tags: ["co-owners"] },
  )();
}

// Tag: ownership-documents
export function cachedListOwnershipDocuments(
  ctx: Ctx,
  propertyId?: string,
): Promise<OwnershipDocument[]> {
  return unstable_cache(
    async () => listOwnershipDocuments(ctx, propertyId),
    ["ownership-documents", ctx.orgId, propertyKey(propertyId)],
    { tags: ["ownership-documents"] },
  )();
}

// Tag: safety-risks
export function cachedListSafetyRisks(ctx: Ctx, propertyId?: string): Promise<SafetyRisk[]> {
  return unstable_cache(
    async () => listSafetyRisks(ctx, propertyId),
    ["safety-risks", ctx.orgId, propertyKey(propertyId)],
    { tags: ["safety-risks"] },
  )();
}

// Tag: inspections
export function cachedListInspections(ctx: Ctx, propertyId?: string): Promise<Inspection[]> {
  return unstable_cache(
    async () => listInspections(ctx, propertyId),
    ["inspections", ctx.orgId, propertyKey(propertyId)],
    { tags: ["inspections"] },
  )();
}

// Tag: certifications
export function cachedListCertifications(
  ctx: Ctx,
  propertyId?: string,
): Promise<Certification[]> {
  return unstable_cache(
    async () => listCertifications(ctx, propertyId),
    ["certifications", ctx.orgId, propertyKey(propertyId)],
    { tags: ["certifications"] },
  )();
}

// Tag: emergency-contacts
export function cachedListEmergencyContacts(
  ctx: Ctx,
  propertyId?: string,
): Promise<EmergencyContact[]> {
  return unstable_cache(
    async () => listEmergencyContacts(ctx, propertyId),
    ["emergency-contacts", ctx.orgId, propertyKey(propertyId)],
    { tags: ["emergency-contacts"] },
  )();
}

// Tag: estate-assignments
export function cachedListEstateAssignments(
  ctx: Ctx,
  propertyId?: string,
): Promise<EstateAssignment[]> {
  return unstable_cache(
    async () => listEstateAssignments(ctx, propertyId),
    ["estate-assignments", ctx.orgId, propertyKey(propertyId)],
    { tags: ["estate-assignments"] },
  )();
}

// Tag: notifications
export function cachedListNotifications(ctx: Ctx, propertyId?: string): Promise<Notification[]> {
  return unstable_cache(
    async () => listNotifications(ctx, propertyId),
    ["notifications", ctx.orgId, propertyKey(propertyId)],
    { tags: ["notifications"] },
  )();
}

// Tag: user-profiles
export function cachedGetUserProfile(ctx: Ctx, id: string): Promise<UserProfile | null> {
  return unstable_cache(
    async () => getUserProfile(ctx, id),
    ["user-profiles", ctx.orgId, id],
    { tags: ["user-profiles"] },
  )();
}
