// Pulls a human-readable message from a Clerk error without leaking internals. Handles both shapes:
//  - Future/signals API: a single ClerkError with `longMessage`/`message`/`code`
//  - Classic API / thrown: { errors: [{ longMessage, message }] }
// Falls back to a generic message when the error isn't recognizable.
export function clerkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as {
      longMessage?: string;
      message?: string;
      errors?: Array<{ longMessage?: string; message?: string }>;
    };
    if (e.errors?.[0]) return e.errors[0].longMessage ?? e.errors[0].message ?? fallback;
    if (e.longMessage) return e.longMessage;
    if (e.message) return e.message;
  }
  return fallback;
}
