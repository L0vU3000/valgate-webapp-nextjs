import "server-only";
import type { Ctx } from "@/lib/services/_mapping";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { listProperties } from "@/lib/services/properties";
import {
  computeNextPayout,
  computeOccupancySummary,
  computeTenancyCount,
} from "@/lib/data/derivations/rental";

// Portfolio rental rollup for GET /api/v1/rental. Counts and amounts only —
// no lease, tenant, or payment rows leave this module.
export type RentalSummary = {
  occupancyPercent: number;
  occupiedCount: number;
  totalCount: number;
  tenancyCount: number;
  nextPayoutAmountNumeric: number | null;
  nextPayoutAt: number | null;
};

// Loads the caller's org properties, leases, and payments, then rolls them into
// occupancy, tenancy count, and the next pending Rent payout. Returns zeros and
// nulls when the org has no rental data — never a fabricated Oct-1 date or $0.
export async function getRentalSummary(ctx: Ctx): Promise<RentalSummary> {
  const [properties, leases, payments] = await Promise.all([
    listProperties(ctx),
    listLeases(ctx),
    listPayments(ctx),
  ]);

  const occupancy = computeOccupancySummary(properties, leases);
  const nextPayout = computeNextPayout(payments);

  return {
    occupancyPercent: occupancy.percent,
    occupiedCount: occupancy.occupiedCount,
    totalCount: occupancy.totalCount,
    tenancyCount: computeTenancyCount(leases),
    nextPayoutAmountNumeric: nextPayout ? nextPayout.amountNumeric : null,
    nextPayoutAt: nextPayout ? nextPayout.at : null,
  };
}
