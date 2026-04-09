import { X } from "lucide-react";

interface PropertyFiltersProps {
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  provinceFilter: string;
  setProvinceFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  setCurrentPage: (v: number) => void;
  mounted: boolean;
  provinces: string[];
}

export function PropertyFilters({
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  provinceFilter,
  setProvinceFilter,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  mounted,
  provinces,
}: PropertyFiltersProps) {
  function clearAll() {
    setTypeFilter("Property Type");
    setStatusFilter("Status");
    setProvinceFilter("All");
    setSearchQuery("");
    setCurrentPage(1);
  }

  return (
    <>
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
          className="flex gap-1.5 overflow-x-auto pb-1.5 px-8 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-val-bg-tint [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[--val-primary-dark]/25 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[--val-primary-dark]/50"
        >
          {provinces.map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={provinceFilter === p}
              onClick={() => { setProvinceFilter(p); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                provinceFilter === p
                  ? "bg-[--val-primary-dark] text-white scale-[1.03]"
                  : "bg-val-bg-tint text-slate-500 hover:bg-blue-100 hover:text-slate-700"
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
          <div className="bg-val-bg-tint p-1 rounded flex">
            {["All", "House", "Building", "Land"].map((t) => {
              const isActive = t === "All" ? typeFilter === "Property Type" : typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t === "All" ? "Property Type" : t); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 text-[12px] font-semibold rounded transition-all duration-150 ${
                    isActive
                      ? "bg-white text-[--val-primary-dark] shadow-sm"
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
          <div className="bg-val-bg-tint p-1 rounded flex">
            {["All", "Rented", "Vacant"].map((s) => {
              const isActive = s === "All" ? statusFilter === "Status" : statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s === "All" ? "Status" : s); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 text-[12px] font-semibold rounded transition-all duration-150 ${
                    isActive
                      ? "bg-white text-[--val-primary-dark] shadow-sm"
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
            onClick={clearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold text-[--val-primary-dark] bg-val-bg-tint hover:bg-blue-100 transition-all duration-150 active:scale-[0.97]"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
    </>
  );
}
