import { cn } from "../ui/utils";
import { TYPE_ICON, TYPE_COLOR } from "@/lib/property-helpers";
import type { LeaseTableRow } from "@/lib/data/derivations/comparable";

/* -------------------------------------------------------------------------- */
/*  LeaseTable Component                                                      */
/* -------------------------------------------------------------------------- */

export function LeaseTable({ data }: { data: LeaseTableRow[] }) {
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
      {data.map((row, i) => (
        <div
          key={row.propertyId}
          className={cn(
            "anim-enter flex items-center transition-colors duration-150 hover:bg-slate-50/50",
            i > 0 && "border-t border-slate-100"
          )}
          style={{ animationDelay: `${500 + i * 80}ms` }}
        >
          <div className="flex w-[33%] items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 min-w-0">
            {(() => {
              const Icon = TYPE_ICON[row.propertyType] ?? TYPE_ICON["other"];
              const colorClass = TYPE_COLOR[row.propertyType] ?? TYPE_COLOR["other"];
              return (
                <div
                  className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded flex items-center justify-center transition-transform duration-200",
                    colorClass
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              );
            })()}
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
