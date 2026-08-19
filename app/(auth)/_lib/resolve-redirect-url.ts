const DEFAULT_REDIRECT = "/app";

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Shared by every auth-flow surface that reads a `redirect_url` query param — the login
// page, the accept-invitation flow, and the signed-in auth-entry redirect in middleware.
// Relative paths are always allowed. An absolute URL is allowed ONLY when its origin is an
// exact match (scheme + host + port) for currentOrigin — Clerk itself generates absolute
// redirect_url values, so rejecting every absolute URL loses deep links like /property/123
// after login. Either way, only pathname+search+hash is ever returned — never the absolute
// URL itself — so a crafted redirect_url can't send a signed-in user off to an
// attacker-controlled host. Protocol-relative URLs ("//host/path") are always rejected, even
// if the host happens to match, since browsers resolve them against the current scheme.
// Paths back into the auth flow itself (/login, /register) are also rejected: honoring one
// of those as a target would bounce the user straight back into the redirect that just
// landed them here, looping forever.
export function resolveRedirectUrl(
  raw: string | null | undefined,
  currentOrigin: string,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!raw || raw.startsWith("//")) return fallback;

  let pathname: string;
  let search: string;
  let hash: string;

  if (raw.startsWith("/")) {
    try {
      const parsed = new URL(raw, "http://localhost");
      pathname = parsed.pathname;
      search = parsed.search;
      hash = parsed.hash;
    } catch {
      return fallback;
    }
  } else {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return fallback;
    }
    const allowedOrigin = originOf(currentOrigin);
    if (!allowedOrigin || parsed.origin !== allowedOrigin) return fallback;
    pathname = parsed.pathname;
    search = parsed.search;
    hash = parsed.hash;
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return fallback;

  return `${pathname}${search}${hash}`;
}

// Middleware-only wrapper: resolves the signed-in auth-entry redirect target (see
// resolveRedirectUrl above) into an absolute URL against the incoming request, since
// NextResponse.redirect() needs a full URL rather than a bare path. requestUrl doubles as
// the current origin — it's the incoming request's own absolute URL.
export function resolveAuthEntryRedirect(requestUrl: string, redirectUrlParam: string | null): URL {
  return new URL(resolveRedirectUrl(redirectUrlParam, requestUrl), requestUrl);
}

// LoginPage wrapper: reads redirect_url straight off useSearchParams(). Both the password
// flow (onSubmit) and the device-trust OTP flow (handleVerify) finish through the same
// completeSignIn() call, so they share this one call instead of each re-deriving the target.
// currentOrigin is the caller's browser origin (window.location.origin) so a Clerk-generated
// same-origin absolute redirect_url is preserved.
export function resolveLoginRedirectTarget(searchParams: URLSearchParams, currentOrigin: string): string {
  return resolveRedirectUrl(searchParams.get("redirect_url"), currentOrigin);
}

// signIn.finalize()'s navigate callback fires just before the session (and any Organization)
// is actually set — per Clerk's docs, it must not depend on the new session being readable yet
// (server actions, setActive(), etc. all race the activation this callback precedes). So this
// never branches on the session itself: every successful finalize lands on /login/tasks, which
// waits for a real active session before deciding whether a task needs resolving (e.g.
// choose-organization defaulting an org) or the session is already fully active and can go
// straight through to redirectTarget.
export function resolveFinalizeNavigateDestination(redirectTarget: string): string {
  return `/login/tasks?redirect_url=${encodeURIComponent(redirectTarget)}`;
}

export type LoginTaskAction = "redirect" | "activate-default-org" | "render-task";

// /login/tasks lands here for every finalize() navigation now, once the Clerk session (and its
// currentTask, if any) has actually loaded. A session with no pending task and an already-active
// org is fully resolved — go straight to redirectUrl. A session with no pending task and no
// active org, or one explicitly carrying a choose-organization task, needs the default-org
// activation flow. Anything else (reset-password, setup-mfa, ...) is a task that must render its
// own UI rather than have an org activated on its behalf.
//
// activeOrganizationId must come from the actual Clerk auth claims (useAuth().orgId), never from
// SessionResource.lastActiveOrganizationId — that field can stay populated in the browser from a
// prior session even when the current session has no active org, which used to send users
// straight to redirectUrl with no orgId claim and fail downstream with "unauthenticated".
export function resolveLoginTaskAction(session: {
  currentTaskKey: string | null;
  activeOrganizationId: string | null;
}): LoginTaskAction {
  if (!session.currentTaskKey) {
    return session.activeOrganizationId ? "redirect" : "activate-default-org";
  }
  return session.currentTaskKey === "choose-organization" ? "activate-default-org" : "render-task";
}
