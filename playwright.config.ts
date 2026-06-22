import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',

  // Root tsconfig uses moduleResolution 'bundler', which breaks Playwright's loader
  // (context.conditions?.includes) when specs import pg. Use a node-resolution tsconfig.
  tsconfig: './e2e/tsconfig.json',

  // Runs once before all workers: pings DB, confirms seed data present
  globalSetup: './e2e/global-setup.ts',

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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // dev:e2e = DEMO_MODE=true, no Clerk key → middleware skips auth
    command: 'npm run dev:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})
