"use client";

import { Plus } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  type MaintenanceItem,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/app/(pro)/pro/_data/mock";
import { cn } from "@/components/ui/utils";

const PRIORITY_DOT: Record<WorkOrderPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-slate-400",
};

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const STATUS_PILL: Record<WorkOrderStatus | "Scheduled", string> = {
  Open: "bg-red-50 text-red-700 border border-red-200",
  "In Progress": "bg-amber-50 text-amber-700 border border-amber-200",
  Scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
};

type WorkOrderRow = MaintenanceItem & {
  title: string;
  assetLabel: string;
  displayStatus: WorkOrderStatus | "Scheduled";
};

type Props = {
  workOrders: MaintenanceItem[];
};

export function ClientWorkOrdersCard({ workOrders }: Props) {
  const rows: WorkOrderRow[] = workOrders.map((item, index) => ({
    ...item,
    title: item.assetName,
    assetLabel: item.clientName,
    displayStatus:
      index === 2 ? "Scheduled" : item.status,
  }));

  return (
    <WidgetCard
      title="Open Work Orders"
      headerRight={
        <>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-600">
            {workOrders.length}
          </span>
          <a
            href="#"
            className="text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
          >
            View All
          </a>
        </>
      }
    >
      <ul className="flex flex-col">
        {rows.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                aria-label={PRIORITY_LABEL[item.priority]}
                className={cn(
                  "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                  PRIORITY_DOT[item.priority],
                )}
              />
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-slate-900">
                  {PRIORITY_LABEL[item.priority]} — {item.title}
                </span>
                <span className="block truncate text-[11.5px] text-slate-500">
                  {item.assetLabel} ·{" "}
                  {item.vendor ? (
                    item.vendor
                  ) : (
                    <span className="italic text-slate-400">Unassigned</span>
                  )}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                STATUS_PILL[item.displayStatus],
              )}
            >
              {item.displayStatus}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Create Work Order
      </button>
    </WidgetCard>
  );
}
