"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Wrench, Bell,
  MoreHorizontal, Download, Pencil,
  DollarSign, AlertTriangle, Clock, UserCheck,
  Building2, Maximize2, Calendar, MapPin,
  BedDouble, Bath, Car, FileCheck,
  TrendingUp, TrendingDown,
  Info, ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { ProgressExplainerModal } from "@/components/portfolio/ProgressExplainerModal";
import { ProgressModal } from "@/components/portfolio/ProgressModal";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { PropertyListItem } from "@/lib/data/types/property";
import dynamic from "next/dynamic";
// The recharts bar chart loads lazily, client-only, so recharts is no longer in this page's initial
// bundle — it downloads once the chart renders. The skeleton fills the same 72px-tall box.
const OverviewBarChart = dynamic(
  () => import("./OverviewBarChart").then((m) => m.OverviewBarChart),
  { ssr: false, loading: () => <div className="h-[72px] w-full animate-pulse rounded bg-slate-50" /> },
);
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Notification } from "@/lib/data/types/notification";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { ProgressDetails } from "@/lib/data/types/progress";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { UserProfile } from "@/lib/data/types/user-profile";
import { formatCurrency, formatCurrencyFull, formatRelativeTime } from "@/lib/format";
import type { Activity } from "@/lib/data/types/activity";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/property-helpers";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { usePropertyShell } from "@/components/property/PropertyShellContext";
import { StackedCardTable } from "@/components/ui/stacked-card-table";
import { PropertyPhotoManager } from "./PropertyPhotoManager";

/* ─── Helper types ────────────────────────────────────────────────────────── */

type ChartPoint = { label: string; income: number; expense: number };
type FeedEvent  = { time: number; color: string; Icon: LucideIcon; text: string };

/* ─── Pure helper functions ───────────────────────────────────────────────── */

function buildChartData(payments: Payment[], expenses: Expense[], now: number): ChartPoint[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - (5 - i));
    const monthStart = d.getTime();
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    const monthEnd = next.getTime();
    const label = d.toLocaleString("en-US", { month: "short" });
    const income = payments
      .filter(p => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart && p.date < monthEnd)
      .reduce((s, p) => s + p.amount, 0);
    const expense = expenses
      .filter(e => e.date >= monthStart && e.date < monthEnd)
      .reduce((s, e) => s + e.amount, 0);
    return { label, income, expense };
  });
}

function getIncomeDelta(payments: Payment[], now: number): number | null {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  const thisStart = d.getTime();
  const prev = new Date(d);
  prev.setMonth(prev.getMonth() - 1);
  const prevStart = prev.getTime();
  const thisInc = payments
    .filter(p => p.kind === "Rent" && p.status === "Paid" && p.date >= thisStart && p.date <= now)
    .reduce((s, p) => s + p.amount, 0);
  const prevInc = payments
    .filter(p => p.kind === "Rent" && p.status === "Paid" && p.date >= prevStart && p.date < thisStart)
    .reduce((s, p) => s + p.amount, 0);
  return prevInc === 0 ? null : ((thisInc - prevInc) / prevInc) * 100;
}

function getValuationDelta(valuations: PropertyValuation[]): number | null {
  if (valuations.length < 2) return null;
  const sorted = [...valuations].sort((a, b) => a.recordedAt - b.recordedAt);
  const prev   = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  return prev.price === 0 ? null : ((latest.price - prev.price) / prev.price) * 100;
}

function deriveIncomeStatus(payments: Payment[], activeLeases: Lease[], now: number): string {
  const expectedRent = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);
  if (expectedRent === 0) return "Due";

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const thisMonthRent = payments.filter(
    (p) => p.kind === "Rent" && p.date >= monthStart.getTime() && p.date < monthEnd.getTime(),
  );

  if (thisMonthRent.some((p) => p.status === "Overdue")) return "Overdue";

  const collected = thisMonthRent
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amount, 0);

  if (collected >= expectedRent) return "Collected";
  if (collected > 0) return "Partial";
  return "Due";
}

function buildActivityFeed(
  payments: Payment[],
  leases: Lease[],
  tenants: Tenant[],
  maintenanceItems: MaintenanceItem[],
  notifications: Notification[],
  now: number,
): FeedEvent[] {
  const tmap = new Map(tenants.map(t => [t.id, t]));
  const lmap = new Map(leases.map(l => [l.id, l]));
  const events: FeedEvent[] = [];

  for (const p of payments) {
    if (p.kind !== "Rent" || p.status !== "Paid") continue;
    const tenantId = p.leaseId ? lmap.get(p.leaseId)?.tenantId : undefined;
    const t = tenantId ? tmap.get(tenantId) : undefined;
    events.push({
      time: p.date,
      color: "#059669",
      Icon: DollarSign,
      text: `Rent received${t ? ` from ${t.name}` : ""} — ${formatCurrencyFull(p.amount)}`,
    });
  }

  for (const l of leases) {
    if (l.stage !== "Signed" || l.startDate > now) continue;
    const t = l.tenantId ? tmap.get(l.tenantId) : undefined;
    events.push({
      time: l.startDate,
      color: "var(--val-primary-dark)",
      Icon: FileText,
      text: `Lease signed${t ? `: ${t.name}` : ""}${l.unit ? `, ${l.unit}` : ""}`,
    });
  }

  for (const m of maintenanceItems) {
    events.push({ time: m.createdAt, color: "#f59e0b", Icon: Wrench, text: `Work order: ${m.title}` });
  }

  for (const n of notifications) {
    events.push({ time: n.createdAt, color: "#94a3b8", Icon: Bell, text: n.description });
  }

  return events.sort((a, b) => b.time - a.time).slice(0, 8);
}

function getAlertStyle(type: string, category?: string): {
  borderClass: string; iconBg: string; iconFg: string; label: string; Icon: LucideIcon;
} {
  if (type === "lease")             return { borderClass: "border-l-amber-400",  iconBg: "bg-amber-50",  iconFg: "text-amber-500",  label: "Lease",       Icon: Clock         };
  if (category === "COMPLIANCE")    return { borderClass: "border-l-rose-500",   iconBg: "bg-rose-50",   iconFg: "text-rose-500",   label: "Compliance",  Icon: AlertTriangle  };
  if (category === "PAYMENT")       return { borderClass: "border-l-blue-400",   iconBg: "bg-blue-50",   iconFg: "text-blue-500",   label: "Payment",     Icon: DollarSign     };
  if (category === "LEASING")       return { borderClass: "border-l-blue-400",   iconBg: "bg-blue-50",   iconFg: "text-blue-500",   label: "Leasing",     Icon: FileText       };
  if (category === "ACCESS")        return { borderClass: "border-l-indigo-400", iconBg: "bg-indigo-50", iconFg: "text-indigo-500", label: "Access",      Icon: UserCheck      };
  return                                   { borderClass: "border-l-amber-400",  iconBg: "bg-amber-50",  iconFg: "text-amber-500",  label: "Maintenance", Icon: Wrench         };
}

function pillarBarClass(score: number): string {
  if (score === 100) return "bg-emerald-400";
  if (score > 0)     return "bg-blue-500";
  return "bg-slate-100";
}

// Build a CSV from data already loaded on this page and trigger a browser
// download. No server round-trip — every value here is already a prop/derived
// figure rendered on the overview, so this is a cheap, fully-client export.
function exportPropertyCsv(
  rows: Array<[string, string | number]>,
  filename: string,
): void {
  // Quote every field and escape embedded quotes so commas/newlines are safe.
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [["Field", "Value"], ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function AttributeChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const pos  = delta >= 0;
  const Icon = pos ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${pos ? "text-emerald-600" : "text-rose-500"}`}>
      <Icon className="w-3 h-3" />
      {pos ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

function useCountUp(raw: string, duration: number, active: boolean): string {
  const num = parseFloat(raw.replace(/[$,%\s]/g, "").replace(/,/g, ""));
  const isDecimal = raw.includes(".");
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!active) { setDisplay(raw); return; }
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const v = (1 - Math.pow(1 - p, 3)) * num;
      const formatted = isDecimal
        ? v.toFixed(1) + "%"
        : (raw.startsWith("$") ? "$" : "") + Math.round(v).toLocaleString("en-US");
      setDisplay(formatted);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return display;
}

function fade(mounted: boolean, delay: number, reduced = false) {
  if (reduced) return { opacity: 1 };
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-8px)",
    transition: "opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)",
    transitionDelay: `${delay}ms`,
  };
}

function MetricCell({ label, value, badge, badgeColor, duration, active, delta }: {
  label: string; value: string; badge?: string; badgeColor?: string;
  duration: number; active: boolean; delta?: number | null;
}) {
  const display = useCountUp(value, duration, active);
  const isIncome = label === "Monthly Income";
  // Mobile padding tightens to keep two cells side-by-side at 484px; the
  // value drops from 26px to 22px and the inline badge from 15px to 13px so
  // the cell doesn't wrap awkwardly. Label tier matches the canonical
  // Stat Label class string from the type scale.
  return (
    <div className={`flex-1 px-4 sm:px-6 py-3 sm:py-4${isIncome ? " bg-[--val-bg-tint]" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
        <p className="text-val-heading text-[22px] sm:text-[26px] font-bold leading-none">{display}</p>
        {badge && <span className="text-[13px] sm:text-[15px] font-semibold" style={{ color: badgeColor }}>{badge}</span>}
        {delta != null && <DeltaBadge delta={delta} />}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export function PropertyOverviewPage({
  property,
  valuations = [],
  leases = [],
  tenants = [],
  payments = [],
  expenses = [],
  notifications = [],
  maintenanceItems = [],
  ownershipRecords = [],
  coOwners = [],
  userProfile,
  progressDetails,
  recentActivities = [],
}: {
  property: Property;
  valuations: PropertyValuation[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  notifications: Notification[];
  maintenanceItems: MaintenanceItem[];
  ownershipRecords: OwnershipRecord[];
  coOwners: CoOwner[];
  userProfile?: UserProfile | null;
  progressDetails?: ProgressDetails;
  recentActivities?: Activity[];
}) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mapStyle, setMapStyle] = useState<"light" | "satellite">("light");
  const [progressExplainerOpen, setProgressExplainerOpen] = useState(false);
  const [progressModalProperty, setProgressModalProperty] = useState<PropertyListItem | null>(null);
  // Alerts are derived client-side from leases + notifications (see "Alerts"
  // below), so dismissing one is purely local UI state — there is no alerts
  // table to persist a dismissal to. We track dismissed alert ids here so a
  // dismiss (and its undo) just shows/hides the row. NOTE: this resets on
  // reload by design until a real alerts/notifications-read backend exists.
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string | number>>(new Set());
  const shell = usePropertyShell();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);

  const now = Date.now();

  /* ── Valuation ── */
  const latestValuation =
    valuations.length > 0
      ? [...valuations].sort((a, b) => a.recordedAt - b.recordedAt).at(-1)!
      : null;

  /* ── Leases & tenants ── */
  const activeLeases = leases.filter(
    (l) => l.stage === "Signed" && l.startDate <= now && l.endDate >= now,
  );
  const monthlyIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);
  const incomeStatus = deriveIncomeStatus(payments, activeLeases, now);
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const activeLeaseholders = activeLeases.map((l) => {
    const t = l.tenantId ? tenantMap.get(l.tenantId) : undefined;
    return {
      initials: t ? t.name.charAt(0).toUpperCase() : "?",
      name: t?.name ?? "—",
      unit: l.unit,
      rent: "$" + l.monthlyRent.toLocaleString("en-US"),
      status: t?.status ?? "—",
      statusOk: t?.status === "Paid",
    };
  });

  /* ── Gross Yield ── */
  const grossYield =
    latestValuation && latestValuation.price > 0 && monthlyIncome > 0
      ? (monthlyIncome * 12 / latestValuation.price) * 100
      : 0;

  /* ── Alerts ── */
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const leaseAlerts = leases
    .filter((l) => l.stage === "Signed" && l.endDate > now && l.endDate - now <= thirtyDaysMs)
    .map((l, i) => {
      const t = l.tenantId ? tenantMap.get(l.tenantId) : undefined;
      const daysLeft = Math.ceil((l.endDate - now) / 86400000);
      return {
        id: -(i + 1),
        type: "lease" as const,
        body: `${l.unit}${t ? ` — ${t.name}` : ""} (${daysLeft} days remaining)`,
        action: "Review",
        actionLabel: `Review lease expiring for ${l.unit}`,
      };
    });
  const notificationAlerts = notifications.map((n) => ({
    id: n.id,
    type: "notification" as const,
    category: n.category,
    body: n.description,
    action: "View",
    actionLabel: `View ${n.title}`,
  }));
  const alerts = [...leaseAlerts, ...notificationAlerts];
  // Hide any alert the user has dismissed this session.
  const visibleAlerts = alerts.filter((a) => !dismissedAlertIds.has(a.id));

  // Dismiss one alert (reversible via the undo toast).
  function dismissAlert(id: string | number) {
    setDismissedAlertIds((prev) => new Set(prev).add(id));
  }
  // Restore a single dismissed alert (used by the per-item Undo).
  function restoreAlert(id: string | number) {
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
  // Dismiss every currently-visible alert at once; undo restores them all.
  function dismissAllAlerts() {
    const ids = visibleAlerts.map((a) => a.id);
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }
  function restoreAlerts(ids: Array<string | number>) {
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  /* ── Ownership ── */
  const ownershipRecord = ownershipRecords[0] ?? null;
  const coOwnerShareTotal = coOwners.reduce((s, c) => s + c.sharePercent, 0);
  const userShare = Math.max(0, 100 - coOwnerShareTotal);

  /* ── YTD financials ── */
  const ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const paidRentYTD = payments.filter(
    (p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now,
  );
  const grossIncome   = paidRentYTD.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses
    .filter((e) => e.date >= ytdStart && e.date <= now)
    .reduce((sum, e) => sum + e.amount, 0);
  const noi = grossIncome - totalExpenses;

  /* ── Trend deltas ── */
  const incomeDelta    = getIncomeDelta(payments, now);
  const valuationDelta = getValuationDelta(valuations);

  /* ── 6-month chart ── */
  const chartData = buildChartData(payments, expenses, now);

  /* ── Activity feed ── */
  const activityFeed = buildActivityFeed(payments, leases, tenants, maintenanceItems, notifications, now);

  /* ── Static map ── */
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasMap = (property.lat !== 0 || property.lng !== 0) && Boolean(mapboxToken);
  const mapStyleId = mapStyle === "light" ? "light-v11" : "satellite-streets-v12";
  const mapUrl = hasMap
    ? `https://api.mapbox.com/styles/v1/mapbox/${mapStyleId}/static/pin-l+2563eb(${property.lng},${property.lat})/${property.lng},${property.lat},14,0/900x360@2x?access_token=${mapboxToken}`
    : null;

  const heroMapUrl = hasMap
    ? `https://api.mapbox.com/styles/v1/mapbox/${mapStyleId}/static/pin-l+2563eb(${property.lng},${property.lat})/${property.lng},${property.lat},13,0/1280x360@2x?access_token=${mapboxToken}`
    : null;

  /* ── KPI metrics ── */
  const metrics = [
    {
      label: "Purchase Price",
      value: property.buyNumeric ? "$" + property.buyNumeric.toLocaleString("en-US") : "—",
      delta: null,
      duration: 1400,
    },
    {
      label: "Monthly Income",
      value: "$" + monthlyIncome.toLocaleString("en-US"),
      delta: incomeDelta,
      duration: 1100,
      badge: incomeStatus,
      badgeColor: incomeStatus === "Collected" ? "#059669"
        : incomeStatus === "Partial" ? "#d97706"
        : incomeStatus === "Overdue" ? "#dc2626"
        : "#64748b",
    },
    {
      label: "Current Valuation",
      value: latestValuation ? "$" + latestValuation.price.toLocaleString("en-US") : "—",
      delta: valuationDelta,
      duration: 900,
    },
  ];

  // Export the headline figures already shown on this page as a CSV. Everything
  // here is derived above from the page's own props, so the export is instant
  // and offline — no extra fetch or server action needed.
  function handleExportData() {
    const rows: Array<[string, string | number]> = [
      ["Property", property.name],
      ["Code", property.code],
      ["Type", TYPE_LABEL[property.type] ?? property.type],
      ["Status", property.status],
      ["Province", property.province ?? ""],
      ["Purchase Price", property.buyNumeric ?? ""],
      ["Current Valuation", latestValuation ? latestValuation.price : ""],
      ["Monthly Income", monthlyIncome],
      ["Income Status", incomeStatus],
      ["YTD Income", grossIncome],
      ["YTD Expenses", totalExpenses],
      ["Net Operating Income", noi],
      ["Active Leases", activeLeases.length],
      ["Progress Score", progressDetails ? `${progressDetails.score}%` : ""],
    ];
    exportPropertyCsv(rows, `${property.code || "property"}-overview.csv`);
    toast.success("Property data exported");
  }

  const countUpActive = mounted && !reducedMotion;
  const ease = "cubic-bezier(0.22,1,0.36,1)";

  function heroIn(delay: number): React.CSSProperties {
    if (reducedMotion) return {};
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0px)" : "translateY(22px)",
      transition: `opacity 650ms ${ease} ${delay}ms, transform 650ms ${ease} ${delay}ms`,
    };
  }

  return (
    <PropertyLayout
      activeTab="overview"
      property={property}
      progress={progressDetails?.score}
      onProgressClick={progressDetails ? () => setProgressModalProperty({
        id: property.id,
        name: property.name,
        code: property.code,
        type: property.type,
        province: property.province,
        status: property.status,
        totalArea: property.totalArea ?? "",
        title: property.title ?? "",
        buy: property.buyNumeric ? formatCurrency(property.buyNumeric) : "—",
        buyNumeric: property.buyNumeric,
        isArchived: property.isArchived,
        progress: progressDetails.score,
        progressDetails,
      }) : undefined}
    >
      <div className="bg-val-bg-page-alt min-h-full pb-10">

        {/* ── Hero — photo mosaic ── */}
        {/* Mobile uses a shorter 240px hero so the property title and KPI
            strip stay near the top of the fold; tablet+ keeps the original
            360px immersive height. */}
        <div className="relative h-[240px] sm:h-[360px] overflow-hidden flex items-end">
          {/* Map background */}
          <div className="absolute inset-0 bg-slate-900">
            {heroMapUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={heroMapUrl}
                src={heroMapUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{
                  transform: reducedMotion ? undefined : mounted ? "scale(1)" : "scale(1.06)",
                  transition: reducedMotion ? undefined : "transform 900ms cubic-bezier(0.25,1,0.5,1)",
                }}
              />
            )}
          </div>

          {/* Gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
            style={{
              opacity: reducedMotion ? 1 : mounted ? 1 : 0,
              transition: reducedMotion ? undefined : "opacity 600ms ease",
            }}
          />

          {/* Hero text & actions */}
          <div className="relative z-20 w-full flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-4 sm:px-8 pb-5 sm:pb-8">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2.5" style={heroIn(80)}>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-0.5 rounded-full">
                  {property.status}
                </span>
                <span className="text-white/70 text-[13px]">{property.province}</span>
              </div>
              <p className="text-white/55 text-[13px] font-medium" style={heroIn(160)}>
                Purchased {property.buyNumeric ? formatCurrency(property.buyNumeric) : "—"}
              </p>
              <h1
                className="text-white font-extrabold tracking-tight leading-none break-words"
                style={{ fontSize: "clamp(28px, 5vw, 58px)", ...heroIn(240) }}
              >
                {property.name}
              </h1>
            </div>
            <div className="flex items-center gap-2.5 shrink-0" style={heroIn(340)}>
              <button
                type="button"
                onClick={() => shell?.openPropertyWizard()}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold px-4 py-2 rounded flex items-center gap-2 hover:bg-white/20 active:scale-[0.97] transition-[background-color,transform] duration-150"
                aria-label="Edit property profile"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit profile
              </button>
              <button
                type="button"
                onClick={handleExportData}
                className="text-white text-[13px] font-semibold px-4 py-2 rounded flex items-center gap-2 shadow-[0_4px_6px_-1px_rgba(0,74,198,0.3)] hover:opacity-90 active:scale-[0.97] transition-[opacity,transform] duration-150"
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                <Download className="w-3.5 h-3.5" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* ── Below-hero content ── */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-0 flex flex-col gap-4">

          {/* Attribute strip + section anchor nav */}
          <div className="pt-5">
            <div className="flex items-center gap-4 pb-1 flex-wrap">
              {/* Core identity */}
              <AttributeChip icon={TYPE_ICON[property.type] ?? Building2} label={TYPE_LABEL[property.type] ?? property.type} />
              {property.province && (
                <AttributeChip icon={MapPin} label={property.province} />
              )}
              {property.totalArea?.trim() && <AttributeChip icon={Maximize2} label={property.totalArea} />}
              {property.yearBuilt?.trim() && <AttributeChip icon={Calendar} label={`Built ${property.yearBuilt}`} />}
              {property.title && property.title !== "—" && (
                <AttributeChip icon={FileCheck} label={property.title} />
              )}

              {/* Divider before amenity stats */}
              {(
                ((property.type === "residential" || property.type === "multi-unit") &&
                  (property.bedrooms?.trim() || property.bathrooms?.trim())) ||
                (property.type !== "land" && property.parkingSpaces?.trim())
              ) && (
                <span className="w-px h-3.5 bg-slate-200 self-center" />
              )}

              {/* Amenity stats */}
              {(property.type === "residential" || property.type === "multi-unit") && property.bedrooms?.trim() && (
                <AttributeChip icon={BedDouble} label={`${property.bedrooms} bed`} />
              )}
              {(property.type === "residential" || property.type === "multi-unit") && property.bathrooms?.trim() && (
                <AttributeChip icon={Bath} label={`${property.bathrooms} bath`} />
              )}
              {property.type !== "land" && property.parkingSpaces?.trim() && (
                <AttributeChip icon={Car} label={`${property.parkingSpaces} parking`} />
              )}
            </div>
          </div>

          {/* KPI metrics bar */}
          <div
            className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 sm:flex sm:divide-x sm:divide-slate-200 overflow-hidden divide-y sm:divide-y-0 divide-slate-200"
            style={fade(mounted, 120, reducedMotion)}
          >
            {metrics.map((m) => (
              <MetricCell
                key={m.label}
                label={m.label}
                value={m.value}
                duration={m.duration}
                active={countUpActive}
                delta={m.delta}
                badge={(m as { badge?: string }).badge}
                badgeColor={(m as { badgeColor?: string }).badgeColor}
              />
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">

            {/* ── Left column ── */}
            <div className="lg:col-span-8 flex flex-col gap-4" style={fade(mounted, 280, reducedMotion)}>

              {/* Summary row */}
              {/*
                Stack the Financials and Ownership cards on mobile (was
                `xs:grid-cols-2` which activated 2-col at 480px — too narrow
                at 484px, the Financials chart bars collapsed and Ownership
                owner names wrapped). 2-col returns at `sm:` (640px+).
              */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                {/* Financials card with mini chart */}
                <div id="overview-financials" className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3 scroll-mt-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[15px] font-semibold">Financials</h3>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Financials options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-slate-500 text-[13px]">Net Operating Income</span>
                    <span className="text-val-heading text-[22px] font-bold">{formatCurrencyFull(noi)}</span>
                  </div>
                  {/* 6-month income vs expense chart */}
                  <div className="-mx-1">
                    <OverviewBarChart chartData={chartData} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-0.5">YTD Expenses</p>
                      <p className="text-rose-600 text-[14px] font-semibold">{formatCurrencyFull(totalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-0.5">YTD Income</p>
                      <p className="text-val-heading text-[14px] font-semibold">{formatCurrencyFull(grossIncome)}</p>
                    </div>
                  </div>
                </div>

                {/* Ownership Summary */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[15px] font-semibold">Ownership</h3>
                    <Link
                      href={`/property/${property.id}/ownership`}
                      className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity"
                    >
                      Details →
                    </Link>
                  </div>

                  {ownershipRecord ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Structure</span>
                        <span className="text-[12px] font-medium text-val-heading">{ownershipRecord.holdingType}</span>
                      </div>

                      <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                        {/* Primary user row — only shown when they hold a share */}
                        {userShare > 0 && (() => {
                          const displayName = userProfile
                            ? `${userProfile.firstName} ${userProfile.lastName}`
                            : "You";
                          const initial = displayName.charAt(0).toUpperCase();
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[--val-bg-tint] flex items-center justify-center text-[--val-primary-dark] text-[10px] font-bold shrink-0">
                                  {initial}
                                </div>
                                <span className="text-[13px] text-val-heading font-medium truncate">{displayName}</span>
                                <span className="text-[11px] text-slate-400 shrink-0">Primary</span>
                              </div>
                              <span className="text-[13px] font-semibold text-val-heading tabular-nums shrink-0">{userShare}%</span>
                            </div>
                          );
                        })()}

                        {/* Co-owners */}
                        {coOwners.map((co) => (
                          <div key={co.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0">
                                {co.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[13px] text-val-heading font-medium truncate">{co.name}</span>
                              <span className="text-[11px] text-slate-400 shrink-0">{co.role}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-val-heading tabular-nums shrink-0">{co.sharePercent}%</span>
                          </div>
                        ))}
                      </div>

                      {ownershipRecord.distributionMethod && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Distribution</span>
                          <span className="text-[11px] font-medium text-slate-500">{ownershipRecord.distributionMethod}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-5 text-center">
                      <p className="text-[12px] text-slate-400 leading-snug">No ownership record yet.</p>
                      <Link
                        href={`/property/${property.id}/ownership`}
                        className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 transition-opacity"
                      >
                        Add ownership details →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Leaseholders */}
              <div id="overview-tenants" className="bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden scroll-mt-20">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
                  <h3 className="text-val-heading text-[15px] font-semibold">Active Leaseholders</h3>
                  <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity" aria-label="View all leaseholders">View All</button>
                </div>
                <div className="p-4 sm:p-0">
                  <StackedCardTable
                    rows={activeLeaseholders}
                    rowKey={(t) => t.name + t.unit}
                    primaryColumn="tenant"
                    trailingColumn="status"
                    emptyState={
                      <p className="text-center text-slate-400 text-[13px] py-6">—</p>
                    }
                    columns={[
                      {
                        key: "tenant",
                        label: "Tenant",
                        render: (t) => (
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[12px] font-semibold shrink-0">
                              {t.initials}
                            </div>
                            <span className="text-val-heading text-[14px] font-semibold truncate">
                              {t.name}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "unit",
                        label: "Unit",
                        render: (t) => (
                          <span className="text-slate-500 text-[14px]">{t.unit}</span>
                        ),
                      },
                      {
                        key: "rent",
                        label: "Monthly Rent",
                        render: (t) => (
                          <span className="text-val-heading text-[14px] font-semibold">
                            {t.rent}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        label: "Status",
                        render: (t) => (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium border ${
                              t.statusOk
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-[--status-danger-bg] text-[--status-danger-text] border-[--status-danger-border]"
                            }`}
                          >
                            {t.status}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Activity Feed */}
              <div id="overview-activity" className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4 scroll-mt-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-val-heading text-[15px] font-semibold">Activity Feed</h3>
                  <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity" aria-label="View all activity">View All</button>
                </div>
                {activityFeed.length === 0 ? (
                  <p className="text-slate-400 text-[13px] text-center py-4">No recent activity</p>
                ) : (
                  <div className="flex flex-col gap-3 relative">
                    <div className="absolute left-[6px] top-2 bottom-2 w-px bg-slate-100" aria-hidden="true" />
                    {activityFeed.map((item, i) => {
                      const Icon = item.Icon;
                      return (
                        <div
                          key={`${item.time}-${i}`}
                          className="flex gap-3 items-start"
                          style={{
                            animationName: mounted ? "analytics-fade-up" : "none",
                            animationDuration: "0.4s",
                            animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                            animationFillMode: "forwards",
                            animationDelay: `${350 + i * 70}ms`,
                            opacity: 0,
                          }}
                        >
                          <Icon
                            className="w-3.5 h-3.5 shrink-0 mt-[3px] relative z-10"
                            style={{ color: item.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-val-heading text-[13px] leading-snug">{item.text}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{formatRelativeTime(item.time)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="lg:col-span-4 flex flex-col gap-4" style={fade(mounted, 340, reducedMotion)}>

              {/* Property Progress card */}
              {progressDetails && (
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-val-heading text-[15px] font-semibold">Property Progress</h3>
                      <button
                        onClick={() => setProgressExplainerOpen(true)}
                        className="text-slate-400 hover:text-slate-600 transition-colors rounded p-0.5 hover:bg-slate-100"
                        aria-label="How progress is calculated"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`text-[22px] font-bold tabular-nums leading-none ${progressDetails.score >= 70 ? "text-emerald-600" : progressDetails.score >= 40 ? "text-amber-500" : "text-rose-500"}`}>
                      {progressDetails.score}<span className="text-[13px] font-medium text-slate-400">%</span>
                    </span>
                  </div>
                  <div className="h-[4px] bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${progressDetails.score >= 70 ? "bg-emerald-400" : "bg-[--val-primary-dark]"}`}
                      style={{
                        width: mounted ? `${progressDetails.score}%` : "0%",
                        transition: "width 700ms cubic-bezier(0.16,1,0.3,1) 200ms",
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-0 -mx-2">
                    {progressDetails.pillars.map((pillar, i) => (
                      <Link
                        key={pillar.key}
                        href={pillar.href}
                        className="group flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <span className="text-[11px] text-slate-500 group-hover:text-val-heading transition-colors truncate min-w-0 flex-1">
                          {pillar.name}
                        </span>
                        <div className="w-12 h-[3px] bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${pillarBarClass(pillar.score)}`}
                            style={{
                              width: mounted ? `${pillar.score}%` : "0%",
                              transition: `width 550ms cubic-bezier(0.16,1,0.3,1) ${200 + i * 30}ms`,
                            }}
                          />
                        </div>
                        <span className={`text-[11px] font-semibold tabular-nums shrink-0 w-7 text-right ${pillar.score === 100 ? "text-emerald-500" : pillar.score > 0 ? "text-blue-600" : "text-slate-300"}`}>
                          {pillar.score}%
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => setProgressModalProperty({
                        id: property.id,
                        name: property.name,
                        code: property.code,
                        type: property.type,
                        province: property.province,
                        status: property.status,
                        totalArea: property.totalArea ?? "",
                        title: property.title ?? "",
                        buy: property.buyNumeric ? formatCurrency(property.buyNumeric) : "—",
                        buyNumeric: property.buyNumeric,
                        isArchived: property.isArchived,
                        progress: progressDetails.score,
                        progressDetails,
                      })}
                      className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 py-1.5 rounded-md transition-colors"
                      aria-label="View progress details"
                    >
                      View details
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Alerts panel */}
              {visibleAlerts.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                        {visibleAlerts.length} action{visibleAlerts.length !== 1 ? "s" : ""} pending
                      </span>
                    </div>
                    {/* Dismiss all — reversible: undo restores every alert just hidden. */}
                    <ConfirmAction
                      tier="undo"
                      successMessage="All alerts dismissed"
                      onConfirm={() => {
                        dismissAllAlerts();
                        return undefined;
                      }}
                      onUndo={() => restoreAlerts(alerts.map((a) => a.id))}
                    >
                      <button
                        className="text-slate-400 text-[12px] font-medium hover:text-slate-600 transition-colors"
                        aria-label="Dismiss all alerts"
                      >
                        Dismiss all
                      </button>
                    </ConfirmAction>
                  </div>
                  {visibleAlerts.map((a, i) => {
                    const category = "category" in a ? (a as { category?: string }).category : undefined;
                    const { borderClass, iconBg, iconFg, label, Icon: AlertIcon } = getAlertStyle(a.type, category);
                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-3 px-4 py-3.5 border-l-[3px] ${borderClass}${i > 0 ? " border-t border-slate-100" : ""}`}
                      >
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                          <AlertIcon className={`w-3.5 h-3.5 ${iconFg}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.05em] mb-0.5 ${iconFg}`}>{label}</p>
                          <p className="text-[12px] text-slate-600 leading-snug">{a.body}</p>
                        </div>
                        <button
                          aria-label={a.actionLabel}
                          className="shrink-0 text-[12px] font-semibold text-white bg-[--val-primary-dark] px-2.5 py-1 rounded hover:opacity-85 transition-opacity whitespace-nowrap mt-0.5"
                        >
                          {a.action}
                        </button>
                        {/* Per-item dismiss — undo tier: hides this alert immediately
                            and offers Undo to bring it back. */}
                        <ConfirmAction
                          tier="undo"
                          successMessage="Alert dismissed"
                          onConfirm={() => {
                            dismissAlert(a.id);
                            return undefined;
                          }}
                          onUndo={() => restoreAlert(a.id)}
                        >
                          <button
                            aria-label={`Dismiss: ${a.body}`}
                            className="shrink-0 size-6 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors mt-0.5"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </ConfirmAction>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions (New Lease / Work Order / Invoice / Notify All) were
                  removed in the Phase-5 stub cleanup: none had a backend handler,
                  so they were visible no-ops. Re-introduce per-action once the
                  corresponding create flows exist (lease/work-order/invoice). */}

              {/* Photo manager — add / delete / set-cover on this property's photos */}
              <PropertyPhotoManager propertyId={property.id} />

            </div>
          </div>

          {/* ── Location section ── */}
          {(mapUrl || property.province) && (
            <div
              id="overview-location"
              className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-20 flex flex-col sm:flex-row"
              style={{ minHeight: 280, ...fade(mounted, 400, reducedMotion) }}
            >
              {/* Info panel */}
              <div className="w-full sm:w-[300px] shrink-0 bg-white flex flex-col justify-between p-5 sm:p-6 gap-4 sm:gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">
                    Location
                  </p>
                  <p className="text-[18px] font-bold text-val-heading leading-tight">
                    {property.city || property.province}
                  </p>
                  {property.addressLine && (
                    <p className="text-[13px] text-slate-500">{property.addressLine}</p>
                  )}
                  {property.addressLine2 && (
                    <p className="text-[13px] text-slate-400">{property.addressLine2}</p>
                  )}
                </div>

                {hasMap && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
                      Coordinates
                    </p>
                    <p className="text-[13px] font-medium tabular-nums text-val-heading">
                      {Math.abs(property.lat).toFixed(5)}°{property.lat >= 0 ? "N" : "S"}
                      {"  "}
                      {Math.abs(property.lng).toFixed(5)}°{property.lng >= 0 ? "E" : "W"}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {hasMap && (
                    <div className="flex gap-1 p-0.5 bg-white/60 border border-slate-200 rounded-lg w-fit">
                      {(["light", "satellite"] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setMapStyle(style)}
                          className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize transition-[background-color,color] duration-150 ${
                            mapStyle === style
                              ? "bg-white text-val-heading shadow-sm"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {hasMap && (
                      <a
                        href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 transition-opacity"
                      >
                        Open in Maps ↗
                      </a>
                    )}
                    <Link
                      href={`/property/${property.id}/location`}
                      className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 transition-opacity"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Map panel */}
              <div className="flex-1 relative overflow-hidden bg-slate-100">
                {mapUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={mapUrl}
                    src={mapUrl}
                    alt={`Map showing ${property.name} location`}
                    className="w-full h-full object-cover"
                    style={{
                      transform: reducedMotion ? undefined : mounted ? "scale(1)" : "scale(1.04)",
                      transition: reducedMotion ? undefined : "transform 900ms cubic-bezier(0.25,1,0.5,1)",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-slate-200" />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── Recent activity panel ────────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-10 max-w-7xl mx-auto w-full">
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-slate-700">Recent activity</h3>
            {recentActivities.length > 0 && (
              <span className="text-[11px] text-slate-400">Showing latest {recentActivities.length}</span>
            )}
          </div>
          {recentActivities.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
              <span className="text-2xl select-none">📋</span>
              <p className="text-[13px] font-medium text-slate-500">No activity yet</p>
              <p className="text-[12px] text-slate-400">Actions like archiving, adding photos, or updating records will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentActivities.map((event) => (
                <li key={event.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-700 truncate">{event.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {event.entity} · {formatRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ProgressModal
        property={progressModalProperty}
        onClose={() => setProgressModalProperty(null)}
        onExplainerClick={() => setProgressExplainerOpen(true)}
      />
      <ProgressExplainerModal
        open={progressExplainerOpen}
        onClose={() => setProgressExplainerOpen(false)}
      />
    </PropertyLayout>
  );
}
