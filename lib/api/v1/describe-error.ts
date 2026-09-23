import "server-only";

// Server-side error reporting for /api/v1 routes.
//
// Why this exists: routes used to log `{ error: String(err) }`. For a drizzle
// failure that yields ONLY the statement text — `Failed query: insert into
// "properties" (...) params: ...` — and drops the actual Postgres reason, which
// drizzle puts in `err.cause`. A missing column then reads as an unexplained 500
// and the real cause is unrecoverable from logs.
//
// `describeError` walks the cause chain (and postgres.js's `detail`/`code`
// fields) so the message that reaches the log names what actually failed.

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : null;

/** First defined string among the candidates, trimmed. */
const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
};

/**
 * Turns any thrown value into a log-safe string that includes the underlying
 * database cause.
 *
 * Depth is capped at 5: a self-referential `cause` chain must not loop forever.
 * The original error's own message is always kept, so a plain non-drizzle
 * failure logs exactly as it did before.
 */
export function describeError(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();

  let current: unknown = err;
  for (let depth = 0; depth < 5 && current != null; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);

    const record = asRecord(current);
    // Error subclasses expose `message`; non-Error throws may hold a string.
    const message = firstString(record?.["message"], typeof current === "string" ? current : undefined);
    if (message && !parts.includes(message)) parts.push(message);

    if (record) {
      // postgres.js hangs these off the error itself rather than a nested cause.
      // Both matter: `code` (e.g. 23503 = FK violation) classifies the failure,
      // `detail` names the offending value. Append each independently — taking
      // only the first would drop the SQLSTATE whenever a detail was present.
      for (const field of ["code", "detail"] as const) {
        const value = firstString(record[field]);
        if (value && !parts.includes(value)) parts.push(value);
      }
      current = record["cause"];
    } else {
      current = undefined;
    }
  }

  if (parts.length === 0) return String(err);
  return parts.join(" | ");
}
