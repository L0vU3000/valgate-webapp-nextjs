import { describe, it, expect } from "vitest";
import { addUtcMonths } from "./format";

// ---------------------------------------------------------------------------
// Self-check for the timezone-safe month arithmetic used by lease renewals.
//
// The bug we are guarding against: the native
// `date.setUTCMonth(date.getUTCMonth() + n)` leaves the day-of-month alone, so
// a date on the 31st rolls forward into the next month when the target month is
// shorter. addUtcMonths must instead clamp the day into the target month, and
// must never shift the result by a day regardless of the host timezone (all
// math is in UTC).
//
// Helper: build a UTC midnight timestamp from a Y/M/D, so the assertions read
// like calendar dates rather than raw millisecond numbers.
// ---------------------------------------------------------------------------

function utc(year: number, month1to12: number, day: number): number {
  return Date.UTC(year, month1to12 - 1, day);
}

describe("addUtcMonths", () => {
  it("advances a normal mid-month date by a full year", () => {
    // Mar 14, 2026 + 12 months => Mar 14, 2027 (no drift, no clamp).
    expect(addUtcMonths(utc(2026, 3, 14), 12)).toBe(utc(2027, 3, 14));
  });

  it("clamps Jan 31 + 1 month to the last day of February (the drift bug)", () => {
    // Native setUTCMonth would land on Mar 3, 2026. We require Feb 28, 2026.
    expect(addUtcMonths(utc(2026, 1, 31), 1)).toBe(utc(2026, 2, 28));
  });

  it("clamps into a leap February (Feb 29)", () => {
    // 2028 is a leap year, so Jan 31 + 1 month => Feb 29, 2028.
    expect(addUtcMonths(utc(2028, 1, 31), 1)).toBe(utc(2028, 2, 29));
  });

  it("rolls the year over when months pass December", () => {
    // Nov 30, 2026 + 3 months => Feb 28, 2027 (year rolls, day clamps).
    expect(addUtcMonths(utc(2026, 11, 30), 3)).toBe(utc(2027, 2, 28));
  });

  it("handles a realistic 12-month lease renewal off a month-end", () => {
    // A lease ending Aug 31 renewed for one 12-month term => Aug 31 next year
    // (Aug has 31 days, so no clamp — the date is preserved exactly).
    expect(addUtcMonths(utc(2026, 8, 31), 12)).toBe(utc(2027, 8, 31));
  });

  it("preserves the time-of-day component", () => {
    // 09:30 UTC must stay 09:30 UTC after the shift.
    const start = Date.UTC(2026, 0, 15, 9, 30, 0);
    const result = new Date(addUtcMonths(start, 1));
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(30);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCMonth()).toBe(1); // February
  });
});
