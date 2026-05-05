"use client";

import React, { useEffect, useState } from "react";
import {
  FileText, Wrench, Receipt, Bell,
  MoreHorizontal, Download, Pencil,
} from "lucide-react";
import type { Property } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { PropertyLayout } from "@/components/property/PropertyLayout";

const alerts = [
  {
    id: 1,
    type: "lease" as const,
    title: "Lease Expiring:",
    body: "Suite 402 — Quantum Tech Ltd (30 days remaining)",
    action: "Review",
    actionLabel: "Review lease expiring for Quantum Tech Ltd, Suite 402",
  },
  {
    id: 2,
    type: "system" as const,
    title: "HVAC Fault:",
    body: "Building A — Central unit cooling efficiency below threshold.",
    action: "Dispatch",
    actionLabel: "Dispatch technician for HVAC fault in Building A",
  },
];

const tenants = [
  { initials: "A", name: "Apex Global Logistics", unit: "Ste. 101", rent: "$12,400", status: "Paid", statusOk: true },
  { initials: "Q", name: "Quantum Tech Ltd", unit: "Ste. 402", rent: "$8,900", status: "Overdue", statusOk: false },
  { initials: "S", name: "Starlight Creatives", unit: "Ste. 205", rent: "$4,200", status: "Paid", statusOk: true },
];

const activityItems = [
  { color: "var(--val-primary-dark)", time: "2h ago", text: "Rent payment received from Apex Global Logistics — $12,400" },
  { color: "#059669", time: "5h ago", text: "Lease renewal signed: Starlight Creatives, 24 months" },
  { color: "#F59E0B", time: "1d ago", text: "Work order submitted: HVAC filter replacement, Building A" },
  { color: "#881337", time: "1d ago", text: "Quantum Tech Ltd lease expires in 30 days" },
  { color: "#515D66", time: "2d ago", text: "Monthly income report generated for March 2026" },
];

const quickActions = [
  { icon: FileText, label: "New Lease" },
  { icon: Wrench, label: "Work Order" },
  { icon: Receipt, label: "Invoice" },
  { icon: Bell, label: "Notify All" },
];

const metrics = [
  { label: "Property Valuation", value: "$24,850,000" },
  { label: "Monthly Income", value: "$312,400", badge: "+12%", badgeColor: "#059669" },
  { label: "Occupancy Rate", value: "94.8%" },
];

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

function MetricCell({ label, value, badge, badgeColor, duration, active }: {
  label: string; value: string; badge?: string; badgeColor?: string; duration: number; active: boolean;
}) {
  const display = useCountUp(value, duration, active);
  const isIncome = label === "Monthly Income";
  return (
    <div className={`flex-1 px-6 py-4${isIncome ? " bg-[--val-bg-tint]" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-val-heading text-[26px] font-bold leading-none">{display}</p>
        {badge && (
          <span className="text-[15px] font-semibold" style={{ color: badgeColor }}>{badge}</span>
        )}
      </div>
    </div>
  );
}

export function PropertyOverviewPage({ property }: { property: Property }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    // Tiny rAF delay so first paint is rendered before we trigger transitions
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);

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
    <PropertyLayout activeTab="overview" property={property}>
      <div className="bg-val-bg-page-alt min-h-full pb-10">

        {/* Hero */}
        <div className="relative h-[380px] overflow-hidden flex items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/property-hero.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{
              transform: reducedMotion ? undefined : mounted ? "scale(1)" : "scale(1.06)",
              transition: reducedMotion ? undefined : `transform 900ms cubic-bezier(0.25,1,0.5,1)`,
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
            style={{
              opacity: reducedMotion ? 1 : mounted ? 1 : 0,
              transition: reducedMotion ? undefined : "opacity 600ms ease",
            }}
          />
          <div className="relative z-10 w-full flex items-end justify-between px-8 pb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5" style={heroIn(80)}>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-0.5 rounded-full">
                  {property.status}
                </span>
                <span className="text-white/70 text-[13px]">
                  {property.province}
                </span>
              </div>
              <p className="text-white/55 text-[13px] font-medium" style={heroIn(160)}>
                Purchased {property.buyNumeric ? formatCurrency(property.buyNumeric) : "—"}
              </p>
              <h1
                className="text-white font-extrabold tracking-tight leading-none"
                style={{ fontSize: "clamp(38px, 4vw, 58px)", ...heroIn(240) }}
              >
                {property.name}
              </h1>
            </div>
            <div className="flex items-center gap-2.5" style={heroIn(340)}>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold px-4 py-2 rounded flex items-center gap-2 hover:bg-white/20 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                className="text-white text-[13px] font-semibold px-4 py-2 rounded flex items-center gap-2 shadow-[0_4px_6px_-1px_rgba(0,74,198,0.3)] hover:opacity-90 active:scale-[0.97] transition-[opacity,transform] duration-150"
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                <Download className="w-3.5 h-3.5" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-8 pt-6 flex flex-col gap-5">

          {/* Key Metrics */}
          <div
            className="bg-white border border-slate-200 rounded-lg flex divide-x divide-slate-200 overflow-hidden"
            style={fade(mounted, 120, reducedMotion)}
          >
            {metrics.map((m) => (
              <MetricCell
                key={m.label}
                label={m.label}
                value={m.value}
                badge={m.badge}
                badgeColor={m.badgeColor}
                duration={m.label === "Property Valuation" ? 1400 : m.label === "Monthly Income" ? 1100 : 900}
                active={countUpActive}
              />
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-5">

            {/* Left Column */}
            <div className="col-span-8 flex flex-col gap-4" style={fade(mounted, 280, reducedMotion)}>

              {/* Summary Row */}
              <div className="grid grid-cols-2 gap-4">

                {/* Financials */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[15px] font-semibold">Financials</h3>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Financials options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-end justify-between">
                      <span className="text-slate-500 text-[13px]">Net Operating Income</span>
                      <span className="text-val-heading text-[22px] font-bold">$184.2k</span>
                    </div>
                    <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[--val-primary-dark] h-full rounded-full"
                        style={{ width: mounted ? "72%" : "0%", transition: "width 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Expenses</p>
                        <p className="text-rose-600 text-[14px] font-semibold">$42.5k</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Gross Income</p>
                        <p className="text-val-heading text-[14px] font-semibold">$226.7k</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tenant Mix */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[15px] font-semibold">Tenant Mix</h3>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Tenant mix options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="relative shrink-0 w-20 h-20">
                      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#e4efff" strokeWidth="10" />
                        <circle
                          cx="40" cy="40" r="32" fill="none"
                          stroke="var(--val-primary-dark)" strokeWidth="10"
                          strokeDasharray={mounted ? "170.8 200.96" : "0 200.96"}
                          strokeDashoffset="0"
                          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s" }}
                        />
                        <circle
                          cx="40" cy="40" r="32" fill="none"
                          stroke="#38bdf8" strokeWidth="10"
                          strokeDasharray={mounted ? "44.2 200.96" : "0 200.96"}
                          strokeDashoffset="-170.8"
                          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1) 0.75s" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-val-heading text-[12px] font-bold leading-none">85%</span>
                        <span className="text-slate-400 text-[9px] leading-none">comm.</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[--val-primary-dark] shrink-0" />
                        <span className="text-slate-500 text-[12px]">Commercial (12)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
                        <span className="text-slate-500 text-[12px]">Retail (4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                        <span className="text-slate-500 text-[12px]">Vacant (2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Leaseholders */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
                  <h3 className="text-val-heading text-[15px] font-semibold">Active Leaseholders</h3>
                  <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity" aria-label="View all leaseholders">View All</button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Tenant</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Unit</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Monthly Rent</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t, i) => (
                      <tr
                        key={t.name}
                        className={`hover:bg-blue-50/30 transition-colors duration-150${i > 0 ? " border-t border-slate-100" : ""}`}
                        style={{
                          animationName: mounted ? "analytics-fade-up" : "none",
                          animationDuration: "0.5s",
                          animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                          animationFillMode: "forwards",
                          animationDelay: `${400 + i * 80}ms`,
                          opacity: mounted ? undefined : 0,
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[12px] font-semibold shrink-0">
                              {t.initials}
                            </div>
                            <span className="text-val-heading text-[14px] font-semibold truncate">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-[14px]">{t.unit}</td>
                        <td className="px-5 py-3.5 text-val-heading text-[14px] font-semibold">{t.rent}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium border ${
                              t.statusOk
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-[--status-danger-bg] text-[--status-danger-text] border-[--status-danger-border]"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Activity Feed */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-val-heading text-[15px] font-semibold">Activity Feed</h3>
                  <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity" aria-label="View all activity">View All</button>
                </div>
                <div className="flex flex-col gap-3 relative">
                  <div className="absolute left-[2px] top-2 bottom-2 w-px bg-slate-100" aria-hidden="true" />
                  {activityItems.map((item, i) => (
                    <div
                      key={item.text}
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
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 relative z-10"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-val-heading text-[13px] leading-snug">{item.text}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-4 flex flex-col gap-4" style={fade(mounted, 340, reducedMotion)}>

              {/* Action Strip */}
              {alerts.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                        {alerts.length} action{alerts.length !== 1 ? "s" : ""} pending
                      </span>
                    </div>
                    <button className="text-slate-400 text-[12px] font-medium hover:text-slate-600 transition-colors" aria-label="Dismiss all alerts">
                      Dismiss all
                    </button>
                  </div>
                  {alerts.map((a, i) => (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3${i > 0 ? " border-t border-slate-100" : ""}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.type === "lease" ? "bg-amber-400" : "bg-rose-500"}`} />
                          <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${a.type === "lease" ? "text-amber-600" : "text-rose-600"}`}>
                            {a.type === "lease" ? "Lease" : "Maintenance"}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500 leading-snug pl-3">{a.body}</p>
                      </div>
                      <button
                        aria-label={a.actionLabel}
                        className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-70 transition-opacity shrink-0"
                      >
                        {a.action} →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                <h3 className="text-val-heading text-[15px] font-semibold">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="bg-val-bg-tint rounded-lg py-3.5 flex flex-col items-center gap-1.5 hover:bg-blue-100 hover:scale-[1.03] hover:shadow-sm active:scale-[0.97] transition-[background-color,transform,box-shadow] duration-150"
                    >
                      <Icon className="w-4 h-4 text-[--val-primary-dark]" />
                      <span className="text-[11px] font-semibold text-val-heading">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}
