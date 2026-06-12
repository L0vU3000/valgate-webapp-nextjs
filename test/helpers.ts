import { vi } from "vitest";

// The pinned "now" for the whole suite: 2026-06-12 00:00:00 UTC.
//
// Date.UTC's month argument is 0-indexed, so month 5 == June.
//
// Why pin the clock at all: the query layer threads `Date.now()` /
// `new Date()` through several derivations — `daysLeft` on certifications and
// leases, "Overdue Nd" labels, this-month collection rates, the 90-day
// expiring-lease windows, and the rolling cashflow series. If the clock were
// left live, every golden value below would drift by one day each day and the
// suite would "rot by tomorrow". Freezing it makes every count reproducible.
export const PINNED_NOW = Date.UTC(2026, 5, 12);

// Installs fake timers and pins the system clock to PINNED_NOW.
//
// `toFake: ["Date"]` means ONLY the Date constructor / Date.now are faked —
// we deliberately leave setTimeout, queueMicrotask, etc. real so that the
// async `await`-driven query functions still resolve normally.
export function freezeClock(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(PINNED_NOW);
}

// Restores the real clock. Call this in afterEach so a frozen clock never
// leaks from one test file into another.
export function unfreezeClock(): void {
  vi.useRealTimers();
}
