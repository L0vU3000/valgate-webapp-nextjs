"use client";

// Client-side helpers that turn a Server Action's result into a user-facing toast.
//
// Every Server Action in this codebase returns the shared `ActionResult<T>` shape
// from `@/app/actions/_result`:
//     { ok: true,  data: T }      // success
//     { ok: false, error: string } // failure
//
// SECURITY NOTE (see CLAUDE.md "Never return err.message to the client"):
// We never show the raw `error` string from a failed result to the user, because it
// could leak internal details. Instead we show a fixed, generic failure message and
// let the caller optionally override it. The real error is already logged on the server.

import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/_result";

// Some action families (e.g. the Pro interface in app/(pro)/pro/actions.ts)
// return a leaner result shape with no `data` payload on success:
//     { ok: true } | { ok: false; error: string }
// The shared toast + <ConfirmAction> + useDestructiveAction helpers all expect
// the canonical ActionResult<T> ({ ok: true; data: T } | ...). This adapter
// normalises the lean shape into ActionResult<void> so those primitives can be
// used as-is, without changing the Pro actions' return type.
export type LeanActionResult =
  | { ok: true }
  | { ok: false; error: string };

export function toActionResult(
  result: LeanActionResult,
): ActionResult<void> {
  return result.ok ? { ok: true, data: undefined } : result;
}

// Text you can customise per call. Everything is optional — sensible defaults below.
export type ToastMessages = {
  // Shown when the action succeeds. Defaults to "Done".
  success?: string;
  // Shown when the action fails. Defaults to a generic, safe message.
  // We deliberately do NOT use result.error here unless you opt in (see allowServerError).
  error?: string;
  // If true, the server's own error string is shown instead of the generic one.
  // Only set this when the action is known to return safe, user-friendly errors.
  allowServerError?: boolean;
};

const DEFAULT_SUCCESS = "Done";
const DEFAULT_ERROR = "Something went wrong. Please try again.";

// Takes the result of a Server Action and fires the matching sonner toast.
// Returns `true` when the action succeeded, so callers can branch:
//
//     const result = await archivePropertyAction(id);
//     if (toastActionResult(result, { success: "Property archived" })) {
//       router.push("/portfolio");
//     }
export function toastActionResult<T>(
  result: ActionResult<T>,
  messages: ToastMessages = {},
): boolean {
  if (result.ok) {
    toast.success(messages.success ?? DEFAULT_SUCCESS);
    return true;
  }

  // Failure path. Pick a safe message: the caller's override, or the server's own
  // string only if explicitly allowed, otherwise the generic fallback.
  const failureText = messages.error
    ? messages.error
    : messages.allowServerError
      ? result.error
      : DEFAULT_ERROR;

  toast.error(failureText);
  return false;
}

// Same as toastActionResult, but the success toast also shows an "Undo" button for
// `durationMs` milliseconds. Use this for the `undo` tier of destructive actions —
// the action has already run, and clicking Undo calls `onUndo` (usually a restore
// Server Action). The promise from `onUndo` is fired but not awaited here; surface
// its own result with another toast inside `onUndo` if you need to.
export function toastActionResultWithUndo<T>(
  result: ActionResult<T>,
  onUndo: () => void | Promise<unknown>,
  messages: ToastMessages = {},
  durationMs = 5000,
): boolean {
  if (result.ok) {
    toast.success(messages.success ?? DEFAULT_SUCCESS, {
      action: {
        label: "Undo",
        onClick: () => {
          // Run the caller's undo handler. We don't await it so the toast can close
          // immediately; the handler can show its own toast if it needs to report.
          void onUndo();
        },
      },
      duration: durationMs,
    });
    return true;
  }

  const failureText = messages.error
    ? messages.error
    : messages.allowServerError
      ? result.error
      : DEFAULT_ERROR;

  toast.error(failureText);
  return false;
}
