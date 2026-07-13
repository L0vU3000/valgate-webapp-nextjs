"use client";

// Read-only per-property activity panel (Phase 5). Presentational only: it renders the
// rows fetched server-side by getOverviewPageData → listActivities(ctx, propertyId) and
// passed down as a prop — there is no client fetch here. Newest first, grouped by day.

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import type { Activity } from "@/lib/data/types/activity";
import { formatRelativeTime } from "@/lib/format";

// Midnight (local) of the day a timestamp falls on — the bucket key for day grouping.
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Human day header: Today / Yesterday / an absolute date for anything older.
function dayLabel(dayStart: number, todayStart: number): string {
  const oneDay = 86_400_000;
  if (dayStart === todayStart) return "Today";
  if (dayStart === todayStart - oneDay) return "Yesterday";
  return new Date(dayStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type DayGroup = { key: number; label: string; items: Activity[] };

// Buckets already-newest-first activities into day groups while preserving order both
// within and across groups (the first group is the most recent day).
function groupByDay(activities: Activity[]): DayGroup[] {
  const todayStart = startOfDay(Date.now());
  const groups: DayGroup[] = [];
  const byKey = new Map<number, DayGroup>();
  for (const a of activities) {
    const key = startOfDay(a.createdAt);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: dayLabel(key, todayStart), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(a);
  }
  return groups;
}

export function PropertyActivityPanel({ activities }: { activities: Activity[] }) {
  // Day grouping and relative times depend on the local clock/timezone, which
  // differ between the server (UTC on Vercel) and the browser. Rendering them on
  // the server would cause a hydration mismatch (wrong day bucket / "Today" vs
  // "Yesterday" flip), so we compute them only after mount. The empty state has
  // no time content, so it stays server-rendered for a flash-free first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const groups = mounted ? groupByDay(activities) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
        <h3 className="text-val-heading text-[15px] font-semibold">Activity</h3>
        {activities.length > 0 && (
          <span className="text-[11px] text-slate-400">Latest {activities.length}</span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
          <ClipboardList className="w-6 h-6 text-slate-300" />
          <p className="text-[13px] font-medium text-slate-500">No activity yet.</p>
          <p className="text-[12px] text-slate-400 leading-snug">
            Updates like editing the property, adding a valuation, or uploading a document
            will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col pb-2">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col">
              <div className="px-5 pt-4 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  {group.label}
                </p>
              </div>
              <ul className="flex flex-col">
                {group.items.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span
                      className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug text-val-heading">
                        {event.description}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatRelativeTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
