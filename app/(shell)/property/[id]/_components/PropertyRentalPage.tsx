"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment, PaymentStatus } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Document as DbDocument } from "@/lib/data/types/document";
import type { MaintenanceItem, MaintenanceSeverity } from "@/lib/data/types/maintenance-item";
import { formatCurrencyFull } from "@/lib/format";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { MobileCardTable } from "@/components/property/MobileCardTable";
import { UnlockButton } from "@/components/feature-unlock/UnlockButton";
import { RentalUnlockMount } from "@/components/feature-unlock/pillars/RentalUnlock";
import type { UnlockState } from "@/components/feature-unlock/types";
import { updateProperty, revokeRentalVerification } from "@/app/actions/properties";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Mail, Phone, FileText, ChevronLeft, ChevronRight,
  Circle, ChevronDown, AlertTriangle, Download,
  Home, ShieldCheck, BadgeCheck, MoreHorizontal, ShieldOff,
} from "lucide-react";

type PaymentVariant = "success" | "warning" | "danger" | "neutral";

const statusVariants: Record<PaymentVariant, string> = {
  success: "text-emerald-700",
  warning: "text-amber-600",
  danger: "text-rose-600",
  neutral: "text-slate-500",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonthYear(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthsSince(ts: number): number {
  const start = new Date(ts);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

function getDocStatusInfo(doc: DbDocument): { statusLabel: string; statusClass: string; dateLabel: string } {
  const dateStr = new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (doc.category === "Rental") {
    return { statusLabel: "Active", statusClass: "text-emerald-700", dateLabel: `Signed ${dateStr}` };
  }
  return { statusLabel: "", statusClass: "", dateLabel: dateStr };
}

export function PropertyRentalPage({
  property,
  progress,
  leases = [],
  tenants = [],
  payments = [],
  expenses = [],
  documents = [],
  maintenanceItems = [],
}: {
  property: Property;
  progress: number;
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  documents: DbDocument[];
  maintenanceItems: MaintenanceItem[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartAt, setWizardStartAt] = useState<"data" | "verification">("data");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [markingInvestment, setMarkingInvestment] = useState(false);
  const [investmentConfirmOpen, setInvestmentConfirmOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isInvestment = (property.propertyUse ?? "investment") === "investment";
  const propertyUseLabel = property.propertyUse === "holiday" ? "holiday residence" : "personal residence";

  // Compute unlock state for investment properties
  const activeLeaseForUnlock = leases.find(
    (l) => l.stage === "Signed" && l.propertyId === property.id,
  ) ?? null;
  const primaryTenantForUnlock = tenants.find(
    (t) => t.propertyId === property.id,
  ) ?? null;
  const unlockState: UnlockState = property.rentalVerified
    ? { kind: "edit", entityId: property.id }
    : activeLeaseForUnlock || primaryTenantForUnlock
      ? { kind: "verify", entityId: property.id }
      : { kind: "unlock" };

  function openWizard() {
    setWizardStartAt(unlockState.kind === "verify" ? "verification" : "data");
    setWizardOpen(true);
  }

  // Non-investment early return
  if (!isInvestment) {
    return (
      <>
        <PropertyLayout activeTab="rental" property={property} progress={progress}>
          <div className="min-h-full bg-val-bg-page-alt flex items-center justify-center px-8 py-20">
            <div className="max-w-sm w-full bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center text-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-[#eef3ff] flex items-center justify-center">
                <Home className="w-7 h-7 text-[var(--val-primary-dark)]" />
              </div>
              <div className="space-y-2.5">
                <h2 className="text-[18px] font-bold text-val-heading tracking-tight leading-snug">
                  Rental isn&apos;t enabled for this property
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  This property is classified as a{" "}
                  <span className="font-semibold text-slate-700">{propertyUseLabel}</span>.
                  Switch it to investment to unlock lease tracking, tenant management, and payment history.
                </p>
              </div>
              <button
                onClick={() => setInvestmentConfirmOpen(true)}
                className="w-full px-6 py-2.5 text-white text-[13.5px] font-semibold rounded-lg hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                Mark as investment property
              </button>
            </div>
          </div>
        </PropertyLayout>

        <Dialog open={investmentConfirmOpen} onOpenChange={setInvestmentConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-[#eef3ff] flex items-center justify-center mb-1">
                <Home className="w-5 h-5 text-[var(--val-primary-dark)]" />
              </div>
              <DialogTitle>Mark as investment property?</DialogTitle>
              <DialogDescription>
                This will enable rental features — lease tracking, tenant management, and payment history — for this property.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setInvestmentConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                disabled={markingInvestment}
                onClick={async () => {
                  setMarkingInvestment(true);
                  const result = await updateProperty(property.id, { propertyUse: "investment" });
                  setMarkingInvestment(false);
                  setInvestmentConfirmOpen(false);
                  if (result.ok) {
                    toast.success("Property marked as investment");
                  } else {
                    toast.error(result.error);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-[var(--val-primary-dark)] hover:opacity-90 disabled:opacity-50 transition-[opacity] duration-150"
              >
                {markingInvestment ? "Updating…" : "Mark as investment"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const now = Date.now();

  // Maintenance
  function severityRank(s: MaintenanceSeverity): number {
    return s === "Emergency" ? 3 : s === "Urgent" ? 2 : 1;
  }
  function severityDotClass(s: MaintenanceSeverity): string {
    return s === "Emergency" ? "bg-rose-500" : s === "Urgent" ? "bg-amber-400" : "bg-slate-300";
  }
  const openItems = maintenanceItems.filter((m) => m.status === "Open");
  const inProgressItems = maintenanceItems.filter((m) => m.status === "InProgress");
  const activeMaintenanceItems = [...openItems, ...inProgressItems];
  const displayItems = [...activeMaintenanceItems]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.createdAt - a.createdAt)
    .slice(0, 3);

  // Lease & tenant
  const activeLeases = leases.filter(
    (l) => l.stage === "Signed" && l.startDate <= now && l.endDate >= now,
  );
  const activeLease = activeLeases[0] ?? null;
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const primaryTenant = activeLease?.tenantId ? (tenantMap.get(activeLease.tenantId) ?? null) : null;
  const isOccupied = activeLease !== null;

  // Property address from schema fields
  const propertyAddress = [property.addressLine, property.city, property.province]
    .filter(Boolean)
    .join(", ");
  const unitLabel = activeLease?.unit ?? property.name;

  // Page subtitle
  const pageSubtitle = activeLease
    ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo · Occupied · Lease expires ${formatDate(activeLease.endDate)}`
    : "No active lease";

  // KPI
  const rentValue = activeLease ? `$${activeLease.monthlyRent.toLocaleString("en-US")}` : "$—";
  const termLabel = activeLease ? `${activeLease.termMonths}-month` : null;
  const occupancyValue = isOccupied ? "Occupied" : "Vacant";
  const occupancyAccent = activeLease
    ? `${monthsSince(activeLease.startDate)} months · since ${formatMonthYear(activeLease.startDate)}`
    : "No active lease";

  // Lease expiry
  const daysUntilExpiry = activeLease
    ? Math.ceil((activeLease.endDate - now) / 86_400_000)
    : null;
  const showExpiryBanner = daysUntilExpiry !== null && daysUntilExpiry < 60;
  const expiryText =
    daysUntilExpiry === null ? null
    : daysUntilExpiry < 0 ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
    : daysUntilExpiry === 0 ? "Expires today"
    : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`;

  // Lease timeline progress
  const leaseProgress = activeLease
    ? Math.min(100, Math.max(0,
        ((now - activeLease.startDate) / (activeLease.endDate - activeLease.startDate)) * 100,
      ))
    : 0;

  // Lease fields (only schema-wired fields)
  const leaseFields: [string, string][] = [
    ["Start", activeLease ? formatDate(activeLease.startDate) : "—"],
    ["End", activeLease ? formatDate(activeLease.endDate) : "—"],
    ["Rent", activeLease ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo` : "—"],
    ["Term", activeLease ? `${activeLease.termMonths} months` : "—"],
    ...(activeLease?.renewalStatus ? [["Renewal", activeLease.renewalStatus] as [string, string]] : []),
  ];

  // Tenant
  const avatarInitials = primaryTenant
    ? primaryTenant.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const tenantName = primaryTenant?.name ?? "No tenant";
  const tenantEmail = primaryTenant?.email ?? null;
  const tenantPhone = primaryTenant?.phone ?? null;
  const movedInDate = activeLease ? formatDate(activeLease.startDate) : "—";

  // Chart: last 6 complete calendar months (rent + expenses)
  const nowDate = new Date(now);
  const chartWindowStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 6, 1);
  const chartWindowEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

  const rentInWindow = payments.filter(
    (p) =>
      p.kind === "Rent" &&
      p.status === "Paid" &&
      p.date >= chartWindowStart.getTime() &&
      p.date < chartWindowEnd.getTime(),
  );
  const expensesInWindow = expenses.filter(
    (e) => e.date >= chartWindowStart.getTime() && e.date < chartWindowEnd.getTime(),
  );

  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(chartWindowStart.getFullYear(), chartWindowStart.getMonth() + i, 1);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      rent: 0,
      expenses: 0,
    };
  });
  rentInWindow.forEach((p) => {
    const d = new Date(p.date);
    const slot = chartMonths.find((m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
    if (slot) slot.rent += p.amount;
  });
  expensesInWindow.forEach((e) => {
    const d = new Date(e.date);
    const slot = chartMonths.find((m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
    if (slot) slot.expenses += e.amount;
  });
  const chartData = chartMonths.map(({ month, rent, expenses }) => ({ month, rent, expenses }));
  const periodLabel = `${chartMonths[0].month} ${chartMonths[0].year} – ${chartMonths[5].month} ${chartMonths[5].year}`;

  const totalRentInWindow = rentInWindow.reduce((sum, p) => sum + p.amount, 0);
  const totalExpensesInWindow = expensesInWindow.reduce((sum, e) => sum + e.amount, 0);
  const netIncomeInWindow = totalRentInWindow - totalExpensesInWindow;

  // YTD
  const ytdStart = new Date(nowDate.getFullYear(), 0, 1).getTime();
  const rentReceivedYTD = payments
    .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now)
    .reduce((sum, p) => sum + p.amount, 0);
  const expensesYTD = expenses
    .filter((e) => e.date >= ytdStart && e.date <= now)
    .reduce((sum, e) => sum + e.amount, 0);
  const ytdNetIncome = rentReceivedYTD - expensesYTD;
  const ytdLabel = `${new Date(ytdStart).toLocaleDateString("en-US", { month: "short" })} – ${new Date(now).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  // Balance due
  const balanceDue = payments
    .filter((p) => p.status === "Pending" || p.status === "Overdue")
    .reduce((sum, p) => sum + p.amount, 0);
  const balanceDueStr = `$${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // On-time rate
  const rentPayments = payments.filter((p) => p.kind === "Rent");
  const onTimePct =
    rentPayments.length > 0
      ? Math.round(
          (rentPayments.filter((p) => p.status === "Paid").length / rentPayments.length) * 100,
        )
      : 0;

  // Payment ledger totals (for summary strip)
  const collectedTotal = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
  const overdueTotal = payments.filter((p) => p.status === "Overdue").reduce((s, p) => s + p.amount, 0);

  // Payment table
  const pageSize = 6;
  const sortedPayments = [...payments].sort((a, b) => b.date - a.date);
  const pagedPayments = sortedPayments.slice(0, pageSize);
  const totalPaymentPages = Math.ceil(payments.length / pageSize);
  const displayEnd = Math.min(pageSize, payments.length);

  function paymentStatusVariant(status: PaymentStatus): PaymentVariant {
    if (status === "Paid") return "success";
    if (status === "Pending") return "warning";
    if (status === "Overdue" || status === "Failed") return "danger";
    return "neutral";
  }

  function fade(delay: number) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(8px)",
      transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
    };
  }

  return (
    <>
    <PropertyLayout activeTab="rental" property={property} progress={progress}>
      <div className="bg-val-bg-page-alt min-h-full pb-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex flex-col gap-4 sm:gap-5">

          {/* ── Page header ── */}
          <div className="pt-8" style={fade(0)}>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">
                {property.code}
              </span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Rental</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-[28px] sm:text-[40px] font-extrabold tracking-tight leading-tight sm:leading-10 text-[--val-heading]">Rental</h1>
                  {property.rentalVerified ? (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Valgate Verified
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                            onSelect={() => setRevokeOpen(true)}
                          >
                            <ShieldOff className="w-4 h-4 mr-2 shrink-0" />
                            Revoke verification
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[12px] font-semibold mb-1">
                      Not verified
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-base mt-2">{pageSubtitle}</p>
              </div>
              {/* Edit/Verify pill — standardized wrapper (see Financials). */}
              <div className="shrink-0">
                <UnlockButton state={unlockState} onClick={openWizard} editLabel="Edit rental" />
              </div>
            </div>
          </div>

          {/* ── Unit context line ── */}
          <div className="flex items-center gap-2.5 -mt-2" style={fade(40)}>
            <span className="text-[13px] font-medium text-val-heading">{unitLabel}</span>
            {propertyAddress && (
              <span className="text-[13px] text-slate-400">· {propertyAddress}</span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isOccupied ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? "bg-emerald-500" : "bg-slate-400"}`} />
              {occupancyValue}
            </span>
          </div>

          {/* ── Lease expiry alert ── */}
          {showExpiryBanner && (
            <div
              className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-lg"
              style={fade(60)}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[13px] font-medium text-amber-800">
                  {expiryText} — act before the lease lapses.
                </p>
              </div>
              <button
                className="shrink-0 px-4 py-2 text-white text-[13px] font-semibold rounded-md hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                }}
              >
                Send Renewal Offer
              </button>
            </div>
          )}

          {/* ── KPI row — single card, 4 columns ── */}
          <div
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
            style={fade(80)}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <KpiStat
                label="Monthly Rent"
                value={rentValue}
                accent={
                  activeLease
                    ? `${termLabel} lease · since ${formatMonthYear(activeLease.startDate)}`
                    : "No active lease"
                }
              />
              <KpiStat
                label="Occupancy"
                value={occupancyValue}
                accent={occupancyAccent}
                accentClass={isOccupied ? "text-emerald-600" : "text-slate-400"}
              />
              <KpiStat
                label="YTD Net Income"
                value={formatCurrencyFull(ytdNetIncome)}
                accent={ytdLabel}
                accentClass={ytdNetIncome >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <KpiStat
                label="Balance Due"
                value={balanceDueStr}
                accent={balanceDue === 0 ? "All current" : "Due now"}
                accentClass={balanceDue === 0 ? "text-emerald-600" : "text-amber-600"}
                dotClass={balanceDue === 0 ? "bg-emerald-400" : "bg-amber-400"}
              />
            </div>
          </div>

          {/* ── Financial Overview (8) + Lease Summary (4) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5" style={fade(120)}>

            <FinancialOverviewCard
              periodLabel={periodLabel}
              chartData={chartData}
              totalRent={totalRentInWindow}
              totalExpenses={totalExpensesInWindow}
              netIncome={netIncomeInWindow}
            />

            {/* Lease Summary */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h3 className="text-base font-bold text-val-heading leading-none">Lease</h3>
                  {property.rentalVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold tracking-[0.05em] uppercase px-2 py-0.5 rounded-full w-fit">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      Valgate Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {termLabel && (
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded">
                      {termLabel}
                    </span>
                  )}
                  {property.rentalVerified && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors duration-150 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                          onSelect={() => setRevokeOpen(true)}
                        >
                          <ShieldOff className="w-4 h-4 mr-2 shrink-0" />
                          Revoke verification
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {activeLease ? (
                <>
                  <p className="text-[14px] font-semibold text-val-heading mb-3">
                    {primaryTenant?.name ?? "—"}
                  </p>

                  <div className="flex flex-col gap-2.5 text-[13px] flex-1">
                    {leaseFields.map(([l, v]) => (
                      <div key={String(l)} className="flex justify-between">
                        <span className="text-slate-400">{l}</span>
                        <span className="font-medium text-val-heading">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Lease timeline */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>{formatDate(activeLease.startDate)}</span>
                      <span>{formatDate(activeLease.endDate)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[--val-primary-dark] transition-all duration-700"
                        style={{ width: `${leaseProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                      {Math.round(leaseProgress)}% through lease
                    </p>
                  </div>

                  {/* Expiry note (only when not already shown as banner) */}
                  {!showExpiryBanner && expiryText && (
                    <div className="mt-3 px-3 py-2.5 bg-amber-50 rounded-md border border-amber-100">
                      <p className="text-amber-700 text-[12px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                        {expiryText}
                      </p>
                    </div>
                  )}

                  <button
                    className="w-full text-white rounded-md py-2.5 text-[13px] font-semibold mt-4 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    style={{
                      background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                    }}
                  >
                    Send Renewal Offer
                  </button>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-[13px] text-slate-400">No active lease</p>
                  <button className="mt-3 text-[13px] font-medium text-[--val-primary-dark] hover:underline">
                    Add lease →
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* ── Tenant + Maintenance (8) | Documents (4) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5" style={fade(180)}>

            {/* Left column: Tenant + Maintenance stacked */}
            <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">

              {/* Tenant Profile */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {/* Avatar hero row */}
                <div className="flex items-center gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-[--val-primary-dark] flex items-center justify-center text-white text-sm font-bold tracking-wide shrink-0">
                    {avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold text-val-heading">{tenantName}</p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-[0.05em] ${
                          isOccupied
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isOccupied ? "Active" : "No tenant"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px] text-slate-400 flex-wrap">
                      {tenantEmail && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          {tenantEmail}
                        </span>
                      )}
                      {tenantPhone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          {tenantPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="px-5 sm:px-6 py-4 grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-6 border-b border-slate-100 text-[13px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-1">
                      Moved In
                    </p>
                    <p className="font-medium text-val-heading">{movedInDate}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-1">
                      On-Time Payments
                    </p>
                    <p
                      className={`font-semibold ${
                        onTimePct >= 90
                          ? "text-emerald-600"
                          : onTimePct >= 70
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {onTimePct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-1">
                      Unit
                    </p>
                    <p className="font-medium text-val-heading">{unitLabel}</p>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex gap-2">
                  <button className="border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-val-heading hover:bg-slate-50 transition-colors">
                    Message Tenant
                  </button>
                  <button className="text-[12px] font-medium text-[--val-primary-dark] hover:underline">
                    View Full Profile →
                  </button>
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <h3 className="text-base font-bold text-val-heading">Maintenance</h3>
                  {openItems.length > 0 && (
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded-full">
                      {openItems.length} Open
                    </span>
                  )}
                  {inProgressItems.length > 0 && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded-full">
                      {inProgressItems.length} In Progress
                    </span>
                  )}
                </div>

                {displayItems.length === 0 ? (
                  <p className="text-[13px] text-slate-400">No open maintenance items.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100">
                    {displayItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <div
                          className={`w-2 h-2 ${severityDotClass(item.severity)} rounded-full mt-1.5 shrink-0`}
                        />
                        <div>
                          <p className="text-[13px] font-medium text-val-heading">{item.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.severity} ·{" "}
                            {item.status === "InProgress" ? "In Progress" : item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button className="border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-val-heading hover:bg-slate-50 transition-colors">
                    New Work Order
                  </button>
                  <button className="text-[12px] font-medium text-[--val-primary-dark] hover:underline">
                    View All Orders →
                  </button>
                </div>
              </div>

            </div>

            {/* Right column: Documents */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 sm:p-6">
              <h3 className="text-base font-bold text-val-heading mb-4">Documents</h3>

              {documents.length === 0 ? (
                <p className="text-[13px] text-slate-400">No documents uploaded.</p>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {documents
                    .slice()
                    .sort((a, b) => b.uploadedAt - a.uploadedAt)
                    .slice(0, 5)
                    .map((doc) => {
                      const { statusLabel, statusClass, dateLabel } = getDocStatusInfo(doc);
                      return (
                        <div key={doc.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                          <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-val-heading truncate">
                              {doc.name}
                            </p>
                            <p className="text-[11px] mt-0.5">
                              {statusLabel && (
                                <span className={`${statusClass} font-medium`}>
                                  {statusLabel} ·{" "}
                                </span>
                              )}
                              <span className="text-slate-400">{dateLabel}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button className="border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-val-heading hover:bg-slate-50 transition-colors">
                  Upload
                </button>
                <button className="text-[12px] font-medium text-[--val-primary-dark] hover:underline">
                  View All Docs →
                </button>
              </div>
            </div>

          </div>

          {/* ── Payment History ── */}
          <div
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
            style={fade(240)}
          >
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-val-heading">Payment History</h3>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                  Filter <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-white text-[12px] font-semibold rounded-md hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                  style={{
                    background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  }}
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Payment ledger summary strip */}
            {payments.length > 0 && (
              <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                <LedgerChip color="emerald" label="Collected" value={formatCurrencyFull(collectedTotal)} />
                {pendingTotal > 0 && (
                  <LedgerChip color="amber" label="Pending" value={formatCurrencyFull(pendingTotal)} />
                )}
                {overdueTotal > 0 && (
                  <LedgerChip color="rose" label="Overdue" value={formatCurrencyFull(overdueTotal)} />
                )}
              </div>
            )}

            {/*
              Payment History — desktop 5-column table; mobile stacked cards
              where the date + amount form the headline and method + status
              live below in a smaller meta row.
            */}
            <MobileCardTable
              desktop={
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[13px] text-slate-400">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      pagedPayments.map((p) => {
                        const variant = paymentStatusVariant(p.status);
                        return (
                          <tr
                            key={p.id}
                            className={`border-t border-slate-100 hover:bg-slate-50/50 transition-colors ${
                              p.status === "Overdue" ? "bg-rose-50/30" : ""
                            }`}
                          >
                            <td className="px-6 py-3.5 text-[13px] text-slate-600">{formatDate(p.date)}</td>
                            <td className="px-6 py-3.5 text-[13px] text-slate-600">{p.kind}</td>
                            <td className="px-6 py-3.5 text-[13px] font-semibold text-val-heading">
                              {formatCurrencyFull(p.amount)}
                            </td>
                            <td className="px-6 py-3.5 text-[13px] text-slate-400">{p.method}</td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`flex items-center gap-1.5 text-[12px] font-medium ${statusVariants[variant]}`}
                              >
                                <Circle className="w-1.5 h-1.5 fill-current" />
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              }
              mobile={
                pagedPayments.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-slate-400">
                    No payments recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100">
                    {pagedPayments.map((p) => {
                      const variant = paymentStatusVariant(p.status);
                      return (
                        <div
                          key={p.id}
                          className={`px-4 py-3.5 flex flex-col gap-1.5 ${
                            p.status === "Overdue" ? "bg-rose-50/30" : ""
                          }`}
                        >
                          {/* Row 1 — date + amount headline */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] text-val-heading font-medium">
                                {formatDate(p.date)}
                              </p>
                              <p className="text-[11px] text-slate-400">{p.kind}</p>
                            </div>
                            <p className="text-[14px] font-semibold text-val-heading tabular-nums shrink-0">
                              {formatCurrencyFull(p.amount)}
                            </p>
                          </div>

                          {/* Row 2 — method + status */}
                          <div className="flex items-center justify-between gap-3 mt-0.5">
                            <span className="text-[12px] text-slate-500">{p.method}</span>
                            <span
                              className={`flex items-center gap-1.5 text-[12px] font-medium ${statusVariants[variant]}`}
                            >
                              <Circle className="w-1.5 h-1.5 fill-current" />
                              {p.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            />

            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50/40">
              <span className="text-[12px] text-slate-400">
                Showing 1–{displayEnd} of {payments.length} payment
                {payments.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1.5">
                <button className="size-8 border border-slate-200 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <span className="text-[12px] text-slate-400 px-2">
                  Page 1 of {Math.max(1, totalPaymentPages)}
                </span>
                <button
                  className="size-8 rounded-md flex items-center justify-center hover:opacity-90 transition-colors"
                  style={{ background: "var(--val-primary-dark)" }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PropertyLayout>

    {/* Rental wizard */}
    <RentalUnlockMount
      open={wizardOpen}
      onOpenChange={setWizardOpen}
      propertyId={property.id}
      startAt={wizardStartAt}
      onSuccess={() => router.refresh()}
    />

    {/* Revoke verification dialog */}
    <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-1">
            <ShieldOff className="w-5 h-5 text-rose-500" />
          </div>
          <DialogTitle>Revoke rental verification?</DialogTitle>
          <DialogDescription>
            This will remove the Valgate Verified badge from this property&apos;s rental data. The linked document will remain in your files but will no longer count as rental evidence.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => setRevokeOpen(false)}
            className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            disabled={revoking}
            onClick={async () => {
              setRevoking(true);
              const result = await revokeRentalVerification(property.id);
              setRevoking(false);
              setRevokeOpen(false);
              if (result.ok) {
                toast.success("Rental verification revoked");
                router.refresh();
              } else {
                toast.error(result.error);
              }
            }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors duration-150"
          >
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ChartMonth = { month: string; rent: number; expenses: number };

function formatChartAxis(value: number): string {
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

function FinancialChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_4px_12px_rgba(18,28,40,0.08)]">
      <p className="text-[11px] font-semibold text-slate-500 mb-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => {
          const isRent = entry.name === "rent";
          const amount = typeof entry.value === "number" ? entry.value : 0;
          return (
            <div key={String(entry.name)} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isRent ? "var(--val-primary-dark)" : "#fda4af" }}
                />
                {isRent ? "Rent" : "Expenses"}
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-val-heading">
                {formatCurrencyFull(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialOverviewCard({
  periodLabel,
  chartData,
  totalRent,
  totalExpenses,
  netIncome,
}: {
  periodLabel: string;
  chartData: ChartMonth[];
  totalRent: number;
  totalExpenses: number;
  netIncome: number;
}) {
  const netPositive = netIncome >= 0;
  const hasChartData = chartData.some((d) => d.rent > 0 || d.expenses > 0);

  return (
    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
      <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-8">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-val-heading tracking-tight">
            Financial Overview
          </h3>
          <p className="text-[13px] text-slate-500 mt-1">{periodLabel}</p>
          <div className="flex items-center gap-4 mt-4">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--val-primary-dark)] opacity-90" />
              Rent
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#fda4af]" />
              Expenses
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            6-mo net
          </p>
          <p
            className={`text-[28px] font-bold leading-none tracking-tight tabular-nums mt-1 ${
              netPositive ? "text-val-heading" : "text-rose-600"
            }`}
          >
            {formatCurrencyFull(netIncome)}
          </p>
          <p
            className={`text-[12px] font-medium mt-1.5 tabular-nums ${
              netPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {netPositive ? "Positive" : "Negative"} cash flow
          </p>
        </div>
      </div>

      <div className="px-2 pb-1">
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              barCategoryGap="28%"
              barGap={4}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#eef1f5"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={formatChartAxis}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,74,198,0.04)" }}
                content={<FinancialChartTooltip />}
              />
              <Bar
                dataKey="rent"
                fill="var(--val-primary-dark)"
                radius={[4, 4, 0, 0]}
                name="rent"
                opacity={0.92}
                maxBarSize={28}
              />
              <Bar
                dataKey="expenses"
                fill="#fda4af"
                radius={[4, 4, 0, 0]}
                name="expenses"
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="mx-4 mb-2 flex h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
            <p className="text-[13px] text-slate-500">
              No rent or expense activity in this period yet.
            </p>
          </div>
        )}
      </div>

      {/* Financial summary row — single column on phone (3 stats stack;
          ~358px wide each), 3-up at tablet+ */}
      <div className="mx-4 sm:mx-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FinancialStatCell
          label="Total rent"
          value={formatCurrencyFull(totalRent)}
          valueClass="text-val-heading"
        />
        <FinancialStatCell
          label="Expenses"
          value={formatCurrencyFull(totalExpenses)}
          valueClass="text-rose-600"
        />
        <FinancialStatCell
          label="Net income"
          value={formatCurrencyFull(netIncome)}
          valueClass={netPositive ? "text-emerald-600" : "text-rose-600"}
          highlight
        />
      </div>
    </div>
  );
}

function FinancialStatCell({
  label,
  value,
  valueClass,
  highlight = false,
}: {
  label: string;
  value: string;
  valueClass: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-4 py-3.5 ${
        highlight
          ? "bg-[#f4f7fc] border border-[#e2e9f5]"
          : "bg-slate-50/80 border border-slate-100"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
        {label}
      </p>
      <p className={`text-[17px] font-bold tabular-nums mt-1 leading-none ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function KpiStat({
  label,
  value,
  accent,
  accentClass,
  dotClass,
}: {
  label: string;
  value: string;
  accent?: string;
  accentClass?: string;
  dotClass?: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-2">
        {label}
      </p>
      <p className="text-[22px] font-bold text-val-heading leading-none tracking-tight">{value}</p>
      {accent && (
        <p className={`text-[12px] mt-2 font-medium flex items-center gap-1.5 ${accentClass ?? "text-slate-400"}`}>
          {dotClass && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
          {accent}
        </p>
      )}
    </div>
  );
}

function LedgerChip({
  color,
  label,
  value,
}: {
  color: "emerald" | "amber" | "rose";
  label: string;
  value: string;
}) {
  const dot =
    color === "emerald" ? "bg-emerald-400" : color === "amber" ? "bg-amber-400" : "bg-rose-400";
  const text =
    color === "emerald"
      ? "text-emerald-700"
      : color === "amber"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className={`text-[12px] font-semibold ${text}`}>{value}</span>
    </div>
  );
}
