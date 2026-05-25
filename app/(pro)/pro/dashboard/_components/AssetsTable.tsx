"use client";

import { Plus, Search, ChevronDown, ArrowUpDown } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { mockAssets, type AssetType, type AssetStatus } from "../_data/mock";
import { cn } from "@/components/ui/utils";

// Assets table — left column widget, bottom half.
// Shows every asset across every client with a colour-coded type pill,
// colour-coded status pill, value and last-updated timestamp.

const TYPE_PILL: Record<AssetType, string> = {
  property:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  vehicle:
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  equipment:
    "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
};

const TYPE_LABEL: Record<AssetType, string> = {
  property: "Property",
  vehicle: "Vehicle",
  equipment: "Equipment",
};

const STATUS_PILL: Record<AssetStatus, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  Vacant:
    "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  "Under Maintenance":
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  "Pending Sale":
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  "Non-Performing":
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};

const COLUMNS = [
  { label: "Asset", width: "w-[34%]" },
  { label: "Type", width: "w-[12%]" },
  { label: "Client", width: "w-[16%]" },
  { label: "Value", width: "w-[12%]" },
  { label: "Status", width: "w-[14%]" },
  { label: "Updated", width: "w-[12%]" },
] as const;

export function AssetsTable() {
  return (
    <WidgetCard
      title="All Assets"
      headerRight={
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search assets…"
              className="h-8 pl-8 pr-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[12.5px] text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 focus:border-blue-300 dark:focus:border-blue-500 transition-all w-[180px]"
            />
          </div>
          <FilterButton label="Type" />
          <FilterButton label="Client" />
          <FilterButton label="Status" />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 text-white text-[12.5px] font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
        </>
      }
    >
      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    "py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
                    col.width,
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {col.label}
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockAssets.map((asset) => (
              <tr
                key={asset.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td className="py-3 pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {asset.name}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {asset.addressOrDescription}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                      TYPE_PILL[asset.type],
                    )}
                  >
                    {TYPE_LABEL[asset.type]}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-600 dark:text-slate-300">
                  {asset.clientName}
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {asset.currentValue}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                      STATUS_PILL[asset.status],
                    )}
                  >
                    {asset.status}
                  </span>
                </td>
                <td className="py-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {asset.lastUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}

// Outlined dropdown-style filter button used in the assets table header.
function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-8 inline-flex items-center gap-1 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-[12.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
    >
      {label}
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
    </button>
  );
}
