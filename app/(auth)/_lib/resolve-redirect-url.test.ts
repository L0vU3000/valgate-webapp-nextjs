// Regression coverage for Step 1.1 of the public launch plan: the post-auth landing path
// moved to `/app` after the old decider page was removed. These tests pin the
// redirect-resolution contract that login, accept-invitation, and the signed-in
// auth-entry middleware all rely on.
//
// Preview-deploy regression: requesting a protected route (e.g. /property/123) redirects to
// /login?redirect_url=<absolute-same-origin-url> (Clerk always generates an absolute
// redirect_url). The resolver used to reject every absolute URL outright, so the deep link
// was lost and the user always landed on /app after signing in. The fix: allow an absolute
// redirect_url only when its origin exactly equals the caller-supplied current origin, and
// return just pathname+search+hash — never the absolute URL itself.

import { describe, it, expect } from "vitest";
import { resolveRedirectUrl, resolveAuthEntryRedirect, resolveLoginRedirectTarget } from "./resolve-redirect-url";

const ORIGIN = "http://localhost:3000";

describe("resolveRedirectUrl", () => {
  it("falls back to /app when no redirect_url is given", () => {
    expect(resolveRedirectUrl(null, ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl(undefined, ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("", ORIGIN)).toBe("/app");
  });

  it("passes through a safe same-origin relative path, including search and hash", () => {
    expect(resolveRedirectUrl("/property/123?tab=documents#top", ORIGIN)).toBe(
      "/property/123?tab=documents#top",
    );
  });

  it("rejects protocol-relative destinations, even when the host matches the current origin", () => {
    expect(resolveRedirectUrl("//evil.example.com/steal", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("//localhost:3000/steal", ORIGIN)).toBe("/app");
  });

  it("allows an absolute redirect_url whose origin exactly matches the current origin, returning only pathname+search+hash", () => {
    expect(resolveRedirectUrl("http://localhost:3000/property/123?tab=documents#top", ORIGIN)).toBe(
      "/property/123?tab=documents#top",
    );
    expect(resolveRedirectUrl("http://localhost:3000/app", ORIGIN)).toBe("/app");
  });

  it("rejects an absolute redirect_url on a different host (external origin)", () => {
    expect(resolveRedirectUrl("https://evil.example.com", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("http://evil.example.com/app", ORIGIN)).toBe("/app");
  });

  it("rejects an absolute redirect_url with a scheme mismatch against the same host", () => {
    expect(resolveRedirectUrl("https://localhost:3000/app", ORIGIN)).toBe("/app");
  });

  it("rejects an absolute redirect_url with a port mismatch against the same host", () => {
    expect(resolveRedirectUrl("http://localhost:4000/app", ORIGIN)).toBe("/app");
  });

  it("rejects a malformed absolute URL", () => {
    expect(resolveRedirectUrl("http://", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("https://[", ORIGIN)).toBe("/app");
  });

  it("rejects auth-loop destinations back into /login or /register", () => {
    expect(resolveRedirectUrl("/login", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("/login?redirect_url=%2Fapp", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("/register", ORIGIN)).toBe("/app");
  });

  it("rejects a same-origin absolute auth-loop destination back into /login or /register", () => {
    expect(resolveRedirectUrl("http://localhost:3000/login", ORIGIN)).toBe("/app");
    expect(resolveRedirectUrl("http://localhost:3000/register?redirect_url=%2Fapp", ORIGIN)).toBe("/app");
  });

  it("honors an explicit fallback override", () => {
    expect(resolveRedirectUrl(null, ORIGIN, "/custom")).toBe("/custom");
    expect(resolveRedirectUrl("https://evil.example.com", ORIGIN, "/custom")).toBe("/custom");
  });
});

describe("resolveAuthEntryRedirect", () => {
  const requestUrl = "http://localhost:3000/login";

  it("falls back to /app when no redirect_url param is present", () => {
    const result = resolveAuthEntryRedirect(requestUrl, null);
    expect(result.toString()).toBe("http://localhost:3000/app");
  });

  it("resolves a safe relative redirect_url to an absolute URL on the request origin", () => {
    const result = resolveAuthEntryRedirect(requestUrl, "/property/123");
    expect(result.toString()).toBe("http://localhost:3000/property/123");
  });

  it("resolves a same-origin absolute redirect_url (Clerk's format) to that same destination", () => {
    const result = resolveAuthEntryRedirect(
      requestUrl,
      "http://localhost:3000/property/123?tab=documents#top",
    );
    expect(result.toString()).toBe("http://localhost:3000/property/123?tab=documents#top");
  });

  it("resolves the exact preview-deploy regression: absolute redirect_url on the preview origin is preserved", () => {
    const previewRequestUrl = "https://preview-abc123.example.dev/login";
    const result = resolveAuthEntryRedirect(
      previewRequestUrl,
      "https://preview-abc123.example.dev/property/123",
    );
    expect(result.toString()).toBe("https://preview-abc123.example.dev/property/123");
  });

  it("rejects an absolute redirect_url whose origin does not match the request origin", () => {
    const previewRequestUrl = "https://preview-abc123.example.dev/login";
    const result = resolveAuthEntryRedirect(
      previewRequestUrl,
      "https://preview-xyz999.example.dev/property/123",
    );
    expect(result.toString()).toBe("https://preview-abc123.example.dev/app");
  });

  it("rejects an absolute redirect_url and falls back to /app", () => {
    const result = resolveAuthEntryRedirect(requestUrl, "https://evil.example.com/phish");
    expect(result.toString()).toBe("http://localhost:3000/app");
  });

  it("rejects a protocol-relative redirect_url and falls back to /app", () => {
    const result = resolveAuthEntryRedirect(requestUrl, "//evil.example.com");
    expect(result.toString()).toBe("http://localhost:3000/app");
  });

  it("rejects an auth-loop redirect_url and falls back to /app", () => {
    const result = resolveAuthEntryRedirect(requestUrl, "/register");
    expect(result.toString()).toBe("http://localhost:3000/app");
  });

  it("rejects a same-origin absolute auth-loop redirect_url and falls back to /app", () => {
    const result = resolveAuthEntryRedirect(requestUrl, "http://localhost:3000/login");
    expect(result.toString()).toBe("http://localhost:3000/app");
  });
});

describe("resolveLoginRedirectTarget", () => {
  // LoginPage reads redirect_url off useSearchParams() (a URLSearchParams) — this is the
  // single source of truth both the password flow and the OTP-verify flow call into, so a
  // successful sign-in honors a safe redirect_url instead of always landing on /app. The
  // current browser origin is supplied by the caller (window.location.origin) so a
  // Clerk-generated same-origin absolute redirect_url survives too.
  it("falls back to /app when the query string has no redirect_url", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams(), ORIGIN)).toBe("/app");
  });

  it("preserves a safe same-origin relative redirect_url", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams("redirect_url=%2Fportfolio"), ORIGIN)).toBe(
      "/portfolio",
    );
  });

  it("preserves a same-origin absolute redirect_url, returning only pathname+search+hash", () => {
    const params = new URLSearchParams({ redirect_url: "http://localhost:3000/property/123" });
    expect(resolveLoginRedirectTarget(params, ORIGIN)).toBe("/property/123");
  });

  it("rejects an absolute redirect_url on a different origin and falls back to /app", () => {
    expect(
      resolveLoginRedirectTarget(
        new URLSearchParams("redirect_url=https%3A%2F%2Fevil.example.com"),
        ORIGIN,
      ),
    ).toBe("/app");
  });

  it("rejects an auth-loop redirect_url and falls back to /app", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams("redirect_url=%2Flogin"), ORIGIN)).toBe("/app");
  });
});
