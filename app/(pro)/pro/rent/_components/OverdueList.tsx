"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { markRentPaid } from "@/app/(pro)/pro/rent.actions";
import { useDestructiveAction } from "@/lib/client/use-destructive-action";
import { toActionResult } from "@/lib/client/action-result";
import { formatCurrencyFull } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import { RENT_STATUS_PILL } from "./RentRollTable";
import { LogPaymentModal } from "./LogPaymentModal";
import type { RentRollRow, RentStatus } from "@/app/(pro)/pro/queries";

// Overdue & unpaid rent — the collection triage list.
//
// Two row actions:
//   - "Mark paid"   — flips an existing Overdue/Pending record to Paid.
//                     Reversible, low-stakes → Phase 4 "undo" tier: it fires
//                     immediately and shows a 5s toast with an Undo button that
//                     flips the record back to the status it had before.
//   - "Log payment" — for a lease with no record this month. This one
//                     collects an amount + method, so it opens the
//                     LogPaymentModal instead of acting inline.

// The rent-roll's derived rentStatus can be "Unpaid" (no record yet), but a
// row only has a paymentId when its status is a real Payment status the schema
// stores — Overdue or Pending. We restore exactly that on undo.
type PriorPaymentStatus = "Overdue" | "Pending";

function priorPaymentStatus(rentStatus: RentStatus): PriorPaymentStatus {
  // Defensive: anything that isn't explicitly Pending is treated as Overdue
  // (the only two states a markable row can be in).
  return rentStatus === "Pending" ? "Pending" : "Overdue";
}

// One overdue/unpaid row. Split into its own component so each "Mark paid"
// button can own a useDestructiveAction hook (hooks can't run in a loop).
function OverdueRow({ row }: { row: RentRollRow }) {
  const router = useRouter();
  const [logRow, setLogRow] = useState<RentRollRow | null>(null);

  const paymentId = row.paymentId;
  const prior = priorPaymentStatus(row.rentStatus);

  // Mark paid (undo tier): flip to Paid now, refresh, and offer a 5s Undo that
  // restores the prior status. No optimistic local edit — router.refresh()
  // re-derives the whole list from the server, which is the source of truth.
  const markPaid = useDestructiveAction({
    action: async () => {
      if (!paymentId) return { ok: true, data: undefined };
      const res = await markRentPaid({ paymentId });
      if (res.ok) router.refresh();
      return toActionResult(res);
    },
    onUndo: async () => {
      if (!paymentId) return;
      const res = await markRentPaid({ paymentId, status: prior });
      if (res.ok) router.refresh();
    },
    successMessage: `Marked ${row.tenantName}'s rent paid`,
  });

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
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
        {paymentId ? (
          <button
            type="button"
            disabled={markPaid.pending}
            onClick={() => void markPaid.run()}
            className="h-7 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            {markPaid.pending ? "Saving…" : "Mark paid"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLogRow(row)}
            className="h-7 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            Log payment
          </button>
        )}
      </div>
      <LogPaymentModal row={logRow} onClose={() => setLogRow(null)} />
    </li>
  );
}

export function OverdueList({ rows }: { rows: RentRollRow[] }) {
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
        <ul className="flex flex-col">
          {rows.map((row) => (
            <OverdueRow key={row.leaseId} row={row} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
