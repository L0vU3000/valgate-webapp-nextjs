"use client";

// useDestructiveAction — a small React hook for the "undo" tier of destructive actions.
//
// The pattern it supports (optimistic delete with rollback):
//   1. You have some local list/value in the UI.
//   2. The user does something low-risk-but-destructive (e.g. dismiss an alert).
//   3. We IMMEDIATELY update the UI (optimistic) so it feels instant.
//   4. We call the Server Action in the background.
//      - If it FAILS, we roll the UI back to how it was and show an error toast.
//      - If it SUCCEEDS, we show a success toast with an "Undo" button. Clicking Undo
//        runs the caller's undo handler (usually a restore Server Action).
//
// This hook does NOT render anything. It returns a `run` function you call from an
// onClick, plus a `pending` flag you can use to disable buttons. It pairs with the
// <ConfirmAction tier="undo"> component, which is the usual way to trigger it, but you
// can also use this hook directly when you need the optimistic-update + rollback logic.

import * as React from "react";

import {
  toastActionResult,
  toastActionResultWithUndo,
  type ToastMessages,
} from "@/lib/client/action-result";
import type { ActionResult } from "@/app/actions/_result";

type UseDestructiveActionOptions<T> = {
  // The Server Action to run. Must return an ActionResult so we know if it worked.
  action: () => Promise<ActionResult<T>>;

  // Optimistically change the UI before the server responds (e.g. remove the row).
  // Optional — omit it if there's nothing to update optimistically.
  optimisticUpdate?: () => void;

  // Undo the optimistic change if the server call FAILS (e.g. put the row back).
  // Should be the exact inverse of optimisticUpdate. Optional.
  rollback?: () => void;

  // Runs when the user clicks "Undo" in the success toast (usually a restore action).
  // If omitted, the success toast has no Undo button. Optional.
  onUndo?: () => void | Promise<unknown>;

  // Toast text. successMessage shows on success; failureMessage overrides the generic
  // error message. We never show raw server errors to the user.
  successMessage?: string;
  failureMessage?: string;

  // How long the Undo toast stays up, in milliseconds. Defaults to 5000.
  undoDurationMs?: number;
};

type UseDestructiveActionReturn = {
  // Call this to perform the action (e.g. from a button's onClick).
  run: () => Promise<void>;
  // True while the Server Action is in flight — use it to disable the trigger.
  pending: boolean;
};

export function useDestructiveAction<T>(
  options: UseDestructiveActionOptions<T>,
): UseDestructiveActionReturn {
  const {
    action,
    optimisticUpdate,
    rollback,
    onUndo,
    successMessage,
    failureMessage,
    undoDurationMs = 5000,
  } = options;

  const [pending, setPending] = React.useState(false);

  const run = React.useCallback(async () => {
    // Guard against double-clicks while a previous run is still going.
    if (pending) return;
    setPending(true);

    // Step 3: optimistically update the UI right away (if a handler was given).
    optimisticUpdate?.();

    const toastMessages: ToastMessages = {
      success: successMessage,
      error: failureMessage,
    };

    try {
      // Step 4: call the Server Action.
      const result = await action();

      if (result.ok) {
        // Success: show the toast (with Undo if a handler was provided).
        if (onUndo) {
          toastActionResultWithUndo(result, onUndo, toastMessages, undoDurationMs);
        } else {
          toastActionResult(result, toastMessages);
        }
      } else {
        // Failure: roll the optimistic change back, then show a generic error toast.
        rollback?.();
        toastActionResult(result, toastMessages);
      }
    } catch {
      // The action threw (network error, etc.). Roll back and show a generic error.
      // We swallow the thrown value on purpose — never surface raw errors to the user.
      rollback?.();
      toastActionResult({ ok: false, error: "unexpected" }, toastMessages);
    } finally {
      setPending(false);
    }
  }, [
    pending,
    action,
    optimisticUpdate,
    rollback,
    onUndo,
    successMessage,
    failureMessage,
    undoDurationMs,
  ]);

  return { run, pending };
}
