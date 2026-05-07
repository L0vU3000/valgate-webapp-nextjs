import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Document } from "@/lib/data/types/document";
import type { Folder } from "@/lib/data/types/folder";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";

export type RentalPageData = {
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  documents: Document[];
  folders: Folder[];
  maintenanceItems: MaintenanceItem[];
};

export async function getRentalPageData(propertyId: string): Promise<RentalPageData> {
  const userId = getCurrentUserId();
  const [
    allLeases,
    allTenants,
    allPayments,
    allExpenses,
    allDocuments,
    allFolders,
    allMaintenanceItems,
  ] = await Promise.all([
    db.leases.list(userId),
    db.tenants.list(userId),
    db.payments.list(userId),
    db.expenses.list(userId),
    db.documents.list(userId),
    db.folders.list(userId),
    db.maintenanceItems.list(userId),
  ]);
  return {
    leases: allLeases.filter((l) => l.propertyId === propertyId),
    tenants: allTenants.filter((t) => t.propertyId === propertyId),
    payments: allPayments.filter((p) => p.propertyId === propertyId),
    expenses: allExpenses.filter((e) => e.propertyId === propertyId),
    documents: allDocuments.filter((d) => d.propertyId === propertyId),
    folders: allFolders.filter((f) => f.propertyId === propertyId),
    maintenanceItems: allMaintenanceItems.filter((m) => m.propertyId === propertyId),
  };
}
