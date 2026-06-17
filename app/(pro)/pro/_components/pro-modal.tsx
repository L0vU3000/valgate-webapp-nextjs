"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";

// Shared modal + form primitives for every "manager input" in the Pro
// cockpit (onboard client, log payment, renew lease, create work order).
//
// Built on the project's shadcn/Radix Dialog, which already gives us:
//   - focus trap (focus stays inside the open dialog)
//   - Escape to dismiss + click-outside to dismiss
//   - enter/exit transitions (via tw-animate-css on DialogContent)
//   - an aria-labelled title and a close (X) button
//
// On top of that, these primitives add the Pro look (slate palette, the
// cockpit's type scale), a single source for input styling, and the
// loading / success / inline-error states the design plan calls for.

// ---------------------------------------------------------------------------
// Shared class strings — one source of truth for field + button styling.
// (Previously the same input class was copy-pasted into each inline form.)
// ---------------------------------------------------------------------------

export const proFieldLabelClass =
  "text-[12px] font-medium text-slate-600 dark:text-slate-300";

export const proInputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 placeholder:text-slate-400 transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30";

// Selects share the input look but reserve room for the native chevron.
export const proSelectClass = cn(proInputClass, "pr-8");

// Buttons get a restrained scale-on-press (0.97 — subtle for a dense pro
// tool). The transition lists exact properties (never `all`); transform is
// included so the press eases rather than snaps. disabled buttons opt out via
// the active: variant only firing on real presses.
export const proPrimaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-blue-700 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

export const proSecondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-4 text-[13px] font-medium text-slate-700 transition-[background-color,transform] hover:bg-slate-50 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60";

// ---------------------------------------------------------------------------
// ProModal — the dialog shell. Controlled via `open` / `onOpenChange`.
// ---------------------------------------------------------------------------

export function ProModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg",
          className,
        )}
      >
        <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4 text-left dark:border-slate-800">
          <DialogTitle className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-[13px] text-slate-500 dark:text-slate-400">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ProField — a labelled form row with an optional hint and inline error.
// ---------------------------------------------------------------------------

export function ProField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className={proFieldLabelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[11.5px] font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProFormError — a form-level error banner (for failures the server returns,
// as opposed to a single field being wrong).
// ---------------------------------------------------------------------------

export function ProFormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProModalActions — the Cancel / Submit footer row.
// ---------------------------------------------------------------------------

export function ProModalActions({
  onCancel,
  submitLabel,
  pendingLabel,
  isPending,
  submitDisabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className={proSecondaryButtonClass}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending || submitDisabled}
        className={proPrimaryButtonClass}
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProModalSuccess — the confirmation flash shown in place of the form after
// a successful write. Calls `onComplete` once, after `delayMs`, so the
// caller can close the modal. The callback is captured in a ref so a
// router.refresh()-driven re-render can't restart the timer.
// ---------------------------------------------------------------------------

export function ProModalSuccess({
  message,
  onComplete,
  delayMs = 1100,
}: {
  message: string;
  onComplete: () => void;
  delayMs?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <motion.span
        initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
      >
        <Check className="h-6 w-6" strokeWidth={2.5} />
      </motion.span>
      <p className="text-[13.5px] font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
    </div>
  );
}
