"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/lib/mock-data";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  Check, Mail, Phone, MapPin, FileText, Upload,
  Users, DollarSign, Clock, Scale, UserPlus,
} from "lucide-react";

function fade(mounted: boolean, delay: number, reduced = false) {
  if (reduced) return { opacity: 1 };
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-8px)",
    transition: "opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)",
    transitionDelay: `${delay}ms`,
  };
}

const kpis = [
  { label: "Ownership Type", value: "Tenancy in Common", sub: "Joint ownership", Icon: Scale },
  { label: "Total Owners", value: "2", sub: "Co-owners", Icon: Users },
  { label: "Acquisition Price", value: "$485,000", sub: "Mar 2021", Icon: DollarSign },
  { label: "Holding Period", value: "4 yrs 3 mos", sub: "Since Mar 2021", Icon: Clock },
];

const docs = [
  { name: "Property Deed", type: "Title Document", date: "Mar 2021", owner: "Both" },
  { name: "Purchase Agreement", type: "Contract", date: "Feb 2021", owner: "Both" },
  { name: "Mortgage Note", type: "Loan Document", date: "Mar 2021", owner: "Both" },
  { name: "Co-Owner Agreement", type: "Legal Agreement", date: "Mar 2021", owner: "Both" },
];

const historyItems = [
  { date: "Jan 15, 2026", text: "1099 forms generated and sent to both owners", color: "var(--val-primary-dark)" },
  { date: "Dec 01, 2025", text: "Annual equity statement distributed", color: "#F59E0B" },
  { date: "Mar 15, 2021", text: "Property acquired — Tenancy in Common established", color: "#059669" },
  { date: "Mar 15, 2021", text: "Deed recorded with Cook County", color: "#515D66" },
];

export function PropertyOwnershipPage({ property }: { property: Property }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <PropertyLayout activeTab="ownership" property={property}>
      <div className="bg-val-bg-page-alt min-h-full pb-10">

        {/* Page Header */}
        <div className="pt-8 pb-6" style={fade(mounted, 0, reducedMotion)}>
          <div className="max-w-[1200px] mx-auto px-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{property.code}</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Ownership</span>
            </div>

            {/* Title row */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">Ownership</h1>
                <p className="text-slate-500 text-base mt-2">
                  Co-owners, equity position, and legal structure for {property.name}.
                </p>
              </div>
              <button
                className="px-5 py-2.5 text-white text-[14px] font-semibold rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                <UserPlus className="w-4 h-4" />
                Add Owner
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-8 pt-6 flex flex-col gap-5">

          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4" style={fade(mounted, 60, reducedMotion)}>
            {kpis.map((kpi, i) => (
              <div
                key={kpi.label}
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={{ transitionDelay: `${100 + i * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    {kpi.label}
                  </span>
                  <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <kpi.Icon className="size-4 text-blue-500" />
                  </div>
                </div>
                <div className="text-[20px] font-bold text-val-heading leading-none">{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Equity & Financial + Ownership Split */}
          <div className="grid grid-cols-12 gap-5" style={fade(mounted, 160, reducedMotion)}>

            <div className="col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-5">Equity &amp; Financial Position</h3>
              <div className="flex gap-12 mb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                    Current Estimated Value
                  </p>
                  <p className="text-[28px] font-bold text-val-heading leading-none">$612,000</p>
                  <p className="text-xs text-emerald-600 mt-1">▲ +26.2% since purchase</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                    Remaining Mortgage
                  </p>
                  <p className="text-[28px] font-bold text-val-heading leading-none">$341,200</p>
                  <p className="text-xs text-slate-400 mt-1">Fixed 30yr @ 3.875%</p>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Equity</span>
                  <span className="text-[13px] font-bold text-val-heading">$270,800 (44.2%)</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[--val-primary-dark]"
                    style={{
                      width: mounted ? "44%" : "0%",
                      transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 200ms",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                {[
                  { label: "LTV Ratio", value: "55.8%" },
                  { label: "Monthly P/I", value: "$1,612/mo" },
                  { label: "Next Payment Due", value: "Feb 01, 2026" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">
                      {label}
                    </p>
                    <p className="text-[14px] font-semibold text-val-heading">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-5">Ownership Split</h3>
              <div className="flex items-center justify-center mb-5">
                <div className="relative w-[140px] h-[140px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e4efff" strokeWidth="12" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="var(--val-primary-dark)" strokeWidth="12"
                      strokeDasharray={mounted ? `${60 * 2.51} ${100 * 2.51}` : `0 ${100 * 2.51}`}
                      style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s" }}
                    />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#38bdf8" strokeWidth="12"
                      strokeDasharray={mounted ? `${40 * 2.51} ${100 * 2.51}` : `0 ${100 * 2.51}`}
                      strokeDashoffset={`${-60 * 2.51}`}
                      style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[13px] font-bold text-val-heading">60% · 40%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[--val-primary-dark] shrink-0" />
                  <span className="text-[14px] text-val-heading">J. Smith</span>
                  <span className="text-[14px] font-semibold text-val-heading ml-auto">60%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                  <span className="text-[14px] text-val-heading">M. Jones</span>
                  <span className="text-[14px] font-semibold text-val-heading ml-auto">40%</span>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                Edit Split
              </button>
            </div>
          </div>

          {/* Owner Cards */}
          <div className="grid grid-cols-2 gap-5" style={fade(mounted, 240, reducedMotion)}>
            <OwnerCard
              initials="JS"
              name="James Smith"
              badge="Primary Owner"
              share={60}
              equity="$162,480"
              email="james.smith@email.com"
              phone="(312) 555-0147"
              address="456 Owner Ave, Chicago IL 60601"
              ssn="••••-••-4832"
              entity="Individual"
              status="On file (2024)"
              mounted={mounted}
            />
            <OwnerCard
              initials="MJ"
              name="Maria Jones"
              badge="Minor Owner"
              share={40}
              equity="$108,320"
              email="m.jones@email.com"
              phone="(312) 555-0192"
              address="789 Partner St, Chicago IL 60602"
              ssn="••••-••-7710"
              entity="LLC — Jones Prop Holdings"
              status="On file (2024)"
              mounted={mounted}
            />
          </div>

          {/* Acquisition Details + Income Distribution */}
          <div className="grid grid-cols-2 gap-5" style={fade(mounted, 300, reducedMotion)}>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-4">Acquisition Details</h3>
              <div className="space-y-3">
                {[
                  ["Purchase Price", "$485,000"],
                  ["Down Payment", "$97,000 (20%)"],
                  ["Closing Costs", "$9,200"],
                  ["Total Acquisition", "$106,200 cash deployed"],
                  ["Lender", "First Midwest Bank"],
                  ["Loan Amount", "$388,000"],
                  ["Interest Rate", "3.875% Fixed"],
                  ["Loan Term", "30 Years"],
                  ["Origination Date", "Mar 15, 2021"],
                  ["Maturity Date", "Mar 15, 2051"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-[14px]">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-val-heading font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-4">Income &amp; Expense Distribution</h3>
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2.5">
                  Distribution Method
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[14px] text-val-heading cursor-pointer">
                    <span className="w-4 h-4 border-2 border-[--val-primary-dark] rounded-full flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 bg-[--val-primary-dark] rounded-full" />
                    </span>
                    Pro-Rata by Share
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-slate-400 cursor-pointer">
                    <span className="w-4 h-4 border-2 border-slate-200 rounded-full shrink-0" />
                    Custom
                  </label>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">
                    Rent Income Split
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[14px]">
                      <span className="text-val-heading">J. Smith 60%</span>
                      <span className="font-semibold text-val-heading">$1,080/mo</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span className="text-val-heading">M. Jones 40%</span>
                      <span className="font-semibold text-val-heading">$720/mo</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">
                    Expense Responsibility
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[14px]">
                      <span className="text-val-heading">J. Smith 60%</span>
                      <span className="text-slate-400">shared costs</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span className="text-val-heading">M. Jones 40%</span>
                      <span className="text-slate-400">shared costs</span>
                    </div>
                  </div>
                </div>
              </div>
              <button className="text-[--val-primary-dark] text-[14px] font-semibold mt-5 hover:opacity-75 transition-opacity">
                Edit Distribution Rules
              </button>
            </div>
          </div>

          {/* Ownership Documents */}
          <div style={fade(mounted, 360, reducedMotion)}>
            <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
                <h3 className="text-val-heading text-[15px] font-semibold">Ownership Documents</h3>
                <button
                  className="px-4 py-2 text-white text-[13px] font-semibold rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                  style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Doc
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    {["Name", "Type", "Date", "Owner", "Status"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => (
                    <tr
                      key={doc.name}
                      className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <td className="px-4 py-3.5 text-[14px] text-val-heading">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          {doc.name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[14px] text-slate-500">{doc.type}</td>
                      <td className="px-4 py-3.5 text-[14px] text-slate-500">{doc.date}</td>
                      <td className="px-4 py-3.5 text-[14px] text-slate-500">{doc.owner}</td>
                      <td className="px-4 py-3.5">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-0.5 rounded-full">
                          Current
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ownership History */}
          <div
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
            style={fade(mounted, 420, reducedMotion)}
          >
            <h3 className="text-base font-bold text-val-heading mb-4">Ownership History &amp; Activity</h3>
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-[107px] top-2 bottom-2 w-px bg-slate-100" aria-hidden="true" />
              {historyItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-[13px] text-slate-400 w-[100px] shrink-0 pt-0.5">{item.date}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 relative z-10"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[14px] text-val-heading">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </PropertyLayout>
  );
}

function OwnerCard({
  initials, name, badge, share, equity,
  email, phone, address, ssn, entity, status, mounted,
}: {
  initials: string; name: string; badge: string; share: number; equity: string;
  email: string; phone: string; address: string; ssn: string; entity: string;
  status: string; mounted: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
          >
            {initials}
          </div>
          <p className="text-[17px] font-bold text-val-heading">{name}</p>
        </div>
        <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-full shrink-0">
          {badge}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Ownership Share</span>
          <span className="text-[14px] font-bold text-val-heading">{share}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[--val-primary-dark] rounded-full"
            style={{
              width: mounted ? `${share}%` : "0%",
              transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 300ms",
            }}
          />
        </div>
        <p className="text-[13px] font-semibold text-val-heading mt-2">Equity Value: {equity}</p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <Mail className="w-4 h-4 shrink-0" />
          {email}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <Phone className="w-4 h-4 shrink-0" />
          {phone}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <MapPin className="w-4 h-4 shrink-0" />
          {address}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2 text-[14px]">
        <div className="flex justify-between">
          <span className="text-slate-500">SSN / EIN</span>
          <span className="text-val-heading font-medium">{ssn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tax Entity</span>
          <span className="text-val-heading font-medium">{entity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">1099 Status</span>
          <span className="text-emerald-600 flex items-center gap-1 font-medium">
            <Check className="w-3 h-3" /> {status}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
        <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
          Edit Owner
        </button>
        <button className="text-[--val-primary-dark] text-[14px] font-semibold hover:opacity-75 transition-opacity">
          View Documents
        </button>
      </div>
    </div>
  );
}
