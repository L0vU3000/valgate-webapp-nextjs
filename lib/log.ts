import "server-only";

// B9 / L5 minimum: one structured log sink. Emits single-line JSON so a log drain (Vercel,
// Datadog, etc.) can parse level + event + fields without a regex. Swap the sink here to wire
// real error tracking (Sentry) later — call sites don't change.
// ponytail: console is the sink. Replace the body, not the call sites, when a drain exists.

type Fields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, fields?: Fields): void {
  // Never log secrets/PII — pass identifiers (userId/orgId), not raw inputs or error objects with stack+data.
  const line = JSON.stringify({ level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Pass an Error as `err`; we surface name+message only (never the whole object outbound — C5).
export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, err?: unknown, fields?: Fields) =>
    emit("error", event, {
      ...fields,
      error: err instanceof Error ? `${err.name}: ${err.message}` : err == null ? undefined : String(err),
    }),
};
