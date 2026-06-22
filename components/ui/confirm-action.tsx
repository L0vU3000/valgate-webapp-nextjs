"use client";

// <ConfirmAction> — ONE reusable wrapper for every destructive action in the app.
// You wrap the trigger button in it, give it a `tier`, and it handles the confirmation
// experience for you. Built on the existing shadcn AlertDialog + sonner — no new deps.
//
// ───────────────────────────────────────────────────────────────────────────
// TIER POLICY (which tier to use)
// ───────────────────────────────────────────────────────────────────────────
// | Tier      | Use for                                                              |
// |-----------|----------------------------------------------------------------------|
// | "undo"    | reversible, low stakes (dismiss an alert, mark a payment paid).       |
// |           | Fires immediately, shows a sonner toast with an "Undo" button (~5s). |
// | "confirm" | irreversible single item (delete one document, remove a co-owner,    |
// |           | resolve a work order). Shows an AlertDialog: title + "This can't be   |
// |           | undone." + Cancel / Confirm.                                         |
// | "typed"   | irreversible + sensitive + cascading (delete a property, bulk-delete |
// |           | docs, revoke a verification). AlertDialog whose Confirm button stays  |
// |           | disabled until the user types an exact required string.              |
// ───────────────────────────────────────────────────────────────────────────
//
// USAGE EXAMPLES
//
//   // undo tier — fires right away, offers Undo:
//   <ConfirmAction
//     tier="undo"
//     successMessage="Alert dismissed"
//     onConfirm={() => dismissAlertAction(id)}      // returns ActionResult
//     onUndo={() => restoreAlertAction(id)}
//   >
//     <Button variant="ghost">Dismiss</Button>
//   </ConfirmAction>
//
//   // confirm tier — single irreversible item:
//   <ConfirmAction
//     tier="confirm"
//     title="Delete this document?"
//     confirmLabel="Delete"
//     onConfirm={() => deleteDocumentAction(id)}
//   >
//     <Button variant="destructive">Delete</Button>
//   </ConfirmAction>
//
//   // typed tier — must type the property name to enable Confirm:
//   <ConfirmAction
//     tier="typed"
//     title="Delete 12 Oak Street?"
//     description="This permanently removes the property and all 8 documents."
//     typedConfirmValue="12 Oak Street"
//     confirmLabel="Delete property"
//     onConfirm={() => deletePropertyAction(id)}
//   >
//     <Button variant="destructive">Delete property</Button>
//   </ConfirmAction>

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Input } from "./input";
import { Label } from "./label";
import {
  toastActionResult,
  toastActionResultWithUndo,
  type ToastMessages,
} from "@/lib/client/action-result";
import { isConfirmDisabled, type ConfirmTier } from "@/lib/client/confirm-tier";
import type { ActionResult } from "@/app/actions/_result";

// Re-export so existing `import { ConfirmTier } from ".../confirm-action"` keeps working.
export type { ConfirmTier };

type ConfirmActionProps = {
  // Which experience to show. Required so the caller always thinks about risk level.
  tier: ConfirmTier;

  // The trigger the user clicks (usually a <Button>). Required.
  children: React.ReactNode;

  // The async action to run when confirmed. Should return an ActionResult so we can
  // toast success/failure for you. (A void return also works — treated as success.)
  onConfirm: () => Promise<ActionResult<unknown>> | Promise<void> | void;

  // Dialog text (confirm/typed tiers). Sensible defaults applied if omitted.
  title?: string;
  description?: string;
  confirmLabel?: string;

  // typed tier only: the exact string the user must type before Confirm enables.
  typedConfirmValue?: string;

  // Toast text. successMessage shows on success; failureMessage overrides the generic
  // error toast. We never show raw server errors (see action-result.ts).
  successMessage?: string;
  failureMessage?: string;

  // undo tier only: called when the user clicks "Undo" in the toast (usually a restore action).
  onUndo?: () => void | Promise<unknown>;

  // undo tier only: how long the Undo toast stays up. Defaults to 5000ms.
  undoDurationMs?: number;
};

// Runs onConfirm and shows the right toast. Returns true on success.
// Centralised so all three tiers behave identically once confirmed.
async function runConfirmedAction(
  onConfirm: ConfirmActionProps["onConfirm"],
  messages: ToastMessages,
): Promise<boolean> {
  const result = await onConfirm();
  // A void-returning action has no ok/error to inspect — treat it as success.
  if (result == null) {
    if (messages.success) toastActionResult({ ok: true, data: undefined }, messages);
    return true;
  }
  return toastActionResult(result as ActionResult<unknown>, messages);
}

export function ConfirmAction({
  tier,
  children,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  typedConfirmValue,
  successMessage,
  failureMessage,
  onUndo,
  undoDurationMs = 5000,
}: ConfirmActionProps) {
  // Whether the AlertDialog is open (confirm + typed tiers).
  const [open, setOpen] = React.useState(false);
  // Whether the action is currently running (disables Confirm + shows "Working…").
  const [pending, setPending] = React.useState(false);
  // What the user has typed so far (typed tier only).
  const [typed, setTyped] = React.useState("");

  const toastMessages: ToastMessages = {
    success: successMessage,
    error: failureMessage,
  };

  // ── undo tier ────────────────────────────────────────────────────────────
  // No dialog. The trigger fires the action immediately, then we show a toast
  // with an Undo button. We clone the child so its onClick runs our handler.
  if (tier === "undo") {
    const handleUndoTier = async () => {
      if (pending) return;
      setPending(true);
      try {
        const result = await onConfirm();
        // If the action returned a result, attach the Undo button to its toast.
        if (result == null) {
          // void action: still offer undo if a handler was given.
          if (onUndo) {
            toastActionResultWithUndo(
              { ok: true, data: undefined },
              onUndo,
              toastMessages,
              undoDurationMs,
            );
          } else if (successMessage) {
            toastActionResult({ ok: true, data: undefined }, toastMessages);
          }
        } else if (onUndo) {
          toastActionResultWithUndo(
            result as ActionResult<unknown>,
            onUndo,
            toastMessages,
            undoDurationMs,
          );
        } else {
          toastActionResult(result as ActionResult<unknown>, toastMessages);
        }
      } finally {
        setPending(false);
      }
    };

    // Wrap (not replace) the child's own onClick so callers can still pass one.
    return wrapTriggerWithOnClick(children, handleUndoTier, pending);
  }

  // ── confirm + typed tiers (both use the AlertDialog) ───────────────────────
  // For the typed tier, Confirm is disabled until the typed text matches exactly.
  const requiresTyping = tier === "typed" && Boolean(typedConfirmValue);
  // Single source of truth for the gating rule (also unit-tested in confirm-tier.ts).
  const confirmDisabled = isConfirmDisabled({
    tier,
    typedConfirmValue,
    typed,
    pending,
  });

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    setPending(true);
    try {
      const ok = await runConfirmedAction(onConfirm, toastMessages);
      if (ok) {
        setOpen(false);
        setTyped(""); // reset for next time
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Don't let the user close mid-action; reset typed text when closing.
        if (pending) return;
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      {/* The trigger just opens the dialog (no action runs yet). */}
      {wrapTriggerWithOnClick(children, () => setOpen(true), false)}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Are you sure?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* typed tier: the confirmation text box. */}
        {requiresTyping ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-action-typed">
              Type{" "}
              <span className="font-semibold">{typedConfirmValue}</span> to
              confirm
            </Label>
            <Input
              id="confirm-action-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          {/* Cancel just closes the dialog. */}
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {/* Confirm runs the action. We stop Radix's auto-close (preventDefault)
              so the dialog stays open while the async action runs. */}
          <AlertDialogAction
            disabled={confirmDisabled}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper: take the caller's trigger element and add our onClick to it without
// throwing away any onClick it already had. If the child isn't a valid React
// element we just render it untouched. `disabled` is applied when pending so the
// undo-tier trigger can't be double-clicked.
function wrapTriggerWithOnClick(
  child: React.ReactNode,
  ourOnClick: () => void,
  disabled: boolean,
): React.ReactElement {
  if (!React.isValidElement(child)) {
    // Not an element (e.g. a string) — wrap it in a span so it's still clickable.
    return (
      <span onClick={ourOnClick} role="button">
        {child}
      </span>
    );
  }

  const childProps = child.props as {
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
  };

  return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
    onClick: (e: React.MouseEvent) => {
      // Run the child's own handler first (if any), then ours.
      childProps.onClick?.(e);
      ourOnClick();
    },
    disabled: disabled || childProps.disabled,
  });
}

// The pure tier-gating logic (isConfirmDisabled) lives in @/lib/client/confirm-tier
// so it can be unit-tested without React. Re-exported here for convenience.
export { isConfirmDisabled } from "@/lib/client/confirm-tier";
