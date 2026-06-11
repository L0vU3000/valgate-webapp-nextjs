"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logRentPayment } from "@/app/(pro)/pro/actions";
import { formatCurrencyFull } from "@/lib/format";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
  proInputClass,
  proSelectClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import type { RentRollRow } from "@/app/(pro)/pro/queries";

// Records a Paid rent payment for a lease that has no record this month.
// Opens from a specific overdue/unpaid row, pre-filled with that lease's
// monthly rent (the manager can adjust for a partial payment). Method is
// the only other input — the server stamps the date, so we don't show a
// fake date field that wouldn't map to a real schema value.

const PAYMENT_METHODS = ["ABA Bank", "Wing", "Wire transfer", "Cash"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function LogPaymentModal({
  row,
  onClose,
}: {
  // The row to log a payment for. `null` means the modal is closed.
  row: RentRollRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // `snapshot` keeps the last opened row rendered while the dialog plays
  // its close animation, after `row` has already flipped back to null.
  const [snapshot, setSnapshot] = useState<RentRollRow | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("ABA Bank");

  // When a new row opens, refill the form from that lease.
  useEffect(() => {
    if (row) {
      setSnapshot(row);
      setAmount(String(row.monthlyRent));
      setError(null);
      setShowSuccess(false);
    }
  }, [row]);

  const open = row !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!snapshot) return;
    setError(null);

    const parsedAmount = Number(amount);

    startTransition(async () => {
      const result = await logRentPayment({
        leaseId: snapshot.leaseId,
        amount: parsedAmount,
        method,
      });

      if (result.ok) {
        router.refresh();
        setShowSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  // The server requires a positive amount.
  const amountIsValid = Number.isFinite(Number(amount)) && Number(amount) > 0;

  return (
    <ProModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Log a payment"
      description={
        snapshot
          ? `Record rent received from ${snapshot.tenantName}.`
          : "Record a rent payment."
      }
    >
      {!snapshot ? null : showSuccess ? (
        <ProModalSuccess
          message={`Payment of ${formatCurrencyFull(Number(amount))} recorded`}
          onComplete={onClose}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Read-only context so the manager knows exactly what they're
              logging against — none of this is editable input. */}
          <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12.5px] dark:border-slate-800 dark:bg-slate-800/40">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {snapshot.propertyName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {snapshot.tenantName} · {snapshot.clientName}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProField
              label="Amount"
              htmlFor="log-amount"
              hint="USD · defaults to the monthly rent"
            >
              <input
                id="log-amount"
                type="number"
                min={0}
                step={10}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={proInputClass}
              />
            </ProField>

            <ProField label="Method" htmlFor="log-method">
              <select
                id="log-method"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as PaymentMethod)
                }
                className={proSelectClass}
              >
                {PAYMENT_METHODS.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {paymentMethod}
                  </option>
                ))}
              </select>
            </ProField>
          </div>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={onClose}
            submitLabel="Record payment"
            pendingLabel="Recording…"
            isPending={isPending}
            submitDisabled={!amountIsValid}
          />
        </form>
      )}
    </ProModal>
  );
}
