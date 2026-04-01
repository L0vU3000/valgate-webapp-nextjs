import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
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
  X,
  type LucideIcon,
} from "lucide-react";

const PAGE_SIZE = 16;

const properties = [
  { id: 1,  name: "Land near river",              code: "PP00016 PH",       type: "House",    province: "Phnom Penh",      status: "Rented", size: "850",   buy: "$1,278,000", title: "Hard title", health: 100 },
  { id: 2,  name: "Siem Reap Land Plot",           code: "SR00015 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", size: "1,200", buy: "$456,000",   title: "Soft title", health: 28  },
  { id: 3,  name: "Kampong Chhnang Parcel",        code: "KPC00013",         type: "Land",     province: "Kampong Chhnang", status: "Vacant", size: "2,500", buy: "$125,000",   title: "Hard title", health: 43  },
  { id: 4,  name: "Angkor Heritage Plot",          code: "SR00007 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", size: "900",   buy: "$234,000",   title: "Soft title", health: 67  },
  { id: 5,  name: "Temple View Land",              code: "SR00006 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", size: "1,100", buy: "$345,000",   title: "Hard title", health: 82  },
  { id: 6,  name: "Central Siem Reap Plot",        code: "SR00005 Land",     type: "Land",     province: "Siem Reap",       status: "Rented", size: "750",   buy: "$567,000",   title: "Hard title", health: 95  },
  { id: 7,  name: "Pub Street Commerce Block",     code: "SR00004 Building", type: "Building", province: "Siem Reap",       status: "Rented", size: "450",   buy: "$890,000",   title: "Hard title", health: 88  },
  { id: 8,  name: "Prey Veng Agricultural Land",   code: "PV00002 Land",     type: "Land",     province: "Prey Veng",       status: "Vacant", size: "5,000", buy: "$180,000",   title: "Soft title", health: 34  },
  { id: 9,  name: "Mekong Riverside Plot",         code: "PV00001 Land",     type: "Land",     province: "Prey Veng",       status: "Vacant", size: "3,200", buy: "$156,000",   title: "\u2014",     health: 22  },
  { id: 10, name: "Toul Kork Urban Parcel",        code: "PP00033 Land",     type: "Land",     province: "Phnom Penh",      status: "Vacant", size: "600",   buy: "$980,000",   title: "Hard title", health: 75  },
  { id: 11, name: "BKK1 Prime Land",               code: "PP00032 Land",     type: "Land",     province: "Phnom Penh",      status: "Rented", size: "480",   buy: "$1,450,000", title: "Hard title", health: 100 },
  { id: 12, name: "Baray Warehouse Complex",       code: "GEN00012",         type: "Building", province: "Prey Veng",       status: "Vacant", size: "4,325", buy: "$1,232,356", title: "\u2014",     health: 12  },
  { id: 13, name: "Kampot Riverside Villa",        code: "GEN00013",         type: "House",    province: "Kampot",          status: "Vacant", size: "3,806", buy: "$356,146",   title: "Soft title", health: 19  },
  { id: 14, name: "Prey Veng Family Residence",    code: "GEN00014",         type: "House",    province: "Prey Veng",       status: "Rented", size: "4,119", buy: "$405,484",   title: "Hard title", health: 10  },
  { id: 15, name: "Toul Tom Poung Parcel",         code: "GEN00015",         type: "Land",     province: "Phnom Penh",      status: "Rented", size: "2,256", buy: "$955,491",   title: "Soft title", health: 33  },
  { id: 16, name: "Chamkar Mon Lot",               code: "GEN00016",         type: "Land",     province: "Phnom Penh",      status: "Rented", size: "4,917", buy: "$1,179,626", title: "\u2014",     health: 24  },
];

const TYPE_ICON: Record<string, LucideIcon> = {
  House: Home,
  Building: Building2,
  Land: Map,
};

const TYPE_COLOR: Record<string, string> = {
  House: "bg-blue-100 text-blue-600",
  Building: "bg-amber-100 text-amber-600",
  Land: "bg-emerald-100 text-emerald-600",
};

function typeBadgeClasses(type: string) {
  switch (type) {
    case "House":    return "bg-blue-50 text-blue-600";
    case "Building": return "bg-amber-50 text-amber-600";
    case "Land":     return "bg-emerald-50 text-emerald-600";
    default:         return "bg-slate-100 text-slate-500";
  }
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case "Rented": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Vacant": return "bg-amber-50 text-amber-700 border border-amber-200";
    default:       return "bg-slate-100 text-slate-500 border border-slate-200";
  }
}

function titleBadgeClasses(title: string) {
  switch (title) {
    case "Hard title": return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Soft title": return "bg-amber-50 text-amber-600 border border-amber-200";
    default:           return "";
  }
}

function healthDotColor(health: number) {
  if (health >= 80) return "bg-emerald-500";
  if (health >= 50) return "bg-amber-500";
  return "bg-red-400";
}

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
  const navigate = useNavigate();

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

  return (
    <main className="h-full flex flex-col bg-[#f8f9ff]">
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
            className="w-full pl-10 pr-4 py-2 text-[14px] bg-[#eef4ff] rounded text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200"
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

          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[14px] font-semibold text-[#121c28] rounded hover:bg-slate-50 active:scale-[0.97] transition-all duration-150">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => navigate("/add-property")}
            className="flex items-center gap-2 px-4 py-2 text-white text-[14px] font-semibold rounded shadow-[0_4px_6px_-1px_rgba(0,74,198,0.25),0_2px_4px_-2px_rgba(0,74,198,0.15)] hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            style={{ background: "linear-gradient(168deg, #004ac6 0%, #2563eb 100%)" }}
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
            <h1 className="text-[22px] font-semibold text-[#121c28] tracking-tight">Portfolio</h1>
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
              <p className="text-[24px] font-bold text-[#121c28] leading-none mt-4">{properties.length}</p>
              <span className="text-[12px] text-emerald-600 font-semibold mt-2 block">+2 this month</span>
            </KpiCard>

            <KpiCard index={1} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Total Value</span>
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-[#121c28] leading-none mt-4">$42.8M</p>
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
              <p className="text-[24px] font-bold text-[#121c28] leading-none mt-4">$312,450</p>
              <span className="text-[12px] text-slate-400 font-semibold mt-2 block">Gross Revenue</span>
            </KpiCard>

            <KpiCard index={3} mounted={mounted}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Occupancy</span>
                <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-[#121c28] leading-none mt-4">{avgOccupancy}%</p>
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
              <p className="text-[24px] font-bold text-[#121c28] leading-none mt-4">{attentionCount}</p>
              <span className="text-[12px] text-red-600 font-semibold mt-2 block">Critical tasks pending</span>
            </KpiCard>
          </div>

          {/* Province Quick-Select Pills */}
          <div
            className="transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-10px)",
              transitionDelay: "300ms",
              maskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
            }}
          >
            <div
              role="radiogroup"
              aria-label="Filter by province"
              className="flex gap-1.5 overflow-x-auto pb-1.5 px-8 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-[#eef4ff] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#004ac6]/25 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#004ac6]/50"
            >
              {provinces.map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={provinceFilter === p}
                  onClick={() => { setProvinceFilter(p); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                    provinceFilter === p
                      ? "bg-[#004ac6] text-white scale-[1.03]"
                      : "bg-[#eef4ff] text-slate-500 hover:bg-blue-100 hover:text-slate-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Controls */}
          <div
            className="flex items-center gap-4 transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-12px)",
              transitionDelay: "350ms",
            }}
          >
            {/* Type segmented control */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">Type</span>
              <div className="bg-[#eef4ff] p-1 rounded flex">
                {["All", "House", "Building", "Land"].map((t) => {
                  const isActive = t === "All" ? typeFilter === "Property Type" : typeFilter === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t === "All" ? "Property Type" : t); setCurrentPage(1); }}
                      className={`px-3.5 py-1.5 text-[12px] font-semibold rounded transition-all duration-150 ${
                        isActive
                          ? "bg-white text-[#004ac6] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status segmented control */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">Status</span>
              <div className="bg-[#eef4ff] p-1 rounded flex">
                {["All", "Rented", "Vacant"].map((s) => {
                  const isActive = s === "All" ? statusFilter === "Status" : statusFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s === "All" ? "Status" : s); setCurrentPage(1); }}
                      className={`px-3.5 py-1.5 text-[12px] font-semibold rounded transition-all duration-150 ${
                        isActive
                          ? "bg-white text-[#004ac6] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear all — visible when any filter is active */}
            {(typeFilter !== "Property Type" || statusFilter !== "Status" || provinceFilter !== "All") && (
              <button
                onClick={() => {
                  setTypeFilter("Property Type");
                  setStatusFilter("Status");
                  setProvinceFilter("All");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold text-[#004ac6] bg-[#eef4ff] hover:bg-blue-100 transition-all duration-150 active:scale-[0.97]"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div
            className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-16px)",
              transitionDelay: "450ms",
            }}
          >
            <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-4 px-3 w-10">
                    <input type="checkbox" aria-label="Select all properties" className="rounded border-slate-300 accent-blue-600" />
                  </th>
                  <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] w-[48px]">
                    #
                  </th>
                  <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Property
                  </th>
                  <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Type
                  </th>
                  <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Province
                  </th>
                  <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Status
                  </th>
                  <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Size
                  </th>
                  <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Buy
                  </th>
                  <th className="text-center py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Title
                  </th>
                  <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <p className="text-[14px] text-slate-400">No properties match your filters.</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setTypeFilter("Property Type");
                          setStatusFilter("Status");
                          setProvinceFilter("All");
                          setCurrentPage(1);
                        }}
                        className="mt-3 text-[14px] text-blue-600 font-medium hover:underline"
                      >
                        Clear all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p, i) => {
                    const TypeIcon = TYPE_ICON[p.type] ?? Map;
                    const typeColor = TYPE_COLOR[p.type] ?? "bg-slate-100 text-slate-500";
                    const hDot = healthDotColor(p.health);
                    return (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer group transition-colors duration-150"
                        tabIndex={0}
                        role="link"
                        onClick={() => navigate(`/property/${p.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/property/${p.id}`); } }}
                        style={{
                          opacity: mounted ? 1 : 0,
                          transform: mounted ? "translateY(0)" : "translateY(-6px)",
                          transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)`,
                          transitionDelay: `${550 + i * 30}ms`,
                        }}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${p.name}`}
                            className="rounded border-slate-300 accent-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>

                        {/* Row # */}
                        <td className="py-3 px-3 text-[12px] text-slate-400">
                          {pageStart + i + 1}
                        </td>

                        {/* Property — thumbnail + name + code */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${typeColor} transition-transform duration-200 group-hover:scale-105`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] text-[#121c28] font-medium leading-tight truncate">{p.name}</p>
                              <p className="text-[12px] text-slate-400 mt-0.5 truncate">{p.code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${typeBadgeClasses(p.type)}`}>
                            {p.type}
                          </span>
                        </td>

                        {/* Province */}
                        <td className="py-3 px-3 text-[14px] text-slate-700">{p.province}</td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${statusBadgeClasses(p.status)}`}>
                            {p.status}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 text-right text-[14px] text-slate-600">
                          {p.size} m&sup2;
                        </td>

                        {/* Buy */}
                        <td className="py-3 px-3 text-right text-[14px] font-medium text-slate-900">
                          {p.buy}
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3 text-center">
                          {p.title === "\u2014" ? (
                            <span className="text-slate-400">&mdash;</span>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${titleBadgeClasses(p.title)}`}>
                              {p.title}
                            </span>
                          )}
                        </td>

                        {/* Health */}
                        <td className="py-3 px-3 text-right">
                          <div aria-label={`Health ${p.health}%`} className="inline-flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-[7px] h-[7px] rounded-full ${hDot}`} />
                              <span className="text-[12px] font-medium text-slate-700">{p.health}%</span>
                            </div>
                            <div className="w-[52px] h-[3px] bg-slate-200 rounded-sm overflow-hidden">
                              <div
                                className={`h-full rounded-sm ${hDot} transition-all duration-700 ease-out`}
                                style={{
                                  width: mounted ? `${p.health}%` : "0%",
                                  transitionDelay: `${650 + i * 40}ms`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 bg-slate-50/60 border-t border-slate-200">
              <p className="text-[14px] text-slate-500">
                Showing{" "}
                <span className="font-semibold text-[#121c28]">{filtered.length}</span>
                {" "}of{" "}
                <span className="font-semibold text-[#121c28]">{properties.length}</span>
                {" "}properties
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={safePage === 1}
                    onClick={() => goToPage(safePage - 1)}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button className="px-3 py-1 rounded text-white text-[14px] font-semibold min-w-[32px] shadow-sm" style={{ background: "#004ac6" }}>
                    {safePage}
                  </button>
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => goToPage(safePage + 1)}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
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

