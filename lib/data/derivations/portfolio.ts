import type { Property, PropertyListItem, PropertyStatus } from "@/lib/data/types/property";
import type { Payment } from "@/lib/data/types/payment";
import type { Lease } from "@/lib/data/types/lease";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import { formatCurrency } from "@/lib/format";

export type PortfolioStats = {
  totalProperties: number;
  totalValue: number;
  rentedCount: number;
  vacantCount: number;
  occupancyRate: number;
  avgProgress: number;
};

export type YoyGrowth =
  | { kind: "unknown" }
  | { kind: "positive"; formatted: string }
  | { kind: "negative"; formatted: string };

export type PortfolioKpis = {
  totalValueFormatted: string;
  monthlyExpected: string;
  monthlyCollected: string;
  isUnderCollected: boolean;
  monthLabel: string;
  yoyGrowth: YoyGrowth;
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

function computeYoyGrowth(
  properties: Property[],
  valuations: PropertyValuation[],
): YoyGrowth {
  if (valuations.length === 0) return { kind: "unknown" };

  const MS_IN_YEAR = 365 * 24 * 60 * 60 * 1000;
  const activeIds = new Set(
    properties
      .filter((p) => !p.isArchived && !INACTIVE_STATUSES.includes(p.status))
      .map((p) => p.id),
  );

  let latestTotal = 0;
  let priorTotal = 0;
  let hasPrior = false;

  for (const propertyId of activeIds) {
    const propVals = valuations
      .filter((v) => v.propertyId === propertyId)
      .sort((a, b) => a.recordedAt - b.recordedAt);

    if (propVals.length === 0) continue;

    const latest = propVals.at(-1)!;
    latestTotal += latest.price;

    const target = latest.recordedAt - MS_IN_YEAR;
    const prior = propVals
      .filter((v) => v.recordedAt < latest.recordedAt)
      .reduce<PropertyValuation | null>((best, v) => {
        if (!best) return v;
        return Math.abs(v.recordedAt - target) < Math.abs(best.recordedAt - target) ? v : best;
      }, null);

    if (prior) {
      priorTotal += prior.price;
      hasPrior = true;
    }
  }

  if (!hasPrior) return { kind: "unknown" };

  const delta = latestTotal - priorTotal;
  const formatted = formatCurrency(Math.abs(delta));
  return delta >= 0
    ? { kind: "positive", formatted: `+${formatted}` }
    : { kind: "negative", formatted: `-${formatted}` };
}

export function computeKpis(
  properties: Property[],
  payments: Payment[],
  leases: Lease[],
  valuations: PropertyValuation[],
  totalValue: number,
): PortfolioKpis {
  const active = properties.filter(
    (p) => !p.isArchived && !INACTIVE_STATUSES.includes(p.status),
  );

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  const expectedRaw = leases
    .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
    .reduce((sum, l) => sum + l.monthlyRent, 0);

  const collectedRaw = payments
    .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

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
    yoyGrowth: computeYoyGrowth(properties, valuations),
    newThisMonth,
  };
}
