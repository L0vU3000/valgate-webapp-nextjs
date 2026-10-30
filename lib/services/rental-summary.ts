import "server-only";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Ctx } from "@/lib/services/_mapping";
import { listCertifications } from "@/lib/services/certifications";
import { countDocuments } from "@/lib/services/documents";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { listProperties } from "@/lib/services/properties";
import { listTenants } from "@/lib/services/tenants";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { computeAttention, type AttentionItem } from "@/lib/data/derivations/compliance";
import { computeMonthRentTotals } from "@/lib/data/derivations/portfolio";
import {
  isActiveSignedLease,
  computeDepositHeld,
  computeNextPayout,
  computeOccupancySummary,
  computeOverdue,
  computeRecentPaymentActivity,
  computeTenancyCount,
  type PaymentActivity,
} from "@/lib/data/derivations/rental";

export type RentalTenancy = {
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
  monthlyRentNumeric: number;
  currency: "USD";
  status: "paid" | "due" | "overdue" | "upcoming";
};

export type RentalHistoryMonth = {
  monthLabel: string;
  amountNumeric: number;
  paidCount: number;
  dueCount: number;
  state: "paid" | "in_progress" | "not_due";
};

export type RentalUpcomingPayment = {
  paymentId: string;
  propertyId: string;
  propertyName: string;
  /** Unix seconds; existing nextPayoutAt/activity dates remain Unix milliseconds. */
  dueAt: number;
  amountNumeric: number;
  currency: "USD";
  state: "due_soon" | "overdue";
};

// Portfolio rental rollup plus explicitly selected tenancy/history/payment preview fields.
// Raw service rows, lease ids, tenant ids, and internal org/user ids stay server-side.
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
  tenancies: RentalTenancy[];
  history: RentalHistoryMonth[];
  upcoming: RentalUpcomingPayment[];
};

// Loads the caller's org rental rows (plus certifications, safety risks, and a document count)
// and rolls them into the dashboard numbers. Returns zeros, nulls, and empty arrays when the org
// has no data — never a fabricated Oct-1 date or $0.
export async function getRentalSummary(ctx: Ctx): Promise<RentalSummary> {
  const [properties, leases, payments, certifications, risks, documentCount, tenants] = await Promise.all([
    listProperties(ctx),
    listLeases(ctx),
    listPayments(ctx),
    listCertifications(ctx),
    listSafetyRisks(ctx),
    countDocuments(ctx),
    listTenants(ctx),
  ]);

  const now = Date.now();
  const occupancy = computeOccupancySummary(properties, leases, now);
  const nextPayout = computeNextPayout(payments, now);
  const month = computeMonthRentTotals(payments, leases, now);
  const overdue = computeOverdue(payments);
  const monthEnd = nextMonthStart(month.monthStart);
  const rentPayments = payments.filter((p) => p.kind === "Rent");
  const currentRent = rentPayments.filter((p) => p.date >= month.monthStart && p.date < monthEnd);
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const leaseById = new Map(leases.map((l) => [l.id, l]));
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
    monthLabel: formatMonthLabel(month.monthStart),
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
    tenancies: leases.filter((l) => isActiveSignedLease(l, now) && propertyNames.has(l.propertyId)).map((l) => {
      const tenant = l.tenantId ? tenantById.get(l.tenantId) : undefined;
      return {
        propertyId: l.propertyId,
        propertyName: propertyNames.get(l.propertyId)!,
        tenantName: tenant?.propertyId === l.propertyId ? tenant.name : null,
        monthlyRentNumeric: l.monthlyRent,
        currency: "USD",
        status: tenancyStatus(l, currentRent, month.monthStart, now),
      };
    }),
    history: leases.length === 0 && rentPayments.length === 0
      ? []
      : rentalHistory(rentPayments, month.monthStart, now),
    upcoming: payments
      .filter((p) => p.status !== "Paid" && p.leaseId && propertyNames.has(leaseById.get(p.leaseId)?.propertyId ?? ""))
      .sort((a, b) => a.date - b.date || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map((p) => {
        const propertyId = leaseById.get(p.leaseId!)!.propertyId;
        return {
          paymentId: p.id,
          propertyId,
          propertyName: propertyNames.get(propertyId)!,
          dueAt: Math.floor(p.date / 1000),
          amountNumeric: p.amount,
          currency: "USD",
          state: p.date < now ? "overdue" : "due_soon",
        };
      }),
  };
}

function formatMonthLabel(monthStart: number): string {
  return new Date(monthStart).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) + " (UTC)";
}

function nextMonthStart(monthStart: number): number {
  const date = new Date(monthStart);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function tenancyStatus(lease: Lease, currentRent: Payment[], monthStart: number, now: number): RentalTenancy["status"] {
  const rows = currentRent.filter((p) => p.leaseId === lease.id);
  if (rows.length > 0) {
    const unpaid = rows.filter((p) => p.status !== "Paid");
    if (unpaid.length === 0) return "paid";
    // Payment.date is the due-date convention used by computeNextPayout; listPayments
    // deliberately strips the optional DB dueDate column from its domain objects.
    if (unpaid.some((p) => p.date < now)) return "overdue";
    return unpaid.some((p) => p.date === now) ? "due" : "upcoming";
  }

  // No stored due-day on Lease: recur on its UTC start day, clamped for short months.
  const month = new Date(monthStart);
  const lastDay = new Date(nextMonthStart(monthStart) - 1).getUTCDate();
  const dueDay = Math.min(new Date(lease.startDate).getUTCDate(), lastDay);
  const dueAt = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), dueDay);
  return dueAt <= now ? "due" : "upcoming";
}

function rentalHistory(rentPayments: Payment[], monthStart: number, now: number): RentalHistoryMonth[] {
  const month = new Date(monthStart);
  return Array.from({ length: 5 }, (_, index) => {
    const start = Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 4 + index, 1);
    const end = nextMonthStart(start);
    const rows = rentPayments.filter((p) => p.date >= start && p.date < end);
    const paid = rows.filter((p) => p.status === "Paid");
    return {
      monthLabel: formatMonthLabel(start),
      amountNumeric: paid.reduce((sum, p) => sum + p.amount, 0),
      paidCount: paid.length,
      dueCount: rows.length,
      // A month without recorded payments is not evidence of settled rent.
      state: start > now ? "not_due" : end <= now && rows.length > 0 && paid.length === rows.length ? "paid" : "in_progress",
    };
  });
}
