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

export type OverviewPageData = {
  valuations: PropertyValuation[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  notifications: Notification[];
  maintenanceItems: MaintenanceItem[];
};

// Notifications have no propertyId — parse linkTo to infer property scope.
// Matches /property/<id>/ prefix; notifications without linkTo or with non-property links are skipped.
function notificationMatchesProperty(notification: Notification, propertyId: string): boolean {
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
  ] = await Promise.all([
    db.propertyValuations.list(userId),
    db.leases.list(userId),
    db.tenants.list(userId),
    db.payments.list(userId),
    db.expenses.list(userId),
    db.notifications.list(userId),
    db.maintenanceItems.list(userId),
  ]);
  return {
    valuations: allValuations.filter((v) => v.propertyId === propertyId),
    leases: allLeases.filter((l) => l.propertyId === propertyId),
    tenants: allTenants.filter((t) => t.propertyId === propertyId),
    payments: allPayments.filter((p) => p.propertyId === propertyId),
    expenses: allExpenses.filter((e) => e.propertyId === propertyId),
    notifications: allNotifications.filter((n) => notificationMatchesProperty(n, propertyId)),
    maintenanceItems: allMaintenanceItems.filter((m) => m.propertyId === propertyId),
  };
}
