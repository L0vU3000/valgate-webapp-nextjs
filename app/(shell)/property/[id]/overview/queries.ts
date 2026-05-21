import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Notification } from "@/lib/data/types/notification";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Document } from "@/lib/data/types/document";
import type { UserProfile } from "@/lib/data/types/user-profile";

export type OverviewPageData = {
  userProfile: UserProfile | null;
  valuations: PropertyValuation[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  notifications: Notification[];
  maintenanceItems: MaintenanceItem[];
  ownershipRecords: OwnershipRecord[];
  coOwners: CoOwner[];
  ownershipDocuments: OwnershipDocument[];
  safetyRisks: SafetyRisk[];
  inspections: Inspection[];
  certifications: Certification[];
  emergencyContacts: EmergencyContact[];
  estateAssignments: EstateAssignment[];
  documents: Document[];
};

function notificationMatchesProperty(notification: Notification, propertyId: string): boolean {
  if (notification.propertyId) return notification.propertyId === propertyId;
  if (!notification.linkTo) return false;
  const match = notification.linkTo.match(/^\/property\/([^/]+)\//);
  return match ? match[1] === propertyId : false;
}

export async function getOverviewPageData(propertyId: string): Promise<OverviewPageData> {
  const userId = getCurrentUserId();
  const [
    allValuations,
    allLeases,
    allTenants,
    allPayments,
    allExpenses,
    allNotifications,
    allMaintenanceItems,
    allOwnershipRecords,
    allCoOwners,
    allOwnershipDocuments,
    allSafetyRisks,
    allInspections,
    allCertifications,
    allEmergencyContacts,
    allEstateAssignments,
    allDocuments,
    userProfile,
  ] = await Promise.all([
    db.propertyValuations.list(userId),
    db.leases.list(userId),
    db.tenants.list(userId),
    db.payments.list(userId),
    db.expenses.list(userId),
    db.notifications.list(userId),
    db.maintenanceItems.list(userId),
    db.ownershipRecords.list(userId),
    db.coOwners.list(userId),
    db.ownershipDocuments.list(userId),
    db.safetyRisks.list(userId),
    db.inspections.list(userId),
    db.certifications.list(userId),
    db.emergencyContacts.list(userId),
    db.estateAssignments.list(userId),
    db.documents.list(userId),
    db.userProfiles.get(userId, userId),
  ]);
  const propLeaseIds = new Set(
    allLeases.filter((l) => l.propertyId === propertyId).map((l) => l.id),
  );
  return {
    valuations: allValuations.filter((v) => v.propertyId === propertyId),
    leases: allLeases.filter((l) => l.propertyId === propertyId),
    tenants: allTenants.filter((t) => t.propertyId === propertyId),
    payments: allPayments.filter((p) => p.leaseId != null && propLeaseIds.has(p.leaseId)),
    expenses: allExpenses.filter((e) => e.propertyId === propertyId),
    notifications: allNotifications.filter((n) => notificationMatchesProperty(n, propertyId)),
    maintenanceItems: allMaintenanceItems.filter((m) => m.propertyId === propertyId),
    ownershipRecords: allOwnershipRecords.filter((r) => r.propertyId === propertyId),
    coOwners: allCoOwners.filter((c) => c.propertyId === propertyId),
    ownershipDocuments: allOwnershipDocuments.filter((d) => d.propertyId === propertyId),
    safetyRisks: allSafetyRisks.filter((r) => r.propertyId === propertyId),
    inspections: allInspections.filter((i) => i.propertyId === propertyId),
    certifications: allCertifications.filter((c) => c.propertyId === propertyId),
    emergencyContacts: allEmergencyContacts.filter((e) => e.propertyId === propertyId),
    estateAssignments: allEstateAssignments.filter((a) => a.propertyId === propertyId),
    documents: allDocuments.filter((d) => d.propertyId === propertyId),
    userProfile: userProfile ?? null,
  };
}
