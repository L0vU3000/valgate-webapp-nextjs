"use client";

import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/utils";
import type { ProWorkOrderRow } from "../../queries";
import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/lib/data/types/maintenance-item";

// Maintenance Queue — right column, bottom widget.
// The unresolved work orders (real MaintenanceItem records, already
// sorted by severity in the query layer). Shows the top of the queue
// with severity dot, property, client and vendor assignment.

const SEVERITY_DOT: Record<MaintenanceSeverity, string> = {
  Emergency: "bg-red-500",
  Urgent: "bg-amber-500",
  Standard: "bg-blue-500",
};

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  Open: "Open",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Cancelled: "Cancelled",
};

const STATUS_PILL: Record<MaintenanceStatus, string> = {
  Open: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  InProgress:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  Resolved:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  Cancelled:
    "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600/40",
};

const VISIBLE_LIMIT = 6;

export function MaintenanceQueueCard({
  queue,
}: {
  queue: ProWorkOrderRow[];
}) {
  const visible = queue.slice(0, VISIBLE_LIMIT);

  return (
    <WidgetCard
      title="Open Work Orders"
      headerRight={
        <>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium">
            {queue.length}
          </span>
          <Link
            href="/pro/work-orders"
            className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View All
          </Link>
        </>
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title="No open work orders"
          description="Everything's running smoothly. Log a repair or vendor request the moment something needs attention."
          action={
            <Link
              href="/pro/work-orders"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Work Order
            </Link>
          }
        />
      ) : (
        <>
      <ul className="flex flex-col">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                aria-label={item.severity}
                className={cn(
                  "mt-1.5 inline-block w-2 h-2 rounded-full shrink-0",
                  SEVERITY_DOT[item.severity],
                )}
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.title}
                </span>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                  {item.propertyName} · {item.clientName} ·{" "}
                  {item.vendorName ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.vendorName}
                    </span>
                  ) : (
                    <span className="italic text-slate-400 dark:text-slate-500">
                      Unassigned
                    </span>
                  )}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                STATUS_PILL[item.status],
              )}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/pro/work-orders"
        className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Work Order
      </Link>
        </>
      )}
    </WidgetCard>
  );
}
