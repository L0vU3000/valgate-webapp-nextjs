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
import {
  type ActivityCategory,
  type ActivityItem,
} from "@/app/(pro)/pro/_data/mock";
import { cn } from "@/components/ui/utils";

const FILTERS = ["All", "Financial", "Maintenance", "Leasing"] as const;
type Filter = (typeof FILTERS)[number];

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
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  maintenance: {
    icon: Wrench,
    bg: "bg-amber-50",
    color: "text-amber-600",
  },
  lease: {
    icon: FileText,
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  client: {
    icon: UserPlus,
    bg: "bg-violet-50",
    color: "text-violet-600",
  },
};

type Props = {
  activity: ActivityItem[];
};

export function ClientActivityFeed({ activity }: Props) {
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
                "h-7 rounded-full px-2.5 text-[11.5px] font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
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
              className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  style.bg,
                )}
              >
                <Icon className={cn("h-4 w-4", style.color)} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] text-slate-900">
                  {item.description}
                </div>
                <div className="truncate text-[11.5px] text-slate-500">
                  {item.assetName}
                </div>
              </div>
              <span className="shrink-0 text-[11.5px] text-slate-400">
                {item.timestamp}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
