import type { Property, PropertyListItem, PropertyStatus } from "@/lib/data/types/property";
import type { Payment } from "@/lib/data/types/payment";
import type { Lease } from "@/lib/data/types/lease";
import { formatCurrency } from "@/lib/format";

export type PortfolioStats = {
  totalProperties: number;
  totalValue: number;
  rentedCount: number;
  vacantCount: number;
  occupancyRate: number;
  avgProgress: number;
};

export type PortfolioKpis = {
  totalValueFormatted: string;
  monthlyExpected: string;
  monthlyCollected: string;
  isUnderCollected: boolean;
  monthLabel: string;
  newThisMonth: number;
};

const INACTIVE_STATUSES: PropertyStatus[] = ["Sold", "Archived"];

export function computeStats(items: PropertyListItem[]): PortfolioStats {
  const active = items.filter(
    (p) => !p.isArchived && !INACTIVE_STATUSES.includes(p.status),
  );
  const n = active.length;
  const totalValue = active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0);
  const rentedCount = active.filter((p) => p.status === "Rented").length;

  return {
    totalProperties: n,
    totalValue,
    rentedCount,
    vacantCount: active.filter((p) => p.status === "Vacant").length,
    occupancyRate: n === 0 ? 0 : Math.round((rentedCount / n) * 100),
    avgProgress: n === 0 ? 0 : Math.round(active.reduce((sum, p) => sum + p.progress, 0) / n),
  };
}

export type MonthRentTotals = {
  monthStart: number;
  expectedRaw: number;
  collectedRaw: number;
  // Paid Rent payments this month / Signed leases still running this month ("2 of 3 paid").
  paidCount: number;
  dueCount: number;
};

// Raw numbers behind the KPI "collected of expected" tile. computeKpis formats these for the
// web; GET /api/v1/rental publishes them unformatted. One copy of the filters, not two.
export function computeMonthRentTotals(
  payments: Payment[],
  leases: Lease[],
  nowMs: number = Date.now(),
): MonthRentTotals {
  const now = new Date(nowMs);
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  const due = leases.filter((l) => l.stage === "Signed" && l.endDate >= monthStart);
  const paid = payments.filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart);

  return {
    monthStart,
    expectedRaw: due.reduce((sum, l) => sum + l.monthlyRent, 0),
    collectedRaw: paid.reduce((sum, p) => sum + (p.amount ?? 0), 0),
    paidCount: paid.length,
    dueCount: due.length,
  };
}

export function computeKpis(
  properties: Property[],
  payments: Payment[],
  leases: Lease[],
  totalValue: number,
): PortfolioKpis {
  const active = properties.filter(
    (p) => !p.isArchived && !INACTIVE_STATUSES.includes(p.status),
  );

  const { monthStart, expectedRaw, collectedRaw } = computeMonthRentTotals(payments, leases);

  const newThisMonth = active.filter(
    (p) => (p.createdAt ?? 0) >= monthStart,
  ).length;

  const monthLabel =
    new Date(monthStart).toLocaleString("en-US", { month: "long", timeZone: "UTC" }) + " (UTC)";

  return {
    totalValueFormatted: active.length === 0 ? "$0" : formatCurrency(totalValue),
    monthlyExpected: formatCurrency(expectedRaw),
    monthlyCollected: formatCurrency(collectedRaw),
    isUnderCollected: expectedRaw > 0 && collectedRaw < expectedRaw,
    monthLabel,
    newThisMonth,
  };
}
