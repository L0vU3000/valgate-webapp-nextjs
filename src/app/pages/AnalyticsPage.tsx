import { useState, useEffect, useRef, type CSSProperties } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Search, ChevronDown, TrendingUp, TrendingDown,
  DollarSign, Building2, Percent, Wrench, FileText, BarChart3,
  LayoutGrid, Table2,
} from "lucide-react";

/* ─── Mock Data ─── */

const revenueData = [
  { month: "Jan", revenue: 95000, expenses: 38000 },
  { month: "Feb", revenue: 108000, expenses: 42000 },
  { month: "Mar", revenue: 118000, expenses: 45000 },
  { month: "Apr", revenue: 105000, expenses: 40000 },
  { month: "May", revenue: 130000, expenses: 48000 },
  { month: "Jun", revenue: 125000, expenses: 42000 },
  { month: "Jul", revenue: 138000, expenses: 50000 },
  { month: "Aug", revenue: 142000, expenses: 38000 },
  { month: "Sep", revenue: 128000, expenses: 47000 },
];

const kpiCards = [
  { label: "Total Revenue", value: "$1,248,300", change: "+8.4%", positive: true, icon: DollarSign },
  { label: "NOI", value: "$712,500", change: "+5.1%", positive: true, icon: TrendingUp },
  { label: "Occupancy", value: "91.4%", change: "-1.2%", positive: false, icon: Building2 },
  { label: "Rent\nCollection", value: "97.8%", change: "+0.6%", positive: true, icon: Percent },
  { label: "Maintenance", value: "$48,200", change: "+12.3%", positive: false, icon: Wrench },
];

const leasePipeline = [
  { range: "0-3 Months", units: 12, pct: 25, color: "#fb7185" },
  { range: "4-6 Months", units: 34, pct: 60, color: "#fbbf24" },
  { range: "7-12 Months", units: 58, pct: 80, color: "#34d399" },
];

const savedReports = [
  "Q2 Risk Assessment",
  "Maintenance ROI Analysis",
  "Tax Depreciation Est.",
];

const expenseBreakdown = [
  { name: "Maintenance", pct: 45, color: "#2563eb" },
  { name: "Utilities", pct: 25, color: "#fbbf24" },
  { name: "Taxes", pct: 30, color: "#10b981" },
];

const capitalGrowth = [
  { rank: "01", name: "Skyline Tower", growth: "+14.2%", pct: 85 },
  { rank: "02", name: "Green Valley Apt", growth: "+11.8%", pct: 70 },
  { rank: "03", name: "Harbor Logistics", growth: "+9.5%", pct: 55 },
];

const maintenanceSpend = [
  { month: "MAR", value: 6200 },
  { month: "APR", value: 7800 },
  { month: "MAY", value: 5400 },
  { month: "JUN", value: 9100 },
  { month: "JUL", value: 7200 },
  { month: "AUG", value: 8400 },
];

const periods = ["MTD", "QTD", "YTD", "12M", "Custom"] as const;

/* ─── Animation helpers ─── */

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

/* ─── Page ─── */

export function AnalyticsPage() {
  const [activePeriod, setActivePeriod] = useState<string>("MTD");
  const [grossMode, setGrossMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  const bottomRow = useInView(0.1);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="h-full flex flex-col bg-val-bg-page-alt font-['Inter',sans-serif] analytics-animate">
      {/* Header — slides down */}
      <div
        className="backdrop-blur-[6px] bg-white/80 h-16 flex items-center justify-between px-8 border-b border-slate-200 shrink-0 z-10"
        style={{ animation: `analytics-fade-up 450ms ${EASE_OUT_QUART} 0ms both` }}
      >
        <div>
          <p className="text-xs font-medium text-slate-400">Portfolio · Analytics</p>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">
            Portfolio Analytics
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 transition-colors duration-200" />
            <input
              type="text"
              placeholder="Search data..."
              className="bg-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-gray-400 w-64 outline-none transition-all duration-250 focus:ring-2 focus:ring-blue-200 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-200 active:scale-[0.97]">
              Compare
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-200 active:scale-[0.97]">
              Schedule Report
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="flex flex-col gap-6">
          {/* Filters Bar — fades up */}
          <div
            className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-4"
            style={{ animation: `analytics-scale-in 450ms ${EASE_OUT_QUART} 80ms both` }}
          >
            <div className="flex items-center justify-between">
              <div className="bg-slate-100 flex items-center p-1 rounded relative">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 relative z-[1] ${
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
              <div className="flex items-center gap-3">
                <FilterDropdown label="All Properties" />
                <FilterDropdown label="Asset Class" />
                <FilterDropdown label="Region" />
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <button className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded flex items-center gap-2 transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.97]">
                Export
                <ChevronDown size={12} />
              </button>
            </div>
          </div>

          {/* KPI Strip — staggered entrance */}
          <div className="grid grid-cols-5 gap-4">
            {kpiCards.map((kpi, i) => (
              <KpiCard key={kpi.label} index={i} {...kpi} />
            ))}
          </div>

          {/* Primary Content: Chart + Right Stack */}
          <div className="grid grid-cols-12 gap-6">
            {/* Main Area Chart — fades in after KPIs */}
            <div
              className="col-span-8 bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md"
              style={{ animation: `analytics-fade-up 600ms ${EASE_OUT_QUART} 550ms both` }}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">
                    Revenue vs Expenses (YTD)
                  </h2>
                  <p className="text-xs text-slate-500">Comparative analysis across all assets</p>
                </div>
                <div className="flex items-center gap-4">
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
              <div className="px-6 pt-4">
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
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `$${v / 1000}k`} axisLine={false} tickLine={false} />
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
                  <span className="text-[10px] font-semibold text-slate-500">TIMELINE ZOOM</span>
                  <span className="text-[10px] font-semibold text-slate-500">MARCH 2024 - AUGUST 2024</span>
                </div>
              </div>
            </div>

            {/* Right Stack — staggered after chart */}
            <div className="col-span-4 flex flex-col gap-6">
              {/* Occupancy Sparkline Card */}
              <div
                className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 flex items-center justify-between transition-shadow duration-300 hover:shadow-md"
                style={{ animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 650ms both` }}
              >
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
                  <p className="text-3xl font-semibold text-slate-900">91.4%</p>
                  <p className="text-xs font-semibold text-rose-500 mt-1">Trend: Downward</p>
                </div>
                <div className="w-32 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{ v: 94 }, { v: 93.5 }, { v: 93 }, { v: 92.2 }, { v: 91.8 }, { v: 91.4 }]}>
                      <defs>
                        <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone" dataKey="v" stroke="#f43f5e" strokeWidth={2} fill="url(#occGrad)" dot={false}
                        isAnimationActive={mounted} animationDuration={1000} animationEasing="ease-out" animationBegin={800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lease Expiry Pipeline */}
              <div
                className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
                style={{ animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 750ms both` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
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
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display mb-4">
                  Saved Reports
                </h3>
                <div className="space-y-3">
                  {savedReports.map((report, i) => (
                    <div
                      key={report}
                      className="flex items-center justify-between group"
                      style={staggerStyle(i, 950)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-slate-400 transition-colors duration-200 group-hover:text-[--val-primary-dark]" />
                        <span className="text-sm font-medium text-slate-700">{report}</span>
                      </div>
                      <button className="text-xs font-semibold text-[--val-primary-dark] opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-[0.95]">
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Cards — scroll-triggered */}
          <div
            ref={bottomRow.ref}
            className="grid grid-cols-3 gap-6 pb-4"
          >
            {/* Expense Breakdown Donut */}
            <div
              className="bg-white border border-slate-100 rounded-lg shadow-sm p-6 transition-shadow duration-300 hover:shadow-md"
              style={bottomRow.visible ? { animation: `analytics-fade-up 500ms ${EASE_OUT_QUART} 0ms both` } : { opacity: 0 }}
            >
              <h3 className="text-base font-bold text-slate-900 font-display mb-6">
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
                    <span className="text-sm font-semibold text-slate-900">$48k</span>
                    <span className="text-[8px] font-semibold text-slate-400 uppercase">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {expenseBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full transition-transform duration-200 hover:scale-150" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-semibold text-slate-900">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-900">{item.pct}%</span>
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
              <h3 className="text-base font-bold text-slate-900 font-display mb-6">
                Capital Growth (Ranked)
              </h3>
              <div className="space-y-4">
                {capitalGrowth.map((item, i) => (
                  <div key={item.rank} className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400 w-4">{item.rank}</span>
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
              <h3 className="text-base font-bold text-slate-900 font-display mb-6">
                Maintenance Spend (6M)
              </h3>
              <ResponsiveContainer width="100%" height={128}>
                <BarChart data={maintenanceSpend}>
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
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

/* ─── Sub-components ─── */

function KpiCard({ label, value, change, positive, icon: Icon, index }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ElementType; index: number;
}) {
  return (
    <div
      className="bg-white border border-slate-100 rounded-lg shadow-sm p-5 flex flex-col gap-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
      style={staggerStyle(index, 200)}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-pre-line">
          {label}
        </span>
        <div className="bg-slate-50 p-1.5 rounded transition-colors duration-200 group-hover:bg-slate-100">
          <Icon size={16} className="text-slate-400" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
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
