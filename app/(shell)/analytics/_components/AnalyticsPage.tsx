"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Search, ChevronDown, TrendingUp, TrendingDown,
  DollarSign, Building2, Percent, Wrench, FileText, BarChart3,
  LayoutGrid, Table2,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import type { AnalyticsPageData, KpiIconKey } from "../queries";

/* -- Icon key map -- */

const KPI_ICONS: Record<KpiIconKey, React.ElementType> = {
  DollarSign,
  TrendingUp,
  Building2,
  Percent,
  Wrench,
};

/* -- UI Config (stays client-side) -- */

const periods = ["MTD", "QTD", "YTD", "12M", "Custom"] as const;

/* -- Animation helpers -- */

const EASE_OUT_QUART = "cubic-bezier(0.25, 1, 0.5, 1)";

function staggerStyle(index: number, baseDelay = 0): CSSProperties {
  return {
    animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} ${baseDelay + index * 80}ms both`,
  };
}

/** Hook: returns true once element scrolls into view */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* -- Page -- */

export function AnalyticsPage({ data, period }: { data: AnalyticsPageData; period: string }) {
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<string>(period);
  const [grossMode, setGrossMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  const bottomRow = useInView(0.1);

  useEffect(() => { setMounted(true); }, []);

  const {
    revenueData, kpiCards, leasePipeline, capitalGrowth,
    maintenanceSpend, savedReports, expenseBreakdown, expenseBreakdownTotal,
  } = data;

  return (
    <div className="h-full flex flex-col bg-val-bg-page-alt font-['Inter',sans-serif] analytics-animate">
      <AppHeader />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
          {/* Page title + actions */}
          {/*
            On mobile the title + breadcrumb stack above the search/actions
            row. The search input becomes full-width so it remains usable
            with the on-screen keyboard. On `lg:` the original side-by-side
            layout returns.
          */}
          <div
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            style={{ animation: `analytics-fade-up 450ms ${EASE_OUT_QUART} 0ms both` }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
                <span className="text-[11px] text-slate-300">/</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Analytics</span>
              </div>
              <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
                Portfolio Analytics
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Search data..."
                  className="bg-slate-100 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 placeholder:text-gray-400 w-full lg:w-56 outline-none transition-all duration-250 focus:ring-2 focus:ring-blue-200 focus:bg-white"
                />
              </div>
              <button className="shrink-0 px-3 sm:px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-200 active:scale-[0.97]">
                Compare
              </button>
              <button className="shrink-0 hidden sm:block px-3 sm:px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-200 active:scale-[0.97]">
                Schedule Report
              </button>
            </div>
          </div>

          {/* Filters Bar — fades up */}
          {/*
            Mobile: each row of filters becomes its own scrollable strip so
            the period tabs, property dropdowns, and view-mode + export
            controls each have their own line. The toggle (NET/GROSS) and
            export button stay on the same row but become smaller.
            Desktop (`lg:`): the original two-line layout is restored.
          */}
          <div
            className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-3 sm:gap-4"
            style={{ animation: `analytics-scale-in 450ms ${EASE_OUT_QUART} 80ms both` }}
          >
            {/* Row 1: period tabs + property dropdowns (stacked on mobile) */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Period tab strip — horizontally scrollable on mobile if it
                  ever overflows. Each tab keeps a thumb-friendly target. */}
              <div className="bg-slate-100 flex items-center p-1 rounded relative overflow-x-auto scrollbar-none w-fit max-w-full">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setActivePeriod(p); router.push(`?period=${p}`); }}
                    className={`shrink-0 px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 relative z-[1] ${
                      activePeriod === p
                        ? "text-[--val-primary-dark]"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {activePeriod === p && (
                      <span
                        className="absolute inset-0 bg-white rounded-md shadow-sm -z-[1]"
                        style={{ animation: `analytics-scale-in 200ms ${EASE_OUT_QUART} both` }}
                      />
                    )}
                    {p}
                  </button>
                ))}
              </div>
              {/* Property/asset/region dropdowns — scrollable strip on mobile. */}
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-none -mx-1 px-1">
                <FilterDropdown label="All Properties" />
                <FilterDropdown label="Asset Class" />
                <FilterDropdown label="Region" />
              </div>
            </div>
            {/* Row 2: NET/GROSS toggle, view modes, export. Wraps on mobile. */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="bg-slate-50 border border-slate-200 flex items-center gap-2 px-3 py-1.5 rounded transition-colors duration-200">
                <span className={`text-xs font-semibold transition-colors duration-250 ${!grossMode ? "text-[--val-primary-dark]" : "text-slate-400"}`}>NET</span>
                <button
                  onClick={() => setGrossMode(!grossMode)}
                  className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${grossMode ? "bg-[--val-primary-dark]" : "bg-slate-300"}`}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
                    style={{
                      transition: `transform 300ms ${EASE_OUT_QUART}`,
                      transform: grossMode ? "translateX(16px)" : "translateX(2px)",
                    }}
                  />
                </button>
                <span className={`text-xs font-semibold transition-colors duration-250 ${grossMode ? "text-[--val-primary-dark]" : "text-slate-400"}`}>GROSS</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded bg-blue-50 text-blue-600 transition-all duration-200 hover:bg-blue-100 active:scale-[0.92]"><BarChart3 size={14} /></button>
                <button className="p-1.5 rounded text-slate-400 transition-all duration-200 hover:text-slate-600 hover:bg-slate-100 active:scale-[0.92]"><Table2 size={14} /></button>
                <button className="p-1.5 rounded text-slate-400 transition-all duration-200 hover:text-slate-600 hover:bg-slate-100 active:scale-[0.92]"><LayoutGrid size={14} /></button>
              </div>
              <button className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded flex items-center gap-2 transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.97] ml-auto">
                Export
                <ChevronDown size={12} />
              </button>
            </div>
          </div>

          {/* KPI Strip — staggered entrance */}
          {/*
            Mobile: 2 KPI cards per row so each value stays legible.
            Tablet (`sm:`): 3 per row.
            Desktop (`lg:`): the original 5-card horizontal strip.
          */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {kpiCards.map((kpi, i) => (
              <KpiCard key={kpi.label} index={i} {...kpi} icon={KPI_ICONS[kpi.iconKey]} />
            ))}
          </div>

          {/* Primary Content: Chart + Right Stack */}
          {/*
            Mobile: chart, occupancy, lease expiry, and saved reports each
            become their own full-width section, stacked vertically.
            Desktop (`lg:`): the original 8/4 asymmetric split.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Main Area Chart — fades in after KPIs */}
            <div
              className="lg:col-span-8 bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md"
              style={{ animation: `analytics-fade-up 600ms ${EASE_OUT_QUART} 550ms both` }}
            >
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-50">
                <div>
                  <h2 className="text-[18px] sm:text-[24px] font-bold text-val-heading font-display">
                    Revenue vs Expenses (YTD)
                  </h2>
                  <p className="text-[12px] text-slate-400">Comparative analysis across all assets</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-slate-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-xs font-semibold text-slate-600">Expenses</span>
                  </div>
                </div>
              </div>
              <div className="px-2 sm:px-6 pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v / 1000}k`} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 4, color: "white", fontSize: 10 }}
                      formatter={(value: number, name: string) => [`$${(value / 1000).toFixed(0)}k`, name === "revenue" ? "Revenue" : "Expenses"]}
                      labelStyle={{ color: "white", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}
                      animationDuration={200}
                      animationEasing="ease-out"
                    />
                    <Area
                      type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={2.5} fill="url(#revenueGrad)"
                      isAnimationActive={mounted} animationDuration={1200} animationEasing="ease-out"
                    />
                    <Area
                      type="monotone" dataKey="expenses" stroke="#60a5fa" strokeWidth={2.5} fill="url(#expenseGrad)"
                      isAnimationActive={mounted} animationDuration={1200} animationEasing="ease-out" animationBegin={200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Timeline scrubber */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                <div className="relative h-1.5 bg-slate-200 rounded-full">
                  <div className="absolute inset-y-0 left-1/4 right-1/3 bg-blue-100 border border-blue-200 rounded-full">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[--val-primary-dark] rounded-full shadow-sm transition-shadow duration-200 hover:shadow-md hover:border-blue-500 cursor-grab" />
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[--val-primary-dark] rounded-full shadow-sm transition-shadow duration-200 hover:shadow-md hover:border-blue-500 cursor-grab" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">TIMELINE ZOOM</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">MARCH 2024 - AUGUST 2024</span>
                </div>
              </div>
            </div>

            {/* Right Stack — staggered after chart */}
            <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
              {/* Occupancy Sparkline Card */}
              <div
                className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
                style={{ animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 650ms both` }}
              >
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Occupancy Rate</p>
                <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums mt-1">
                  {kpiCards.find((k) => k.label === "Occupancy")?.value ?? "—"}
                </p>
                <p className="text-[12px] text-slate-400 mt-1">Point-in-time</p>
              </div>

              {/* Lease Expiry Pipeline */}
              <div
                className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
                style={{ animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 750ms both` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading font-display">
                    Lease Expiry Pipeline
                  </h3>
                  <button className="text-xs font-semibold text-[--val-primary-dark] transition-opacity duration-200 hover:opacity-70 active:scale-[0.97]">View All</button>
                </div>
                <div className="space-y-4">
                  {leasePipeline.map((item, i) => (
                    <div key={item.range} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">{item.range}</span>
                        <span className="text-xs font-semibold text-slate-900">{item.units} Units</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full origin-left"
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.color,
                            animation: `bar-fill 700ms ${EASE_OUT_QUART} ${900 + i * 120}ms both`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Reports */}
              <div
                className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
                style={{ animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 850ms both` }}
              >
                <h3 className="text-[15px] sm:text-[18px] font-semibold text-slate-400 font-display mb-4">
                  Saved Reports
                </h3>
                <div className="space-y-3">
                  {savedReports.length === 0 ? (
                    <p className="text-xs text-slate-400">No saved reports yet.</p>
                  ) : (
                    savedReports.map((report, i) => (
                      <div
                        key={report}
                        className="flex items-center justify-between group"
                        style={staggerStyle(i, 950)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-slate-400 transition-colors duration-200 group-hover:text-[--val-primary-dark]" />
                          <span className="text-sm font-medium text-slate-700">{report}</span>
                        </div>
                        <button className="text-xs font-semibold text-[--val-primary-dark] opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 active:scale-[0.95]">
                          Load
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Cards — scroll-triggered */}
          <div
            ref={bottomRow.ref}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pb-4"
          >
            {/* Expense Breakdown Donut */}
            <div
              className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
              style={bottomRow.visible ? { animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 0ms both` } : { opacity: 0 }}
            >
              <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading font-display mb-6">
                Expense Breakdown
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="pct"
                        cx="50%" cy="50%"
                        innerRadius={34} outerRadius={50}
                        startAngle={90} endAngle={-270}
                        strokeWidth={0}
                        isAnimationActive={bottomRow.visible}
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {expenseBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-slate-900">
                      {expenseBreakdownTotal === 0 ? "$0"
                        : expenseBreakdownTotal >= 1000 ? `$${(expenseBreakdownTotal / 1000).toFixed(1)}k`
                        : `$${expenseBreakdownTotal}`}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {expenseBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full transition-transform duration-200 hover:scale-150" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] font-semibold text-val-heading">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-val-heading tabular-nums">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Capital Growth */}
            <div
              className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
              style={bottomRow.visible ? { animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 100ms both` } : { opacity: 0 }}
            >
              <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading font-display mb-6">
                Capital Growth (Ranked)
              </h3>
              <div className="space-y-4">
                {capitalGrowth.map((item, i) => (
                  <div key={item.rank} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500 w-4 tabular-nums">{item.rank}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">{item.name}</span>
                        <span className="text-xs font-semibold text-emerald-600">{item.growth}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[--val-primary-dark] rounded-full origin-left"
                          style={bottomRow.visible
                            ? { width: `${item.pct}%`, animation: `bar-fill 600ms ${EASE_OUT_QUART} ${200 + i * 120}ms both` }
                            : { width: `${item.pct}%`, transform: "scaleX(0)" }
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Spend */}
            <div
              className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
              style={bottomRow.visible ? { animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 200ms both` } : { opacity: 0 }}
            >
              <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading font-display mb-6">
                Maintenance Spend (6M)
              </h3>
              <ResponsiveContainer width="100%" height={128}>
                <BarChart data={maintenanceSpend}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
                    contentStyle={{ fontSize: 10, borderRadius: 4 }}
                  />
                  <Bar
                    dataKey="value" radius={[4, 4, 0, 0]}
                    isAnimationActive={bottomRow.visible}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {maintenanceSpend.map((entry, i) => (
                      <Cell key={entry.month} fill={i === maintenanceSpend.length - 1 ? "var(--val-primary-dark)" : "#e2e8f0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Sub-components -- */

function KpiCard({ label, value, change, positive, icon: Icon, index }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ElementType; index: number;
}) {
  return (
    <div
      className="bg-white border border-slate-100 rounded-lg shadow-sm p-5 flex flex-col gap-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
      style={staggerStyle(index, 200)}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] whitespace-pre-line">
          {label}
        </span>
        <div className="bg-slate-50 p-1.5 rounded transition-colors duration-200 group-hover:bg-slate-100">
          <Icon size={16} className="text-slate-400" />
        </div>
      </div>
      <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums">{value}</p>
      <div className="flex items-center gap-1">
        {positive ? (
          <TrendingUp size={12} className="text-emerald-600" />
        ) : (
          <TrendingDown size={12} className="text-rose-500" />
        )}
        <span className={`text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-500"}`}>
          {change}
        </span>
        <span className="text-xs text-slate-400 ml-1">vs prev</span>
      </div>
    </div>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <button className="bg-white border border-slate-200 rounded px-3 py-1.5 flex items-center gap-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.97]">
      {label}
      <ChevronDown size={14} className="text-slate-400 transition-transform duration-200" />
    </button>
  );
}
