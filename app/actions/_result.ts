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
