import { describe, it, expect } from "vitest";
import { isConfirmDisabled } from "@/lib/client/confirm-tier";

// Self-check for the non-trivial logic in <ConfirmAction>: the tier-gating rule that
// decides when the Confirm button is enabled. This is the part most likely to break
// silently (a disabled-state bug would let users confirm destructive actions early,
// or block them forever), so we pin it down here.

describe("isConfirmDisabled — tier gating", () => {
  it("confirm tier: enabled by default (no typing required)", () => {
    expect(
      isConfirmDisabled({ tier: "confirm", typed: "", pending: false }),
    ).toBe(false);
  });

  it("undo tier: enabled by default (no typing required)", () => {
    expect(
      isConfirmDisabled({ tier: "undo", typed: "", pending: false }),
    ).toBe(false);
  });

  it("typed tier: DISABLED until the typed text matches exactly", () => {
    const base = {
      tier: "typed" as const,
      typedConfirmValue: "12 Oak Street",
      pending: false,
    };
    // Nothing typed yet → disabled.
    expect(isConfirmDisabled({ ...base, typed: "" })).toBe(true);
    // Partial / wrong text → still disabled.
    expect(isConfirmDisabled({ ...base, typed: "12 Oak" })).toBe(true);
    // Wrong case → still disabled (must match exactly).
    expect(isConfirmDisabled({ ...base, typed: "12 oak street" })).toBe(true);
    // Exact match → ENABLED.
    expect(isConfirmDisabled({ ...base, typed: "12 Oak Street" })).toBe(false);
  });

  it("typed tier with no required value: behaves like confirm (enabled)", () => {
    expect(
      isConfirmDisabled({ tier: "typed", typed: "", pending: false }),
    ).toBe(false);
  });

  it("any tier: ALWAYS disabled while an action is pending", () => {
    expect(
      isConfirmDisabled({ tier: "confirm", typed: "", pending: true }),
    ).toBe(true);
    expect(
      isConfirmDisabled({
        tier: "typed",
        typedConfirmValue: "DELETE",
        typed: "DELETE", // even with a correct match…
        pending: true, // …pending wins and keeps it disabled.
      }),
    ).toBe(true);
  });
});
