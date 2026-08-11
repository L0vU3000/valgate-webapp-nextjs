const DEFAULT_REDIRECT = "/app";

// Shared by every auth-flow surface that reads a `redirect_url` query param — the login
// page, the accept-invitation flow, and the signed-in auth-entry redirect in middleware.
// Only same-origin relative paths are ever returned — never an absolute URL — so a
// crafted redirect_url can't send a signed-in user off to an attacker-controlled host.
// Paths back into the auth flow itself (/login, /register) are also rejected: honoring one
// of those as a target would bounce the user straight back into the redirect that just
// landed them here, looping forever.
export function resolveRedirectUrl(raw: string | null | undefined, fallback: string = DEFAULT_REDIRECT): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;

  let pathname: string;
  let search: string;
  let hash: string;
  try {
    const parsed = new URL(raw, "http://localhost");
    pathname = parsed.pathname;
    search = parsed.search;
    hash = parsed.hash;
  } catch {
    return fallback;
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return fallback;

  return `${pathname}${search}${hash}`;
}

// Middleware-only wrapper: resolves the signed-in auth-entry redirect target (see
// resolveRedirectUrl above) into an absolute URL against the incoming request, since
// NextResponse.redirect() needs a full URL rather than a bare path.
export function resolveAuthEntryRedirect(requestUrl: string, redirectUrlParam: string | null): URL {
  return new URL(resolveRedirectUrl(redirectUrlParam), requestUrl);
}

// LoginPage wrapper: reads redirect_url straight off useSearchParams(). Both the password
// flow (onSubmit) and the device-trust OTP flow (handleVerify) finish through the same
// completeSignIn() call, so they share this one call instead of each re-deriving the target.
export function resolveLoginRedirectTarget(searchParams: URLSearchParams): string {
  return resolveRedirectUrl(searchParams.get("redirect_url"));
}
