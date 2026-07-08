"use client";

import { useState } from "react";
import {
  DollarSign,
  Wrench,
  FileText,
  PencilLine,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProActivityEvent } from "../../queries";

// Activity Feed. Real events derived from payments, work orders and leases, and
// (on the client Activity tab) merged with the real audit log, newest first.
// The pill tabs filter by category.
//
// Two modes, both driven by optional props so existing callers are unchanged:
//   - flat (default)        — the dashboard + client Overview snapshot.
//   - grouped + initialCount — the client Activity tab: day headers + Load more.

const FILTERS = ["All", "Financial", "Maintenance", "Leasing", "Updates"] as const;
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
  Updates: ["update"],
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
  update: {
    // Neutral slate — audit "who-changed-what" events don't compete with the
    // financial/maintenance/leasing colors (blue stays precious).
    icon: PencilLine,
    bg: "bg-slate-100 dark:bg-slate-500/15",
    color: "text-slate-600 dark:text-slate-400",
  },
};

// Day buckets for grouped mode, computed relative to now (client-side render).
const DAY_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;
type DayBucket = (typeof DAY_ORDER)[number];

function dayBucketFor(timestamp: number): DayBucket {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (timestamp >= startOfToday) return "Today";
  if (timestamp >= startOfToday - oneDay) return "Yesterday";
  if (timestamp >= startOfToday - 6 * oneDay) return "This week";
  return "Earlier";
}

// One activity row. Shared by flat and grouped modes so they can't drift.
function ActivityRow({ item }: { item: ProActivityEvent }) {
  const style = CATEGORY_STYLE[item.category];
  const Icon = style.icon;
  const meta = [item.clientName, item.propertyName].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5",
          style.bg,
        )}
      >
        <Icon className={cn("w-4 h-4", style.color)} />
      </span>
      <div className="flex-1 min-w-0 leading-tight">
        {item.actor && (
          <div className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
            {item.actor}
          </div>
        )}
        <div className="text-[13px] text-slate-900 dark:text-slate-100 truncate">
          {item.description}
        </div>
        {meta && (
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
            {meta}
          </div>
        )}
      </div>
      <span className="text-[11.5px] text-slate-400 dark:text-slate-500 shrink-0">
        {formatRelativeTime(item.timestamp)}
      </span>
    </li>
  );
}

export function ActivityFeed({
  activity,
  grouped = false,
  initialCount,
}: {
  activity: ProActivityEvent[];
  // Day-group the rows (Today / Yesterday / This week / Earlier).
  grouped?: boolean;
  // Show only the first N rows with a "Load more" reveal. Omit to show all.
  initialCount?: number;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [visibleCount, setVisibleCount] = useState(
    initialCount ?? activity.length,
  );

  const filterValue = FILTER_TO_CATEGORIES[filter];
  const filteredItems =
    filterValue === "all"
      ? activity
      : activity.filter((item) => filterValue.includes(item.category));

  // Load-more slice (no-op when initialCount is omitted → shows everything).
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleItems.length < filteredItems.length;

  if (activity.length === 0) {
    return (
      <WidgetCard title="Activity">
        <EmptyState
          icon={<ActivityIcon className="h-6 w-6" />}
          title="No activity yet"
          description="Payments, work orders, lease changes, and edits you make will land here automatically as you manage this portfolio."
        />
      </WidgetCard>
    );
  }

  // Group the visible slice by day bucket, preserving newest-first order.
  const groups: Array<{ bucket: DayBucket; items: ProActivityEvent[] }> = [];
  if (grouped) {
    for (const bucket of DAY_ORDER) {
      const items = visibleItems.filter(
        (item) => dayBucketFor(item.timestamp) === bucket,
      );
      if (items.length > 0) groups.push({ bucket, items });
    }
  }

  return (
    <WidgetCard title="Activity">
      <div className="flex items-center gap-1 flex-wrap">
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

      {visibleItems.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No activity in this category yet.
        </p>
      ) : grouped ? (
        <div className="flex flex-col gap-1">
          {groups.map((group) => (
            <div key={group.bucket}>
              <div className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group.bucket}
              </div>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col">
          {visibleItems.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {initialCount !== undefined && hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + (initialCount || 20))}
          className="mt-3 w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Load more
        </button>
      )}
    </WidgetCard>
  );
}
