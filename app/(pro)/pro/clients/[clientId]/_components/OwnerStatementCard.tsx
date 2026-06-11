"use client";

import { Printer } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { formatCurrencyFull, formatDate } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { OwnerStatement } from "@/app/(pro)/pro/queries";

// Owner Statement — the monthly owner packet, generated entirely from
// real records of the statement month (previous full calendar month):
// rent payments, management fee, tax/insurance accruals, maintenance
// costs, occupancy, work orders, and upcoming expirations.
//
// This is the report a manager would otherwise assemble by hand at
// month-end — the single biggest time drain in the industry surveys.

export function OwnerStatementCard({
  statement,
  clientName,
}: {
  statement: OwnerStatement;
  clientName: string;
}) {
  const noiNegative = statement.netOperatingIncome < 0;

  return (
    <WidgetCard
      title={`Owner Statement — ${statement.monthLabel}`}
      headerRight={
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
      }
    >
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
        Prepared for {clientName} · Period {formatDate(statement.periodStart)}{" "}
        – {formatDate(statement.periodEnd - 1)}
      </p>

      {/* Income / expenses ledger */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Income
          </h3>
          <StatementRow
            label="Rent collected"
            value={statement.rentCollected}
          />
          <StatementRow label="Other income" value={statement.otherIncome} />
          <StatementRow
            label="Total income"
            value={statement.rentCollected + statement.otherIncome}
            emphasis
          />
        </div>

        <div className="flex flex-col">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Expenses
          </h3>
          <StatementRow
            label={`Management fee (${statement.managementFeePct}%)`}
            value={statement.managementFee}
          />
          <StatementRow
            label="Property tax accrual"
            value={statement.taxAccrual}
          />
          <StatementRow
            label="Insurance accrual"
            value={statement.insuranceAccrual}
          />
          <StatementRow
            label="Maintenance"
            value={statement.maintenanceCosts}
          />
          <StatementRow
            label="Total expenses"
            value={statement.totalExpenses}
            emphasis
          />
        </div>
      </div>

      {/* NOI line */}
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
            "text-[16px] font-semibold tabular-nums",
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
        <div className="rounded-md border border-slate-100 py-2.5 dark:border-slate-800">
          <div className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {statement.occupancyRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Occupancy
          </div>
        </div>
        <div className="rounded-md border border-slate-100 py-2.5 dark:border-slate-800">
          <div className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {statement.workOrdersOpenedInMonth}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Work orders opened
          </div>
        </div>
        <div className="rounded-md border border-slate-100 py-2.5 dark:border-slate-800">
          <div className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {statement.workOrdersOpenToday}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Open today
          </div>
        </div>
      </div>

      {/* Upcoming items the owner should know about */}
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
    </WidgetCard>
  );
}

// One ledger line in the statement (label + amount).
function StatementRow({
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
      <span
        className={
          emphasis ? undefined : "text-slate-600 dark:text-slate-300"
        }
      >
        {label}
      </span>
      <span className="tabular-nums">{formatCurrencyFull(value)}</span>
    </div>
  );
}
