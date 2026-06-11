"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { markRentPaid, logRentPayment } from "@/app/(pro)/pro/actions";
import { formatCurrencyFull } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import { RENT_STATUS_PILL } from "./RentRollTable";
import type { RentRollRow } from "@/app/(pro)/pro/queries";

// Overdue & unpaid rent — the collection triage list.
// "Mark paid" updates the existing Overdue/Pending payment record;
// "Log payment" creates a Paid record for leases with no record this
// month. Both write through the real server actions and refresh.

const PAYMENT_METHODS = ["ABA Bank", "Wing", "Wire transfer", "Cash"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function OverdueList({ rows }: { rows: RentRollRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyLeaseId, setBusyLeaseId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("ABA Bank");

  // Marks an existing Overdue/Pending payment record as Paid.
  function handleMarkPaid(row: RentRollRow) {
    if (!row.paymentId) return;
    setError(null);
    setBusyLeaseId(row.leaseId);
    const paymentId = row.paymentId;
    startTransition(async () => {
      const result = await markRentPaid({ paymentId });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
      setBusyLeaseId(null);
    });
  }

  // Creates a Paid rent record for a lease with no record this month.
  function handleLogPayment(row: RentRollRow) {
    setError(null);
    setBusyLeaseId(row.leaseId);
    startTransition(async () => {
      const result = await logRentPayment({
        leaseId: row.leaseId,
        amount: row.monthlyRent,
        method,
      });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
      setBusyLeaseId(null);
    });
  }

  return (
    <WidgetCard
      title="Overdue & Unpaid"
      headerRight={
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11.5px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
          {rows.length}
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
          Nothing outstanding — all rent for this month is in.
        </p>
      ) : (
        <>
          <label className="flex items-center justify-between gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            Payment method for logged payments
            <select
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as PaymentMethod)
              }
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <ul className="flex flex-col">
            {rows.map((row) => (
              <li
                key={row.leaseId}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"
              >
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {row.tenantName} —{" "}
                    <span className="tabular-nums">
                      {formatCurrencyFull(row.monthlyRent)}
                    </span>
                  </span>
                  <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                    {row.propertyName} · {row.clientName}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      RENT_STATUS_PILL[row.rentStatus],
                    )}
                  >
                    {row.rentStatus}
                  </span>
                  {row.paymentId ? (
                    <button
                      type="button"
                      disabled={isPending && busyLeaseId === row.leaseId}
                      onClick={() => handleMarkPaid(row)}
                      className="h-7 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      {isPending && busyLeaseId === row.leaseId
                        ? "Saving…"
                        : "Mark paid"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending && busyLeaseId === row.leaseId}
                      onClick={() => handleLogPayment(row)}
                      className="h-7 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    >
                      {isPending && busyLeaseId === row.leaseId
                        ? "Saving…"
                        : "Log payment"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </>
      )}
    </WidgetCard>
  );
}
