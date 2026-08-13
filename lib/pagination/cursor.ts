// Opaque cursor encode/decode for stable DB-cursor pagination (HTTP API v1 list endpoints).
// Deliberately framework/db-free: base64url(JSON) is enough to make the cursor opaque to
// callers (they must not construct or interpret it) while staying trivially debuggable
// server-side. Not a security boundary — callers are already org-scoped before this runs.
export function encodeCursor<T extends Record<string, unknown>>(fields: T): string {
  return Buffer.from(JSON.stringify(fields), "utf8").toString("base64url");
}

// `requiredKeys` lets a caller assert the exact shape it expects (e.g. ["createdAt", "id"])
// so a cursor from a different endpoint/shape is rejected rather than silently accepted.
export function decodeCursor<T extends Record<string, unknown>>(
  cursor: string,
  requiredKeys?: (keyof T)[],
): T | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    if (requiredKeys && !requiredKeys.every((key) => key in parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}
