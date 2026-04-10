"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  DollarSign,
  Home,
  Map,
  TrendingUp,
  AlertTriangle,
  Download,
  Bell,
  Settings,
  Plus,
} from "lucide-react";
import { properties } from "@/lib/mock-data";
import { PropertyFilters } from "@/components/portfolio/PropertyFilters";
import { PropertyTable } from "@/components/portfolio/PropertyTable";

const PAGE_SIZE = 16;

const provinces = [
  "All", "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang",
  "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep", "Koh Kong",
  "Kratie", "Mondulkiri", "Oddar Meanchey", "Pailin", "Phnom Penh",
  "Preah Vihear", "Prey Veng", "Pursat", "Ratanakiri", "Siem Reap",
  "Sihanoukville", "Stung Treng", "Svay Rieng", "Takeo", "Tbong Khmum",
];


const avgOccupancyNum = properties.reduce((sum, p) => sum + p.health, 0) / properties.length;
const avgOccupancy = avgOccupancyNum.toFixed(1);
const attentionCount = properties.filter((p) => p.health < 30).length;

export function PortfolioPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Property Type");
  const [statusFilter, setStatusFilter] = useState("Status");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filtered = properties.filter((p) => {
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q);
    const matchesType = typeFilter === "Property Type" || p.type === typeFilter;
    const matchesStatus = statusFilter === "Status" || p.status === statusFilter;
    const matchesProvince = provinceFilter === "All" || p.province === provinceFilter;
    return matchesSearch && matchesType && matchesStatus && matchesProvince;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function goToPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  }

  function clearAllFilters() {
    setSearchQuery("");
    setTypeFilter("Property Type");
    setStatusFilter("Status");
    setProvinceFilter("All");
    setCurrentPage(1);
  }

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      {/* Top Nav Bar */}
      <div role="banner" className="bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-6 flex items-center justify-between h-[56px] shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-[448px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search portfolio..."
            className="w-full pl-10 pr-4 py-2 text-[14px] bg-val-bg-tint rounded text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button aria-label="Notifications, unread" className="p-2 rounded hover:bg-slate-100 transition-colors duration-150 relative">
            <Bell className="w-5 h-5 text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button aria-label="Settings" className="p-2 rounded hover:bg-slate-100 transition-colors duration-150">
            <Settings className="w-5 h-5 text-slate-500" />
          </button>

          <div className="w-px h-8 bg-slate-200" />

          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[14px] font-semibold text-val-heading rounded hover:bg-slate-50 active:scale-[0.97] transition-all duration-150">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => router.push("/add-property")}
            className="flex items-center gap-2 px-4 py-2 text-white text-[14px] font-semibold rounded shadow-[0_4px_6px_-1px_rgba(0,74,198,0.25),0_2px_4px_-2px_rgba(0,74,198,0.15)] hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Property
          </button>

          <div className="w-9 h-9 rounded-xl bg-slate-300 border-2 border-white shadow-sm overflow-hidden ml-2">
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto scrollbar-none px-8 pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">

          {/* Page Header */}
          <div
            className="transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-8px)",
            }}
          >
            <h1 className="text-[22px] font-semibold text-val-heading tracking-tight">Portfolio</h1>
            <p className="text-[14px] text-slate-500 mt-1">
              Oversee and manage your complete real estate asset inventory across all regions.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard index={0} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Properties</span>
                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-4">{properties.length}</p>
              <span className="text-[12px] text-emerald-600 font-semibold mt-2 block">+2 this month</span>
            </KpiCard>

            <KpiCard index={1} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Total Value</span>
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-4">$42.8M</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[12px] text-emerald-600 font-semibold">4.2% YoY</span>
              </div>
            </KpiCard>

            <KpiCard index={2} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Monthly Income</span>
                <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-violet-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-4">$312,450</p>
              <span className="text-[12px] text-slate-400 font-semibold mt-2 block">Gross Revenue</span>
            </KpiCard>

            <KpiCard index={3} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Occupancy</span>
                <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-4">{avgOccupancy}%</p>
              <div className="mt-3">
                <AnimatedBar value={avgOccupancyNum} color="bg-amber-400" mounted={mounted} delay={600} />
              </div>
            </KpiCard>

            <KpiCard index={4} mounted={mounted} accent>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Attention</span>
                <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-4">{attentionCount}</p>
              <span className="text-[12px] text-red-600 font-semibold mt-2 block">Critical tasks pending</span>
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
            filtered={filtered}
            properties={properties}
            mounted={mounted}
            navigate={(path) => router.push(path)}
            totalPages={totalPages}
            safePage={safePage}
            goToPage={goToPage}
            onClearFilters={clearAllFilters}
          />
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
          width: mounted ? `${value}%` : "0%",
          transition: `width 800ms cubic-bezier(0.25,1,0.5,1)`,
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}
