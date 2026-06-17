"use client";

import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/components/ui/utils";
import type { AiActionResult, AiProposedAction } from "@/lib/data/types/ai-message";

// Formats raw payload key names into human-readable labels.
function labelFor(key: string): string {
  const labels: Record<string, string> = {
    paymentId: "Payment ID",
    leaseId: "Lease ID",
    amount: "Amount",
    method: "Payment method",
    riskId: "Risk ID",
    propertyId: "Property ID",
    propertyIds: "Properties",
    clientId: "Client ID",
    title: "Title",
    severity: "Severity",
    vendorId: "Vendor ID",
    cost: "Cost",
    status: "Status",
    id: "Work order ID",
    email: "Email",
    phone: "Phone",
    name: "Name",
    clientType: "Client type",
    managementFeePct: "Management fee",
  };
  return labels[key] ?? key;
}

// Formats a raw payload value into a readable string.
function valueFor(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    // Show numbers that look like money with formatting.
    if (value > 100) return value.toLocaleString();
    return String(value);
  }
  return String(value);
}

type ApprovalGateProps = {
  action: AiProposedAction;
  result: AiActionResult | undefined;
  onApprove: () => void;
  onReject: () => void;
  onUndo: () => void;
  isPending: boolean;
};

export function ApprovalGate({
  action,
  result,
  onApprove,
  onReject,
  onUndo,
  isPending,
}: ApprovalGateProps) {
  // Render the success state (action was approved and completed).
  if (result?.ok && !result.undone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Action applied
          </p>
          <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
            {action.consequence}
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/60 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-white dark:border-emerald-700/40 dark:bg-white/5 dark:text-emerald-400 dark:hover:bg-white/10"
        >
          <RotateCcw className="size-3" />
          Undo
        </button>
      </motion.div>
    );
  }

  // Render the undone state.
  if (result?.undone) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-400">
        <RotateCcw className="size-4 shrink-0" />
        Action undone
      </div>
    );
  }

  // Render the rejected state.
  if (result && !result.ok && result.error === "Rejected") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-400">
        <XCircle className="size-4 shrink-0" />
        Action rejected
      </div>
    );
  }

  // Render the error state (approval attempted but failed).
  if (result && !result.ok) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 dark:border-red-800/40 dark:bg-red-950/30">
        <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Action failed</p>
          <p className="text-xs text-red-700 dark:text-red-400">{result.error}</p>
        </div>
        <button
          type="button"
          onClick={onApprove}
          disabled={isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300/60 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700/40 dark:bg-white/5 dark:text-red-400"
        >
          Retry
        </button>
      </div>
    );
  }

  // Default: pending approval — show the payload card + Approve/Reject buttons.
  const payloadEntries = Object.entries(action.payload).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "mt-4 overflow-hidden rounded-xl border",
        "border-amber-200/70 bg-amber-50/80 dark:border-amber-800/40 dark:bg-amber-950/20",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-amber-200/50 bg-amber-100/60 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-900/20">
        <span className="size-2 animate-pulse rounded-full bg-amber-500" />
        <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-amber-700 dark:text-amber-400">
          Awaiting approval
        </span>
      </div>

      {/* Payload list */}
      <div className="px-4 py-3">
        <div className="mb-3 grid gap-2">
          {payloadEntries.map(([key, value]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-xs text-amber-700/70 dark:text-amber-400/70">
                {labelFor(key)}
              </span>
              <span className="min-w-0 break-words text-right text-xs font-medium text-amber-900 dark:text-amber-200">
                {valueFor(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Consequence */}
        <p className="mb-4 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
          {action.consequence}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={isPending}
            className="flex-1 rounded-lg border border-amber-300/60 bg-white/60 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700/40 dark:bg-white/5 dark:text-amber-400 dark:hover:bg-white/10"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={isPending}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold",
              "bg-amber-500 text-white transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Applying…
              </>
            ) : (
              "Approve"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
