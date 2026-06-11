"use client";

import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { formatCurrencyFull, formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { RentRollRow, RentStatus } from "@/app/(pro)/pro/queries";

// Rent roll — every signed lease still running this month, with the
// current month's rent status derived from real Payment records.

export const RENT_STATUS_PILL: Record<RentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  Pending:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  Overdue:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  Unpaid:
    "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const COLUMNS = [
  { label: "Tenant / Unit", width: "w-[24%]" },
  { label: "Property", width: "w-[20%]" },
  { label: "Client", width: "w-[14%]" },
  { label: "Rent", width: "w-[10%]" },
  { label: "This Month", width: "w-[12%]" },
  { label: "Lease Ends", width: "w-[12%]" },
  { label: "Last Paid", width: "w-[8%]" },
] as const;

export function RentRollTable({
  rows,
  clients,
  clientFilter,
  onClientFilterChange,
}: {
  rows: RentRollRow[];
  clients: Array<{ id: string; name: string }>;
  clientFilter: string;
  onClientFilterChange: (clientId: string) => void;
}) {
  return (
    <WidgetCard
      title="Rent Roll"
      headerRight={
        <select
          value={clientFilter}
          onChange={(event) => onClientFilterChange(event.target.value)}
          aria-label="Filter by client"
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12.5px] text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="all">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400"
                >
                  No active leases for this filter.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.leaseId}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="py-3 pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {row.tenantName}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {row.unit}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[12.5px] text-slate-700 dark:text-slate-200">
                  {row.propertyName}
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-600 dark:text-slate-300">
                  {row.clientName}
                </td>
                <td className="py-3 pr-3 text-[13px] font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrencyFull(row.monthlyRent)}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      RENT_STATUS_PILL[row.rentStatus],
                    )}
                  >
                    {row.rentStatus}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-600 dark:text-slate-300">
                  {formatDate(row.leaseEnd)}
                  {row.renewalStatus && (
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                      {row.renewalStatus}
                    </span>
                  )}
                </td>
                <td className="py-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {row.lastPaidDate ? formatRelativeTime(row.lastPaidDate) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
