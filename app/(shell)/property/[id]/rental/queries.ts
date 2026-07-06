import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListLeases,
  cachedListTenants,
  cachedListPayments,
  cachedListExpenses,
  cachedListDocuments,
  cachedListFolders,
  cachedListMaintenanceItems,
} from "@/lib/data/cached-reads";
import type { Ctx } from "@/lib/services/_mapping";
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

export async function getRentalPageData(propertyId: string, overrideCtx?: Ctx): Promise<RentalPageData> {
  const authCtx = overrideCtx ?? await requireCtx();

  const [
    leases,
    tenants,
    payments,
    expenses,
    documents,
    folders,
    maintenanceItems,
  ] = await Promise.all([
    cachedListLeases(authCtx, propertyId),
    cachedListTenants(authCtx, propertyId),
    cachedListPayments(authCtx, propertyId),
    cachedListExpenses(authCtx, propertyId),
    cachedListDocuments(authCtx, propertyId),
    cachedListFolders(authCtx, propertyId),
    cachedListMaintenanceItems(authCtx, propertyId),
  ]);

  return {
    leases,
    tenants,
    payments,
    expenses,
    documents,
    folders,
    maintenanceItems,
  };
}