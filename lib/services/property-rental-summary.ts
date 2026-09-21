import "server-only";
import type { Ctx } from "@/lib/services/_mapping";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { getProperty } from "@/lib/services/properties";
import {
  computePropertyRentalRollup,
  type PropertyRentalRollup,
} from "@/lib/data/derivations/rental";

// Per-property rental rollup for GET /api/v1/properties/[id]/rental.
//
// Returns null when the property is missing OR belongs to another org — getProperty is already
// org-scoped, so those two cases are indistinguishable here and both become a plain 404.
// Otherwise: one occupancy percent, one active-lease count, one summed monthly rent, and the
// next upcoming Pending Rent payment. Lease, tenant, and payment rows are read but never
// returned — no lease id, tenant id, unit, method, or payment id leaves this module.
export async function getPropertyRentalSummary(
  ctx: Ctx,
  propertyId: string,
): Promise<PropertyRentalRollup | null> {
  const property = await getProperty(ctx, propertyId);
  if (!property) return null;

  // Both service calls filter on orgId and property_id, so a cross-org property id can never
  // contribute rows even if it somehow resolved above.
  const [leases, payments] = await Promise.all([
    listLeases(ctx, propertyId),
    listPayments(ctx, propertyId),
  ]);

  return computePropertyRentalRollup(property, leases, payments);
}
