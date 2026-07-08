const DEFAULT_REDIRECT = "/launch";

// Shared by every auth-flow page that reads a `redirect_url` query param
// (login, login/tasks, launch). Only same-origin relative paths are ever
// returned — never an absolute URL — so a crafted redirect_url can't send a
// signed-in user off to an attacker-controlled host. Paths back into the
// auth flow itself (/login, /register) are also rejected: honoring one of
// those as a target would bounce the user straight back into the redirect
// that just landed them here, looping forever.
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
