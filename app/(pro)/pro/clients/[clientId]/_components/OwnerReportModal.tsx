"use client";

import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrencyFull, formatDate } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import {
  proPrimaryButtonClass,
  proSecondaryButtonClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import type { OwnerStatement } from "@/app/(pro)/pro/queries";

// The Owner Report — the flagship monthly owner packet, presented as a
// send-ready document the manager reviews before printing or saving to
// PDF. Every figure comes from real records of the statement month
// (the previous full calendar month).
//
// Print isolation: "Print / Save as PDF" adds `print-owner-report` to
// <html>; the rules in styles/print.css then print ONLY this document
// (marked `data-owner-report`) — never the surrounding portfolio page or
// the modal overlay. See that file for the technique.

export function OwnerReportModal({
  open,
  onOpenChange,
  statement,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: OwnerStatement;
  clientName: string;
}) {
  const noiNegative = statement.netOperatingIncome < 0;
  const totalIncome = statement.rentCollected + statement.otherIncome;

  function handlePrint() {
    const root = document.documentElement;
    root.classList.add("print-owner-report");

    // Remove the print class once the print dialog closes. We listen for
    // afterprint and also keep a timeout fallback, since afterprint does
    // not fire reliably across every browser / "Save as PDF" path.
    const cleanup = () => {
      root.classList.remove("print-owner-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 1000);

    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-owner-report
        className="max-h-[88vh] gap-0 overflow-y-auto border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900 sm:max-w-2xl"
      >
        {/* Letterhead */}
        <div className="flex items-start justify-between gap-4 bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-[13px] font-bold">
              VP
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold">
                Valgate Professional
              </span>
              <span className="text-[11.5px] text-blue-100">
                Asset Management
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <DialogTitle className="text-[15px] font-semibold text-white">
              Owner Statement
            </DialogTitle>
            <span className="text-[12px] text-blue-100">
              {statement.monthLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <DialogDescription className="text-[12.5px] text-slate-500 dark:text-slate-400">
            Prepared for{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {clientName}
            </span>{" "}
            · Period {formatDate(statement.periodStart)} –{" "}
            {formatDate(statement.periodEnd - 1)}
          </DialogDescription>

          {/* Income / expenses ledger */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <section className="flex flex-col">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Income
              </h3>
              <ReportRow label="Rent collected" value={statement.rentCollected} />
              <ReportRow label="Other income" value={statement.otherIncome} />
              <ReportRow label="Total income" value={totalIncome} emphasis />
            </section>

            <section className="flex flex-col">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Expenses
              </h3>
              <ReportRow
                label={`Management fee (${statement.managementFeePct}%)`}
                value={statement.managementFee}
              />
              <ReportRow
                label="Property tax accrual"
                value={statement.taxAccrual}
              />
              <ReportRow
                label="Insurance accrual"
                value={statement.insuranceAccrual}
              />
              <ReportRow label="Maintenance" value={statement.maintenanceCosts} />
              <ReportRow
                label="Total expenses"
                value={statement.totalExpenses}
                emphasis
              />
            </section>
          </div>

          {/* NOI band */}
          <div
            className={cn(
              "flex items-center justify-between rounded-md px-4 py-3",
              noiNegative
                ? "bg-red-50 dark:bg-red-500/10"
                : "bg-emerald-50 dark:bg-emerald-500/10",
            )}
          >
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              Net operating income
            </span>
            <span
              className={cn(
                "text-[17px] font-semibold tabular-nums",
                noiNegative
                  ? "text-red-700 dark:text-red-300"
                  : "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {formatCurrencyFull(statement.netOperatingIncome)}
            </span>
          </div>

          {/* Operations snapshot */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <ReportStat value={`${statement.occupancyRate}%`} label="Occupancy" />
            <ReportStat
              value={String(statement.workOrdersOpenedInMonth)}
              label="Work orders opened"
            />
            <ReportStat
              value={String(statement.workOrdersOpenToday)}
              label="Open today"
            />
          </div>

          {/* Upcoming items */}
          {(statement.upcomingLeaseExpirations.length > 0 ||
            statement.upcomingCertExpirations.length > 0) && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Upcoming (next 90 days)
              </h3>
              <ul className="flex flex-col">
                {statement.upcomingLeaseExpirations.map((lease) => (
                  <li
                    key={`${lease.propertyName}-${lease.endDate}`}
                    className="flex items-center justify-between border-b border-slate-100 py-2 text-[12.5px] last:border-0 dark:border-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-200">
                      Lease ends — {lease.propertyName} ({lease.tenantName})
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatDate(lease.endDate)} ·{" "}
                      {formatCurrencyFull(lease.monthlyRent)}/mo
                    </span>
                  </li>
                ))}
                {statement.upcomingCertExpirations.map((cert) => (
                  <li
                    key={`${cert.propertyName}-${cert.name}`}
                    className="flex items-center justify-between border-b border-slate-100 py-2 text-[12.5px] last:border-0 dark:border-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-200">
                      {cert.name} expires — {cert.propertyName}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatDate(cert.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Generated by Valgate Professional from recorded transactions for
            the period above. Accruals (tax, insurance) are monthly portions of
            the annual figures on file.
          </p>
        </div>

        {/* Action bar — never printed (data-print-hide). */}
        <div
          data-print-hide
          className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={proSecondaryButtonClass}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={cn(proPrimaryButtonClass, "gap-1.5")}
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// One ledger line (label + amount).
function ReportRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-slate-100 py-2 text-[12.5px] last:border-0 dark:border-slate-800",
        emphasis && "font-semibold text-slate-900 dark:text-slate-100",
      )}
    >
      <span className={emphasis ? undefined : "text-slate-600 dark:text-slate-300"}>
        {label}
      </span>
      <span className="tabular-nums">{formatCurrencyFull(value)}</span>
    </div>
  );
}

// One operations-snapshot stat tile.
function ReportStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-slate-100 py-2.5 dark:border-slate-800">
      <div className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
