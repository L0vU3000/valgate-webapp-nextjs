"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { renewLease } from "@/app/(pro)/pro/actions";
import { formatCurrencyFull, formatDate } from "@/lib/format";
import type { RentPageData } from "@/app/(pro)/pro/queries";

// Leases expiring within 90 days — the renewal pipeline.
// "Renew" extends the lease by its own term via the real server action.

export function ExpiringLeasesCard({
  leases,
}: {
  leases: RentPageData["expiring"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyLeaseId, setBusyLeaseId] = useState<string | null>(null);

  function handleRenew(leaseId: string) {
    setError(null);
    setBusyLeaseId(leaseId);
    startTransition(async () => {
      const result = await renewLease({ leaseId });
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
      title="Expiring Leases (90 days)"
      headerRight={
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          {leases.length}
        </span>
      }
    >
      {leases.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No leases expiring in the next 90 days.
        </p>
      ) : (
        <ul className="flex flex-col">
          {leases.map((lease) => (
            <li
              key={lease.leaseId}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"
            >
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                  {lease.tenantName} · {lease.propertyName}
                </span>
                <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                  Ends {formatDate(lease.endDate)} (in {lease.daysLeft}d) ·{" "}
                  {formatCurrencyFull(lease.monthlyRent)}/mo
                  {lease.renewalStatus ? ` · ${lease.renewalStatus}` : ""}
                </span>
              </div>
              <button
                type="button"
                disabled={isPending && busyLeaseId === lease.leaseId}
                onClick={() => handleRenew(lease.leaseId)}
                className="h-7 shrink-0 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                {isPending && busyLeaseId === lease.leaseId
                  ? "Renewing…"
                  : "Renew"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </WidgetCard>
  );
}
