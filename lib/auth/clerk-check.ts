export const DEMO_CLERK_SENTINEL = "demo-no-clerk";

/**
 * Predicate to determine if a CLERK_SECRET_KEY is a real functional secret
 * or the designated non-functional demo sentinel.
 *
 * A key is "real" if it is present and NOT the specific sentinel value.
 * This prevents hardcoded "test-key-shaped" strings from passing as real secrets
 * while allowing an explicit, clearly non-secret sentinel to trigger demo behavior.
 */
export function isRealClerkKey(key: string | undefined | null): boolean {
  if (!key) return false;
  return key !== DEMO_CLERK_SENTINEL;
}
