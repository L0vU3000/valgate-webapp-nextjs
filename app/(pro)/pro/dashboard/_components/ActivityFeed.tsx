"use client";

import { useState } from "react";
import {
  DollarSign,
  Wrench,
  FileText,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { mockActivity, type ActivityCategory } from "../_data/mock";
import { cn } from "@/components/ui/utils";

// Activity Feed — bottom row, right half.
// Pill-tab filter (All / Financial / Maintenance / Leasing) above a list of
// activity items, each with a category icon, description, sub-line, and
// relative timestamp.

const FILTERS = ["All", "Financial", "Maintenance", "Leasing"] as const;
type Filter = (typeof FILTERS)[number];

// Map each filter tab to the categories it includes. "All" matches everything.
const FILTER_TO_CATEGORIES: Record<Filter, ActivityCategory[] | "all"> = {
  All: "all",
  Financial: ["payment"],
  Maintenance: ["maintenance"],
  Leasing: ["lease", "client"],
};

const CATEGORY_STYLE: Record<
  ActivityCategory,
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
  client: {
    icon: UserPlus,
    bg: "bg-violet-50 dark:bg-violet-500/15",
    color: "text-violet-600 dark:text-violet-400",
  },
};

export function ActivityFeed() {
  const [filter, setFilter] = useState<Filter>("All");

  const filterValue = FILTER_TO_CATEGORIES[filter];
  const visibleItems =
    filterValue === "all"
      ? mockActivity
      : mockActivity.filter((item) => filterValue.includes(item.category));

  return (
    <WidgetCard
      title="Activity"
      headerRight={
        <a
          href="#"
          className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          View All
        </a>
      }
    >
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
                  {item.clientName} · {item.assetName}
                </div>
              </div>
              <span className="text-[11.5px] text-slate-400 dark:text-slate-500 shrink-0">
                {item.timestamp}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
