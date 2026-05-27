"use client";

import { ArrowUpDown } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  type ComplianceItem,
  type ComplianceStatus,
} from "@/app/(pro)/pro/_data/mock";
import { cn } from "@/components/ui/utils";

const STATUS_PILL: Record<ComplianceStatus, string> = {
  "On Track": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Due Soon": "bg-amber-50 text-amber-700 border border-amber-200",
  Overdue: "bg-red-50 text-red-700 border border-red-200",
};

const COLUMNS = [
  { label: "Item", width: "w-[42%]" },
  { label: "Asset", width: "w-[28%]" },
  { label: "Due", width: "w-[15%]" },
  { label: "Status", width: "w-[15%]" },
] as const;

type Props = {
  compliance: ComplianceItem[];
};

export function ClientComplianceTable({ compliance }: Props) {
  return (
    <WidgetCard title="Compliance & Deadlines">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500",
                  col.width,
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-slate-700"
                >
                  {col.label}
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compliance.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
            >
              <td className="py-3 pr-3 text-[13px] font-semibold text-slate-900">
                {item.itemName}
              </td>
              <td className="py-3 pr-3 text-[12.5px] text-slate-600">
                {item.assetName}
              </td>
              <td className="py-3 pr-3 text-[12.5px] text-slate-700">
                {item.dueLabel}
              </td>
              <td className="py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
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
