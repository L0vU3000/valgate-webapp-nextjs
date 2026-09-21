import type { Ctx } from "@/lib/services/_mapping";
import { toRentalSummaryDto, type RentalSummaryDtoV1 } from "@/lib/api/v1/dto";

// DTOs for the rental slice.
//
// This lives in its own file rather than lib/api/v1/dto.ts because dto.ts is a shared file
// touched concurrently by the valuation/parity branch — splitting avoids a merge conflict on
// a file three agents are editing. The org-wide RentalSummaryDtoV1 / toRentalSummaryDto still
// live in dto.ts and are re-exported here so the rental surface has one import site.
export { toRentalSummaryDto };
export type { RentalSummaryDtoV1 };

// GET /api/v1/properties/{id}/rental — the property-scoped Rental screen shape.
//
// Screen-shaped aggregate only, per the contract's explicit non-goal ("no lease, payment, or
// tenant list endpoints"): these five fields are every number the property Rental screen shows.
// Deliberately withheld: property id, lease ids, tenant ids, unit names, payment ids/methods,
// per-payment dates, and the lease/payment rows themselves.
export type PropertyRentalSummaryDtoV1 = {
  /** Integer 0–100. 100 when occupied (Owner-Occupied or an active Signed lease), else 0. */
  occupancyPercent: number;
  /** Currently active Signed leases for this property. */
  activeLeaseCount: number;
  /** Sum of monthlyRent over those active leases. 0 when there are none. */
  monthlyRentNumeric: number;
  /** Sum of Pending Rent on the next upcoming UTC day. Null when none exists. */
  nextPaymentAmountNumeric: number | null;
  /** Unix ms of the earliest payment on that day. Null when none exists. */
  nextPaymentAt: number | null;
  /** "USD" only when a real upcoming payment exists; v1 is USD-only. */
  currency: "USD" | null;
};

// The service already returns safe numbers (0 for missing, null for absent dates), so this is a
// straight field-picking copy — never a spread, so a field added to the rollup cannot silently
// reach the wire. The only derived value is currency, which mirrors toRentalSummaryDto's rule:
// no payment, no currency code.
export type PropertyRentalSummarySource = {
  occupancyPercent: number;
  activeLeaseCount: number;
  monthlyRentNumeric: number;
  nextPaymentAmountNumeric: number | null;
  nextPaymentAt: number | null;
};

function safePercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(100, Math.round(value));
}

function safeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

function safeAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function toPropertyRentalSummaryDto(
  summary: PropertyRentalSummarySource,
): PropertyRentalSummaryDtoV1 {
  const amount = summary.nextPaymentAmountNumeric;
  const at = summary.nextPaymentAt;
  const hasPayment =
    amount !== null && at !== null && Number.isFinite(amount) && amount > 0 && Number.isFinite(at) && at >= 0;

  return {
    occupancyPercent: safePercent(summary.occupancyPercent),
    activeLeaseCount: safeCount(summary.activeLeaseCount),
    monthlyRentNumeric: safeAmount(summary.monthlyRentNumeric),
    nextPaymentAmountNumeric: hasPayment ? amount : null,
    nextPaymentAt: hasPayment ? at : null,
    currency: hasPayment ? "USD" : null,
  };
}

// Kept as a reference to the shared Ctx type so a future org-scoped field addition stays
// type-checked against the same role union the rest of v1 uses.
export type PropertyRentalRoleV1 = Ctx["orgRole"];
