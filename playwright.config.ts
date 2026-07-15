import { defineConfig, devices } from '@playwright/test'

// ─── Auth suite flag ─────────────────────────────────────────────────────────
// Auth projects + the 3002 server are only activated when PLAYWRIGHT_AUTH=1.
// This keeps `npm run test:e2e` (DEMO suite) fast and self-contained —
// it never tries to start the real-Clerk server or contact Clerk's API.
//
// To run auth tests:
//   PLAYWRIGHT_AUTH=1 npx playwright test --project auth-setup --project auth
// Or via the package.json script:
//   npm run test:e2e:auth
const RUN_AUTH = !!process.env.PLAYWRIGHT_AUTH

export default defineConfig({
  testDir: './e2e',

  // Root tsconfig uses moduleResolution 'bundler', which breaks Playwright's loader
  // (context.conditions?.includes) when specs import pg. Use a node-resolution tsconfig.
  tsconfig: './e2e/tsconfig.json',

  // Runs once before all workers: pings DB, confirms seed data present.
  // This runs for both the DEMO and auth suites — both use the same dev DB.
  globalSetup: './e2e/global-setup.ts',

  // Runs once after all workers: removes throwaway file-based test clients
  // (named "E2E …") that specs create, so they don't linger as untracked files.
  globalTeardown: './e2e/global-teardown.ts',

  // D1=A: serial execution. Several specs mutate shared seed PROP-0001 (photos, tabs)
  // and destructive specs race under fullyParallel. workers:1 makes runs deterministic
  // and lets create→act chains use test.describe.serial. Slower, but the source of truth.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  // HTML for visual review + JSON for programmatic parsing
  reporter: [
    ['html'],
    ['json', { outputFile: 'e2e/test-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ── DEMO suite (existing, untouched) ──────────────────────────────────────
    // DEMO_MODE=true, no real Clerk key, port 3001.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        // auth specs (e2e/auth/*) need the real-Clerk rig and only run under the
        // 'auth' project (PLAYWRIGHT_AUTH=1). Without this, the DEMO chromium
        // project globs them in and they time out — see test:e2e:auth.
        /\/auth\//,
        // scope-cut — excluded until product returns. The Directory and Pro
        // surfaces were cut to the MVP core, so their routes intentionally 404.
        // Keep the specs in git as the old contract; don't let their 404s read
        // as regressions in the active owner-facing suite. See the e2e-regression
        // pipeline's disposition table (run 2026-07-15-163613).
        /\/directory\.spec\.ts/,
        /\/pro-.*\.spec\.ts/,
      ],
    },

    // ── Auth suite (real Clerk, port 3002) ────────────────────────────────────
    // Only included when PLAYWRIGHT_AUTH=1. Keeps DEMO runs clean.
    //
    // auth-setup: signs in the three test users and saves their sessions to
    //   playwright/.clerk/{owner-a,viewer-a,owner-b}.json
    // auth: the actual auth/IDOR tests; loads those sessions so no login UI needed.
    //
    // Prerequisite: node scripts/provision-clerk-test-users.mjs
    ...(RUN_AUTH
      ? [
          {
            name: 'auth-setup',
            testDir: './e2e/auth',
            // Only picks up auth.setup.ts — not the smoke test or future test files.
            testMatch: 'auth.setup.ts',
            use: {
              // Auth server runs on 3002 (real Clerk keys, DEMO_MODE=false).
              baseURL: 'http://localhost:3002',
            },
          },
          {
            name: 'auth',
            testDir: './e2e/auth',
            // Exclude setup files from the test run — they're handled by auth-setup above.
            testIgnore: /.*\.setup\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              baseURL: 'http://localhost:3002',
            },
            // auth-setup must complete (sessions saved) before auth tests run.
            dependencies: ['auth-setup'],
          },
        ]
      : []),
  ],

  // Only ONE server per run: the DEMO suite uses 3001, the auth suite uses 3002.
  // No project ever needs both, so starting both just pays a second cold
  // turbopack boot for nothing. Pick the server that matches the run.
  webServer: RUN_AUTH
    ? [
        // ── Auth server (port 3002) ────────────────────────────────────────
        // dev:e2e-auth = DEMO_MODE=false, real Clerk keys from .env.e2e-auth.
        // Readiness URL is /login, not /: the root path returns 404 under real
        // Clerk, and Playwright does NOT count 404 as "ready" (it accepts
        // 200-399, 400, 401, 402, 403) — so probing / would poll until timeout.
        // /login is a public page that returns 200.
        {
          command: 'npm run dev:e2e-auth',
          url: 'http://localhost:3002/login',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
      ]
    : [
        // ── DEMO server (port 3001) ────────────────────────────────────────
        // dev:e2e = DEMO_MODE=true, no Clerk key → middleware skips auth
        {
          command: 'npm run dev:e2e',
          url: 'http://localhost:3001',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
      ],
})
