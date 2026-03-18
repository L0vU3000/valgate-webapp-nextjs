import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, MoreVertical, Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const provinces = [
  "All", "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang",
  "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep", "Koh Kong",
  "Kratie", "Mondulkiri",
];

const properties = [
  { id: 1, name: "Land near river", code: "PP00016 PH", type: "House", typeColor: "#0284C7", province: "Phnom Penh", status: "Rented", statusColor: "#059669", size: "850", buy: "$1,278,000", title: "Hard title", titleColor: "#2563EB", health: 100, healthColor: "#059669" },
  { id: 2, name: "Siem Reap Land Plot", code: "SR00015 Land", type: "Land", typeColor: "#0284C7", province: "Siem Reap", status: "Vacant", statusColor: "#F59E0B", size: "1,200", buy: "$456,000", title: "Soft title", titleColor: "#F59E0B", health: 28, healthColor: "#E11D48" },
  { id: 3, name: "Kampong Chhnang Prop.", code: "KPC00013", type: "Land", typeColor: "#0284C7", province: "Kampong Chhnang", status: "Vacant", statusColor: "#F59E0B", size: "2,500", buy: "$125,000", title: "Hard title", titleColor: "#2563EB", health: 43, healthColor: "#F59E0B" },
  { id: 4, name: "Angkor Property", code: "SR00007 Land", type: "Land", typeColor: "#0284C7", province: "Siem Reap", status: "Vacant", statusColor: "#F59E0B", size: "900", buy: "$234,000", title: "Soft title", titleColor: "#F59E0B", health: 67, healthColor: "#F59E0B" },
  { id: 5, name: "Temple View Land", code: "SR00006 Land", type: "Land", typeColor: "#0284C7", province: "Siem Reap", status: "Vacant", statusColor: "#F59E0B", size: "1,100", buy: "$345,000", title: "Hard title", titleColor: "#2563EB", health: 82, healthColor: "#059669" },
  { id: 6, name: "Central Siem Reap", code: "SR00005 Land", type: "Land", typeColor: "#0284C7", province: "Siem Reap", status: "Rented", statusColor: "#059669", size: "750", buy: "$567,000", title: "Hard title", titleColor: "#2563EB", health: 95, healthColor: "#059669" },
  { id: 7, name: "Commercial Building", code: "SR00004 Building", type: "Building", typeColor: "#F59E0B", province: "Siem Reap", status: "Rented", statusColor: "#059669", size: "450", buy: "$890,000", title: "Hard title", titleColor: "#2563EB", health: 88, healthColor: "#059669" },
  { id: 8, name: "Prey Veng Agricultural", code: "PV00002 Land", type: "Land", typeColor: "#0284C7", province: "Prey Veng", status: "Vacant", statusColor: "#F59E0B", size: "5,000", buy: "$180,000", title: "Soft title", titleColor: "#F59E0B", health: 34, healthColor: "#E11D48" },
  { id: 9, name: "Riverside Plot", code: "PV00001 Land", type: "Land", typeColor: "#0284C7", province: "Prey Veng", status: "Vacant", statusColor: "#F59E0B", size: "3,200", buy: "$156,000", title: "\u2014", titleColor: "#515D66", health: 22, healthColor: "#E11D48" },
  { id: 10, name: "Phnom Penh Urban", code: "PP00033 Land", type: "Land", typeColor: "#0284C7", province: "Phnom Penh", status: "Vacant", statusColor: "#F59E0B", size: "600", buy: "$980,000", title: "Hard title", titleColor: "#2563EB", health: 75, healthColor: "#F59E0B" },
  { id: 11, name: "BKK1 Land", code: "PP00032 Land", type: "Land", typeColor: "#0284C7", province: "Phnom Penh", status: "Rented", statusColor: "#059669", size: "480", buy: "$1,450,000", title: "Hard title", titleColor: "#2563EB", health: 100, healthColor: "#059669" },
  { id: 12, name: "Property 12", code: "GEN00012", type: "Building", typeColor: "#F59E0B", province: "Prey Veng", status: "Vacant", statusColor: "#F59E0B", size: "4,325", buy: "$1,232,356", title: "\u2014", titleColor: "#515D66", health: 12, healthColor: "#E11D48" },
  { id: 13, name: "Property 13", code: "GEN00013", type: "House", typeColor: "#0284C7", province: "Kampot", status: "Vacant", statusColor: "#F59E0B", size: "3,806", buy: "$356,146", title: "Soft title", titleColor: "#F59E0B", health: 19, healthColor: "#E11D48" },
  { id: 14, name: "Property 14", code: "GEN00014", type: "House", typeColor: "#0284C7", province: "Prey Veng", status: "Rented", statusColor: "#059669", size: "4,119", buy: "$405,484", title: "Hard title", titleColor: "#2563EB", health: 10, healthColor: "#E11D48" },
  { id: 15, name: "Property 15", code: "GEN00015", type: "Land", typeColor: "#0284C7", province: "Phnom Penh", status: "Rented", statusColor: "#059669", size: "2,256", buy: "$955,491", title: "Soft title", titleColor: "#F59E0B", health: 33, healthColor: "#E11D48" },
  { id: 16, name: "Property 16", code: "GEN00016", type: "Land", typeColor: "#0284C7", province: "Phnom Penh", status: "Rented", statusColor: "#059669", size: "4,917", buy: "$1,179,626", title: "\u2014", titleColor: "#515D66", health: 24, healthColor: "#E11D48" },
];

export function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">
      {/* Header */}
      <div className="bg-card px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-[20px] text-foreground font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>Portfolio</h1>
            <p className="text-[14px] text-muted-foreground">Explore anything in your property database</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2 mt-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 pt-6 pb-4">
        <div className="max-w-[1160px] mx-auto">
        <div className="grid grid-cols-3 gap-6">
          <KpiCard emoji="🏠" label="Total Property" value="1,500" trend="+20%" trendColor="#059669" sub="Last month total 1,050" />
          <KpiCard emoji="📊" label="Number of Sales" value="320" trend="+20%" trendColor="#059669" sub="Last month total 950" />
          <KpiCard emoji="💰" label="Total Sales" value="$150k" trend="+20%" trendColor="#059669" sub="Last month total 1,000" />
        </div>
        </div>
      </div>

      {/* Province filter */}
      <div className="px-6 pb-4">
        <div className="max-w-[1160px] mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {provinces.map((p) => (
            <button
              key={p}
              onClick={() => setActiveFilter(p)}
              className={`px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                activeFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-[#F59E0B] text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="max-w-[1160px] mx-auto">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 w-8"><input type="checkbox" className="rounded" /></th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">#</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Property</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Type</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Province</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Status</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Size ↕</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Buy ↕</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Title</th>
                <th className="text-left py-3 px-4 text-[12px] text-muted-foreground tracking-[0.012px]">Health ↕</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/property/${p.id}`)}
                >
                  <td className="py-3 px-4"><input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} /></td>
                  <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
                      <div>
                        <p className="text-foreground">{p.name}</p>
                        <p className="text-[12px] text-muted-foreground">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-lg text-[12px]" style={{ backgroundColor: "#ECFDF5", color: p.typeColor }}>
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{p.province}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-lg text-[12px] text-white" style={{ backgroundColor: p.statusColor }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{p.size} m<sup>2</sup></td>
                  <td className="py-3 px-4 text-foreground">{p.buy}</td>
                  <td className="py-3 px-4">
                    <span className="text-[12px]" style={{ color: p.titleColor }}>{p.title}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.healthColor }} />
                      <span className="text-[14px]" style={{ color: p.healthColor }}>{p.health}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[14px] text-muted-foreground">Showing 1-25 of 1,500 results</span>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded hover:bg-accent/50"><ChevronLeft className="w-4 h-4" /></button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded text-[14px] ${currentPage === p ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground"}`}
                >
                  {p}
                </button>
              ))}
              <span className="text-muted-foreground px-1">...</span>
              <button onClick={() => setCurrentPage(60)} className="w-8 h-8 rounded text-[14px] hover:bg-accent/50 text-foreground">60</button>
              <button className="p-2 rounded hover:bg-accent/50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ emoji, label, value, trend, trendColor, sub }: {
  emoji: string; label: string; value: string; trend: string; trendColor: string; sub: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col justify-between h-[104px]">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{emoji}</span>
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>{value}</p>
      <div className="flex items-center gap-2">
        <span className="text-[12px]" style={{ color: trendColor }}>↑ {trend}</span>
        <span className="text-[12px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}