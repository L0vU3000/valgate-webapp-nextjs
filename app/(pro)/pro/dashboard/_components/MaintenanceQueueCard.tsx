"use client";

import { Plus } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  mockMaintenance,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "../_data/mock";
import { cn } from "@/components/ui/utils";

// Maintenance Queue — right column, bottom widget.
// Lists the most urgent open work orders with a priority dot, asset name,
// client name, status pill, and assigned vendor (or "Unassigned").

const PRIORITY_DOT: Record<WorkOrderPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-slate-400 dark:bg-slate-500",
};

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  Open: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  "In Progress":
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
};

export function MaintenanceQueueCard() {
  return (
    <WidgetCard
      title="Open Work Orders"
      headerRight={
        <>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium">
            12
          </span>
          <a
            href="#"
            className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View All
          </a>
        </>
      }
    >
      <ul className="flex flex-col">
        {mockMaintenance.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                aria-label={PRIORITY_LABEL[item.priority]}
                className={cn(
                  "mt-1.5 inline-block w-2 h-2 rounded-full shrink-0",
                  PRIORITY_DOT[item.priority],
                )}
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.assetName}
                </span>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                  {item.clientName} ·{" "}
                  {item.vendor ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.vendor}
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
              {item.status}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Work Order
      </button>
    </WidgetCard>
  );
}
