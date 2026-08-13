/**
 * e2e/preview/authenticated-smoke.spec.ts
 *
 * Authenticated, non-mutating smoke checks against a preview deployment.
 *
 * This suite NEVER logs in itself — it loads a Playwright storageState file
 * supplied by a human or a secure runner via PLAYWRIGHT_PREVIEW_STORAGE_STATE.
 * Producing that file (signing in against the preview's real Clerk instance
 * and saving cookies/localStorage) is out of scope here; see
 * docs/PLAYWRIGHT-PREVIEW-SMOKE.md.
 *
 * If the env var is not set, every test in this file skips cleanly with a
 * clear annotation instead of failing — this suite must be safe to run (or
 * accidentally include) even when no authenticated state is available.
 *
 * Every check here is read-only: no type/listing selection, no form submit,
 * no upload, no document scan, no data creation. Reaching the property-type
 * screen (Step 1 of /add-property) and confirming a card is present is as far
 * as this goes — it never clicks that card.
 *
 * Run with:
 *   PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \\
 *   PLAYWRIGHT_PREVIEW_STORAGE_STATE="/path/to/storage-state.json" \\
 *     npx playwright test --config playwright.preview.config.ts e2e/preview/authenticated-smoke.spec.ts
 */
import { existsSync } from 'node:fs'
import { test, expect } from './fixtures'
import { findForbiddenWords, assertNoUnexpectedFailures } from './lib/preview-checks'

const STORAGE_STATE_PATH = process.env.PLAYWRIGHT_PREVIEW_STORAGE_STATE?.trim()
const SKIP_REASON =
  'PLAYWRIGHT_PREVIEW_STORAGE_STATE not supplied — set it to a Playwright storageState JSON ' +
  'path (see docs/PLAYWRIGHT-PREVIEW-SMOKE.md) to run authenticated preview checks. Skipping ' +
  'the authenticated preview-smoke suite.'

const hasStorageState = !!STORAGE_STATE_PATH && existsSync(STORAGE_STATE_PATH)

test.describe('Preview authenticated smoke', () => {
  test.skip(!hasStorageState, SKIP_REASON)

  // Only applied when the suite actually runs — test.use with an undefined
  // path would be a Playwright config error, and the skip above already
  // short-circuits every test when hasStorageState is false.
  if (hasStorageState) {
    test.use({ storageState: STORAGE_STATE_PATH })
  }

  test('direct "/" resolves to /app for a signed-in session', async ({ page, pageErrors, failedResponses }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/app(?:[/?#]|$)/)
    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('/settings has no Claude/MCP/AI/Connect copy', async ({ page, pageErrors, failedResponses }) => {
    const response = await page.goto('/settings')
    expect(response?.status() ?? 0, 'expected HTTP 2xx from /settings').toBeLessThan(400)

    const bodyText = await page.locator('body').innerText()
    const matches = findForbiddenWords(bodyText, ['claude', 'mcp', 'ai', 'connect'])
    expect(matches, `found MCP-related copy on /settings: ${JSON.stringify(matches)}`).toEqual([])
    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('/add-property landing screen has no marketplace/rental copy', async ({ page, pageErrors, failedResponses }) => {
    const response = await page.goto('/add-property')
    expect(response?.status() ?? 0, 'expected HTTP 2xx from /add-property').toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)

    const bodyText = await page.locator('body').innerText()
    const matches = findForbiddenWords(bodyText, [
      'advisor',
      'listing',
      'listings',
      'host',
      'guest',
      'guests',
      'booking',
      'bookings',
      'pricing',
    ])
    expect(matches, `found marketplace/rental copy on /add-property landing: ${JSON.stringify(matches)}`).toEqual([])
    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('Get Started shows method choice directly (no interstitial dialog)', async ({ page, pageErrors, failedResponses }) => {
    await page.goto('/add-property')
    await page.getByRole('button', { name: /get started/i }).first().click()

    // No advisor/confirmation dialog interposed between "Get Started" and the
    // method-choice screen.
    await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toHaveCount(0)
    await expect(page.getByRole('button', { name: /enter manually/i })).toBeVisible({ timeout: 5_000 })
    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })

  test('Enter manually -> Continue reaches a property-type screen with Residential House', async ({ page, pageErrors, failedResponses }) => {
    await page.goto('/add-property')
    await page.getByRole('button', { name: /get started/i }).first().click()
    await page.getByRole('button', { name: /enter manually/i }).click()

    // "Continue" can render in both a mobile and a desktop footer at once;
    // click the one that's actually visible to avoid a strict-mode violation.
    await page
      .getByRole('button', { name: /^continue$/i })
      .filter({ visible: true })
      .first()
      .click()

    // Reached the property-type screen. Confirm the card is present and stop —
    // never click it (that would advance the wizard and start a draft).
    await expect(page.getByRole('button', { name: /residential house/i })).toBeVisible({ timeout: 10_000 })
    await assertNoUnexpectedFailures(pageErrors, failedResponses)
  })
})
