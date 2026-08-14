import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isApiV1Route, shouldSkipAuthProtect } from "./middleware";

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

function requestFor(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"));
}

describe("isApiV1Route", () => {
  it("matches /api/v1/me and other /api/v1/* paths", () => {
    expect(isApiV1Route(requestFor("/api/v1/me"))).toBe(true);
    expect(isApiV1Route(requestFor("/api/v1/properties"))).toBe(true);
    expect(isApiV1Route(requestFor("/api/v1/properties/123"))).toBe(true);
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
});
