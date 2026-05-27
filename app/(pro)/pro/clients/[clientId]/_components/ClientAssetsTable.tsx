"use client";

import { Plus, Search, ChevronDown, ArrowUpDown } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  type AssetType,
  type AssetStatus,
  type ClientAsset,
} from "@/app/(pro)/pro/_data/mock";
import { cn } from "@/components/ui/utils";

const TYPE_PILL: Record<AssetType, string> = {
  property: "bg-blue-50 text-blue-700 border border-blue-200",
  vehicle: "bg-violet-50 text-violet-700 border border-violet-200",
  equipment: "bg-teal-50 text-teal-700 border border-teal-200",
};

const TYPE_LABEL: Record<AssetType, string> = {
  property: "Property",
  vehicle: "Vehicle",
  equipment: "Equipment",
};

const STATUS_PILL: Record<AssetStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Vacant: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Under Maintenance": "bg-amber-50 text-amber-700 border border-amber-200",
  "Pending Sale": "bg-blue-50 text-blue-700 border border-blue-200",
  "Non-Performing": "bg-red-50 text-red-700 border border-red-200",
};

const COLUMNS = [
  { label: "Asset", width: "w-[30%]" },
  { label: "Type", width: "w-[12%]" },
  { label: "Value", width: "w-[14%]" },
  { label: "Status", width: "w-[14%]" },
  { label: "Occupancy", width: "w-[16%]" },
  { label: "Updated", width: "w-[14%]" },
] as const;

type Props = {
  assets: ClientAsset[];
};

export function ClientAssetsTable({ assets }: Props) {
  return (
    <WidgetCard
      title="Assets"
      headerRight={
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets…"
              className="h-8 w-[180px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <FilterButton label="Type" />
          <FilterButton label="Status" />
          <FilterButton label="Location" />
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12.5px] font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Asset
          </button>
        </>
      }
    >
      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    "py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500",
                    col.width,
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-slate-700"
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
              >
                <td className="py-3 pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900">
                      {asset.name}
                    </span>
                    <span className="text-[11.5px] text-slate-500">
                      {asset.addressOrDescription}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      TYPE_PILL[asset.type],
                    )}
                  >
                    {TYPE_LABEL[asset.type]}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium tabular-nums text-slate-900">
                  {asset.currentValue}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      STATUS_PILL[asset.status],
                    )}
                  >
                    {asset.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12.5px] text-slate-600">
                  {asset.occupancy}
                </td>
                <td className="py-3 text-[12px] text-slate-500">
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

function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
    </button>
  );
}
