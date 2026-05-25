"use client";

import { ArrowUpDown } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { mockCompliance, type ComplianceStatus } from "../_data/mock";
import { cn } from "@/components/ui/utils";

// Compliance & Deadlines — bottom row, left half.
// Sorted by due date ascending. Item name + asset on the left, client chip,
// due date, and colour-coded status badge.

const STATUS_PILL: Record<ComplianceStatus, string> = {
  "On Track":
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  "Due Soon":
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  Overdue:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};

const COLUMNS = [
  { label: "Item", width: "w-[42%]" },
  { label: "Client", width: "w-[18%]" },
  { label: "Due", width: "w-[20%]" },
  { label: "Status", width: "w-[20%]" },
] as const;

export function ComplianceTable() {
  return (
    <WidgetCard
      title="Compliance & Deadlines"
      headerRight={
        <a
          href="#"
          className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          View All
        </a>
      }
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
                  col.width,
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  {col.label}
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockCompliance.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td className="py-3 pr-3">
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {item.itemName}
                  </span>
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {item.assetName}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-3">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-[10.5px] font-semibold",
                    item.clientColor,
                  )}
                  title={item.clientInitials}
                >
                  {item.clientInitials}
                </span>
              </td>
              <td className="py-3 pr-3 text-[12.5px] text-slate-700 dark:text-slate-200">
                {item.dueLabel}
              </td>
              <td className="py-3">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                    STATUS_PILL[item.status],
                  )}
                >
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetCard>
  );
}
