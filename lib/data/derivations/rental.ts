import type { Lease, LeaseStage } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";

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
