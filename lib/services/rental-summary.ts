import "server-only";
import type { Ctx } from "@/lib/services/_mapping";
import { listCertifications } from "@/lib/services/certifications";
import { countDocuments } from "@/lib/services/documents";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { listProperties } from "@/lib/services/properties";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { computeAttention, type AttentionItem } from "@/lib/data/derivations/compliance";
import { computeMonthRentTotals } from "@/lib/data/derivations/portfolio";
import {
  computeDepositHeld,
  computeNextPayout,
  computeOccupancySummary,
  computeOverdue,
  computeRecentPaymentActivity,
  computeTenancyCount,
  type PaymentActivity,
} from "@/lib/data/derivations/rental";

// Portfolio rental rollup for GET /api/v1/rental. Counts, amounts, and display-only peek rows —
// no lease, tenant, payment, or document ids leave this module.
export type RentalSummary = {
  occupancyPercent: number;
  occupiedCount: number;
  totalCount: number;
  tenancyCount: number;
  nextPayoutAmountNumeric: number | null;
  nextPayoutAt: number | null;
  monthLabel: string;
  collectedAmountNumeric: number | null;
  expectedAmountNumeric: number | null;
  paidCount: number;
  dueCount: number;
  overdueAmountNumeric: number | null;
  overdueCount: number;
  depositHeldNumeric: number | null;
  documentCount: number;
  attention: AttentionItem[];
  activity: PaymentActivity[];
};

// Loads the caller's org rental rows (plus certifications, safety risks, and a document count)
// and rolls them into the dashboard numbers. Returns zeros, nulls, and empty arrays when the org
// has no data — never a fabricated Oct-1 date or $0.
export async function getRentalSummary(ctx: Ctx): Promise<RentalSummary> {
  const [properties, leases, payments, certifications, risks, documentCount] = await Promise.all([
    listProperties(ctx),
    listLeases(ctx),
    listPayments(ctx),
    listCertifications(ctx),
    listSafetyRisks(ctx),
    countDocuments(ctx),
  ]);

  const now = Date.now();
  const occupancy = computeOccupancySummary(properties, leases, now);
  const nextPayout = computeNextPayout(payments, now);
  const month = computeMonthRentTotals(payments, leases, now);
  const overdue = computeOverdue(payments);
  const propertyNames = new Map(properties.map((p) => [p.id, p.name]));
  // "Not collected" (null) only when there is nothing due and nothing paid; "$0 of $9,240" is real.
  const hasMonthData = month.dueCount > 0 || month.paidCount > 0;

  return {
    occupancyPercent: occupancy.percent,
    occupiedCount: occupancy.occupiedCount,
    totalCount: occupancy.totalCount,
    tenancyCount: computeTenancyCount(leases, now),
    nextPayoutAmountNumeric: nextPayout ? nextPayout.amountNumeric : null,
    nextPayoutAt: nextPayout ? nextPayout.at : null,
    monthLabel:
      new Date(month.monthStart).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) +
      " (UTC)",
    collectedAmountNumeric: hasMonthData ? month.collectedRaw : null,
    expectedAmountNumeric: month.dueCount > 0 ? month.expectedRaw : null,
    paidCount: month.paidCount,
    dueCount: month.dueCount,
    overdueAmountNumeric: overdue.amountNumeric,
    overdueCount: overdue.count,
    depositHeldNumeric: computeDepositHeld(payments),
    documentCount,
    attention: computeAttention(certifications, risks, propertyNames, 5, now),
    activity: computeRecentPaymentActivity(payments, leases, properties, 5, now),
  };
}
