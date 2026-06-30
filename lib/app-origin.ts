import "server-only";

/**
 * Absolute origin for server-generated links (Clerk invitation redirects, etc.).
 * Set NEXT_PUBLIC_APP_URL in .env.local for local dev, e.g. http://localhost:3001
 */
export function getAppOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3001";
}

export function appAbsoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppOrigin()}${normalized}`;
}

/** Where Clerk sends invitees after they click the link in the Resend email. */
export function getClientInvitationRedirectUrl(): string {
  return appAbsoluteUrl("/accept-invitation");
}
