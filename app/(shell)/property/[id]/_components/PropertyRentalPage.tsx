"use client";

import { useState, useEffect } from "react";
import type { Property } from "@/lib/mock-data";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Mail, Phone, FileText, ChevronLeft, ChevronRight, CheckCircle,
  Circle, ChevronDown, Home, Download,
} from "lucide-react";

const chartData = [
  { month: "Jan", rent: 2100 },
  { month: "Feb", rent: 2300 },
  { month: "Mar", rent: 2450 },
  { month: "Apr", rent: 2200 },
  { month: "May", rent: 2400 },
  { month: "Jun", rent: 2450 },
];

type PaymentVariant = "success" | "warning" | "neutral";

const payments: { date: string; type: string; amount: string; method: string; status: string; variant: PaymentVariant; highlight?: boolean }[] = [
  { date: "Jun 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", variant: "success" },
  { date: "May 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", variant: "success" },
  { date: "Apr 3, 2025", type: "Late Fee", amount: "$75.00", method: "Card", status: "Paid", variant: "success" },
  { date: "Apr 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Late (3 days)", variant: "warning", highlight: true },
  { date: "Mar 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", variant: "success" },
  { date: "Mar 1, 2025", type: "Security Deposit", amount: "$4,900", method: "Check", status: "Held in escrow", variant: "neutral" },
];

const statusVariants: Record<PaymentVariant, string> = {
  success: "text-emerald-700",
  warning: "text-amber-600",
  neutral: "text-slate-500",
};

export function PropertyRentalPage({ property }: { property: Property }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
              <p className="text-slate-500 text-base mt-2">$2,450/mo · Occupied · Lease expires Feb 28, 2026</p>
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
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[12px] font-semibold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Occupied
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4" style={fade(80)}>
          <KpiCard label="Monthly Rent" value="$2,450" sub="/mo" accent="↑ $150 above market avg" accentClass="text-emerald-600" />
          <KpiCard label="Occupancy" value="Occupied" sub="" accent="6 months · Since Mar 2024" accentClass="text-slate-400" />
          <KpiCard label="YTD Net Income" value="$21,875" sub="" accent="↑ +8.2% vs last year" accentClass="text-emerald-600" />
          <KpiCard label="Balance Due" value="$0.00" sub="" accent="Current" accentClass="text-emerald-600" showDot />
        </div>

        {/* Financial Overview + Lease Summary */}
        <div className="grid grid-cols-12 gap-5" style={fade(140)}>

          <div className="col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-val-heading">Financial Overview</h3>
              <button className="flex items-center gap-1.5 border border-slate-200 rounded px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors duration-150">
                Jan – Jun 2025 <ChevronDown className="w-3 h-3" />
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
                <p className="text-[18px] font-bold text-val-heading mt-0.5">$14,700</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Expenses</p>
                <p className="text-[18px] font-bold text-rose-600 mt-0.5">$3,250</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Net Income</p>
                <p className="text-[18px] font-bold text-emerald-600 mt-0.5">
                  $11,450 <span className="text-[13px] font-medium">↑ vs prior period</span>
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-4 bg-white border border-slate-200 rounded-lg p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-val-heading">Lease Summary</h3>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded">12-month</span>
            </div>
            <p className="text-[15px] font-semibold text-val-heading mb-4">Jane Smith</p>
            <div className="flex flex-col gap-2 text-[13px] flex-1">
              {[
                ["Lease Start", "Mar 1, 2024"],
                ["Lease End", "Feb 28, 2026"],
                ["Rent", "$2,450/mo"],
                ["Deposit", "$4,900"],
                ["Auto-pay", "Active"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium text-val-heading">
                    {v === "Active"
                      ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                      : v}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-amber-700 text-[13px] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                Expires in 47 days
              </p>
            </div>
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
              <div className="w-8 h-8 bg-[--val-primary-dark] rounded-full flex items-center justify-center text-white text-[11px] font-bold">JS</div>
            </div>
            <p className="text-[15px] font-semibold text-val-heading">Jane Smith</p>
            <div className="flex flex-col gap-1.5 text-[13px] text-slate-500 mt-2">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> jane@email.com</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> (312) 555-0192</div>
            </div>
            <div className="border-t border-slate-100 mt-4 pt-3 flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Moved in</span>
                <span className="font-medium text-val-heading">Mar 1, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">On-time payments</span>
                <span className="font-medium text-val-heading">98%</span>
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
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-bold text-val-heading">Maintenance</h3>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold tracking-[1px] uppercase px-2 py-0.5 rounded-full">2 Open</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-val-heading">Leaky faucet — Kitchen</p>
                  <p className="text-[12px] text-slate-500">High priority · Assigned: Bob V.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-val-heading">HVAC Filter Replacement</p>
                  <p className="text-[12px] text-slate-500">Medium priority · Scheduled: Jun 15</p>
                </div>
              </div>
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
              {[
                { name: "Lease Agreement", statusLabel: "Active", statusClass: "text-emerald-700", date: "Signed Mar 1, 2024" },
                { name: "Move-in Checklist", statusLabel: "", statusClass: "", date: "Mar 1, 2024" },
                { name: "Insurance Certificate", statusLabel: "Expiring", statusClass: "text-amber-600", date: "Exp: Dec 2025" },
              ].map((doc) => (
                <div key={doc.name} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-slate-50 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-val-heading">{doc.name}</p>
                    <p className="text-[12px]">
                      {doc.statusLabel && <span className={doc.statusClass}>{doc.statusLabel} · </span>}
                      <span className="text-slate-500">{doc.date}</span>
                    </p>
                  </div>
                </div>
              ))}
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
              {payments.map((p, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-100 hover:bg-blue-50/30 transition-colors ${p.highlight ? "bg-amber-50/40" : ""}`}
                >
                  <td className="px-5 py-3.5 text-[14px] text-val-heading">{p.date}</td>
                  <td className="px-5 py-3.5 text-[14px] text-val-heading">{p.type}</td>
                  <td className="px-5 py-3.5 text-[14px] font-medium text-val-heading">{p.amount}</td>
                  <td className="px-5 py-3.5 text-[14px] text-slate-500">{p.method}</td>
                  <td className="px-5 py-3.5">
                    <span className={`flex items-center gap-1.5 text-[13px] font-medium ${statusVariants[p.variant]}`}>
                      <Circle className="w-1.5 h-1.5 fill-current" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50/60 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
            <span className="text-[13px] text-slate-500">Showing 1–6 of 24 payments</span>
            <div className="flex items-center gap-1.5">
              <button className="size-8 bg-val-bg-tint rounded flex items-center justify-center hover:bg-blue-100 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <span className="text-[13px] text-slate-500 px-2">Page 1 of 4</span>
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
