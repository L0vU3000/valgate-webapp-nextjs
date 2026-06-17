import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listExpenses } from "@/lib/services/expenses";
import { listDocuments } from "@/lib/services/documents";
import { listFolders } from "@/lib/services/folders";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
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
  const authCtx = await requireCtx();
  const [
    allLeases,
    allTenants,
    allPayments,
    allExpenses,
    allDocuments,
    allFolders,
    allMaintenanceItems,
  ] = await Promise.all([
    listLeases(authCtx),
    listTenants(authCtx),
    listPayments(authCtx),
    listExpenses(authCtx),
    listDocuments(authCtx),
    listFolders(authCtx),
    listMaintenanceItems(authCtx),
  ]);
  const propLeaseIds = new Set(
    allLeases.filter((l) => l.propertyId === propertyId).map((l) => l.id),
  );
  return {
    leases: allLeases.filter((l) => l.propertyId === propertyId),
    tenants: allTenants.filter((t) => t.propertyId === propertyId),
    payments: allPayments.filter((p) => p.leaseId != null && propLeaseIds.has(p.leaseId)),
    expenses: allExpenses.filter((e) => e.propertyId === propertyId),
    documents: allDocuments.filter((d) => d.propertyId === propertyId),
    folders: allFolders.filter((f) => f.propertyId === propertyId),
    maintenanceItems: allMaintenanceItems.filter((m) => m.propertyId === propertyId),
  };
}
