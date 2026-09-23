import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isApiV1Route, shouldSkipAuthProtect, checkAuthIpRateLimit } from "./middleware";

// ---------------------------------------------------------------------------
// Regression coverage for the staging bug: an unauthenticated request to
// /api/v1/me was intercepted by Clerk's auth.protect() (x-clerk-auth-reason:
// protect-rewrite) and rewritten to an HTML 404 before the route handler
// (which does its own Authorization: Bearer session-token auth, see
// lib/api/v1/auth.ts) ever ran.
//
// middleware.ts skips auth.protect() only for routes that
// shouldSkipAuthProtect() classifies as such. Before the fix, /api/v1/* was
// not part of that classification, so this test fails against the
// pre-fix middleware.
// ---------------------------------------------------------------------------

function requestFor(path: string, ip = "203.0.113.7"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"), {
    headers: { "x-forwarded-for": ip },
  });
}

describe("isApiV1Route", () => {
  it("matches /api/v1/me and other /api/v1/* paths", () => {
    expect(isApiV1Route(requestFor("/api/v1/me"))).toBe(true);
    expect(isApiV1Route(requestFor("/api/v1/properties"))).toBe(true);
    expect(isApiV1Route(requestFor("/api/v1/properties/123"))).toBe(true);
    expect(isApiV1Route(requestFor("/api/v1/properties/PROP-0001/documents"))).toBe(true);
  });

  it("does not match non-v1 API routes or MCP routes", () => {
    expect(isApiV1Route(requestFor("/api/webhooks/clerk"))).toBe(false);
    expect(isApiV1Route(requestFor("/api/mcp"))).toBe(false);
    expect(isApiV1Route(requestFor("/mcp"))).toBe(false);
  });
});

describe("shouldSkipAuthProtect", () => {
  it("skips auth.protect() for /api/v1/me so the handler can run its own bearer auth", () => {
    expect(shouldSkipAuthProtect(requestFor("/api/v1/me"))).toBe(true);
  });

  it("still skips auth.protect() for pre-existing public routes", () => {
    expect(shouldSkipAuthProtect(requestFor("/login"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/mcp"))).toBe(true);
  });

  it("still requires auth.protect() for a non-v1 protected app route", () => {
    expect(shouldSkipAuthProtect(requestFor("/app/dashboard"))).toBe(false);
  });

  // TM1-67: these two handlers authenticate themselves (Svix / CRON_SECRET). If they stay
  // behind auth.protect(), Clerk rewrites the third-party request to HTML before the handler runs.
  it("skips auth.protect() for the Resend webhook so Svix signature verification can run", () => {
    expect(shouldSkipAuthProtect(requestFor("/api/webhooks/resend"))).toBe(true);
  });

  it("skips auth.protect() for the draft-cleanup cron so the CRON_SECRET bearer check can run", () => {
    expect(shouldSkipAuthProtect(requestFor("/api/cron/cleanup-drafts"))).toBe(true);
  });

  it("still requires auth.protect() for session-cookie JSON routes that call resolveRouteCtx", () => {
    expect(shouldSkipAuthProtect(requestFor("/api/add-property/scan"))).toBe(false);
    expect(shouldSkipAuthProtect(requestFor("/api/documents/DOC-0001/summarize"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge IP limit on the unauthenticated auth entry points. Before this, only
// /mcp had any edge limit (AGENTS.md §86 listed "no rate limiting on auth
// actions" as an open gap), so one IP could loop /register or credential-stuff
// /login unthrottled.
// ---------------------------------------------------------------------------
describe("checkAuthIpRateLimit", () => {
  it("allows a normal burst from one IP, then 429s past the limit", () => {
    const ip = "198.51.100.42"; // unique per test — the window Map persists across cases
    // 20 is AUTH_IP_LIMIT; the first 20 must pass untouched.
    for (let i = 0; i < 20; i++) {
      expect(checkAuthIpRateLimit(requestFor("/login", ip))).toBeNull();
    }
    const blocked = checkAuthIpRateLimit(requestFor("/login", ip));
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("60");
  });

  it("buckets per IP — one noisy IP does not block another", () => {
    const noisy = "198.51.100.99";
    for (let i = 0; i < 21; i++) checkAuthIpRateLimit(requestFor("/register", noisy));
    expect(checkAuthIpRateLimit(requestFor("/register", noisy))?.status).toBe(429);
    expect(checkAuthIpRateLimit(requestFor("/register", "198.51.100.100"))).toBeNull();
  });

  it("covers every unauthenticated entry point", () => {
    const ip = "198.51.100.200"; // fresh IP; assert the first call is always allowed
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/accept-invitation",
      "/oauth-consent",
    ]) {
      expect(checkAuthIpRateLimit(requestFor(path, ip))).toBeNull();
    }
  });

  it("ignores routes that must not be throttled here", () => {
    // /api/v1 authenticates first and rate-limits per userId in lib/ratelimit.ts.
    // Webhooks are third-party senders; throttling them would drop Clerk/Resend events.
    expect(checkAuthIpRateLimit(requestFor("/api/v1/properties"))).toBeNull();
    expect(checkAuthIpRateLimit(requestFor("/api/webhooks/clerk"))).toBeNull();
    expect(checkAuthIpRateLimit(requestFor("/api/webhooks/resend"))).toBeNull();
    expect(checkAuthIpRateLimit(requestFor("/mcp"))).toBeNull();
  });
});
