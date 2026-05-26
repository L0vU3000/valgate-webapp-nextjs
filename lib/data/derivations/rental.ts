import type { Lease, LeaseStage } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { Property } from "@/lib/data/types/property";
import type { Expense } from "@/lib/data/types/expense";

export type PipelineCard = {
  unit: string;
  detail: string;
  faded?: boolean;
};

export type PipelineStage = {
  label: string;
  count: number;
  color: string;
  countBg: string;
  cards: PipelineCard[];
  borderColor: string;
};

export type ArrearsBucket = {
  label: string;
  amount: string;
  width: string;
  color: string;
};

export type MaintenanceSummaryItem = {
  label: string;
  count: number;
  color: string;
};

export type UpcomingEvent = {
  time: string;
  timeColor: string;
  title: string;
  detail: string;
  dotColor: string;
  active?: boolean;
};

const DAY_MS = 86_400_000;

const STAGE_CONFIG: Record<
  LeaseStage,
  { color: string; countBg: string; borderColor: string }
> = {
  Approaching: {
    color: "text-slate-400",
    countBg: "bg-slate-200 text-slate-600",
    borderColor: "",
  },
  Offered: {
    color: "text-blue-600",
    countBg: "bg-blue-100 text-blue-600",
    borderColor: "border-l-blue-500",
  },
  Signed: {
    color: "text-green-600",
    countBg: "bg-green-100 text-green-600",
    borderColor: "border-l-green-500",
  },
  Declined: {
    color: "text-red-700",
    countBg: "bg-red-100 text-red-700",
    borderColor: "",
  },
};

export function computePipeline(leases: Lease[]): PipelineStage[] {
  const order: LeaseStage[] = ["Approaching", "Offered", "Signed", "Declined"];
  const now = Date.now();

  return order.map((stage) => {
    const inStage = leases.filter((l) => l.stage === stage);
    const cards: PipelineCard[] = inStage.slice(0, 2).map((l) => {
      let detail = "";
      if (stage === "Approaching") {
        const days = Math.max(0, Math.round((l.endDate - now) / DAY_MS));
        detail = `Exp: ${days} Days`;
      } else if (stage === "Offered") {
        const days = Math.max(0, Math.round((now - l.startDate) / DAY_MS));
        detail = `Sent: ${days} Days ago`;
      } else if (stage === "Signed") {
        detail = `Effective: ${new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      } else {
        detail = `Moving: ${new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return {
        unit: l.unit,
        detail,
        faded: stage === "Declined" ? true : undefined,
      };
    });
    return {
      label: stage,
      count: inStage.length,
      cards,
      ...STAGE_CONFIG[stage],
    };
  });
}

export function computeArrears(payments: Payment[]): ArrearsBucket[] {
  const now = Date.now();
  const buckets: { label: string; min: number; max: number; color: string }[] = [
    { label: "0-30d", min: 0, max: 30, color: "bg-blue-700" },
    { label: "31-60d", min: 31, max: 60, color: "bg-amber-400" },
    { label: "61-90d", min: 61, max: 90, color: "bg-red-700" },
  ];

  const overdue = payments.filter((p) => p.status === "Overdue");
  const totals = buckets.map((b) => {
    const inBucket = overdue.filter((p) => {
      const ageDays = Math.floor((now - p.date) / DAY_MS);
      return ageDays >= b.min && ageDays <= b.max;
    });
    return inBucket.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  });
  const max = Math.max(0, ...totals);

  return buckets.map((b, i) => ({
    label: b.label,
    amount: `$${totals[i].toLocaleString()}`,
    width: max === 0 ? "0%" : `${Math.round((totals[i] / max) * 100)}%`,
    color: b.color,
  }));
}

export function computeMaintenanceTotal(items: MaintenanceItem[]): string {
  const total = items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  return `$${total.toLocaleString()}`;
}

export function computeMaintenanceSummary(
  items: MaintenanceItem[],
): MaintenanceSummaryItem[] {
  const sevs: { label: MaintenanceItem["severity"]; color: string }[] = [
    { label: "Emergency", color: "bg-red-700" },
    { label: "Urgent", color: "bg-amber-500" },
    { label: "Standard", color: "bg-slate-300" },
  ];
  return sevs.map((s) => ({
    label: s.label,
    count: items.filter((i) => i.severity === s.label && i.status !== "Resolved").length,
    color: s.color,
  }));
}

export function computeUpcomingEvents(
  leases: Lease[],
  maintenance: MaintenanceItem[],
  payments: Payment[],
): UpcomingEvent[] {
  const now = Date.now();
  const horizon = now + 14 * DAY_MS;

  type Candidate = { at: number; title: string; detail: string };
  const candidates: Candidate[] = [];

  for (const l of leases) {
    if (l.endDate >= now && l.endDate <= horizon) {
      candidates.push({
        at: l.endDate,
        title: `Lease expiring: ${l.unit}`,
        detail: l.tenantId ? `Tenant: ${l.tenantId}` : "",
      });
    }
  }
  for (const m of maintenance) {
    if (m.status !== "Resolved" && m.createdAt >= now - 7 * DAY_MS) {
      candidates.push({
        at: m.createdAt,
        title: m.title,
        detail: `Severity: ${m.severity}`,
      });
    }
  }
  for (const p of payments) {
    if (p.status === "Pending" && p.date >= now && p.date <= horizon) {
      candidates.push({
        at: p.date,
        title: `Payment due: ${p.kind}`,
        detail: `Amount: $${p.amount.toLocaleString()}`,
      });
    }
  }

  candidates.sort((a, b) => a.at - b.at);

  return candidates.slice(0, 5).map((c, i) => ({
    time: formatEventTime(c.at),
    timeColor: i === 0 ? "text-blue-600" : "text-slate-400",
    title: c.title,
    detail: c.detail,
    dotColor: i === 0 ? "bg-blue-500" : "bg-slate-300",
    active: i === 0 ? true : undefined,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Heatmap types (moved here so derivation + component share them)          */
/* -------------------------------------------------------------------------- */

export type UnitStatus = "occupied" | "vacant" | "expiring";

export interface HeatmapUnit {
  id: string;
  name: string;
  status: UnitStatus;
  tenant?: string;
  rent: number;
  leaseEnd?: string;
}

export interface PropertyCluster {
  property: string;
  units: HeatmapUnit[];
}

/* -------------------------------------------------------------------------- */
/*  Top-spend type                                                            */
/* -------------------------------------------------------------------------- */

export interface TopSpend {
  category: string;
  amount: string;
  pct: string;
}

/* -------------------------------------------------------------------------- */
/*  Q3.M — Billing Recovery: paid Rent payments / all Rent payments          */
/* -------------------------------------------------------------------------- */

export function computeRecoveryRate(payments: Payment[]): string {
  const rentPayments = payments.filter((p) => p.kind === "Rent");
  if (rentPayments.length === 0) return "—";
  const paid = rentPayments
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + p.amount, 0);
  const total = rentPayments.reduce((s, p) => s + p.amount, 0);
  if (total === 0) return "—";
  return `${((paid / total) * 100).toFixed(1)}%`;
}

/* -------------------------------------------------------------------------- */
/*  Q3.N — Eviction Risk: leases with latest Rent payment overdue > 60d     */
/* -------------------------------------------------------------------------- */

export function computeEvictionRisk(payments: Payment[], leases: Lease[]): string {
  const now = Date.now();
  let count = 0;
  for (const lease of leases) {
    const leasePayments = payments
      .filter((p) => p.leaseId === lease.id && p.kind === "Rent")
      .sort((a, b) => b.date - a.date);
    if (leasePayments.length === 0) continue;
    const latest = leasePayments[0];
    if (latest.status !== "Overdue") continue;
    if (Math.floor((now - latest.date) / DAY_MS) > 60) count++;
  }
  if (count === 0) return "None";
  return `${count} ${count === 1 ? "Tenant" : "Tenants"}`;
}

/* -------------------------------------------------------------------------- */
/*  Q3.O — Vacancy Loss: vacant count × avg active-lease rent                */
/*  Fallback: avg of last 10 leases by startDate when no active leases       */
/* -------------------------------------------------------------------------- */

export function computeVacancyCost(properties: Property[], leases: Lease[]): string {
  const now = Date.now();
  const vacantCount = properties.filter((p) => !p.isArchived && p.status === "Vacant").length;
  if (vacantCount === 0) return "$0";

  const activeLeases = leases.filter(
    (l) => l.stage === "Signed" && l.startDate <= now && l.endDate >= now,
  );
  let avgRent: number;
  if (activeLeases.length > 0) {
    avgRent = activeLeases.reduce((s, l) => s + l.monthlyRent, 0) / activeLeases.length;
  } else {
    const recent = [...leases].sort((a, b) => b.startDate - a.startDate).slice(0, 10);
    avgRent = recent.length > 0
      ? recent.reduce((s, l) => s + l.monthlyRent, 0) / recent.length
      : 0;
  }

  return `$${Math.round(vacantCount * avgRent).toLocaleString()}`;
}

/* -------------------------------------------------------------------------- */
/*  Q3.Q — Top Spend Category: highest-sum Expense.category                  */
/* -------------------------------------------------------------------------- */

export function computeTopSpendCategory(expenses: Expense[]): TopSpend | null {
  if (expenses.length === 0) return null;
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  let topCat = "";
  let topAmt = 0;
  for (const [cat, amt] of totals) {
    if (amt > topAmt) { topAmt = amt; topCat = cat; }
  }
  const totalAll = [...totals.values()].reduce((s, v) => s + v, 0);
  const pct = totalAll === 0 ? 0 : (topAmt / totalAll) * 100;
  return {
    category: topCat,
    amount: `$${Math.round(topAmt).toLocaleString()}`,
    pct: `${pct.toFixed(1)}%`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Q4.T — Heatmap: properties grouped by city/suburb (no Unit entity)       */
/* -------------------------------------------------------------------------- */

const EXPIRING_DAYS = 30;

export function computeHeatmapData(properties: Property[], leases: Lease[]): PropertyCluster[] {
  const now = Date.now();

  const leaseMap = new Map<string, Lease>();
  for (const l of leases) {
    if (l.stage !== "Signed") continue;
    const cur = leaseMap.get(l.propertyId);
    if (!cur || l.endDate > cur.endDate) leaseMap.set(l.propertyId, l);
  }

  const bySuburb = new Map<string, Property[]>();
  for (const p of properties) {
    if (p.isArchived) continue;
    const suburb = p.city || p.province;
    const arr = bySuburb.get(suburb) ?? [];
    arr.push(p);
    bySuburb.set(suburb, arr);
  }

  return [...bySuburb.entries()].map(([suburb, props]) => ({
    property: suburb,
    units: props.map((p) => {
      const lease = leaseMap.get(p.id);
      let status: UnitStatus;
      if (!lease || p.status === "Vacant") {
        status = "vacant";
      } else {
        const daysToEnd = Math.floor((lease.endDate - now) / DAY_MS);
        status = daysToEnd <= EXPIRING_DAYS && daysToEnd >= 0 ? "expiring" : "occupied";
      }
      return {
        id: p.id,
        name: p.name,
        status,
        tenant: lease?.unit,
        rent: lease?.monthlyRent ?? 0,
        leaseEnd: lease ? new Date(lease.endDate).toISOString().slice(0, 10) : undefined,
      };
    }),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Q3.B — Monthly Gross Income: sum of active Signed lease rents           */
/*  Trend: month-over-month % change                                        */
/* -------------------------------------------------------------------------- */

export function computeMonthlyGrossIncome(leases: Lease[]): { amount: string; trend: string } {
  const now = new Date();
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const sumActive = (from: number, to: number) =>
    leases
      .filter((l) => l.stage === "Signed" && l.startDate < to && l.endDate >= from)
      .reduce((s, l) => s + l.monthlyRent, 0);

  const current = sumActive(curStart, curEnd);
  const prev = sumActive(prevStart, curStart);

  let trend = "";
  if (prev > 0) {
    const pct = ((current - prev) / prev) * 100;
    trend = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  }

  return { amount: `$${current.toLocaleString()}`, trend };
}

/* -------------------------------------------------------------------------- */
/*  Q3.B-History — 6-month income sparkline heights (0-100 normalised)       */
/* -------------------------------------------------------------------------- */

export function computeMonthlyGrossIncomeHistory(
  leases: Lease[],
  payments: Payment[],
  monthCount: number,
): number[] {
  const now = Date.now();
  const raw: number[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    const monthStart = d.getTime();
    const monthEnd = new Date(d);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const paidRent = payments
      .filter(
        (p) =>
          p.kind === "Rent" &&
          p.status === "Paid" &&
          p.date >= monthStart &&
          p.date < monthEnd.getTime(),
      )
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedRent = leases
      .filter(
        (l) =>
          l.stage === "Signed" &&
          l.startDate <= monthEnd.getTime() &&
          l.endDate >= monthStart,
      )
      .reduce((sum, l) => sum + l.monthlyRent, 0);

    raw.push(paidRent > 0 ? paidRent : expectedRent);
  }

  const max = Math.max(...raw, 1);
  return raw.map((v) => Math.round((v / max) * 100));
}

/* -------------------------------------------------------------------------- */
/*  Q3.P — Collection Rate: Paid Rent $ this month / expected Rent $ this mo */
/* -------------------------------------------------------------------------- */

export function computeCollectionRate(payments: Payment[], leases: Lease[]): string {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  const expected = leases
    .filter((l) => l.stage === "Signed" && l.startDate < monthEnd && l.endDate >= monthStart)
    .reduce((s, l) => s + l.monthlyRent, 0);

  if (expected === 0) return "—";

  const received = payments
    .filter(
      (p) =>
        p.kind === "Rent" &&
        p.status === "Paid" &&
        p.date >= monthStart &&
        p.date < monthEnd,
    )
    .reduce((s, p) => s + p.amount, 0);

  return `${Math.min(100, Math.round((received / expected) * 100))}%`;
}

/* -------------------------------------------------------------------------- */
/*  Q4.S — Occupancy Rate: active-lease or owner-occupied / total           */
/* -------------------------------------------------------------------------- */

export function computeOccupancyRate(properties: Property[], leases: Lease[]): number {
  const now = Date.now();
  const nonArchived = properties.filter((p) => !p.isArchived);
  if (nonArchived.length === 0) return 0;
  const active = nonArchived.filter((p) => {
    if (p.status === "Owner-Occupied") return true;
    return leases.some(
      (l) =>
        l.propertyId === p.id &&
        l.stage === "Signed" &&
        l.startDate <= now &&
        l.endDate >= now,
    );
  });
  return Math.round((active.length / nonArchived.length) * 100);
}

function formatEventTime(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((that.getTime() - today.getTime()) / DAY_MS);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return `Today • ${time}`;
  if (diffDays === 1) return `Tomorrow • ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "long" })} • ${time}`;
}
