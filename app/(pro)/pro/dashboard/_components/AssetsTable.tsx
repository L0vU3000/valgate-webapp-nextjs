"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterTr } from "@/app/(pro)/pro/_components/motion-primitives";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProPropertyRow } from "../../queries";
import type { PropertyStatus } from "@/lib/data/types/property";

// Properties table — left column widget, bottom half.
// One row per property in the book (all clients), with a type pill,
// status pill, live market value, owning client, and last update.
// The search box filters client-side over name / address / client.

const TYPE_PILL: Record<ProPropertyRow["type"], string> = {
  residential:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  commercial:
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  "multi-unit":
    "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
  retail:
    "bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30",
  land: "bg-lime-50 text-lime-700 border border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30",
  industrial:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  construction:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  other:
    "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const STATUS_PILL: Record<PropertyStatus, string> = {
  Rented:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  Vacant:
    "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  "For Sale":
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  Sold: "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  Archived:
    "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Owner-Occupied":
    "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
};

const COLUMNS = [
  { label: "Property", width: "w-[34%]" },
  { label: "Type", width: "w-[12%]" },
  { label: "Client", width: "w-[16%]" },
  { label: "Value", width: "w-[12%]" },
  { label: "Status", width: "w-[14%]" },
  { label: "Updated", width: "w-[12%]" },
] as const;

export function AssetsTable({
  properties,
}: {
  properties: ProPropertyRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Client-side filter over the visible columns.
  const query = search.trim().toLowerCase();
  const visible =
    query === ""
      ? properties
      : properties.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.addressLabel.toLowerCase().includes(query) ||
            p.clientName.toLowerCase().includes(query),
        );

  return (
    <WidgetCard
      title="All Properties"
      headerRight={
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search properties…"
              className="h-8 pl-8 pr-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[12.5px] text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 focus:border-blue-300 dark:focus:border-blue-500 transition-all w-[180px]"
            />
          </div>
          <Link
            href="/add-property"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 text-white text-[12.5px] font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Property
          </Link>
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
                    "py-2 pr-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
                    col.width,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400"
                >
                  No properties match your search.
                </td>
              </tr>
            )}
            {visible.map((property, index) => (
              <EnterTr
                key={property.id}
                index={index}
                onClick={() => router.push(`/property/${property.id}`)}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/70 transition-colors cursor-pointer"
              >
                <td className="py-3 pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {property.name}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {property.addressLabel}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize",
                      TYPE_PILL[property.type],
                    )}
                  >
                    {property.type}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-600 dark:text-slate-300">
                  {property.clientName}
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {property.valueFormatted}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                      STATUS_PILL[property.status],
                    )}
                  >
                    {property.status}
                  </span>
                </td>
                <td className="py-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(property.updatedAt)}
                </td>
              </EnterTr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
