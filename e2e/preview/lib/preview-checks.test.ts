import { describe, expect, it } from "vitest";
import {
  findForbiddenCopy,
  findForbiddenWords,
  isIgnorablePreviewNoiseUrl,
  requireBaseUrl,
} from "./preview-checks";

describe("requireBaseUrl", () => {
  it("returns the trimmed URL when PLAYWRIGHT_BASE_URL is set", () => {
    expect(requireBaseUrl({ PLAYWRIGHT_BASE_URL: " https://my-preview.example.vercel.app " })).toBe(
      "https://my-preview.example.vercel.app",
    );
  });

  it("throws a clear error when the variable is missing", () => {
    expect(() => requireBaseUrl({})).toThrow(/PLAYWRIGHT_BASE_URL/);
  });

  it("throws a clear error when the variable is blank", () => {
    expect(() => requireBaseUrl({ PLAYWRIGHT_BASE_URL: "   " })).toThrow(/PLAYWRIGHT_BASE_URL/);
  });

  it("never falls back to a production default", () => {
    // requireBaseUrl must not silently substitute a hardcoded host — assert the
    // thrown message names the env var instead of returning a fallback URL.
    expect(() => requireBaseUrl({ PLAYWRIGHT_BASE_URL: "" })).toThrow(Error);
  });
});

describe("isIgnorablePreviewNoiseUrl", () => {
  it("ignores Clerk telemetry beacons", () => {
    expect(isIgnorablePreviewNoiseUrl("https://clerk-telemetry.com/v1/event")).toBe(true);
  });

  it("ignores Vercel Live / preview toolbar and insights endpoints", () => {
    expect(isIgnorablePreviewNoiseUrl("https://vercel.live/socket")).toBe(true);
    expect(isIgnorablePreviewNoiseUrl("https://my-preview.example.vercel.app/_vercel/insights/view")).toBe(true);
    expect(isIgnorablePreviewNoiseUrl("https://my-preview.example.vercel.app/_vercel/speed-insights/script.js")).toBe(true);
  });

  it("does not ignore the app's own product responses", () => {
    expect(isIgnorablePreviewNoiseUrl("https://my-preview.example.vercel.app/api/properties")).toBe(false);
    expect(isIgnorablePreviewNoiseUrl("https://my-preview.example.vercel.app/login")).toBe(false);
  });
});

describe("findForbiddenCopy", () => {
  it("returns matched terms found in the text (case-insensitive)", () => {
    const matches = findForbiddenCopy("We track 127 active listings across your portfolio.", [
      "active listings",
      "occupancy",
    ]);
    expect(matches).toEqual(["active listings"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(findForbiddenCopy("Keep every property record in one place.", ["broker", "marketplace"])).toEqual([]);
  });

  it("matches are case-insensitive", () => {
    expect(findForbiddenCopy("Contact your ADVISOR for details.", ["advisor"])).toEqual(["advisor"]);
  });
});

describe("findForbiddenWords", () => {
  it("does not false-positive on short tokens embedded in ordinary words", () => {
    // A plain substring check for "ai" would incorrectly match "email"/"domain"/"available".
    expect(findForbiddenWords("Sign in with your email address in the domain field.", ["ai"])).toEqual([]);
  });

  it("matches a short token when it appears as its own word", () => {
    expect(findForbiddenWords("Ask the AI assistant for help.", ["ai"])).toEqual(["ai"]);
  });

  it("matches product/brand tokens as whole words, case-insensitively", () => {
    const text = "Connect Claude to sync your MCP server.";
    expect(findForbiddenWords(text, ["claude", "mcp", "connect", "ai"])).toEqual(["claude", "mcp", "connect"]);
  });

  it("returns an empty array when none of the words appear", () => {
    expect(findForbiddenWords("Update your profile and preferences.", ["claude", "mcp", "ai", "connect"])).toEqual(
      [],
    );
  });
});
