import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/v1/http";
import { config, isApiV1Route, shouldSkipAuthProtect } from "../../middleware";

// Origin used only to build absolute redirect URLs in tests and docs helpers.
// Clerk itself redirects to the live request origin; the path (/login) is what matters.
const LOCAL_ORIGIN = "http://localhost";

/**
 * Build a NextRequest for a pathname so Clerk's createRouteMatcher helpers
 * (isApiV1Route, shouldSkipAuthProtect) can classify it the same way middleware.ts does.
 *
 * Returns null when the path is not a valid URL path. Callers must handle that —
 * a bad path is not treated as public.
 */
export function requestForPath(pathname: string): NextRequest | null {
  if (!pathname.startsWith("/")) {
    return null;
  }

  try {
    return new NextRequest(new URL(pathname, LOCAL_ORIGIN));
  } catch {
    return null;
  }
}

/**
 * Return true when Next.js will actually run middleware.ts for this pathname.
 *
 * Next.js treats each `config.matcher` string as a whole-path regular expression.
 * If a protected page is missing from this list, clerkMiddleware never runs and
 * auth.protect() never runs either. That is the hole this helper exists to catch.
 */
export function middlewareRunsForPath(pathname: string): boolean {
  const matchers = config.matcher;

  if (!Array.isArray(matchers) || matchers.length === 0) {
    return false;
  }

  for (const matcher of matchers) {
    let regex: RegExp;
    try {
      regex = new RegExp(`^${matcher}$`);
    } catch {
      throw new Error(`middleware config.matcher is not valid regex: ${matcher}`);
    }

    if (regex.test(pathname)) {
      return true;
    }
  }

  return false;
}

/**
 * What an anonymous visitor should get for a path, using the live middleware
 * allowlists rather than a second copied list.
 *
 * - Static files the matcher skips: not an app route; Next serves the file.
 * - Public routes (login, landing, Clerk webhook, MCP): the request continues.
 * - /api/v1/*: middleware skips auth.protect() on purpose; the handler returns JSON 401.
 * - Everything else: auth.protect() sends the browser to /login.
 */
export function responseForAnonymousVisitor(pathname: string): NextResponse {
  const request = requestForPath(pathname);
  if (!request) {
    return NextResponse.json(
      { error: "invalid_path" },
      { status: 400 },
    );
  }

  if (!middlewareRunsForPath(pathname)) {
    // Matcher skip is only for Next internals and static assets (images, fonts, css).
    // Those are not authenticated app data.
    return NextResponse.next();
  }

  if (isApiV1Route(request)) {
    // Same envelope the v1 handlers return when resolveApiV1Ctx finds no session.
    return apiError(401, "unauthorized", "Authentication required.");
  }

  if (shouldSkipAuthProtect(request)) {
    return NextResponse.next();
  }

  // ClerkProvider signInUrl is "/login" (app/layout.tsx). auth.protect() uses that.
  return NextResponse.redirect(new URL("/login", LOCAL_ORIGIN));
}
