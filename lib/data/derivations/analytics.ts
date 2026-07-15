import type { Property } from "@/lib/data/types/property";
import type { Payment } from "@/lib/data/types/payment";
import type { Lease } from "@/lib/data/types/lease";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Expense } from "@/lib/data/types/expense";

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

export type DateWindow = { from: number; to: number };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UTC_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const EXPENSE_COLORS: Record<string, string> = {
  Maintenance: "#2563eb",
  Utilities:   "#fbbf24",
  Insurance:   "#f97316",
  Tax:         "#10b981",
  Management:  "#8b5cf6",
  Other:       "#6b7280",
};

export function periodToWindow(period: string): DateWindow {
  const now = Date.now();
  const d = new Date();
  switch (period) {
    case "MTD": return { from: Date.UTC(d.getFullYear(), d.getMonth(), 1), to: now };
    case "QTD": {
      const q = Math.floor(d.getMonth() / 3) * 3;
      return { from: Date.UTC(d.getFullYear(), q, 1), to: now };
    }
    case "YTD": return { from: Date.UTC(d.getFullYear(), 0, 1), to: now };
    case "12M":
    case "Custom":
    default: return { from: Date.UTC(d.getFullYear(), d.getMonth() - 11, 1), to: now };
  }
}

function monthsInWindow(window: DateWindow): { start: number; end: number; label: string }[] {
  const out: { start: number; end: number; label: string }[] = [];
  const d = new Date(window.from);
  let year = d.getUTCFullYear(), month = d.getUTCMonth();
  while (true) {
    const start = Date.UTC(year, month, 1);
    const end = Date.UTC(year, month + 1, 1);
    if (start >= window.to) break;
    out.push({ start, end: Math.min(end, window.to), label: MONTH_LABELS[month]! });
    month++; if (month > 11) { month = 0; year++; }
  }
  return out;
}

function isPaidRentWithinWindow(payment: Payment, window: DateWindow): boolean {
  return (
    payment.kind === "Rent" &&
    payment.status === "Paid" &&
    payment.date >= window.from &&
    payment.date < window.to
  );
}

function isExpenseWithinWindow(expense: Expense, window: DateWindow): boolean {
  return expense.date >= window.from && expense.date < window.to;
}

function formatUtcMonthAndYear(timestamp: number): string {
  return UTC_MONTH_YEAR_FORMATTER.format(new Date(timestamp)).toUpperCase();
}

export function computeRevenueTimelineLabel(
  payments: Payment[],
  expenses: Expense[],
  window: DateWindow,
): string | null {
  const contributingDates: number[] = [];

  for (const payment of payments) {
    if (isPaidRentWithinWindow(payment, window)) {
      contributingDates.push(payment.date);
    }
  }

  for (const expense of expenses) {
    if (isExpenseWithinWindow(expense, window)) {
      contributingDates.push(expense.date);
    }
  }

  if (contributingDates.length === 0) {
    return null;
  }

  const earliestDate = Math.min(...contributingDates);
  const latestDate = Math.max(...contributingDates);

  return `${formatUtcMonthAndYear(earliestDate)} - ${formatUtcMonthAndYear(latestDate)}`;
}

export function computeRevenueSeries(
  payments: Payment[],
  expenses: Expense[],
  window: DateWindow,
): RevenueDataPoint[] {
  const months = monthsInWindow(window);
  return months.map(({ start, end, label }) => {
    const monthWindow: DateWindow = { from: start, to: end };
    const revenue = payments
      .filter((payment) => isPaidRentWithinWindow(payment, monthWindow))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const expenseTotal = expenses
      .filter((expense) => isExpenseWithinWindow(expense, monthWindow))
      .reduce((sum, e) => sum + e.amount, 0);
    return { month: label, revenue, expenses: expenseTotal };
  });
}

export function computeKpiCards(
  properties: Property[],
  payments: Payment[],
  leases: Lease[],
  maintenance: MaintenanceItem[],
  expenses: Expense[],
  window: DateWindow,
): KpiCard[] {
  const windowPayments = payments.filter(
    (p) => p.status === "Paid" && p.kind === "Rent" && p.date >= window.from && p.date < window.to,
  );
  const totalRevenue = windowPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const windowExpenses = expenses
    .filter((e) => e.date >= window.from && e.date < window.to)
    .reduce((sum, e) => sum + e.amount, 0);
  const noi = totalRevenue - windowExpenses;

  const active = properties.filter((p) => !p.isArchived);
  const occupiedCount = active.filter(
    (p) => p.status === "Rented" || p.status === "Owner-Occupied",
  ).length;
  // Occupancy is point-in-time — NOT filtered by window
  const occupancyPct = active.length === 0 ? 0 :
    Math.round((occupiedCount / active.length) * 1000) / 10;

  const totalLeases = leases.length;
  const signedLeases = leases.filter((l) => l.stage === "Signed").length;
  const collectionPct =
    totalLeases === 0 ? 0 : Math.round((signedLeases / totalLeases) * 1000) / 10;

  const maintenanceTotal = maintenance.length;

  return [
    {
      label: "Total Revenue",
      value: windowPayments.length === 0 ? "$0" : `$${totalRevenue.toLocaleString()}`,
      change: "—",
      positive: true,
      iconKey: "DollarSign",
    },
    {
      label: "NOI",
      value: `$${noi.toLocaleString()}`,
      change: "—",
      positive: noi >= 0,
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
    units: totals[i]!,
    pct: max === 0 ? 0 : Math.round((totals[i]! / max) * 100),
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
      const first = series[0]!.price;
      const last = series[series.length - 1]!.price;
      if (first === 0) return null;
      const growthPct = ((last - first) / first) * 100;
      return { name: p.name, growthPct };
    })
    .filter((r): r is { name: string; growthPct: number } => r !== null)
    .sort((a, b) => b.growthPct - a.growthPct)
    .slice(0, 3);

  if (rows.length === 0) return [];
  const peak = rows[0]!.growthPct;

  return rows.map((r, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    name: r.name,
    growth: `${r.growthPct >= 0 ? "+" : ""}${r.growthPct.toFixed(1)}%`,
    pct: peak === 0 ? 0 : Math.round((r.growthPct / peak) * 100),
  }));
}

export function computeMaintenanceSpend(
  expenses: Expense[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _window: DateWindow,
): MaintenanceSpendItem[] {
  const now = Date.now();
  const d = new Date();
  // Always trailing 6M — card is labeled "6M"
  const sixM: DateWindow = { from: Date.UTC(d.getFullYear(), d.getMonth() - 5, 1), to: now };
  const months = monthsInWindow(sixM);
  const maintenanceExpenses = expenses.filter((e) => e.category === "Maintenance");
  return months.map(({ start, end, label }) => ({
    month: label.toUpperCase(),
    value: maintenanceExpenses
      .filter((e) => e.date >= start && e.date < end)
      .reduce((sum, e) => sum + e.amount, 0),
  }));
}

export function computeExpenseBreakdown(
  expenses: Expense[],
  window: DateWindow,
): { items: ExpenseBreakdownItem[]; total: number } {
  const windowExpenses = expenses.filter((e) => e.date >= window.from && e.date < window.to);
  const total = windowExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (total === 0) return { items: [], total: 0 };

  const byCategory = new Map<string, number>();
  for (const e of windowExpenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }

  const items: ExpenseBreakdownItem[] = [];
  for (const [name, amount] of byCategory) {
    if (amount > 0) {
      items.push({
        name,
        pct: Math.round((amount / total) * 100),
        color: EXPENSE_COLORS[name] ?? "#6b7280",
      });
    }
  }

  return { items, total };
}
