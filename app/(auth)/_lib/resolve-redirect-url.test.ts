// Regression coverage for Step 1.1 of the public launch plan: the post-auth landing path
// moved to `/app` after the old decider page was removed. These tests pin the
// redirect-resolution contract that login, accept-invitation, and the signed-in
// auth-entry middleware all rely on.

import { describe, it, expect } from "vitest";
import { resolveRedirectUrl, resolveAuthEntryRedirect, resolveLoginRedirectTarget } from "./resolve-redirect-url";

describe("resolveRedirectUrl", () => {
  it("falls back to /app when no redirect_url is given", () => {
    expect(resolveRedirectUrl(null)).toBe("/app");
    expect(resolveRedirectUrl(undefined)).toBe("/app");
    expect(resolveRedirectUrl("")).toBe("/app");
  });

  it("passes through a safe same-origin relative path, including search and hash", () => {
    expect(resolveRedirectUrl("/property/123?tab=documents#top")).toBe(
      "/property/123?tab=documents#top",
    );
  });

  it("rejects protocol-relative destinations", () => {
    expect(resolveRedirectUrl("//evil.example.com/steal")).toBe("/app");
  });

  it("rejects absolute destinations", () => {
    expect(resolveRedirectUrl("https://evil.example.com")).toBe("/app");
    expect(resolveRedirectUrl("http://evil.example.com/app")).toBe("/app");
  });

  it("rejects auth-loop destinations back into /login or /register", () => {
    expect(resolveRedirectUrl("/login")).toBe("/app");
    expect(resolveRedirectUrl("/login?redirect_url=%2Fapp")).toBe("/app");
    expect(resolveRedirectUrl("/register")).toBe("/app");
  });

  it("honors an explicit fallback override", () => {
    expect(resolveRedirectUrl(null, "/custom")).toBe("/custom");
    expect(resolveRedirectUrl("https://evil.example.com", "/custom")).toBe("/custom");
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
});

describe("resolveLoginRedirectTarget", () => {
  // LoginPage reads redirect_url off useSearchParams() (a URLSearchParams) — this is the
  // single source of truth both the password flow and the OTP-verify flow call into, so a
  // successful sign-in honors a safe redirect_url instead of always landing on /app.
  it("falls back to /app when the query string has no redirect_url", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams())).toBe("/app");
  });

  it("preserves a safe same-origin redirect_url", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams("redirect_url=%2Fportfolio"))).toBe(
      "/portfolio",
    );
  });

  it("rejects an absolute redirect_url and falls back to /app", () => {
    expect(
      resolveLoginRedirectTarget(new URLSearchParams("redirect_url=https%3A%2F%2Fevil.example.com")),
    ).toBe("/app");
  });

  it("rejects an auth-loop redirect_url and falls back to /app", () => {
    expect(resolveLoginRedirectTarget(new URLSearchParams("redirect_url=%2Flogin"))).toBe("/app");
  });
});
