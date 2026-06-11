"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { updateWorkOrder } from "@/app/(pro)/pro/actions";
import { formatCurrencyFull, formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProWorkOrderRow, WorkOrdersPageData } from "@/app/(pro)/pro/queries";
import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/lib/data/types/maintenance-item";

// The main work-orders table. Each row is a real MaintenanceItem with
// inline actions: advance status (Open → In Progress → Resolved) and
// assign a vendor from the Professional directory.

const SEVERITY_DOT: Record<MaintenanceSeverity, string> = {
  Emergency: "bg-red-500",
  Urgent: "bg-amber-500",
  Standard: "bg-blue-500",
};

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  Open: "Open",
  InProgress: "In Progress",
  Resolved: "Resolved",
};

const STATUS_PILL: Record<MaintenanceStatus, string> = {
  Open: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  InProgress:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  Resolved:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

export function WorkOrdersTable({
  rows,
  vendors,
}: {
  rows: ProWorkOrderRow[];
  vendors: WorkOrdersPageData["vendors"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Advance a work order to the next status.
  function handleStatusChange(id: string, status: MaintenanceStatus) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await updateWorkOrder({ id, status });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  // Assign a vendor (Professional) to a work order.
  function handleAssignVendor(id: string, vendorId: string) {
    if (vendorId === "") return;
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await updateWorkOrder({ id, vendorId });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  return (
    <WidgetCard
      title="All Work Orders"
      headerRight={
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {rows.length}
        </span>
      }
    >
      <ul className="flex flex-col">
        {rows.length === 0 && (
          <li className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
            No work orders yet.
          </li>
        )}
        {rows.map((row) => {
          const busy = isPending && busyId === row.id;
          return (
            <li
              key={row.id}
              className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-label={row.severity}
                    title={row.severity}
                    className={cn(
                      "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                      SEVERITY_DOT[row.severity],
                    )}
                  />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {row.title}
                    </span>
                    <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                      {row.propertyName} · {row.clientName} · opened{" "}
                      {formatRelativeTime(row.createdAt)}
                      {row.cost !== undefined &&
                        ` · est. ${formatCurrencyFull(row.cost)}`}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_PILL[row.status],
                  )}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pl-[18px]">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                  {row.vendorName ? (
                    <>
                      Vendor: {row.vendorName}
                      {row.vendorCategory ? ` (${row.vendorCategory})` : ""}
                    </>
                  ) : row.status === "Resolved" ? (
                    "—"
                  ) : (
                    <select
                      defaultValue=""
                      disabled={busy}
                      onChange={(event) =>
                        handleAssignVendor(row.id, event.target.value)
                      }
                      aria-label={`Assign vendor for ${row.title}`}
                      className="h-7 rounded-md border border-amber-200 bg-amber-50 px-2 text-[11.5px] font-medium text-amber-800 focus:outline-none dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      <option value="" disabled>
                        Assign vendor…
                      </option>
                      {vendors.map((vendor) => (
                        <option
                          key={vendor.id}
                          value={vendor.id}
                          disabled={!vendor.available}
                        >
                          {vendor.name} — {vendor.category}
                          {vendor.available ? "" : " (unavailable)"}
                        </option>
                      ))}
                    </select>
                  )}
                </span>

                <div className="flex shrink-0 items-center gap-2">
                  {row.status === "Open" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleStatusChange(row.id, "InProgress")}
                      className="h-7 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    >
                      {busy ? "Saving…" : "Start"}
                    </button>
                  )}
                  {row.status === "InProgress" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleStatusChange(row.id, "Resolved")}
                      className="h-7 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      {busy ? "Saving…" : "Resolve"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </WidgetCard>
  );
}
