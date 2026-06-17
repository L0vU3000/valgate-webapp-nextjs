"use client";

import { useState } from "react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { formatCurrencyFull, formatDate } from "@/lib/format";
import { RenewLeaseModal } from "./RenewLeaseModal";
import type { RentPageData } from "@/app/(pro)/pro/queries";

type ExpiringLease = RentPageData["expiring"][number];

// Leases expiring within 90 days — the renewal pipeline.
// "Renew" opens a confirmation modal showing the new end date before it
// extends the lease through the real server action.

export function ExpiringLeasesCard({
  leases,
}: {
  leases: RentPageData["expiring"];
}) {
  // The lease whose renew-confirmation modal is open (null = closed).
  const [renewLeaseItem, setRenewLeaseItem] = useState<ExpiringLease | null>(
    null,
  );

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
                onClick={() => setRenewLeaseItem(lease)}
                className="h-7 shrink-0 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                Renew
              </button>
            </li>
          ))}
        </ul>
      )}

      <RenewLeaseModal
        lease={renewLeaseItem}
        onClose={() => setRenewLeaseItem(null)}
      />
    </WidgetCard>
  );
}
