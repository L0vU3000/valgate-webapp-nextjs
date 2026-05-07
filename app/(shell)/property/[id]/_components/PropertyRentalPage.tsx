"use client";

import { useState, useEffect } from "react";
import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment, PaymentStatus } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Document as DbDocument } from "@/lib/data/types/document";
import type { MaintenanceItem, MaintenanceSeverity } from "@/lib/data/types/maintenance-item";
import { formatCurrencyFull } from "@/lib/format";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Mail, Phone, FileText, ChevronLeft, ChevronRight,
  Circle, ChevronDown, Home, Download,
} from "lucide-react";

type PaymentVariant = "success" | "warning" | "neutral";

const statusVariants: Record<PaymentVariant, string> = {
  success: "text-emerald-700",
  warning: "text-amber-600",
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
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (doc.category === "Insurance" && Date.now() - doc.uploadedAt > oneYearMs) {
    const expStr = new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return { statusLabel: "Expiring", statusClass: "text-amber-600", dateLabel: `Exp: ${expStr}` };
  }
  return { statusLabel: "", statusClass: "", dateLabel: dateStr };
}

export function PropertyRentalPage({
  property,
  leases = [],
  tenants = [],
  payments = [],
  expenses = [],
  documents = [],
  maintenanceItems = [],
}: {
  property: Property;
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  documents: DbDocument[];
  maintenanceItems: MaintenanceItem[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const now = Date.now();

  function severityRank(s: MaintenanceSeverity): number {
    return s === "Emergency" ? 3 : s === "Urgent" ? 2 : 1;
  }
  function severityDotClass(s: MaintenanceSeverity): string {
    return s === "Emergency" ? "bg-rose-500" : s === "Urgent" ? "bg-amber-400" : "bg-slate-400";
  }
  const openItems = maintenanceItems.filter((m) => m.status === "Open");
  const inProgressItems = maintenanceItems.filter((m) => m.status === "InProgress");
  const activeItems = [...openItems, ...inProgressItems];
  const displayItems = [...activeItems]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.createdAt - a.createdAt)
    .slice(0, 2);

  const activeLeases = leases.filter(
    (l) => l.stage === "Signed" && l.startDate <= now && l.endDate >= now
  );
  const activeLease = activeLeases[0] ?? null;
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const primaryTenant = activeLease?.tenantId ? (tenantMap.get(activeLease.tenantId) ?? null) : null;

  const isOccupied = activeLease !== null;

  const pageSubtitle = activeLease
    ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo · Occupied · Lease expires ${formatDate(activeLease.endDate)}`
    : "No active lease";

  const rentValue = activeLease ? "$" + activeLease.monthlyRent.toLocaleString("en-US") : "$0";

  const occupancyValue = isOccupied ? "Occupied" : "Vacant";
  const occupancyAccent = activeLease
    ? `${monthsSince(activeLease.startDate)} months · Since ${formatMonthYear(activeLease.startDate)}`
    : "No active lease";

  const termLabel = activeLease ? `${activeLease.termMonths}-month` : "—";

  const leaseFields: [string, string][] = [
    ["Lease Start", activeLease ? formatDate(activeLease.startDate) : "—"],
    ["Lease End", activeLease ? formatDate(activeLease.endDate) : "—"],
    ["Rent", activeLease ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo` : "—"],
    ["Deposit", "—"],
    ["Auto-pay", "—"],
  ];

  const daysUntilExpiry = activeLease ? Math.ceil((activeLease.endDate - now) / 86400000) : null;
  const expiryText =
    daysUntilExpiry === null ? null
    : daysUntilExpiry < 0 ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
    : daysUntilExpiry === 0 ? "Expires today"
    : `Expires in ${daysUntilExpiry} days`;

  const avatarInitials = primaryTenant
    ? primaryTenant.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "—";

  const tenantName = primaryTenant?.name ?? "—";
  const tenantEmail = primaryTenant?.email ?? "—";
  const tenantPhone = primaryTenant?.phone ?? "—";
  const movedInDate = activeLease ? formatDate(activeLease.startDate) : "—";
  const tenantNameInSummary = primaryTenant?.name ?? "—";

  // Chart window: last 6 complete calendar months
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

  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(chartWindowStart.getFullYear(), chartWindowStart.getMonth() + i, 1);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      rent: 0,
    };
  });
  rentInWindow.forEach((p) => {
    const d = new Date(p.date);
    const slot = chartMonths.find(
      (m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth(),
    );
    if (slot) slot.rent += p.amount;
  });
  const chartData = chartMonths.map(({ month, rent }) => ({ month, rent }));
  const periodLabel = `${chartMonths[0].month} ${chartMonths[0].year} – ${chartMonths[5].month} ${chartMonths[5].year}`;

  const totalRentInWindow = rentInWindow.reduce((sum, p) => sum + p.amount, 0);
  const expensesInWindow = expenses.filter(
    (e) => e.date >= chartWindowStart.getTime() && e.date < chartWindowEnd.getTime(),
  );
  const totalExpensesInWindow = expensesInWindow.reduce((sum, e) => sum + e.amount, 0);
  const netIncomeInWindow = totalRentInWindow - totalExpensesInWindow;

  // YTD for KPI cards
  const ytdStart = new Date(nowDate.getFullYear(), 0, 1).getTime();
  const rentReceivedYTD = payments
    .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now)
    .reduce((sum, p) => sum + p.amount, 0);
  const expensesYTD = expenses
    .filter((e) => e.date >= ytdStart && e.date <= now)
    .reduce((sum, e) => sum + e.amount, 0);
  const ytdNetIncome = rentReceivedYTD - expensesYTD;

  const balanceDue = payments
    .filter((p) => p.status === "Pending" || p.status === "Overdue")
    .reduce((sum, p) => sum + p.amount, 0);
  const balanceDueStr =
    "$" + balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceDueAccent = balanceDue === 0 ? "Current" : `$${balanceDue.toLocaleString("en-US")} due`;
  const balanceDueAccentClass = balanceDue === 0 ? "text-emerald-600" : "text-amber-600";

  const rentPayments = payments.filter((p) => p.kind === "Rent");
  const onTimePct =
    rentPayments.length > 0
      ? Math.round((rentPayments.filter((p) => p.status === "Paid").length / rentPayments.length) * 100)
      : 0;

  const pageSize = 6;
  const sortedPayments = [...payments].sort((a, b) => b.date - a.date);
  const pagedPayments = sortedPayments.slice(0, pageSize);
  const totalPaymentPages = Math.ceil(payments.length / pageSize);
  const displayEnd = Math.min(pageSize, payments.length);

  function paymentStatusVariant(status: PaymentStatus): PaymentVariant {
    if (status === "Paid") return "success";
    if (status === "Pending" || status === "Overdue" || status === "Failed") return "warning";
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
    <PropertyLayout activeTab="rental" property={property}>
      <div className="bg-val-bg-page-alt min-h-full pb-10">
      <div className="max-w-[1200px] mx-auto px-8 flex flex-col gap-5">

        {/* Page header */}
        <div className="pt-8 pb-0" style={fade(0)}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">{property.code}</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Rental</span>
          </div>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight leading-10 text-[--val-heading]">Rental</h1>
              <p className="text-slate-500 text-base mt-2">{pageSubtitle}</p>
            </div>
            <button
              className="px-5 py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)", boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)" }}
            >
              Send Renewal Offer
            </button>
          </div>
        </div>

        {/* Unit header */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]" style={fade(60)}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-val-heading">Unit 4B — 123 Maple St, Chicago, IL 60601</p>
              <p className="text-[13px] text-slate-500">3 Bed / 2 Bath · 1,250 sq ft · Floor 4</p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${isOccupied ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? "bg-emerald-500" : "bg-slate-400"}`} />
            {occupancyValue}
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4" style={fade(80)}>
          <KpiCard label="Monthly Rent" value={rentValue} sub="/mo" accent="" accentClass="text-slate-400" />
          <KpiCard label="Occupancy" value={occupancyValue} sub="" accent={occupancyAccent} accentClass="text-slate-400" />
          <KpiCard label="YTD Net Income" value={formatCurrencyFull(ytdNetIncome)} sub="" accent="" accentClass="text-slate-400" />
          <KpiCard label="Balance Due" value={balanceDueStr} sub="" accent={balanceDueAccent} accentClass={balanceDueAccentClass} showDot={balanceDue === 0} />
        </div>

        {/* Financial Overview + Lease Summary */}
        <div className="grid grid-cols-12 gap-5" style={fade(140)}>

          <div className="col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-val-heading">Financial Overview</h3>
              <button className="flex items-center gap-1.5 border border-slate-200 rounded px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors duration-150">
                {periodLabel} <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Rent"]}
                  contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="rent" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-8 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Total Rent</p>
                <p className="text-[18px] font-bold text-val-heading mt-0.5">{formatCurrencyFull(totalRentInWindow)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Expenses</p>
                <p className="text-[18px] font-bold text-rose-600 mt-0.5">{formatCurrencyFull(totalExpensesInWindow)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Net Income</p>
                <p className="text-[18px] font-bold text-emerald-600 mt-0.5">
                  {formatCurrencyFull(netIncomeInWindow)}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-4 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-val-heading">Lease Summary</h3>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded">{termLabel}</span>
            </div>
            <p className="text-[15px] font-semibold text-val-heading mb-4">{tenantNameInSummary}</p>
            <div className="flex flex-col gap-2 text-[13px] flex-1">
              {leaseFields.map(([l, v]) => (
                <div key={String(l)} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium text-val-heading">{v}</span>
                </div>
              ))}
            </div>
            {expiryText && (
              <div className="mt-4 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-amber-700 text-[13px] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                  {expiryText}
                </p>
              </div>
            )}
            <button
              className="w-full text-white rounded py-2.5 text-[14px] font-semibold mt-3 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
              }}
            >
              Send Renewal Offer
            </button>
          </div>

        </div>

        {/* Tenant, Maintenance, Documents */}
        <div className="grid grid-cols-12 gap-5" style={fade(200)}>

          {/* Tenant Profile */}
          <div className="col-span-5 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-val-heading">Tenant Profile</h3>
              <div className="w-8 h-8 bg-[--val-primary-dark] rounded-full flex items-center justify-center text-white text-[11px] font-bold">{avatarInitials}</div>
            </div>
            <p className="text-[15px] font-semibold text-val-heading">{tenantName}</p>
            <div className="flex flex-col gap-1.5 text-[13px] text-slate-500 mt-2">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> {tenantEmail}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {tenantPhone}</div>
            </div>
            <div className="border-t border-slate-100 mt-4 pt-3 flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Moved in</span>
                <span className="font-medium text-val-heading">{movedInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">On-time payments</span>
                <span className="font-medium text-val-heading">{onTimePct}%</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="border border-slate-200 rounded px-3 py-1.5 text-[13px] font-medium text-val-heading hover:bg-slate-50 transition-colors duration-150">
                Message Tenant
              </button>
              <button className="text-[--val-primary-dark] text-[13px] font-medium hover:underline">View Full Profile →</button>
            </div>
          </div>

          {/* Maintenance */}
          <div className="col-span-4 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h3 className="text-base font-bold text-val-heading">Maintenance</h3>
              {openItems.length > 0 && (
                <span className="bg-rose-50 text-rose-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded-full">{openItems.length} Open</span>
              )}
              {inProgressItems.length > 0 && (
                <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded-full">{inProgressItems.length} In Progress</span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {displayItems.length === 0 ? (
                <p className="text-[13px] text-slate-400">—</p>
              ) : displayItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 ${severityDotClass(item.severity)} rounded-full mt-1.5 shrink-0`} />
                  <div>
                    <p className="text-[13px] font-medium text-val-heading">{item.title}</p>
                    <p className="text-[12px] text-slate-500">{item.severity} priority · {item.status === "InProgress" ? "In Progress" : item.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 border-t border-slate-100 pt-3">
              <button className="border border-slate-200 rounded px-3 py-1.5 text-[13px] font-medium text-val-heading hover:bg-slate-50 transition-colors duration-150">
                New Work Order
              </button>
              <button className="text-[--val-primary-dark] text-[13px] font-medium hover:underline">View All Orders →</button>
            </div>
          </div>

          {/* Documents */}
          <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
            <h3 className="text-base font-bold text-val-heading mb-4">Documents</h3>
            <div className="flex flex-col gap-3">
              {documents.length === 0 ? (
                <p className="text-[13px] text-slate-400">—</p>
              ) : (
                documents
                  .slice()
                  .sort((a, b) => b.uploadedAt - a.uploadedAt)
                  .slice(0, 3)
                  .map((doc) => {
                    const { statusLabel, statusClass, dateLabel } = getDocStatusInfo(doc);
                    return (
                      <div key={doc.id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 bg-slate-50 rounded flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-val-heading">{doc.name}</p>
                          <p className="text-[12px]">
                            {statusLabel && <span className={statusClass}>{statusLabel} · </span>}
                            <span className="text-slate-500">{dateLabel}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            <div className="flex gap-2 mt-4 border-t border-slate-100 pt-3">
              <button className="border border-slate-200 rounded px-3 py-1.5 text-[13px] font-medium text-val-heading hover:bg-slate-50 transition-colors duration-150">
                Upload Document
              </button>
              <button className="text-[--val-primary-dark] text-[13px] font-medium hover:underline">View All Docs →</button>
            </div>
          </div>

        </div>

        {/* Payment History */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] overflow-hidden" style={fade(260)}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-val-heading">Payment History</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 border border-slate-200 rounded px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors duration-150">
                Filter <ChevronDown className="w-3 h-3" />
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-[12px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Type</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Amount</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Method</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-[13px]">—</td>
                </tr>
              ) : pagedPayments.map((p) => {
                const variant = paymentStatusVariant(p.status);
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-slate-100 hover:bg-blue-50/30 transition-colors ${p.status === "Overdue" ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5 text-[14px] text-val-heading">{formatDate(p.date)}</td>
                    <td className="px-5 py-3.5 text-[14px] text-val-heading">{p.kind}</td>
                    <td className="px-5 py-3.5 text-[14px] font-medium text-val-heading">{formatCurrencyFull(p.amount)}</td>
                    <td className="px-5 py-3.5 text-[14px] text-slate-500">{p.method}</td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1.5 text-[13px] font-medium ${statusVariants[variant]}`}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="bg-slate-50/60 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
            <span className="text-[13px] text-slate-500">
              Showing 1–{displayEnd} of {payments.length} payment{payments.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <button className="size-8 bg-val-bg-tint rounded flex items-center justify-center hover:bg-blue-100 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <span className="text-[13px] text-slate-500 px-2">Page 1 of {Math.max(1, totalPaymentPages)}</span>
              <button
                className="size-8 rounded flex items-center justify-center hover:opacity-90 transition-colors"
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
  );
}

function KpiCard({
  label, value, sub, accent, accentClass, showDot = false,
}: {
  label: string; value: string; sub: string; accent: string; accentClass: string; showDot?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-3">{label}</p>
      <p className="text-[24px] font-bold text-val-heading leading-none">{value}</p>
      {sub && <p className="text-[13px] text-slate-400 mt-0.5">{sub}</p>}
      <p className={`text-[12px] mt-2 font-medium flex items-center gap-1 ${accentClass}`}>
        {showDot && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block shrink-0" />}
        {accent}
      </p>
    </div>
  );
}
