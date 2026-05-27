import { useState, useMemo } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "../ui/utils";
import { formatCurrencyFull } from "../../lib/format";
import type { HeatmapUnit, PropertyCluster } from "@/lib/data/derivations/rental";

/* -------------------------------------------------------------------------- */
/*  Re-export types for consumers that imported them from here               */
/* -------------------------------------------------------------------------- */

export type { UnitStatus, HeatmapUnit, PropertyCluster } from "@/lib/data/derivations/rental";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatCurrency = formatCurrencyFull;

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
              {unit.tenant && (
                <div className="mt-0.5 text-[10px] text-slate-300">
                  {unit.tenant}
                </div>
              )}
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
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-amber-400">
              Lease expiring soon
            </div>
          )}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeatmapGrid Component                                                     */
/* -------------------------------------------------------------------------- */

export function HeatmapGrid({ data }: { data: PropertyCluster[] }) {
  const summary = useMemo(() => {
    const all = data.flatMap((c) => c.units);
    return {
      occupied: all.filter((u) => u.status === "occupied").length,
      vacant: all.filter((u) => u.status === "vacant").length,
      expiring: all.filter((u) => u.status === "expiring").length,
    };
  }, [data]);

  return (
    <div
      className="anim-enter-right lg:col-span-4 flex flex-col rounded-lg bg-slate-900 p-5 sm:p-6 shadow-xl"
      style={{ animationDelay: "450ms" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] sm:text-[24px] font-bold text-white">
          Portfolio Occupancy
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

      {/* Suburb-grouped grid */}
      <div className="mt-5 flex flex-col gap-4 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
        {data.map((cluster, ci) => {
          let tileIdx = 0;
          return (
            <div key={cluster.property}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
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
          <span className="text-[11px] font-semibold text-slate-500">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-[2px] border-2 border-dashed border-slate-500" />
          <span className="text-[11px] font-semibold text-slate-500">Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-[2px] bg-amber-500 ring-1 ring-amber-300/50" />
          <span className="text-[11px] font-semibold text-slate-500">Expiring</span>
        </div>
      </div>
    </div>
  );
}
