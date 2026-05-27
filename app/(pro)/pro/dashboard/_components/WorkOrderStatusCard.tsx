"use client";

import { ArrowRight, Plus } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { StatusDot } from "@/app/(pro)/pro/_components/StatusDot";
import { mockWorkOrderStatus } from "../_data/mock";

// Work Order Status — right column, top widget.
// Clean status-summary table (label + count + dot) plus a "Create Work Order"
// outlined CTA and a "View All Work Orders" text link at the bottom.

export function WorkOrderStatusCard() {
  const total = mockWorkOrderStatus.reduce((sum, row) => sum + row.count, 0);

  return (
    <WidgetCard
      title="Work Order Status"
      headerRight={
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium">
          {total} total
        </span>
      }
    >
      <ul className="flex flex-col">
        {mockWorkOrderStatus.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <span className="inline-flex items-center gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
              <StatusDot severity={row.severity} />
              {row.label}
            </span>
            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 inline-flex items-center justify-center gap-1.5 h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Work Order
      </button>
      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        View All Work Orders
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </WidgetCard>
  );
}
