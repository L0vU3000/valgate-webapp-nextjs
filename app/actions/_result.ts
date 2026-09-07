import { revalidateTag } from "next/cache";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const NOT_IMPLEMENTED_UNTIL_B6 = {
  ok: false as const,
  error: "not implemented until B6",
};

/** FE contract tag strings. Next 15's revalidateTag takes a single arg (Next 16 added the cache-profile 2nd arg). */
export function revalidateFeTag(tag: string): void {
  revalidateTag(tag);
}

/**
 * TM1-64 — the single response every rate-limited action edge returns.
 *
 * Deliberately generic (C5): it says the caller is going too fast, never which limiter
 * fired or what the quota is, so it leaks nothing about our thresholds. Typed as
 * `ok: false` so it is assignable to ActionResult<T> for any T.
 */
export const TOO_MANY_REQUESTS = {
  ok: false as const,
  error: "Too many requests. Please try again in a moment.",
};
