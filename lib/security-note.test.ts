import { describe, it, expect } from "vitest";
import { buildSecurityNote, PASSWORD_ROTATION_DAYS } from "./security-note";

// Acceptance test for WIRE-001: the profile "Security Recommendation" date must be
// derived from a real account timestamp, never the fabricated "Jan 15, 2024" literal.
// The derivation is a pure function so it runs in the node-only vitest env (the
// surface itself is a client component the harness can't render without jsdom).

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

describe("buildSecurityNote (WIRE-001)", () => {
  it("derives the next-change date from lastLogin + the rotation policy", () => {
    // A real account timestamp, shaped like user_profiles.lastLogin (epoch ms).
    const lastLogin = Date.UTC(2026, 6, 1);
    const note = buildSecurityNote({ lastLogin, memberSince: Date.UTC(2025, 0, 1) });
    const expected = formatDate(lastLogin + PASSWORD_ROTATION_DAYS * DAY_MS);
    expect(note).toContain(`Next change suggested by ${expected}.`);
  });

  it("falls back to memberSince when lastLogin is absent", () => {
    const memberSince = Date.UTC(2026, 0, 15);
    const note = buildSecurityNote({ memberSince });
    const expected = formatDate(memberSince + PASSWORD_ROTATION_DAYS * DAY_MS);
    expect(note).toContain(`Next change suggested by ${expected}.`);
  });

  it("omits the date sentence when the profile carries no timestamp", () => {
    const note = buildSecurityNote({});
    expect(note).not.toMatch(/Next change suggested by/);
  });

  it("never emits the old fabricated date", () => {
    const note = buildSecurityNote({ lastLogin: Date.UTC(2026, 6, 1) });
    expect(note).not.toContain("Jan 15, 2024");
  });
});
