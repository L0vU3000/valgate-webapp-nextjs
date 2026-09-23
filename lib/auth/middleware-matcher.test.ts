import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { config, shouldSkipAuthProtect } from "../../middleware";
import {
  middlewareRunsForPath,
  requestForPath,
  responseForAnonymousVisitor,
} from "./middleware-matcher";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Read middleware.ts so tests can pin the live allowlist and matcher text
 * without importing private createRouteMatcher constants (they are not exported).
 */
function readMiddlewareSource(): string {
  return fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
}

/**
 * Build a NextRequest the same way middleware.test.ts does.
 */
function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost"));
}

// Routes a signed-out visitor must NOT be able to use. If any of these become
// public in isPublicRoute, the matcher has a real hole.
const AUTHENTICATED_ONLY_PATHS = [
  "/app",
  "/portfolio",
  "/settings",
  "/profile",
  "/rental",
  "/add-property",
  "/design-system",
  "/property/PRP-0001",
  "/property/PRP-0001/overview",
  "/property/PRP-0001/documents",
  "/api/add-property/scan",
  "/api/documents/DOC-0001/summarize",
];

// Paths the matcher must still run on (otherwise auth.protect never fires).
const MATCHER_MUST_COVER = [
  "/",
  "/login",
  "/app",
  "/portfolio",
  "/api/v1/me",
  "/api/v1/properties",
  "/api/add-property/scan",
  "/mcp",
  "/.well-known/oauth-protected-resource",
  "/__clerk/handshake",
];

// Static files the Clerk-recommended matcher is supposed to skip.
const MATCHER_MUST_SKIP = [
  "/favicon.ico",
  "/logo.png",
  "/assets/photo.jpg",
  "/_next/static/chunks/main.js",
];

describe("requestForPath", () => {
  it("builds a request for a normal pathname", () => {
    const request = requestForPath("/portfolio");
    expect(request).not.toBeNull();
    expect(request?.nextUrl.pathname).toBe("/portfolio");
  });

  it("returns null for a path that is not a URL path", () => {
    expect(requestForPath("portfolio")).toBeNull();
    expect(requestForPath("")).toBeNull();
  });
});

describe("middleware config.matcher coverage", () => {
  it("uses the Clerk catch-all plus API and /__clerk matchers", () => {
    expect(config.matcher).toEqual([
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      "/(api|trpc)(.*)",
      "/__clerk/(.*)",
    ]);
  });

  it("runs middleware for every app and API path we care about", () => {
    for (const pathname of MATCHER_MUST_COVER) {
      expect(
        middlewareRunsForPath(pathname),
        `middleware must run for ${pathname} or auth.protect never runs`,
      ).toBe(true);
    }
  });

  it("skips Next internals and static files, not app routes", () => {
    for (const pathname of MATCHER_MUST_SKIP) {
      expect(
        middlewareRunsForPath(pathname),
        `${pathname} should be a static skip, not an unprotected page`,
      ).toBe(false);
    }
  });

  it("still runs middleware for .json (js(?!on) must not skip JSON)", () => {
    expect(middlewareRunsForPath("/file.json")).toBe(true);
    expect(middlewareRunsForPath("/api/v1/me")).toBe(true);
  });
});

describe("public-route allowlist accuracy", () => {
  it("does not mark authenticated-only routes as skip-protect", () => {
    for (const pathname of AUTHENTICATED_ONLY_PATHS) {
      expect(
        shouldSkipAuthProtect(requestFor(pathname)),
        `${pathname} must go through auth.protect()`,
      ).toBe(false);
    }
  });

  it("still skips auth.protect for the real public surfaces", () => {
    expect(shouldSkipAuthProtect(requestFor("/"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/login"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/login/tasks"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/register"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/forgot-password"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/accept-invitation"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/oauth-consent"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/api/webhooks/clerk"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/mcp"))).toBe(true);
    expect(shouldSkipAuthProtect(requestFor("/.well-known/oauth-protected-resource"))).toBe(true);
  });

  it("does not reintroduce a stale /docs public matcher", () => {
    const source = readMiddlewareSource();
    expect(source).not.toMatch(/["']\/docs\(/);
  });

  it("middleware.ts still calls auth.protect for non-skipped routes", () => {
    const source = readMiddlewareSource();
    expect(source).toContain("if (!shouldSkipAuthProtect(request)) await auth.protect()");
  });
});

describe("anonymous visitor: 401 or redirect", () => {
  it("redirects an anonymous browser away from /portfolio (authenticated-only)", async () => {
    const response = responseForAnonymousVisitor("/portfolio");

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("returns JSON 401 for anonymous GET /api/v1/me", async () => {
    const response = responseForAnonymousVisitor("/api/v1/me");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      error: { code: "unauthorized", message: expect.any(String) },
    });
  });

  it("lets an anonymous visitor through to /login", () => {
    const response = responseForAnonymousVisitor("/login");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
