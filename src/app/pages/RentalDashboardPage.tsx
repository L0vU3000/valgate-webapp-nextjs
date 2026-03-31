import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Building2,
  FileText,
  Download,
  TrendingUp,
  Search,
  Bell,
  Settings,
  MoreVertical,
} from "lucide-react";
import { cn } from "../components/ui/utils";

/* -------------------------------------------------------------------------- */
/*  Static Data                                                               */
/* -------------------------------------------------------------------------- */

const navLinks = ["Portfolio", "Units", "Leases", "Financials"] as const;

const kpiCards = [
  { label: "Occupancy", value: "91%", sub: null, bar: 91 },
  { label: "Vacancy Cost", value: "$2,450", sub: "/ Month Realized Loss", subColor: "text-red-700" },
  { label: "Collection", value: "93%", sub: "On-time payment rate", subColor: "text-green-600" },
  {
    label: "Maintenance",
    value: "$4,800",
    sub: null,
    dots: [
      { color: "bg-red-700" },
      { color: "bg-orange-400" },
      { color: "bg-slate-200" },
    ],
  },
] as const;

const sparklineHeights = [40, 55, 45, 70, 85, 96];

const propertyRows = [
  {
    name: "Borey Tonle Bassac",
    location: "BKK1, Phnom Penh",
    noi: "$412,000",
    rent: "$4,200 avg",
    index: "Below Market (8%)",
    indexColor: "bg-amber-50 text-amber-700",
    img: "bg-gradient-to-br from-blue-400 to-indigo-500",
  },
  {
    name: "Mekong Residence",
    location: "Chroy Changvar, Phnom Penh",
    noi: "$284,500",
    rent: "$2,850 avg",
    index: "Optimal",
    indexColor: "bg-green-50 text-green-700",
    img: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
  {
    name: "Angkor Gateway",
    location: "Svay Dangkum, Siem Reap",
    noi: "$195,000",
    rent: "$3,400 avg",
    index: "Market Leader",
    indexColor: "bg-blue-50 text-blue-700",
    img: "bg-gradient-to-br from-violet-400 to-purple-500",
  },
];

/* -------------------------------------------------------------------------- */
/*  Heatmap Data — units grouped by property                                  */
/* -------------------------------------------------------------------------- */

type UnitStatus = "occupied" | "vacant" | "expiring";

interface HeatmapUnit {
  id: string;
  name: string;
  status: UnitStatus;
  tenant?: string;
  rent: number;
  leaseEnd?: string;
}

interface PropertyCluster {
  property: string;
  units: HeatmapUnit[];
}

const heatmapData: PropertyCluster[] = [
  {
    property: "Borey Tonle Bassac",
    units: [
      { id: "bt-101", name: "Unit 101", status: "occupied", tenant: "Chea Sopheap", rent: 4200, leaseEnd: "2026-11-30" },
      { id: "bt-102", name: "Unit 102", status: "occupied", tenant: "Keo Visal", rent: 4400, leaseEnd: "2027-03-15" },
      { id: "bt-201", name: "Unit 201", status: "expiring", tenant: "Pich Dara", rent: 4100, leaseEnd: "2026-04-14" },
      { id: "bt-202", name: "Unit 202", status: "vacant", rent: 4300 },
      { id: "bt-301", name: "Unit 301", status: "occupied", tenant: "Sok Channary", rent: 4500, leaseEnd: "2027-01-20" },
      { id: "bt-302", name: "Unit 302", status: "occupied", tenant: "Hem Rithy", rent: 4200, leaseEnd: "2026-09-30" },
      { id: "bt-401", name: "Unit 401", status: "expiring", tenant: "Nhem Sreyleak", rent: 4350, leaseEnd: "2026-04-28" },
      { id: "bt-402", name: "Unit 402B", status: "occupied", tenant: "Meas Sokha", rent: 4200, leaseEnd: "2027-06-01" },
    ],
  },
  {
    property: "Mekong Residence",
    units: [
      { id: "mr-a1", name: "Unit A1", status: "occupied", tenant: "Pich Sovann", rent: 2800, leaseEnd: "2026-12-15" },
      { id: "mr-a2", name: "Unit A2", status: "occupied", tenant: "Nary Meas", rent: 2900, leaseEnd: "2027-02-28" },
      { id: "mr-b1", name: "Unit B1", status: "vacant", rent: 2850 },
      { id: "mr-b2", name: "Unit B2", status: "occupied", tenant: "Vuthy Keo", rent: 2750, leaseEnd: "2026-10-31" },
      { id: "mr-c1", name: "Unit C1", status: "occupied", tenant: "Srey Leak Oum", rent: 2900, leaseEnd: "2027-05-15" },
      { id: "mr-c2", name: "Unit C2", status: "expiring", tenant: "Dara Phan", rent: 2800, leaseEnd: "2026-04-20" },
    ],
  },
  {
    property: "Angkor Gateway",
    units: [
      { id: "ag-101", name: "Unit 101", status: "occupied", tenant: "Thy Cheng", rent: 3400, leaseEnd: "2027-04-01" },
      { id: "ag-102", name: "Unit 102", status: "occupied", tenant: "Rath Bopha", rent: 3500, leaseEnd: "2026-08-15" },
      { id: "ag-201", name: "Unit 201", status: "occupied", tenant: "Kimheng Uy", rent: 3400, leaseEnd: "2027-01-31" },
      { id: "ag-202", name: "Unit 202", status: "vacant", rent: 3600 },
      { id: "ag-301", name: "Unit 301", status: "occupied", tenant: "Kosal Heng", rent: 3500, leaseEnd: "2026-11-15" },
    ],
  },
  {
    property: "Sisowath Quay Villas",
    units: [
      { id: "sq-1", name: "Villa 1", status: "occupied", tenant: "Sothea Prak", rent: 5200, leaseEnd: "2027-02-01" },
      { id: "sq-2", name: "Villa 2", status: "expiring", tenant: "Chan Bopha", rent: 5000, leaseEnd: "2026-04-10" },
      { id: "sq-3", name: "Villa 3", status: "occupied", tenant: "Visal Nhem", rent: 5400, leaseEnd: "2026-12-31" },
      { id: "sq-4", name: "Villa 4", status: "expiring", tenant: "Kosal Meng", rent: 5100, leaseEnd: "2026-04-25" },
    ],
  },
  {
    property: "Phsar Thmey Flats",
    units: [
      { id: "pt-1a", name: "Flat 1A", status: "occupied", tenant: "Pisey Ros", rent: 1800, leaseEnd: "2026-09-01" },
      { id: "pt-1b", name: "Flat 1B", status: "occupied", tenant: "Vanna Kem", rent: 1750, leaseEnd: "2027-03-15" },
      { id: "pt-2a", name: "Flat 2A", status: "occupied", tenant: "Chanthy Im", rent: 1800, leaseEnd: "2026-07-31" },
      { id: "pt-2b", name: "Flat 2B", status: "occupied", tenant: "Rotha Sim", rent: 1850, leaseEnd: "2027-01-01" },
      { id: "pt-3a", name: "Flat 3A", status: "occupied", tenant: "Maly Ouk", rent: 1800, leaseEnd: "2026-10-15" },
      { id: "pt-3b", name: "Flat 3B", status: "occupied", tenant: "Bora Chea", rent: 1750, leaseEnd: "2026-12-01" },
      { id: "pt-4a", name: "Flat 4A", status: "vacant", rent: 1900 },
      { id: "pt-4b", name: "Flat 4B", status: "occupied", tenant: "Samnang Tep", rent: 1800, leaseEnd: "2027-04-30" },
      { id: "pt-5a", name: "Flat 5A", status: "occupied", tenant: "Kunthea Lor", rent: 1850, leaseEnd: "2026-08-15" },
      { id: "pt-5b", name: "Flat 5B", status: "occupied", tenant: "Sokha Yim", rent: 1800, leaseEnd: "2027-02-28" },
    ],
  },
];

const pipelineStages = [
  {
    label: "Approaching",
    count: 12,
    color: "text-slate-400",
    countBg: "bg-slate-200 text-slate-600",
    cards: [
      { unit: "Unit 402B", detail: "Exp: 14 Days" },
      { unit: "Unit 115A", detail: "Exp: 19 Days" },
    ],
    borderColor: "",
  },
  {
    label: "Offered",
    count: 8,
    color: "text-blue-600",
    countBg: "bg-blue-100 text-blue-600",
    cards: [{ unit: "Unit 809", detail: "Sent: 2 Days ago" }],
    borderColor: "border-l-blue-500",
  },
  {
    label: "Signed",
    count: 24,
    color: "text-green-600",
    countBg: "bg-green-100 text-green-600",
    cards: [{ unit: "Unit 202", detail: "Effective: Oct 1" }],
    borderColor: "border-l-green-500",
  },
  {
    label: "Declined",
    count: 3,
    color: "text-red-700",
    countBg: "bg-red-100 text-red-700",
    cards: [{ unit: "Unit 501", detail: "Moving: Sept 30", faded: true }],
    borderColor: "",
  },
];

const arrearsBuckets = [
  { label: "0-30d", amount: "$12,400", width: "60%", color: "bg-blue-700" },
  { label: "31-60d", amount: "$4,120", width: "33%", color: "bg-amber-400" },
  { label: "61-90d", amount: "$1,850", width: "12%", color: "bg-red-700" },
];

const maintenanceItems = [
  { label: "Emergency", count: 2, color: "bg-red-700" },
  { label: "Urgent", count: 5, color: "bg-amber-500" },
  { label: "Standard", count: 14, color: "bg-slate-300" },
];

const upcomingEvents = [
  {
    time: "Today • 14:00",
    timeColor: "text-blue-600",
    title: "Lease Signing: Unit 402B",
    detail: "Tenant: Meas Sokha (Borey Tonle Bassac)",
    dotColor: "bg-blue-500",
    active: true,
  },
  {
    time: "Tomorrow • 09:30",
    timeColor: "text-slate-400",
    title: "AC Inspection (All Bldgs)",
    detail: "Vendor: Phnom Penh Cool Air",
    dotColor: "bg-slate-300",
  },
  {
    time: "Friday • 16:00",
    timeColor: "text-slate-400",
    title: "Move-out Inspection: Unit A2",
    detail: "Staff: Sopheak Chhun",
    dotColor: "bg-slate-300",
  },
];

/* -------------------------------------------------------------------------- */
/*  Heatmap Helpers                                                           */
/* -------------------------------------------------------------------------- */

function heatmapSummary() {
  const all = heatmapData.flatMap((c) => c.units);
  return {
    occupied: all.filter((u) => u.status === "occupied").length,
    vacant: all.filter((u) => u.status === "vacant").length,
    expiring: all.filter((u) => u.status === "expiring").length,
    total: all.length,
  };
}

function formatCurrency(n: number) {
  return "$" + n.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/*  Heatmap Tile with Tooltip                                                 */
/* -------------------------------------------------------------------------- */

function HeatmapTile({ unit, delay }: { unit: HeatmapUnit; delay: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const tileClass = cn(
    "rental-heatmap-cell relative h-7 w-7 rounded-[4px] cursor-default transition-all duration-200",
    unit.status === "occupied" && "bg-blue-500 hover:bg-blue-400",
    unit.status === "vacant" &&
      "bg-transparent border-2 border-dashed border-slate-500 hover:border-slate-300",
    unit.status === "expiring" &&
      "bg-amber-500 ring-2 ring-amber-300/50 hover:bg-amber-400"
  );

  return (
    <div
      className={tileClass}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2.5 text-left shadow-xl ring-1 ring-white/10">
          <div className="text-[11px] font-semibold text-white">
            {unit.name}
          </div>
          {unit.status === "vacant" ? (
            <div className="mt-0.5 text-[10px] text-red-400">
              Vacant — {formatCurrency(unit.rent)}/mo lost
            </div>
          ) : (
            <>
              <div className="mt-0.5 text-[10px] text-slate-300">
                {unit.tenant}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                {formatCurrency(unit.rent)}/mo · Ends{" "}
                {new Date(unit.leaseEnd!).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </>
          )}
          {unit.status === "expiring" && (
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-amber-400">
              Lease expiring soon
            </div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slot Machine Digit                                                        */
/* -------------------------------------------------------------------------- */

function SlotDigit({ digit, delay }: { digit: string; delay: number }) {
  const target = parseInt(digit, 10);
  const [active, setActive] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) { setActive(true); return; }
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay, reduced]);

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: "1em",
        lineHeight: "1em",
        verticalAlign: "top",
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          transform: active ? `translateY(-${target * 10}%)` : "translateY(0%)",
          transition:
            active && !reduced
              ? "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span
            key={d}
            style={{ display: "block", height: "1em", lineHeight: "1em" }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function SlotNumber({ value }: { value: string }) {
  let digitIndex = 0;
  return (
    <>
      {value.split("").map((char, i) => {
        if (/\d/.test(char)) {
          const delay = 80 + digitIndex++ * 90;
          return <SlotDigit key={i} digit={char} delay={delay} />;
        }
        return <span key={i} style={{ verticalAlign: "top" }}>{char}</span>;
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export function RentalDashboardPage() {
  const [activeNav, setActiveNav] = useState<string>("Units");
  const summary = useMemo(heatmapSummary, []);

  return (
    <div className="rental-animate flex h-full flex-col bg-surface-page">
      {/* ------------------------------------------------------------------ */}
      {/*  Top Bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header className="anim-enter shrink-0 border-b border-border-default bg-white px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: brand + nav */}
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-slate-900">
              Rental Dashboard
            </span>
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => setActiveNav(link)}
                  className={cn(
                    "text-base transition-all duration-200",
                    activeNav === link
                      ? "border-b-2 border-blue-600 pb-1.5 font-medium text-blue-600"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {link}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: search + icons */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search portfolio..."
                className="w-64 rounded-xl bg-slate-50 py-1.5 pl-9 pr-4 text-sm text-foreground placeholder:text-slate-400 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="rounded-xl p-2 text-slate-500 transition-colors duration-150 hover:bg-slate-50 active:scale-95">
              <Bell className="h-5 w-5" />
            </button>
            <button className="rounded-xl p-2 text-slate-500 transition-colors duration-150 hover:bg-slate-50 active:scale-95">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Content                                                           */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col gap-8">
          {/* ============================================================== */}
          {/*  Zone 1: Hero Vitals                                           */}
          {/* ============================================================== */}
          <section className="grid grid-cols-12 gap-6">
            {/* Hero Income Card */}
            <div
              className="rental-hero col-span-7 relative overflow-hidden rounded-lg bg-blue-600 p-8 shadow-xl"
            >
              {/* Decorative blob */}
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-xl bg-blue-500 opacity-20 blur-[32px]" />

              <div className="relative flex flex-col justify-between h-full">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-blue-200">
                    Monthly Gross Income
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[60px] font-extrabold leading-none tracking-tight text-blue-50">
                      <SlotNumber value="$19,600" />
                    </span>
                    <span className="flex items-center text-sm font-semibold text-blue-200">
                      <TrendingUp className="mr-1 h-3.5 w-3.5" />
                      +4.2%
                    </span>
                  </div>
                </div>

                {/* Sparkline — bars grow upward */}
                <div className="mt-8 flex h-24 items-end gap-1">
                  {sparklineHeights.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rental-sparkline-bar flex-1 rounded-t-sm",
                        i === sparklineHeights.length - 1
                          ? "bg-white"
                          : "bg-blue-400/30"
                      )}
                      style={{
                        height: `${h}%`,
                        animationDelay: `${400 + i * 80}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* KPI 2×2 Grid */}
            <div className="col-span-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
              {kpiCards.map((kpi, i) => (
                <div
                  key={kpi.label}
                  className={cn(
                    "anim-enter flex flex-col justify-center bg-white px-6 py-7",
                    i % 2 !== 0 && "border-l border-slate-200",
                    i >= 2 && "border-t border-slate-200"
                  )}
                  style={{ animationDelay: `${200 + i * 100}ms` }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {kpi.label}
                  </span>
                  <span className="mt-1 text-3xl font-extrabold text-slate-900">
                    {kpi.value}
                  </span>
                  {"bar" in kpi && kpi.bar && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="rental-bar h-full rounded-full bg-blue-700"
                        style={{
                          width: `${kpi.bar}%`,
                          animationDelay: "600ms",
                        }}
                      />
                    </div>
                  )}
                  {kpi.sub && (
                    <span className={cn("mt-1 text-[10px] font-medium", kpi.subColor)}>
                      {kpi.sub}
                    </span>
                  )}
                  {"dots" in kpi && kpi.dots && (
                    <div className="mt-2 flex gap-1">
                      {kpi.dots.map((d, j) => (
                        <div key={j} className={cn("h-2 w-2 rounded-full", d.color)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/*  Zone 2: Quick Actions                                         */}
          {/* ============================================================== */}
          <section
            className="anim-enter flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            style={{ animationDelay: "300ms" }}
          >
            <span className="border-r border-slate-200 pr-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Actions
            </span>
            <button className="flex items-center gap-2 rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-blue-900 active:scale-95">
              <Plus className="h-4 w-4" />
              New Lease
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <Building2 className="h-4 w-4" />
              Add Property
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <FileText className="h-4 w-4" />
              Portfolio Report
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition-all duration-150 hover:bg-blue-100 active:scale-95">
              <TrendingUp className="h-4 w-4" />
              Bulk Increase
            </button>
          </section>

          {/* ============================================================== */}
          {/*  Zone 3: Asymmetric — Table + Heatmap                          */}
          {/* ============================================================== */}
          <section className="grid grid-cols-12 gap-6">
            {/* Property Leaderboard */}
            <div
              className="anim-enter col-span-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              style={{ animationDelay: "400ms" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Property Ranking
                </h2>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  By Yield
                </span>
              </div>

              {/* Table header */}
              <div className="flex bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <div className="w-[33%] px-6 py-3">Property</div>
                <div className="w-[20%] px-6 py-3">NOI (Annual)</div>
                <div className="w-[22%] px-6 py-3">Monthly Rent</div>
                <div className="w-[25%] px-6 py-3">Market Index</div>
              </div>

              {/* Rows */}
              {propertyRows.map((row, i) => (
                <div
                  key={row.name}
                  className={cn(
                    "anim-enter flex items-center transition-colors duration-150 hover:bg-slate-50/50",
                    i > 0 && "border-t border-slate-100"
                  )}
                  style={{ animationDelay: `${500 + i * 80}ms` }}
                >
                  <div className="flex w-[33%] items-center gap-3 px-6 py-4">
                    <div
                      className={cn(
                        "h-10 w-10 shrink-0 rounded transition-transform duration-200 group-hover:scale-105",
                        row.img
                      )}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {row.name}
                      </p>
                      <p className="text-xs text-slate-400">{row.location}</p>
                    </div>
                  </div>
                  <div className="w-[20%] px-6 py-4 text-base font-semibold text-slate-700">
                    {row.noi}
                  </div>
                  <div className="w-[22%] px-6 py-4 text-base text-slate-500">
                    {row.rent}
                  </div>
                  <div className="w-[25%] px-6 py-4">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-tight",
                        row.indexColor
                      )}
                    >
                      {row.index}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Unit Occupancy Heatmap */}
            <div
              className="anim-enter-right col-span-4 flex flex-col rounded-lg bg-slate-900 p-6 shadow-xl"
              style={{ animationDelay: "450ms" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Unit Occupancy
                </h2>
                <button className="rounded p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-slate-200 active:scale-95">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Summary line */}
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <span className="text-blue-400">{summary.occupied} occupied</span>
                <span>·</span>
                <span className="text-slate-500">{summary.vacant} vacant</span>
                <span>·</span>
                <span className="text-amber-400">{summary.expiring} expiring soon</span>
              </div>

              {/* Property-grouped grid */}
              <div className="mt-5 flex flex-col gap-4 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
                {heatmapData.map((cluster, ci) => {
                  let tileIdx = 0;
                  return (
                    <div key={cluster.property}>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                        {cluster.property}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.units.map((unit) => (
                          <HeatmapTile
                            key={unit.id}
                            unit={unit}
                            delay={600 + ci * 80 + tileIdx++ * 30}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 flex items-center gap-4 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-[2px] bg-blue-500" />
                  <span className="text-[9px] font-medium text-slate-500">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-[2px] border-2 border-dashed border-slate-500" />
                  <span className="text-[9px] font-medium text-slate-500">Vacant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-[2px] bg-amber-500 ring-1 ring-amber-300/50" />
                  <span className="text-[9px] font-medium text-slate-500">Expiring</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/*  Zone 4: Lease Renewal Pipeline                                */}
          {/* ============================================================== */}
          <section
            className="anim-enter overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{ animationDelay: "550ms" }}
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Lease Renewal Pipeline
              </h2>
            </div>
            <div className="flex divide-x divide-slate-100">
              {pipelineStages.map((stage, si) => (
                <div key={stage.label} className="flex flex-1 flex-col gap-4 p-6">
                  {/* Stage header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        stage.color
                      )}
                    >
                      {stage.label}
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-semibold",
                        stage.countBg
                      )}
                    >
                      {stage.count}
                    </span>
                  </div>

                  {/* Cards */}
                  {stage.cards.map((card, ci) => (
                    <div
                      key={card.unit}
                      className={cn(
                        "anim-enter rounded border border-slate-200 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        stage.borderColor && `border-l-4 ${stage.borderColor}`,
                        "faded" in card && card.faded && "opacity-50"
                      )}
                      style={{ animationDelay: `${650 + si * 100 + ci * 60}ms` }}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {card.unit}
                      </p>
                      <p className="text-xs text-slate-500">{card.detail}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/*  Zone 5: Bottom Triptych                                       */}
          {/* ============================================================== */}
          <section className="grid grid-cols-12 gap-6 pb-8">
            {/* Rent Collection & Arrears */}
            <div
              className="anim-enter col-span-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "700ms" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Rent Collection &amp; Arrears
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  Aging Buckets
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {arrearsBuckets.map((bucket, i) => (
                  <div
                    key={bucket.label}
                    className="flex items-center gap-4"
                  >
                    <span className="w-12 text-right text-xs font-semibold text-slate-400">
                      {bucket.label}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-50 h-8">
                      <div
                        className={cn("rental-bar h-full", bucket.color)}
                        style={{
                          width: bucket.width,
                          animationDelay: `${900 + i * 120}ms`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {bucket.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer stats */}
              <div className="mt-6 flex items-start justify-around border-t border-slate-100 pt-5">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Recovery Rate
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    98.2%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Eviction Risk
                  </p>
                  <p className="text-xl font-semibold text-red-700">
                    4 Units
                  </p>
                </div>
              </div>
            </div>

            {/* Maintenance Exposure */}
            <div
              className="anim-enter col-span-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "780ms" }}
            >
              <h3 className="text-base font-bold text-slate-900">
                Maintenance<br />Exposure
              </h3>

              <div className="mt-6 flex flex-col gap-4">
                {maintenanceItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", item.color)} />
                      <span className="text-sm font-medium text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top spend */}
              <p className="mt-6 text-[10px] font-semibold uppercase text-slate-400">
                Top Spend Category
              </p>
              <div className="mt-2 rounded bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">
                    HVAC / Systems
                  </span>
                  <span className="text-xs font-semibold text-blue-700">
                    $3,240
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="rental-bar h-full rounded-full bg-blue-700"
                    style={{ width: "66.6%", animationDelay: "1000ms" }}
                  />
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div
              className="anim-enter-right col-span-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "750ms" }}
            >
              <h3 className="text-base font-bold text-slate-900">
                Upcoming Events
              </h3>

              <div className="relative mt-6 flex flex-col gap-6">
                {/* Vertical timeline line */}
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-100" />

                {upcomingEvents.map((event, i) => (
                  <div
                    key={event.title}
                    className="anim-enter relative flex flex-col pl-8"
                    style={{ animationDelay: `${850 + i * 100}ms` }}
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "absolute left-0 top-1 h-4 w-4 rounded-full border-4 border-white",
                        event.dotColor,
                        event.active && "rental-timeline-active shadow-sm"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        event.timeColor
                      )}
                    >
                      {event.time}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {event.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {event.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
