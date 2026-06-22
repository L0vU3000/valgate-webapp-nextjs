// Pure, framework-free logic for <ConfirmAction>'s tier gating. Kept in its own
// plain-.ts file (no JSX, no React) so it can be unit-tested without a React/JSX
// build step, and reused by the component in components/ui/confirm-action.tsx.

// The three risk levels a destructive action can have. See the table in
// components/ui/confirm-action.tsx for which tier to use when.
export type ConfirmTier = "undo" | "confirm" | "typed";

// Decides whether the Confirm button should be DISABLED, given the tier, the value
// the user must type (typed tier only), what they've typed so far, and whether an
// action is already in flight.
//
// Rules, in order:
//   1. While an action is pending, Confirm is always disabled (no double-submits).
//   2. For the "typed" tier WITH a required value, Confirm stays disabled until the
//      typed text matches that value EXACTLY (case-sensitive).
//   3. Otherwise Confirm is enabled.
export function isConfirmDisabled(args: {
  tier: ConfirmTier;
  typedConfirmValue?: string;
  typed: string;
  pending: boolean;
}): boolean {
  const { tier, typedConfirmValue, typed, pending } = args;
  if (pending) return true;
  const requiresTyping = tier === "typed" && Boolean(typedConfirmValue);
  if (requiresTyping) return typed !== typedConfirmValue;
  return false;
}
