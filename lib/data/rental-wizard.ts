import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";

export async function getRentalWizardInitial(propertyId: string): Promise<{
  property: Property | null;
  activeLease: Lease | null;
  primaryTenant: Tenant | null;
  recentPayments: Payment[];
}> {
  const userId = getCurrentUserId();
  const property = await db.properties.get(userId, propertyId);

  const allLeases = await db.leases.list(userId);
  const propertyLeases = allLeases.filter((l) => l.propertyId === propertyId);
  const activeLease = propertyLeases
    .filter((l) => l.stage === "Signed")
    .sort((a, b) => (b.startDate ?? 0) - (a.startDate ?? 0))[0] ?? null;

  const allTenants = await db.tenants.list(userId);
  const primaryTenant = allTenants.find((t) => t.propertyId === propertyId) ?? null;

  const allPayments = await db.payments.list(userId);
  const leaseIds = new Set(propertyLeases.map((l) => l.id));
  const recentPayments = allPayments
    .filter((p) => p.leaseId != null && leaseIds.has(p.leaseId))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, 5);

  return { property, activeLease, primaryTenant, recentPayments };
}
