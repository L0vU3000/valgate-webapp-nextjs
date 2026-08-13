/**
 * e2e/preview/public-smoke.spec.ts
 *
 * Public, non-mutating smoke checks against a preview deployment: `/`,
 * `/login`, `/register`. No form is ever submitted — these are read-only
 * "did the page render correctly" checks, safe to run against a shared
 * preview URL.
 *
 * Run with:
 *   PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \\
 *     npx playwright test --config playwright.preview.config.ts e2e/preview/public-smoke.spec.ts
 */
import { test, expect } from './fixtures'
import { findForbiddenCopy, assertNoUnexpectedFailures } from './lib/preview-checks'

// Terms from B2B/marketplace copy that was deliberately removed from the
// consumer-facing product (see commits e16c836 "remove B2B profile residue",
// 1d215c1 "align public copy with owner launch", and the AuthBrandPanel trust
// strip that used to read "127 active listings / 94% occupancy / SOC 2 Type II
// / 500+ portfolios"). If any of these resurface on the landing page, it's a
// regression toward the old B2B/marketplace positioning, not a fresh usage.
//
// Deliberately excludes generic words like "portfolio" — /portfolio is a real,
// current consumer route, so a bare "portfolio" is not itself a red flag.
const FORBIDDEN_LANDING_COPY = [
  'active listings',
  'occupancy',
  'soc 2',
  'job title',
  'employee id',
  'office location',
  'marketplace',
  'broker',
  'tenant portal',
  'b2b',
  'enterprise plan',
  'advisor',
] as const

test.describe('Preview public smoke', () => {
  test('/ — landing loads, has required public controls, no stale B2B/marketplace copy', async ({
    page,
    pageErrors,
    failedResponses,
  }) => {
    const response = await page.goto('/')
    expect(response?.status() ?? 0, 'expected HTTP 2xx from /').toBeLessThan(400)
    await expect(page).toHaveTitle(/Valgate/i)

    // Required public controls: sign-in entry point and the primary CTA into
    // registration, both present without navigating away.
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    const matches = findForbiddenCopy(bodyText, FORBIDDEN_LANDING_COPY)
    expect(matches, `found stale B2B/marketplace copy on landing: ${JSON.stringify(matches)}`).toEqual([])

    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('/login — loads with required public controls', async ({ page, pageErrors, failedResponses }) => {
    const response = await page.goto('/login')
    expect(response?.status() ?? 0, 'expected HTTP 2xx from /login').toBeLessThan(400)
    await expect(page).toHaveTitle(/Valgate/i)

    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^log in$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible()

    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('/register — loads with required public controls', async ({ page, pageErrors, failedResponses }) => {
    const response = await page.goto('/register')
    expect(response?.status() ?? 0, 'expected HTTP 2xx from /register').toBeLessThan(400)
    await expect(page).toHaveTitle(/Valgate/i)

    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()

    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })
})
