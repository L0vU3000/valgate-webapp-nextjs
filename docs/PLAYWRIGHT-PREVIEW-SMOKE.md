# Playwright preview-smoke suite

Local foundation for running a small, read-only Playwright smoke suite against an
**already-deployed** preview URL (e.g. a Vercel preview deployment) — separate from the
existing `playwright.config.ts`, which drives the local DEMO server (port 3001) and the
local real-Clerk auth rig (port 3002).

> **Status: local-only.** This is groundwork, not a finished pipeline. It does not run in
> CI today. Wiring it into GitHub Actions + GitHub Secrets (to run automatically against
> Vercel preview deployments) is a **separate, owner-approved phase** — no workflow file,
> secret, or Vercel config was touched to build this. Nothing here talks to Vercel or any
> external service on its own; it only runs when a human (or a secure runner set up later)
> points it at a URL.

## Files

| Path | Purpose |
|---|---|
| `playwright.preview.config.ts` | Dedicated config. No `webServer`, no default `baseURL`, no `globalSetup`/`globalTeardown` (no DB dependency). Chromium only, serial, no retries. |
| `e2e/preview/fixtures.ts` | Local `test`/`expect` export that tracks uncaught page errors and failed responses. Does **not** reuse `e2e/fixtures.ts` — that fixture blocks `clerk.accounts.dev`, which is correct for the local DEMO server but would break real Clerk on a preview deployment. |
| `e2e/preview/lib/preview-checks.ts` | Pure helpers (`requireBaseUrl`, `isIgnorablePreviewNoiseUrl`, `findForbiddenCopy`, `findForbiddenWords`) with a colocated unit test, run via `vitest.config.preview.ts`. |
| `e2e/preview/public-smoke.spec.ts` | Public, unauthenticated checks: `/`, `/login`, `/register`. Never submits a form. |
| `e2e/preview/authenticated-smoke.spec.ts` | Authenticated, non-mutating checks. Skips safely if no storage state is supplied. |

## Required environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | Yes | The preview deployment URL to test, e.g. `https://valgate-webapp-git-my-branch.vercel.app`. The config throws a clear error and refuses to run if this is unset or blank — there is no default, and it will **never** fall back to production or localhost. |
| `PLAYWRIGHT_PREVIEW_STORAGE_STATE` | Only for authenticated checks | Absolute path to a Playwright `storageState` JSON file (cookies + localStorage) for an already-signed-in session on that same preview deployment. If unset (or the file doesn't exist), every test in `authenticated-smoke.spec.ts` skips with a clear annotation instead of failing. |

## Running locally

Public checks only (no auth):

```bash
PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \
  npx playwright test --config playwright.preview.config.ts e2e/preview/public-smoke.spec.ts
```

Full suite, including authenticated checks:

```bash
PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \
PLAYWRIGHT_PREVIEW_STORAGE_STATE="/absolute/path/to/storage-state.json" \
  npx playwright test --config playwright.preview.config.ts
```

Omit `PLAYWRIGHT_PREVIEW_STORAGE_STATE` and the authenticated suite skips cleanly; the
public suite still runs.

## How a human/secure runner supplies `storageState`

This suite deliberately does **not** sign in on its own — it has no login flow, no
credentials, and no knowledge of any preview-specific Clerk test user. Producing the
storage-state file is a separate, manual step, done by whoever has legitimate access to
sign in on that preview deployment:

1. Sign in to the preview URL in a real browser (or via a throwaway Playwright script run
   locally, following the same shape as `e2e/auth/auth.setup.ts` — `clerk.signIn()` against
   the preview's Clerk instance, then `page.context().storageState({ path: ... })`).
2. Save the resulting JSON file somewhere **outside version control** — see "Artifact
   locations" below.
3. Point `PLAYWRIGHT_PREVIEW_STORAGE_STATE` at that file's absolute path when invoking
   `playwright test --config playwright.preview.config.ts`.

The file contains live session cookies/tokens for a real account. Treat it like a
credential: don't paste it into chat, a PR description, or a committed file. Delete it once
you're done, or let it expire naturally.

## Artifact locations

All output from this config is gitignored and kept separate from the main suite's
`playwright-report/` / `test-results/` so the two never collide:

- HTML report: `preview-artifacts/html-report/`
- JSON results: `preview-artifacts/results.json`
- Traces/screenshots/video (on failure only): `preview-artifacts/test-results/`

None of these paths are created unless you actually run the suite.

## Safety limits (by design)

- **No mutations.** Every test is read-only: no form submission, no property-type
  selection, no draft creation, no file upload/scan, no data written anywhere. The
  authenticated suite reaches the `/add-property` property-type screen and stops — it
  confirms a card (e.g. "Residential House") is visible but never clicks it.
- **No hardcoded target.** `playwright.preview.config.ts` has no default `baseURL`. A run
  with `PLAYWRIGHT_BASE_URL` unset fails immediately with an explanatory error instead of
  silently doing nothing or hitting the wrong environment.
- **No database dependency.** Unlike `playwright.config.ts`, this config has no
  `globalSetup`/`globalTeardown` — it never pings or depends on the dev database.
- **No local server.** There is no `webServer` entry. This suite only ever talks to the URL
  you give it.
- **Known preview noise is filtered, not ignored blindly.** `isIgnorablePreviewNoiseUrl`
  (in `e2e/preview/lib/preview-checks.ts`) explicitly filters Clerk's telemetry beacon and
  Vercel's `vercel.live` / `_vercel/insights` / `_vercel/speed-insights` endpoints out of
  the "unexpected failed response" checks — every other failing request still fails the
  test.

## What's deliberately out of scope here

- GitHub Actions workflow wiring, GitHub Secrets, or any CI trigger.
- Automatically provisioning or rotating a preview-specific Clerk test user/storage state.
- Anything that mutates data on a preview deployment.

These are follow-on, owner-approved work — not part of this local foundation.
