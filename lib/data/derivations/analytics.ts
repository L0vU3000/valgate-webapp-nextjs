import type { Property } from "@/lib/data/types/property";
import type { Payment } from "@/lib/data/types/payment";
import type { Lease } from "@/lib/data/types/lease";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";

export type RevenueDataPoint = {
  month: string;
  revenue: number;
  expenses: number;
};

export type KpiIconKey = "DollarSign" | "TrendingUp" | "Building2" | "Percent" | "Wrench";

export type KpiCard = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  iconKey: KpiIconKey;
};

export type LeasePipelineItem = {
  range: string;
  units: number;
  pct: number;
  color: string;
};

export type CapitalGrowthItem = {
  rank: string;
  name: string;
  growth: string;
  pct: number;
};

export type MaintenanceSpendItem = {
  month: string;
  value: number;
};

export type ExpenseBreakdownItem = {
  name: string;
  pct: number;
  color: string;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeRevenueSeries(
  payments: Payment[],
  maintenance: MaintenanceItem[],
): RevenueDataPoint[] {
  const months = lastNMonthsWindow(9);
  return months.map(({ start, end, label }) => {
    const revenue = payments
      .filter((p) => p.status === "Paid" && p.kind === "Rent" && p.date >= start && p.date < end)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const expenses = maintenance
      .filter((m) => m.createdAt >= start && m.createdAt < end)
      .length * 0;
    return { month: label, revenue, expenses };
  });
}

export function computeKpiCards(
  properties: Property[],
  payments: Payment[],
  leases: Lease[],
  maintenance: MaintenanceItem[],
): KpiCard[] {
  const totalRevenue = payments
    .filter((p) => p.status === "Paid" && p.kind === "Rent")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const active = properties.filter((p) => !p.isArchived);
  const occupancyPct =
    active.length === 0
      ? 0
      : Math.round(
          (active.filter((p) => p.status === "Rented").length /
            active.length) *
            1000,
        ) / 10;

  const totalLeases = leases.length;
  const signedLeases = leases.filter((l) => l.stage === "Signed").length;
  const collectionPct =
    totalLeases === 0 ? 0 : Math.round((signedLeases / totalLeases) * 1000) / 10;

  const maintenanceTotal = maintenance.length;

  return [
    {
      label: "Total Revenue",
      value: payments.length === 0 ? "$0" : `$${totalRevenue.toLocaleString()}`,
      change: "—",
      positive: true,
      iconKey: "DollarSign",
    },
    {
      label: "NOI",
      value: payments.length === 0 ? "$0" : `$${totalRevenue.toLocaleString()}`,
      change: "—",
      positive: true,
      iconKey: "TrendingUp",
    },
    {
      label: "Occupancy",
      value: properties.length === 0 ? "0%" : `${occupancyPct}%`,
      change: "—",
      positive: true,
      iconKey: "Building2",
    },
    {
      label: "Rent\nCollection",
      value: totalLeases === 0 ? "0%" : `${collectionPct}%`,
      change: "—",
      positive: true,
      iconKey: "Percent",
    },
    {
      label: "Maintenance",
      value: maintenanceTotal === 0 ? "$0" : `${maintenanceTotal} open`,
      change: "—",
      positive: true,
      iconKey: "Wrench",
    },
  ];
}

export function computeLeasePipeline(leases: Lease[]): LeasePipelineItem[] {
  const now = Date.now();
  const buckets = [
    { range: "0-3 Months", min: 0, max: 90, color: "#fb7185" },
    { range: "4-6 Months", min: 91, max: 180, color: "#fbbf24" },
    { range: "7-12 Months", min: 181, max: 365, color: "#34d399" },
  ];

  const totals = buckets.map(
    (b) =>
      leases.filter((l) => {
        const days = Math.floor((l.endDate - now) / 86_400_000);
        return days >= b.min && days <= b.max;
      }).length,
  );
  const max = Math.max(0, ...totals);

  return buckets.map((b, i) => ({
    range: b.range,
    units: totals[i],
    pct: max === 0 ? 0 : Math.round((totals[i] / max) * 100),
    color: b.color,
  }));
}

export function computeCapitalGrowth(
  properties: Property[],
  valuations: PropertyValuation[],
): CapitalGrowthItem[] {
  if (properties.length === 0) return [];

  const valuationsByProp = new Map<string, PropertyValuation[]>();
  for (const v of valuations) {
    if (!valuationsByProp.has(v.propertyId)) valuationsByProp.set(v.propertyId, []);
    valuationsByProp.get(v.propertyId)!.push(v);
  }

  const rows = properties
    .map((p) => {
      const series = (valuationsByProp.get(p.id) ?? []).slice().sort(
        (a, b) => a.recordedAt - b.recordedAt,
      );
      if (series.length < 2) return null;
      const first = series[0].price;
      const last = series[series.length - 1].price;
      if (first === 0) return null;
      const growthPct = ((last - first) / first) * 100;
      return { name: p.name, growthPct };
    })
    .filter((r): r is { name: string; growthPct: number } => r !== null)
    .sort((a, b) => b.growthPct - a.growthPct)
    .slice(0, 3);

  if (rows.length === 0) return [];
  const peak = rows[0].growthPct;

  return rows.map((r, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    name: r.name,
    growth: `${r.growthPct >= 0 ? "+" : ""}${r.growthPct.toFixed(1)}%`,
    pct: peak === 0 ? 0 : Math.round((r.growthPct / peak) * 100),
  }));
}

export function computeMaintenanceSpend(
  maintenance: MaintenanceItem[],
): MaintenanceSpendItem[] {
  const months = lastNMonthsWindow(6);
  return months.map(({ start, end, label }) => ({
    month: label.toUpperCase(),
    value: maintenance.filter((m) => m.createdAt >= start && m.createdAt < end).length,
  }));
}

export function computeExpenseBreakdown(
  maintenance: MaintenanceItem[],
  properties: Property[],
): ExpenseBreakdownItem[] {
  const maintenanceCount = maintenance.length;
  const taxesTotal = properties.reduce(
    (sum, p) => sum + (p.annualPropertyTax ?? 0),
    0,
  );
  const insuranceTotal = properties.reduce(
    (sum, p) => sum + (p.annualInsurance ?? 0),
    0,
  );
  const total = maintenanceCount + taxesTotal + insuranceTotal;

  if (total === 0) {
    return [
      { name: "Maintenance", pct: 0, color: "#2563eb" },
      { name: "Utilities", pct: 0, color: "#fbbf24" },
      { name: "Taxes", pct: 0, color: "#10b981" },
    ];
  }

  return [
    { name: "Maintenance", pct: Math.round((maintenanceCount / total) * 100), color: "#2563eb" },
    { name: "Utilities", pct: Math.round((insuranceTotal / total) * 100), color: "#fbbf24" },
    { name: "Taxes", pct: Math.round((taxesTotal / total) * 100), color: "#10b981" },
  ];
}

function lastNMonthsWindow(
  n: number,
): { start: number; end: number; label: string }[] {
  const out: { start: number; end: number; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({
      start: d.getTime(),
      end: next.getTime(),
      label: MONTH_LABELS[d.getMonth()],
    });
  }
  return out;
}
