"use client";

import { FileText, Plus, Wrench, Receipt, Bell, MoreHorizontal, ArrowUpRight } from "lucide-react";
import type { Property } from "@/lib/mock-data";
import { PropertyLayout } from "@/components/property/PropertyLayout";

const alerts = [
  {
    id: 1,
    title: "Lease Expiring:",
    body: " Suite 402 — Quantum Tech Ltd (30 days remaining)",
    action: "Review",
  },
  {
    id: 2,
    title: "HVAC Fault:",
    body: " Building A Central Unit reported cooling efficiency drop.",
    action: "Dispatch",
  },
];

const tenants = [
  { initials: "A", name: "Apex Global Logistics", unit: "Ste. 101", rent: "$12,400.00", status: "Paid", statusOk: true },
  { initials: "Q", name: "Quantum Tech Ltd", unit: "Ste. 402", rent: "$8,900.00", status: "Due", statusOk: false },
  { initials: "S", name: "Starlight Creatives", unit: "Ste. 205", rent: "$4,200.00", status: "Paid", statusOk: true },
];

const activityItems = [
  { color: "var(--val-primary-dark)", time: "2h ago", text: "Rent payment received from Apex Global Logistics — $12,400" },
  { color: "#059669", time: "5h ago", text: "Lease renewal signed: Starlight Creatives, 24 months" },
  { color: "#F59E0B", time: "1d ago", text: "Work order submitted: HVAC filter replacement, Building A" },
  { color: "#881337", time: "1d ago", text: "Alert: Quantum Tech Ltd lease expires in 30 days" },
  { color: "#515D66", time: "2d ago", text: "Monthly income report generated for March 2026" },
];

const quickActions = [
  { icon: FileText, label: "New Lease" },
  { icon: Wrench, label: "Work Order" },
  { icon: Receipt, label: "Invoice" },
  { icon: Bell, label: "Notify All" },
];

function MetricCard({
  iconBg,
  label,
  value,
  badge,
  badgeColor,
}: {
  iconBg: string;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl p-6 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: iconBg }}>
        <div className="w-5 h-4 rounded bg-current opacity-40" />
      </div>
      <div>
        <p className="text-[#434655] text-[12px] font-medium uppercase tracking-wide">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-val-heading text-[24px] font-semibold">{value}</p>
          {badge && (
            <span className="text-[14px] font-medium" style={{ color: badgeColor }}>{badge}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PropertyOverviewPage({ property }: { property: Property }) {
  return (
    <PropertyLayout activeTab="overview" property={property}>
      <div className="pb-12">
        {/* Property Hero Header */}
        <div
          className="relative h-80 overflow-hidden flex items-end"
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, var(--val-primary-dark) 60%, #0ea5e9 100%)",
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-8 right-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 left-24 w-96 h-40 rounded-full bg-blue-400/20 blur-2xl" />
          </div>

          <div className="relative z-10 w-full flex items-end justify-between px-8 pb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-[12px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full">
                  Active
                </span>
                <span className="text-white/80 text-[14px]">
                  7824 Sterling Avenue, Financial District, NY
                </span>
              </div>
              <h1 className="text-white text-[36px] font-extrabold tracking-tight leading-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                The Sterling Heights Office
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-white text-val-heading text-[14px] font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 transition-colors">
                <FileText className="w-4 h-4" />
                Edit Profile
              </button>
              <button className="bg-[--val-primary-dark] text-white text-[14px] font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-[0px_10px_15px_-3px_rgba(0,74,198,0.3)] hover:bg-[#003ba0] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-6 mt-8 flex flex-col gap-8">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-3 gap-6">
            <MetricCard
              iconBg="#eef2f8"
              label="Property Valuation"
              value="$24,850,000"
            />
            <MetricCard
              iconBg="#ecfdf5"
              label="Monthly Income"
              value="$312,400"
              badge="+12%"
              badgeColor="#059669"
            />
            <MetricCard
              iconBg="#f0f9ff"
              label="Occupancy Rate"
              value="94.8%"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left: Main Modules */}
            <div className="col-span-8 flex flex-col gap-8">
              {/* Alert Panel */}
              <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-4 flex gap-4">
                <div className="text-[#881337] mt-0.5 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#881337] font-bold text-[14px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      2 Urgent Alerts Pending
                    </p>
                    <button className="text-[#881337] text-[12px] font-semibold">Dismiss All</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {alerts.map((a) => (
                      <div key={a.id} className="bg-white/50 border border-[#fecdd3]/50 rounded-lg p-3 flex items-center justify-between">
                        <p className="text-[#881337] text-[14px]">
                          <span className="font-semibold">{a.title}</span>
                          <span className="font-normal">{a.body}</span>
                        </p>
                        <button className="bg-white text-val-heading text-[12px] font-semibold px-3 py-1 rounded shadow-sm ml-4 shrink-0">
                          {a.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Financials Widget */}
                <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[18px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Financials
                    </h3>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                      <span className="text-[#434655] text-[14px]">Net Operating Income</span>
                      <span className="text-val-heading text-[18px] font-semibold">$184.2k</span>
                    </div>
                    <div className="bg-[#e4efff] h-2 rounded-full overflow-hidden">
                      <div className="bg-[--val-primary-dark] h-full w-[72%]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-[rgba(195,198,215,0.2)]">
                      <div>
                        <p className="text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Expenses</p>
                        <p className="text-[#ba1a1a] text-[14px] font-semibold">$42.5k</p>
                      </div>
                      <div>
                        <p className="text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Gross Income</p>
                        <p className="text-val-heading text-[14px] font-semibold">$226.7k</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tenant Mix Widget */}
                <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-val-heading text-[18px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Tenant Mix
                    </h3>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Donut chart */}
                    <div className="relative shrink-0 w-20 h-20">
                      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#e4efff" strokeWidth="10" />
                        {/* Commercial 85% = 200.96 of 201.06 */}
                        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--val-primary-dark)" strokeWidth="10"
                          strokeDasharray="170.8 200.96" strokeDashoffset="0" />
                        {/* Retail 22% */}
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#38bdf8" strokeWidth="10"
                          strokeDasharray="44.2 200.96" strokeDashoffset="-170.8" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-val-heading text-[12px] font-semibold">85%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[--val-primary-dark] shrink-0" />
                        <span className="text-[#434655] text-[12px]">Commercial (12)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                        <span className="text-[#434655] text-[12px]">Retail (4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#e4efff] shrink-0" />
                        <span className="text-[#434655] text-[12px]">Vacant (2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Leaseholders */}
              <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(195,198,215,0.2)]">
                  <h3 className="text-val-heading text-[18px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Primary Leaseholders
                  </h3>
                  <button className="text-[--val-primary-dark] text-[14px] font-semibold">View All</button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[rgba(238,244,255,0.5)]">
                      <th className="text-left px-6 py-3 text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Tenant</th>
                      <th className="text-left px-6 py-3 text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Unit</th>
                      <th className="text-left px-6 py-3 text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Monthly Rent</th>
                      <th className="text-left px-6 py-3 text-[#434655] text-[10px] font-semibold uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t, i) => (
                      <tr key={t.name} className={i > 0 ? "border-t border-[rgba(195,198,215,0.1)]" : ""}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#d8e3f4] flex items-center justify-center text-val-heading text-[12px] font-semibold shrink-0">
                              {t.initials}
                            </div>
                            <span className="text-val-heading text-[14px] font-semibold">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#434655] text-[14px]">{t.unit}</td>
                        <td className="px-6 py-4 text-val-heading text-[14px] font-semibold">{t.rent}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              t.statusOk
                                ? "bg-[#ecfdf5] text-[#065f46]"
                                : "bg-[#fffbeb] text-[#92400e]"
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
            </div>

            {/* Right: Activity Sidebar */}
            <div className="col-span-4 flex flex-col gap-6">
              {/* Quick Actions */}
              <div className="bg-[--val-primary-dark] rounded-xl p-6 flex flex-col gap-4 shadow-[0px_10px_15px_-3px_rgba(0,74,198,0.2),0px_4px_6px_-4px_rgba(0,74,198,0.2)]">
                <h3 className="text-white text-[18px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="bg-white/20 rounded-lg py-4 flex flex-col items-center gap-2 hover:bg-white/30 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-white" />
                      <span className="text-white text-[12px] font-semibold text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-val-heading text-[18px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Activity Feed
                  </h3>
                  <button className="text-[--val-primary-dark] text-[12px] font-semibold">View All</button>
                </div>
                <div className="flex flex-col gap-4">
                  {activityItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-val-heading text-[13px] leading-snug">{item.text}</p>
                        <p className="text-[#434655] text-[12px] mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note */}
              <div className="bg-white border border-[rgba(195,198,215,0.3)] rounded-xl p-4 shadow-sm">
                <button className="w-full flex items-center gap-2 text-[#434655] text-[14px] hover:text-[--val-primary-dark] transition-colors">
                  <Plus className="w-4 h-4" />
                  Add a note or update...
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}
