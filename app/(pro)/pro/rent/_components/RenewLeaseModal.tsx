"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { renewLease } from "@/app/(pro)/pro/rent.actions";
import { formatCurrencyFull, formatDate } from "@/lib/format";
import {
  ProModal,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
} from "@/app/(pro)/pro/_components/pro-modal";
import type { RentPageData } from "@/app/(pro)/pro/queries";

type ExpiringLease = RentPageData["expiring"][number];

// Confirms a lease renewal. There is no free-text input here — renewal
// extends the lease by one full term — so the modal's job is to show the
// manager exactly what will change (current end → new end) before they
// commit. The new end date is computed in the query layer with the same
// math the server action uses, so the preview can't drift from reality.

export function RenewLeaseModal({
  lease,
  onClose,
}: {
  lease: ExpiringLease | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Keep the last lease rendered through the dialog's close animation.
  const [snapshot, setSnapshot] = useState<ExpiringLease | null>(null);

  useEffect(() => {
    if (lease) {
      setSnapshot(lease);
      setError(null);
      setShowSuccess(false);
    }
  }, [lease]);

  const open = lease !== null;

  function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!snapshot) return;
    setError(null);
    startTransition(async () => {
      const result = await renewLease({ leaseId: snapshot.leaseId });
      if (result.ok) {
        router.refresh();
        setShowSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <ProModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Renew lease"
      description={
        snapshot
          ? `Extend ${snapshot.tenantName}'s lease by one full term.`
          : "Extend the lease by one full term."
      }
    >
      {!snapshot ? null : showSuccess ? (
        <ProModalSuccess
          message={`Lease renewed to ${formatDate(snapshot.projectedEndDate)}`}
          onComplete={onClose}
        />
      ) : (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12.5px] dark:border-slate-800 dark:bg-slate-800/40">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {snapshot.propertyName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {snapshot.tenantName} · {snapshot.clientName} ·{" "}
              {formatCurrencyFull(snapshot.monthlyRent)}/mo
            </div>
          </div>

          {/* The change being confirmed: current end → projected new end. */}
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Current end
              </span>
              <span className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
                {formatDate(snapshot.endDate)}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                New end (+{snapshot.termMonths} mo)
              </span>
              <span className="text-[13.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                {formatDate(snapshot.projectedEndDate)}
              </span>
            </div>
          </div>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={onClose}
            submitLabel="Confirm renewal"
            pendingLabel="Renewing…"
            isPending={isPending}
          />
        </form>
      )}
    </ProModal>
  );
}
