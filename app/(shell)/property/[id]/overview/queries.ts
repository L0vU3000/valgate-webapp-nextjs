import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListPropertyValuations,
  cachedListLeases,
  cachedListTenants,
  cachedListPayments,
  cachedListExpenses,
  cachedListNotifications,
  cachedListMaintenanceItems,
  cachedListOwnershipRecords,
  cachedListCoOwners,
  cachedListOwnershipDocuments,
  cachedListSafetyRisks,
  cachedListInspections,
  cachedListCertifications,
  cachedListEmergencyContacts,
  cachedListEstateAssignments,
  cachedListDocuments,
  cachedGetUserProfile,
} from "@/lib/data/cached-reads";
import { listActivities } from "@/lib/services/activities";
import type { Ctx } from "@/lib/services/_mapping";
import type { Activity } from "@/lib/data/types/activity";
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
  recentActivities: Activity[];
};

function notificationMatchesProperty(notification: Notification, propertyId: string): boolean {
  if (notification.propertyId) return notification.propertyId === propertyId;
  if (!notification.linkTo) return false;
  const match = notification.linkTo.match(/^\/property\/([^/]+)\//);
  return match ? match[1] === propertyId : false;
}

export async function getOverviewPageData(
  propertyId: string,
  overrideCtx?: Ctx,
): Promise<OverviewPageData> {
  const authCtx = overrideCtx ?? await requireCtx();

  const [
    valuations,
    leases,
    tenants,
    payments,
    expenses,
    allNotifications,
    maintenanceItems,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    documents,
    userProfile,
    recentActivities,
  ] = await Promise.all([
    cachedListPropertyValuations(authCtx, propertyId),
    cachedListLeases(authCtx, propertyId),
    cachedListTenants(authCtx, propertyId),
    cachedListPayments(authCtx, propertyId),
    cachedListExpenses(authCtx, propertyId),
    cachedListNotifications(authCtx),
    cachedListMaintenanceItems(authCtx, propertyId),
    cachedListOwnershipRecords(authCtx, propertyId),
    cachedListCoOwners(authCtx, propertyId),
    cachedListOwnershipDocuments(authCtx, propertyId),
    cachedListSafetyRisks(authCtx, propertyId),
    cachedListInspections(authCtx, propertyId),
    cachedListCertifications(authCtx, propertyId),
    cachedListEmergencyContacts(authCtx, propertyId),
    cachedListEstateAssignments(authCtx, propertyId),
    cachedListDocuments(authCtx, propertyId),
    cachedGetUserProfile(authCtx, authCtx.userId),
    listActivities(authCtx, propertyId, 10),
  ]);

  return {
    valuations,
    leases,
    tenants,
    payments,
    expenses,
    notifications: allNotifications.filter((n) => notificationMatchesProperty(n, propertyId)),
    maintenanceItems,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    estateAssignments,
    documents,
    userProfile: userProfile ?? null,
    recentActivities,
  };
}