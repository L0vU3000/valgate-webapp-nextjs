import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronsUpDown, Building2, BarChart3, DollarSign, Home, Map, type LucideIcon } from "lucide-react";

const PAGE_SIZE = 10;

const provinces = [
  "All", "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang",
  "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep", "Koh Kong",
  "Kratie", "Mondulkiri",
];

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
  House:    Home,
  Building: Building2,
  Land:     Map,
};

function statusClasses(status: string) {
  if (status === "Rented") return "bg-status-success-bg text-status-success-text";
  if (status === "Vacant") return "bg-status-warning-bg text-status-warning-text";
  return "bg-muted text-muted-foreground";
}

function titleClasses(title: string) {
  if (title === "Hard title") return "text-primary";
  if (title === "Soft title") return "text-status-warning-text";
  return "text-muted-foreground";
}

function healthClasses(health: number) {
  if (health >= 80) return { dot: "bg-status-success", text: "text-status-success-text", pill: "bg-status-success-bg" };
  if (health >= 50) return { dot: "bg-status-warning", text: "text-status-warning-text", pill: "bg-status-warning-bg" };
  return { dot: "bg-status-danger", text: "text-status-danger-text", pill: "bg-status-danger-bg" };
}

export function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const q = searchQuery.trim().toLowerCase();
  const filtered = properties.filter((p) => {
    const matchesProvince = activeFilter === "All" || p.province === activeFilter;
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q);
    return matchesProvince && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

  function goToPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  }

  // Build visible page numbers: always show first, last, current ±1, with ellipsis gaps
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, totalPages, safePage, safePage - 1, safePage + 1].filter(n => n >= 1 && n <= totalPages));
    const sorted = [...set].sort((a, b) => a - b);
    const result: (number | "…")[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && (sorted[i] as number) - (sorted[i - 1] as number) > 1) result.push("…");
      result.push(sorted[i]);
    }
    return result;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card px-6 py-4 border-b border-border">
        <div className="grid grid-cols-3 items-center">
          <div>
            <h1 className="text-[24px] font-semibold text-foreground">Portfolio</h1>
            <p className="text-[13px] text-muted-foreground tracking-wide">Explore anything in your property database</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search properties…"
              className="w-full pl-9 pr-4 py-2 text-[14px] bg-muted/40 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground flex items-center gap-2 hover:bg-accent/50">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button onClick={() => navigate("/add-property")} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] flex items-center gap-2 hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-[1160px] mx-auto flex flex-col gap-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard icon={Building2} label="Total Property" value="1,500" trend="+20%" trendClass="text-status-success-text" sub="vs. last month" />
            <KpiCard icon={BarChart3} label="Number of Sales" value="320" trend="+20%" trendClass="text-status-success-text" sub="vs. last month" />
            <KpiCard icon={DollarSign} label="Total Sales" value="$150k" trend="+20%" trendClass="text-status-success-text" sub="vs. last month" />
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">

            {/* Province filter toolbar */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex gap-2 overflow-x-auto">
                {provinces.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setActiveFilter(p); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] whitespace-nowrap shrink-0 transition-all ${
                      activeFilter === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 w-8"><input type="checkbox" className="rounded" /></th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">#</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">Property</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">Province</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">Size <ChevronsUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">Acq. Value <ChevronsUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">Title</th>
                  <th className="text-left py-3 px-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">Health <ChevronsUpDown className="w-3 h-3" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[14px] text-muted-foreground">
                      No properties match your search.
                    </td>
                  </tr>
                ) : pageRows.map((p, i) => {
                  const TypeIcon = TYPE_ICON[p.type] ?? Map;
                  const h = healthClasses(p.health);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/property/${p.id}`)}
                    >
                      <td className="py-3 px-4"><input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} /></td>
                      <td className="py-3 px-4 text-muted-foreground">{pageStart + i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-foreground">{p.name}</p>
                            <p className="text-[12px] text-muted-foreground">{p.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[12px] ${p.type === "Building" ? "bg-status-warning-bg text-status-warning-text" : "bg-status-info-bg text-status-info-text"}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.province}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[12px] ${statusClasses(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[13px]">{p.size} m<sup>2</sup></td>
                      <td className="py-3 px-4 text-foreground text-[13px] font-medium">{p.buy}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[12px] ${titleClasses(p.title)}`}>{p.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${h.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />
                          <span className={`text-[13px] font-medium ${h.text}`}>{p.health}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-[14px] text-muted-foreground">
                {filtered.length === 0
                  ? "No results"
                  : `Showing ${showingFrom}–${showingTo} of ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={safePage === 1}
                    onClick={() => goToPage(safePage - 1)}
                    className="p-2 rounded hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers().map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-[14px]">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item as number)}
                        className={`w-8 h-8 rounded text-[14px] ${safePage === item ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground"}`}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => goToPage(safePage + 1)}
                    className="p-2 rounded hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend, trendClass, sub }: {
  icon: LucideIcon; label: string; value: string; trend: string; trendClass: string; sub: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[12px] text-muted-foreground font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className="text-[32px] font-bold text-foreground leading-none">{value}</p>
      <div className="flex items-center gap-2">
        <span className={`text-[12px] font-medium ${trendClass}`}>{trend}</span>
        <span className="text-[12px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}
