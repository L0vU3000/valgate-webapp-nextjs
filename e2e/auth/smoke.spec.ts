/**
 * e2e/auth/smoke.spec.ts
 *
 * Phase 0 gate — verifies that a real-Clerk session reaches /portfolio.
 *
 * This is the simplest possible auth test: can owner-a load a protected page
 * without being redirected to /login? If this fails, nothing in Phase 2/3 will
 * work, so it runs first.
 *
 * storageState: loads owner-a's saved session (playwright/.clerk/owner-a.json)
 * so the browser starts already signed in.
 *
 * If this test fails, check:
 *   1. Auth server running: npm run dev:e2e-auth
 *   2. Sessions current: PLAYWRIGHT_AUTH=1 playwright test --project auth-setup
 *   3. Real keys in .env.e2e-auth (not REPLACE_ME placeholders)
 *   4. JIT sync success: check server logs for "upsertUser/upsertOrg" calls
 */

import { test, expect } from '@playwright/test'

// Load owner-a's saved session. The browser starts pre-authenticated —
// no login flow needed.
test.use({ storageState: 'playwright/.clerk/owner-a.json' })

test('owner-a reaches /portfolio without being redirected to login', async ({ page }) => {
  // Navigate to the portfolio page (a protected route).
  // An unauthenticated user would be redirected to /login or /sign-in.
  const response = await page.goto('/portfolio')

  // --- Gate check 1: no redirect to login ---
  // If Clerk's middleware redirects us, the URL changes.
  expect(
    page.url(),
    'expected to stay on /portfolio but was redirected (session may have expired or JIT sync failed)',
  ).not.toMatch(/\/login|\/sign-in/)

  // --- Gate check 2: page loaded with HTTP 2xx ---
  // A 4xx/5xx means the route errored (e.g. "unauthenticated" thrown by requireCtx).
  expect(
    response?.status() ?? 0,
    'expected HTTP 2xx from /portfolio',
  ).toBeLessThan(400)

  // --- Gate check 3: portfolio content visible ---
  // The portfolio page renders a heading or list of properties.
  // We wait up to 10 s for React hydration + server-side data fetching.
  await expect(
    page.locator('h1').first(),
    'expected a page heading — confirms the portfolio route rendered',
  ).toBeVisible({ timeout: 10_000 })
})
