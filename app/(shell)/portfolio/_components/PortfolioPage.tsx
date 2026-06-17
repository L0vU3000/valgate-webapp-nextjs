"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Plus,
} from "lucide-react";
import type { PortfolioPageData } from "../queries";
import type { PropertyStatus } from "@/lib/data/types/property";
import dynamic from "next/dynamic";
import { PropertyTable } from "@/components/portfolio/PropertyTable";
const PropertyFilters = dynamic(
  () => import("@/components/portfolio/PropertyFilters").then((m) => ({ default: m.PropertyFilters })),
  { ssr: false }
);
import type { TableAnimationConfig, SortKey } from "@/components/portfolio/PropertyTable";
import { AppHeader } from "@/components/layout/AppHeader";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";

const PAGE_SIZE = 16;

const PORTFOLIO_TABLE_ANIMATION: TableAnimationConfig = {
  containerDuration: 250,
  containerDelay: 280,
  rowDuration: 400,
  rowStagger: 25,
  progressBarDelay: 100,
  progressBarStagger: 30,
};

const provinces = ["All", ...CAMBODIA_PROVINCES];


export function PortfolioPage({ data }: { data: PortfolioPageData }) {
  const { properties: activeProperties, archivedProperties, stats, kpis, archivedCount, soldCount, showArchived } = data;

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Property Type");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | null>(null);
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [archivedFilter, setArchivedFilter] = useState(showArchived);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const source = archivedFilter ? archivedProperties : activeProperties;

  const q = searchQuery.trim().toLowerCase();
  const filtered = source.filter((p) => {
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.province ?? "").toLowerCase().includes(q);
    const matchesType = typeFilter === "Property Type" || p.type === typeFilter;
    const matchesStatus = archivedFilter || !statusFilter || p.status === statusFilter;
    const matchesProvince = provinceFilter === "All" || p.province === provinceFilter;
    return matchesSearch && matchesType && matchesStatus && matchesProvince;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let av: string | number, bv: string | number
        switch (sortKey) {
          case "name":     av = a.name.toLowerCase();    bv = b.name.toLowerCase();    break
          case "province": av = (a.province ?? "").toLowerCase(); bv = (b.province ?? "").toLowerCase(); break
          case "status":   av = a.status;                bv = b.status;                break
          case "size":     av = a.totalArea ? Number(a.totalArea) : -1; bv = b.totalArea ? Number(b.totalArea) : -1; break
          case "buy":      av = a.buyNumeric;            bv = b.buyNumeric;            break
          case "progress": av = a.progress;              bv = b.progress;              break
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1
        if (av > bv) return sortDir === "asc" ? 1 : -1
        return 0
      })
    : filtered

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  function goToPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir("asc")
    } else if (sortDir === "asc") {
      setSortDir("desc")
    } else {
      setSortKey(null)
      setSortDir("asc")
    }
    setCurrentPage(1)
  }

  function clearAllFilters() {
    setSearchQuery("");
    setTypeFilter("Property Type");
    setStatusFilter(null);
    setProvinceFilter("All");
    setArchivedFilter(false);
    setCurrentPage(1);
  }

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />

      {/* Main content */}
      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">

          {/* Page Header */}
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-8px)",
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
                <span className="text-[11px] text-slate-300">/</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Portfolio</span>
              </div>
              <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">Portfolio</h1>
              <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">
                Oversee and manage your complete real estate asset inventory across all regions.
              </p>
            </div>
            <div className="shrink-0">
            <button
              onClick={() => router.push("/add-property")}
              className="flex items-center gap-2 px-4 py-2 text-white text-[14px] font-semibold rounded shadow-[0_4px_6px_-1px_rgba(0,74,198,0.25),0_2px_4px_-2px_rgba(0,74,198,0.15)] hover:opacity-90 active:scale-[0.97] transition-all duration-150 shrink-0"
              style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Property
            </button>
            </div>
          </div>

          {/* KPI Cards — 2 cols on phone (4 cards = 2×2 grid, ~173px per card
              at 390px viewport), 4 across on lg+. Skipping 1-col stage keeps
              the dashboard from feeling sparse on iPhone 14. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard index={0} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Properties</span>
                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums mt-4">{stats.totalProperties}</p>
              <span className="text-[12px] text-emerald-600 font-semibold mt-2 block">+{kpis.newThisMonth} this month</span>
            </KpiCard>

            <KpiCard index={1} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Total Purchase Price</span>
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
              <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums mt-4">{kpis.totalValueFormatted}</p>
              <span className="text-[12px] text-slate-400 font-medium mt-2 block">Purchase price</span>
            </KpiCard>

            <KpiCard index={2} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Monthly Income</span>
                <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-violet-600" />
                </div>
              </div>
              <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums mt-4">{kpis.monthlyExpected}</p>
              <span className="text-[12px] text-emerald-600 font-semibold mt-2 block">
                {kpis.monthlyCollected} collected
                <span className="text-slate-400 font-normal ml-1">{kpis.monthLabel}</span>
              </span>
            </KpiCard>

            <KpiCard index={3} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Occupancy</span>
                <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums mt-4">{stats.occupancyRate}%</p>
              <div className="mt-3">
                <AnimatedBar value={stats.occupancyRate} color="bg-amber-400" mounted={mounted} delay={600} />
              </div>
            </KpiCard>
          </div>

          {/* Filters */}
          <PropertyFilters
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            provinceFilter={provinceFilter}
            setProvinceFilter={setProvinceFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setCurrentPage={setCurrentPage}
            mounted={mounted}
            provinces={provinces}
          />

          {/* Table */}
          <PropertyTable
            pageRows={pageRows}
            pageStart={pageStart}
            filtered={sorted}
            properties={source}
            mounted={mounted}
            navigate={(path) => router.push(path)}
            totalPages={totalPages}
            safePage={safePage}
            goToPage={goToPage}
            onClearFilters={clearAllFilters}
            animationConfig={PORTFOLIO_TABLE_ANIMATION}
            showArchived={false}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />

          {/* Footer — sold / archived counts */}
          {(soldCount > 0 || archivedCount > 0) && (
            <div className="flex items-center justify-center gap-3 pt-3 pb-1">
              <p className="text-[12px] text-slate-400">
                {soldCount > 0 && archivedCount > 0 && (
                  <>{soldCount} sold · {archivedCount} archived</>
                )}
                {soldCount > 0 && archivedCount === 0 && (
                  <>{soldCount} sold</>
                )}
                {archivedCount > 0 && soldCount === 0 && (
                  <>{archivedCount} archived</>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                {soldCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter("Sold"); setArchivedFilter(false); setCurrentPage(1); }}
                    className="text-[11px] font-semibold text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 hover:border-slate-300 hover:text-slate-600 transition-colors duration-150"
                  >
                    Show sold
                  </button>
                )}
                {archivedCount > 0 && (
                  <button
                    onClick={() => { setArchivedFilter(!archivedFilter); setStatusFilter(null); setCurrentPage(1); }}
                    className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 transition-colors duration-150 ${
                      archivedFilter
                        ? "text-amber-700 border-amber-300 bg-amber-50 hover:border-amber-400"
                        : "text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                    }`}
                  >
                    {archivedFilter ? "Hide archived" : "Show archived"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </main>
  );
}

/* ── Sub-components ────────────────────────────── */

function KpiCard({ children, index, mounted, accent }: {
  children: React.ReactNode;
  index: number;
  mounted: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
        accent ? "border-l-4 border-l-amber-400" : ""
      }`}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-16px)",
        transition: "opacity 500ms cubic-bezier(0.25,1,0.5,1), transform 500ms cubic-bezier(0.25,1,0.5,1), box-shadow 300ms, translate 300ms",
        transitionDelay: `${100 + index * 80}ms`,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedBar({ value, color, mounted, delay }: {
  value: number;
  color: string;
  mounted: boolean;
  delay: number;
}) {
  return (
    <div className="h-[6px] bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: mounted ? `${Math.min(100, Math.max(0, value))}%` : "0%",
          transition: `width 800ms cubic-bezier(0.25,1,0.5,1)`,
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}
