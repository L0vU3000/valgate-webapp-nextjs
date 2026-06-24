/**
 * e2e/auth/manager-routing.spec.ts  —  Pro-2.1: Manager routing + /pro guard
 *
 * ─── WHAT THIS COVERS ──────────────────────────────────────────────────────
 *
 * MANAGER (signed in as manager-a, is_manager = true in the DB):
 *   M-ROUTE-1  Landing on "/" redirects to /pro/dashboard, which loads.
 *   M-ROUTE-2  /pro/dashboard is reachable directly (the guard lets managers in).
 *
 * OWNER (signed in as owner-a, a normal owner — is_manager = false):
 *   M-ROUTE-3  Landing on "/" stays in the owner shell (no /pro redirect).
 *   M-ROUTE-4  /pro/dashboard returns 404 (notFound) — the cockpit is invisible.
 *
 * ─── DESIGN ────────────────────────────────────────────────────────────────
 *
 * Uses saved storageState sessions — NO login UI is driven here. The is_manager
 * flag is written by auth.setup.ts (setManagerFlag) after the manager's JIT sync.
 * Keep this THIN: it is a routing smoke, not a security test of record (that is
 * the tests/authz Vitest suite + the service layer).
 *
 * Never wait for networkidle on the dev server (it streams and never idles).
 *
 * ─── RUN COMMAND ───────────────────────────────────────────────────────────
 *
 *   # terminal 1 — auth server (real Clerk keys, port 3002):
 *   npm run dev:e2e-auth
 *
 *   # terminal 2 — Node ≥24 required (Node 22 + PW 1.61 loader bug):
 *   PLAYWRIGHT_AUTH=1 npx playwright test e2e/auth/manager-routing.spec.ts --project=auth
 */

import { test, expect } from '@playwright/test'

test.describe('manager-a: routed into the /pro cockpit', () => {
  test.use({ storageState: 'playwright/.clerk/manager-a.json' })

  test('M-ROUTE-1: "/" redirects a manager to /pro/dashboard', async ({ page }) => {
    await page.goto('/')
    // The shell layout redirects managers before rendering any owner data.
    await expect(page).toHaveURL(/\/pro\/dashboard\/?$/)
  })

  test('M-ROUTE-2: /pro/dashboard loads directly for a manager', async ({ page }) => {
    const response = await page.goto('/pro/dashboard')
    // Not blocked: the (pro) guard lets is_manager users through.
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/pro\/dashboard\/?$/)
  })
})

test.describe('owner-a: a normal owner cannot see /pro', () => {
  test.use({ storageState: 'playwright/.clerk/owner-a.json' })

  test('M-ROUTE-3: "/" keeps an owner in the shell (no /pro redirect)', async ({ page }) => {
    await page.goto('/')
    // Owners are unaffected by the manager redirect — they never land in /pro.
    expect(page.url()).not.toContain('/pro')
  })

  test('M-ROUTE-4: /pro/dashboard returns 404 for an owner', async ({ page }) => {
    const response = await page.goto('/pro/dashboard')
    // The (pro) guard calls notFound() for non-managers → HTTP 404.
    expect(response?.status()).toBe(404)
  })
})
