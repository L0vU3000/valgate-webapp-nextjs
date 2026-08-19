import { defineConfig, devices } from '@playwright/test'
import { requireBaseUrl } from './e2e/preview/lib/preview-checks'

// ─── Preview-smoke config — LOCAL FOUNDATION ONLY ─────────────────────────────
// This config runs a small, read-only smoke suite against an already-deployed
// preview URL (e.g. a Vercel preview deployment). It is intentionally separate
// from playwright.config.ts, which drives the local DEMO (3001) and real-Clerk
// (3002) servers.
//
// Differences from playwright.config.ts that matter:
//   - No webServer: this suite never starts a local Next.js process. It only
//     ever talks to the URL you hand it via PLAYWRIGHT_BASE_URL.
//   - No default baseURL: requireBaseUrl() throws a clear error if the env var
//     is missing, so this can NEVER silently fall back to a hardcoded host
//     (and definitely never to production).
//   - No globalSetup/globalTeardown: those (e2e/global-setup.ts /
//     global-teardown.ts) ping the local dev database — a preview run must not
//     depend on or touch any database.
//
// Wiring this into GitHub Actions + secrets is a deliberately separate,
// owner-approved phase — see docs/PLAYWRIGHT-PREVIEW-SMOKE.md. This config is
// local-only groundwork.
//
// Usage:
//   PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \
//     npx playwright test --config playwright.preview.config.ts
const baseURL = requireBaseUrl(process.env)

export default defineConfig({
  testDir: './e2e/preview',

  // Only collect Playwright specs. e2e/preview/lib/*.test.ts are Vitest unit
  // tests for the pure helpers (see vitest.config.preview.ts) — Playwright's
  // default testMatch would otherwise discover them too and fail trying to
  // load Vitest's test.describe()-free API inside its own runner.
  testMatch: '**/*.spec.ts',

  // Same node-resolution tsconfig as the main suite (root tsconfig's
  // moduleResolution: 'bundler' breaks Playwright's loader).
  tsconfig: './e2e/tsconfig.json',

  // Read-only checks against a remote, already-running deployment: serial and
  // no retries keeps runs deterministic and avoids hammering someone else's
  // preview environment with duplicate requests.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  // HTML for visual review + JSON for programmatic parsing, both under a
  // preview-specific, gitignored artifact path so they never collide with the
  // main suite's playwright-report/ or test-results/.
  reporter: [
    ['html', { outputFolder: 'preview-artifacts/html-report', open: 'never' }],
    ['json', { outputFile: 'preview-artifacts/results.json' }],
  ],
  outputDir: 'preview-artifacts/test-results',

  use: {
    baseURL,
    // No retries locally, so 'on-first-retry' would never fire — capture
    // directly off the terminal attempt instead.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer entry — this suite only ever talks to the supplied preview URL.
})
