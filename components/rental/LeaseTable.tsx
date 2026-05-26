import { cn } from "../ui/utils";

/* -------------------------------------------------------------------------- */
/*  Static Data                                                               */
/* -------------------------------------------------------------------------- */

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
/*  LeaseTable Component                                                      */
/* -------------------------------------------------------------------------- */

export function LeaseTable() {
  return (
    <div
      className="anim-enter lg:col-span-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      style={{ animationDelay: "400ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-5">
        <h2 className="text-[18px] sm:text-[24px] font-bold text-val-heading">
          Property Ranking
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          By Yield
        </span>
      </div>

      {/* Table header — paddings shrink on mobile so the four columns fit
          within a 484px viewport without horizontal overflow. */}
      <div className="flex bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
        <div className="w-[33%] px-3 sm:px-6 py-3">Property</div>
        <div className="w-[20%] px-3 sm:px-6 py-3">NOI</div>
        <div className="w-[22%] px-3 sm:px-6 py-3">Rent</div>
        <div className="w-[25%] px-3 sm:px-6 py-3">Index</div>
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
          <div className="flex w-[33%] items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 min-w-0">
            <div
              className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded transition-transform duration-200 group-hover:scale-105",
                row.img
              )}
            />
            <div className="min-w-0">
              <p className="text-[14px] sm:text-[15px] font-semibold text-val-heading truncate">
                {row.name}
              </p>
              <p className="text-[12px] text-slate-400 truncate">{row.location}</p>
            </div>
          </div>
          <div className="w-[20%] px-3 sm:px-6 py-3 sm:py-4 text-[14px] sm:text-[15px] font-semibold text-slate-700 tabular-nums truncate">
            {row.noi}
          </div>
          <div className="w-[22%] px-3 sm:px-6 py-3 sm:py-4 text-[14px] sm:text-[15px] text-slate-600 tabular-nums truncate">
            {row.rent}
          </div>
          <div className="w-[25%] px-3 sm:px-6 py-3 sm:py-4">
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]",
                row.indexColor
              )}
            >
              {row.index}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
