import { useState, useMemo } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "../ui/utils";
import { formatCurrencyFull } from "../../lib/format";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type UnitStatus = "occupied" | "vacant" | "expiring";

export interface HeatmapUnit {
  id: string;
  name: string;
  status: UnitStatus;
  tenant?: string;
  rent: number;
  leaseEnd?: string;
}

export interface PropertyCluster {
  property: string;
  units: HeatmapUnit[];
}

/* -------------------------------------------------------------------------- */
/*  Static Data                                                               */
/* -------------------------------------------------------------------------- */

export const heatmapData: PropertyCluster[] = [
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatCurrency = formatCurrencyFull;

function heatmapSummary() {
  const all = heatmapData.flatMap((c) => c.units);
  return {
    occupied: all.filter((u) => u.status === "occupied").length,
    vacant: all.filter((u) => u.status === "vacant").length,
    expiring: all.filter((u) => u.status === "expiring").length,
    total: all.length,
  };
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
/*  HeatmapGrid Component                                                     */
/* -------------------------------------------------------------------------- */

export function HeatmapGrid() {
  const summary = useMemo(heatmapSummary, []);

  return (
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
  );
}
