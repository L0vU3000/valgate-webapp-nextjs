"use client";

import { Plus, MoreHorizontal, ArrowUpDown } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { mockClients, type ClientHealth } from "@/app/(pro)/pro/_data/mock";
import { useWorkspaceTabs } from "@/app/(pro)/pro/_components/WorkspaceTabProvider";
import { cn } from "@/components/ui/utils";

// Clients table — left column widget, top half.
// Lists every managed client with a small avatar chip, asset count,
// portfolio progress bar, total value, health dot and last activity.

const HEALTH_LABEL: Record<ClientHealth, string> = {
  healthy: "Healthy",
  "needs-attention": "Needs attention",
  critical: "Critical",
};

const HEALTH_DOT: Record<ClientHealth, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-500",
  critical: "bg-red-500",
};

const COLUMNS = [
  { label: "Client", width: "w-[28%]" },
  { label: "Assets", width: "w-[10%]" },
  { label: "Portfolio", width: "w-[22%]" },
  { label: "Value", width: "w-[12%]" },
  { label: "Health", width: "w-[12%]" },
  { label: "Activity", width: "w-[10%]" },
  { label: "", width: "w-[6%]" },
] as const;

export function ClientsTable() {
  const { openClientTab } = useWorkspaceTabs();

  return (
    <WidgetCard
      title="Clients"
      headerRight={
        <>
          <a
            href="#"
            className="text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View All
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 text-white text-[12.5px] font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </>
      }
    >
      <div className="overflow-hidden">
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
                  {col.label && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      {col.label}
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockClients.map((client) => (
              <tr
                key={client.id}
                onClick={() => openClientTab(client.id)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold",
                        client.avatarColor,
                      )}
                    >
                      {client.initials}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                        {client.name}
                      </span>
                      <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                        {client.clientType}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[13px] text-slate-700 dark:text-slate-300">
                  {client.assetCount} assets
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${client.activeAssetPct}%` }}
                      />
                    </div>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {client.activeAssetPct}%
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {client.totalValue}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5"
                    title={HEALTH_LABEL[client.health]}
                  >
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        HEALTH_DOT[client.health],
                      )}
                    />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">
                      {HEALTH_LABEL[client.health]}
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {client.lastActivity}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openClientTab(client.id);
                      }}
                      className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-800 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      aria-label="Row options"
                      className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
