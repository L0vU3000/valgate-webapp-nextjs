import { expect } from '@playwright/test';

/** Minimal shape of the env vars these helpers read — lets tests pass plain objects. */
export type PreviewEnv = Record<string, string | undefined>;

/**
 * Resolves PLAYWRIGHT_BASE_URL or throws a clear, actionable error.
 * Never falls back to a default host — a preview run with no target must fail loudly,
 * not silently point at production or localhost.
 */
export function requireBaseUrl(env: PreviewEnv): string {
  const raw = env.PLAYWRIGHT_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "PLAYWRIGHT_BASE_URL is required to run the preview-smoke suite.\n" +
        "Set it to the preview deployment URL, e.g.:\n" +
        '  PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" npx playwright test --config playwright.preview.config.ts\n' +
        "There is no default — this suite must never accidentally target production.",
    );
  }
  return raw;
}

export async function assertNoUnexpectedFailures(pageErrors: string[], failedResponses: { url: string; status: number }[]) {
  expect(pageErrors, `uncaught page errors: ${JSON.stringify(pageErrors)}`).toEqual([])
  expect(
    failedResponses,
    `unexpected failed responses: ${JSON.stringify(failedResponses)}`,
  ).toEqual([])
}

// Known third-party noise that shows up on real preview deployments but is not
// a signal about the app itself: Clerk's telemetry beacon (fire-and-forget,
// commonly blocked/ad-blocked and occasionally non-2xx) and Vercel's preview
// toolbar / analytics / speed-insights endpoints injected into preview builds.
const IGNORABLE_HOSTS = [/(^|\.)clerk-telemetry\.com$/i, /(^|\.)vercel\.live$/i];
const IGNORABLE_PATH_PREFIXES = ["/_vercel/insights/", "/_vercel/speed-insights/"];

/** True when a failed response is expected preview/Clerk/Vercel noise, not a product failure. */
export function isIgnorablePreviewNoiseUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (IGNORABLE_HOSTS.some((pattern) => pattern.test(parsed.hostname))) return true;
  return IGNORABLE_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix));
}

/** Returns the subset of `terms` that appear (case-insensitively) in `text`. */
export function findForbiddenCopy(text: string, terms: readonly string[]): string[] {
  const haystack = text.toLowerCase();
  return terms.filter((term) => haystack.includes(term.toLowerCase()));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the subset of `words` that appear as whole words (case-insensitively) in `text`.
 * Unlike findForbiddenCopy's plain substring match, this is safe for short tokens
 * (e.g. "AI", "MCP") that would otherwise false-positive inside ordinary copy —
 * a plain substring check for "ai" matches inside "email", "domain", "available", etc.
 */
export function findForbiddenWords(text: string, words: readonly string[]): string[] {
  return words.filter((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text));
}
