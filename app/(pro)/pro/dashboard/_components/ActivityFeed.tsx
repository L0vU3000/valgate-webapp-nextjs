"use client";

import { useState } from "react";
import {
  DollarSign,
  Wrench,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProActivityEvent } from "../../queries";

// Activity Feed — bottom row, right half.
// Real events derived from payments, work orders and leases in the
// query layer, newest first. The pill tabs filter by category.

const FILTERS = ["All", "Financial", "Maintenance", "Leasing"] as const;
type Filter = (typeof FILTERS)[number];

// Map each filter tab to the categories it includes.
const FILTER_TO_CATEGORIES: Record<
  Filter,
  Array<ProActivityEvent["category"]> | "all"
> = {
  All: "all",
  Financial: ["payment"],
  Maintenance: ["maintenance"],
  Leasing: ["lease"],
};

const CATEGORY_STYLE: Record<
  ProActivityEvent["category"],
  { icon: LucideIcon; bg: string; color: string }
> = {
  payment: {
    icon: DollarSign,
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  maintenance: {
    icon: Wrench,
    bg: "bg-amber-50 dark:bg-amber-500/15",
    color: "text-amber-600 dark:text-amber-400",
  },
  lease: {
    icon: FileText,
    bg: "bg-blue-50 dark:bg-blue-500/15",
    color: "text-blue-600 dark:text-blue-400",
  },
};

export function ActivityFeed({
  activity,
}: {
  activity: ProActivityEvent[];
}) {
  const [filter, setFilter] = useState<Filter>("All");

  const filterValue = FILTER_TO_CATEGORIES[filter];
  const visibleItems =
    filterValue === "all"
      ? activity
      : activity.filter((item) => filterValue.includes(item.category));

  return (
    <WidgetCard title="Activity">
      <div className="flex items-center gap-1">
        {FILTERS.map((option) => {
          const isActive = option === filter;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                "h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col">
        {visibleItems.length === 0 && (
          <li className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
            No activity in this category yet.
          </li>
        )}
        {visibleItems.map((item) => {
          const style = CATEGORY_STYLE[item.category];
          const Icon = style.icon;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                  style.bg,
                )}
              >
                <Icon className={cn("w-4 h-4", style.color)} />
              </span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-[13px] text-slate-900 dark:text-slate-100 truncate">
                  {item.description}
                </div>
                <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                  {item.clientName} · {item.propertyName}
                </div>
              </div>
              <span className="text-[11.5px] text-slate-400 dark:text-slate-500 shrink-0">
                {formatRelativeTime(item.timestamp)}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
