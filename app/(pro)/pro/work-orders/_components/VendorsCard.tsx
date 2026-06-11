"use client";

import { Star } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { cn } from "@/components/ui/utils";
import type { WorkOrdersPageData } from "@/app/(pro)/pro/queries";

// Vendor directory side card — the trade Professionals (Maintenance,
// Electrician, Plumber, Inspector) available for dispatch.

export function VendorsCard({
  vendors,
}: {
  vendors: WorkOrdersPageData["vendors"];
}) {
  return (
    <WidgetCard
      title="Vendors"
      headerRight={
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {vendors.length}
        </span>
      }
    >
      <ul className="flex flex-col">
        {vendors.length === 0 && (
          <li className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
            No trade professionals in the directory yet.
          </li>
        )}
        {vendors.map((vendor) => (
          <li
            key={vendor.id}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"
          >
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                {vendor.name}
              </span>
              <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                {vendor.category} · {vendor.company}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 dark:text-slate-300">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {vendor.rating.toFixed(1)}
              </span>
              <span
                aria-label={vendor.available ? "Available" : "Unavailable"}
                title={vendor.available ? "Available" : "Unavailable"}
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  vendor.available
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              />
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
