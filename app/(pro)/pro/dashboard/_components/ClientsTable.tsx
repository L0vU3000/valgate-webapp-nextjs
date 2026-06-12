"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  EnterTr,
  DrawInBar,
} from "@/app/(pro)/pro/_components/motion-primitives";
import { useWorkspaceTabs } from "@/app/(pro)/pro/_components/WorkspaceTabProvider";
import {
  HEALTH_DOT,
  type ClientHealth,
} from "@/app/(pro)/pro/_components/pro-shell-types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ClientRollup } from "../../queries";

// Clients table — left column widget, top half.
// One row per managed client; every cell comes from the client rollup:
// active property count, occupancy bar, total portfolio value, derived
// health, and the timestamp of the latest real activity.

const HEALTH_LABEL: Record<ClientHealth, string> = {
  healthy: "Healthy",
  "needs-attention": "Needs attention",
  critical: "Critical",
};

const COLUMNS = [
  { label: "Client", width: "w-[28%]" },
  { label: "Properties", width: "w-[10%]" },
  { label: "Occupancy", width: "w-[22%]" },
  { label: "Value", width: "w-[12%]" },
  { label: "Health", width: "w-[12%]" },
  { label: "Activity", width: "w-[10%]" },
  { label: "", width: "w-[6%]" },
] as const;

export function ClientsTable({ clients }: { clients: ClientRollup[] }) {
  const { openClientTab } = useWorkspaceTabs();

  return (
    <WidgetCard
      title="Clients"
      headerRight={
        <>
          <Link
            href="/pro/clients"
            className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View All
          </Link>
          <Link
            href="/pro/clients"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 text-white text-[12.5px] font-medium hover:bg-blue-700 transition-[background-color,transform] active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </Link>
        </>
      }
    >
      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.label || "actions"}
                  className={cn(
                    "py-2 pr-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
                    col.width,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400"
                >
                  No clients yet — onboard your first client.
                </td>
              </tr>
            )}
            {clients.map((rollup, index) => (
              <EnterTr
                key={rollup.client.id}
                index={index}
                onClick={() => openClientTab(rollup.client.id)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/70 transition-colors cursor-pointer"
              >
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold",
                        rollup.client.avatarBg,
                      )}
                    >
                      {rollup.client.initials}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                        {rollup.client.name}
                      </span>
                      <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                        {rollup.client.clientType}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[13px] text-slate-700 dark:text-slate-300">
                  {rollup.propertyCount}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <DrawInBar
                      percent={rollup.occupancyRate}
                      delaySeconds={0.15 + index * 0.035}
                      trackClassName="flex-1"
                    />
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {rollup.occupancyRate}%
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {rollup.totalValueFormatted}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5"
                    title={HEALTH_LABEL[rollup.health]}
                  >
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        HEALTH_DOT[rollup.health],
                      )}
                    />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">
                      {HEALTH_LABEL[rollup.health]}
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(rollup.lastActivityAt)}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openClientTab(rollup.client.id);
                      }}
                      className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-800 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </td>
              </EnterTr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
