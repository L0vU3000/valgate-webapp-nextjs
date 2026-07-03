export const SITE_ACCESS_COOKIE_NAME = "site-access";

export const SITE_GATE_PATH = "/gate";

/** Cookie lifetime after a successful unlock (7 days). */
export const SITE_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const TOKEN_SALT = "valgate-site-access";

export function isSiteGateEnabled(): boolean {
  return Boolean(process.env.SITE_PASSWORD?.length);
}

export async function deriveSiteAccessToken(sitePassword: string): Promise<string> {
  const data = new TextEncoder().encode(`${sitePassword}:${TOKEN_SALT}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedSiteAccessToken(): Promise<string | null> {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) return null;
  return deriveSiteAccessToken(sitePassword);
}

export function sanitizeRedirectPath(from: string | null | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return "/";
  }
  if (from.includes("://")) {
    return "/";
  }
  const pathOnly = from.split("?")[0] ?? from;
  if (pathOnly.startsWith(SITE_GATE_PATH)) {
    return "/";
  }
  return from;
}

/** Auth/onboarding routes must stay reachable without the preview password. */
export function isSiteGateExempt(pathname: string): boolean {
  return (
    pathname === SITE_GATE_PATH ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/accept-invitation") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/api/webhooks/")
  );
}

export function getSiteAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SITE_ACCESS_MAX_AGE_SECONDS,
    path: "/",
  };
}
