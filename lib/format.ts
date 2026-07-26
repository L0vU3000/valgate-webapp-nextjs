/**
 * Compact currency format: $1.28M, $456K, $800
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Full locale currency format: $1,278,000
 */
export function formatCurrencyFull(n: number): string {
  return "$" + n.toLocaleString();
}

/**
 * Byte count: "512 B", "1.4 KB", "3.8 MB"
 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Add a whole number of months to a UTC timestamp, safely.
 *
 * Why this exists instead of `date.setUTCMonth(date.getUTCMonth() + n)`:
 * the native call mutates only the month field and leaves the day-of-month
 * alone. When the starting day does not exist in the target month it rolls
 * forward into the following month. For example, taking Jan 31 and adding one
 * month with the native call lands on Mar 3 (because Feb has no 31st, so the
 * extra days spill over). For a lease that ends on the 31st, that silent drift
 * pushes the renewal end date past the real anniversary.
 *
 * This helper instead clamps the day to the last valid day of the target
 * month. Jan 31 + 1 month becomes Feb 28 (or Feb 29 in a leap year), and a
 * normal date like Mar 14 + 12 months simply becomes Mar 14 next year. All
 * arithmetic is done in UTC so the result never shifts by a day due to the
 * server's local timezone.
 *
 * @param ts        Starting point as a Unix millisecond timestamp.
 * @param months    How many whole months to add (may be negative).
 * @returns         A new Unix millisecond timestamp, same time-of-day, with
 *                  the day clamped into the target month.
 */
export function addUtcMonths(ts: number, months: number): number {
  const start = new Date(ts);

  // Pull the starting date apart into its UTC pieces so we can rebuild it.
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  // The raw target month index (can be < 0 or > 11; Date.UTC normalises it).
  const targetMonthIndex = month + months;

  // How many days the target month actually has. Day 0 of "the month after"
  // is the last day of the month we want, which gives us the clamp ceiling.
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, targetMonthIndex + 1, 0),
  ).getUTCDate();

  // Never let the day exceed what the target month can hold.
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  // Rebuild the timestamp, preserving the original time-of-day in UTC.
  return Date.UTC(
    year,
    targetMonthIndex,
    clampedDay,
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds(),
  );
}

/**
 * Locale date format: "Mar 14, 2026"
 */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Relative time from a Unix ms timestamp: "2m ago", "3h ago", "Yesterday", "Feb 14"
 */
export function formatRelativeTime(createdAt: number): string {
  // Clamp to 0: a just-created row's DB timestamp can be a few seconds ahead of
  // the client clock (normal skew), which would otherwise render "-1m ago".
  const diff = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
