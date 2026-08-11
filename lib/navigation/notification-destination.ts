// Cut-feature route roots with no real page under app/ — see
// docs/plans/PUBLIC-LAUNCH-PLAN.md §1.2. Shared between the resolver below (so a
// notification click can't navigate to one of these) and tests/navigation-integrity.test.ts
// (so "is this route cut" has exactly one definition).
export const CUT_ROUTE_PREFIXES = [
  "pro",
  "analytics",
  "compliance",
  "directory",
  "estate-planning",
  "work-orders",
  "activity",
  "dbdiagram",
  "docs",
  "launch",
  "map",
] as const;

function isCutDestination(pathname: string): boolean {
  return CUT_ROUTE_PREFIXES.some((prefix) => pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`));
}

/**
 * Resolves a notification's `linkTo` into a safe same-site navigation target, or
 * null if it should not navigate anywhere: empty, protocol-relative/external, or
 * pointing at a feature cut from the MVP. Historical notification rows can still
 * carry dead linkTo values, so every notification click handler must call this
 * before router.push.
 */
export function resolveNotificationDestination(linkTo: string | null | undefined): string | null {
  if (!linkTo) return null;
  if (linkTo.startsWith("//")) return null;
  if (!linkTo.startsWith("/")) return null;
  // WHATWG URL parsing treats "\" as equivalent to "/" for special schemes, so
  // "/\evil.example.com" starts with a single forward slash (passing the checks
  // above) yet resolves to the external host https://evil.example.com. Reject any
  // backslash outright rather than trying to enumerate every normalization case.
  if (linkTo.includes("\\")) return null;

  const pathname = linkTo.split("?")[0].split("#")[0];
  if (isCutDestination(pathname)) return null;

  return linkTo;
}
