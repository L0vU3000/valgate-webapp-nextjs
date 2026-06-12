"use client";

import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterLi } from "@/app/(pro)/pro/_components/motion-primitives";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProInspectionRow } from "@/app/(pro)/pro/queries";
import type { InspectionStatus } from "@/lib/data/types/inspection";

// Recent Inspections — the inspection log, newest first (sorted by the
// query layer). Each row shows the inspection type, an outcome pill, the
// issue count, the property + client, and how long ago it happened.

const STATUS_PILL: Record<InspectionStatus, string> = {
  Passed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  Satisfactory:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  Failed:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};

export function InspectionsCard({
  inspections,
}: {
  inspections: ProInspectionRow[];
}) {
  return (
    <WidgetCard title="Recent Inspections">
      {inspections.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No inspections on record.
        </p>
      ) : (
        <ul className="flex flex-col">
          {inspections.map((inspection, index) => (
            <EnterLi
              key={inspection.id}
              index={index}
              className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
            >
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                  {inspection.type}
                </span>
                <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                  {inspection.propertyName} · {inspection.clientName}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_PILL[inspection.status],
                  )}
                >
                  {inspection.status}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {inspection.issues === 0
                    ? "No issues"
                    : `${inspection.issues} ${inspection.issues === 1 ? "issue" : "issues"}`}{" "}
                  · {formatRelativeTime(inspection.inspectedAt)}
                </span>
              </div>
            </EnterLi>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
