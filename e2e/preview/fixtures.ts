/**
 * Shared Playwright fixture for the preview-smoke suite.
 *
 * Deliberately NOT built on top of ../fixtures.ts (the DEMO-suite fixture),
 * which aborts every request to clerk.accounts.dev — a workaround for a
 * Clerk *development-mode* modal that only appears against the local DEMO_MODE
 * server. A preview deployment runs real Clerk; blocking its host here would
 * break sign-in entirely instead of fixing anything.
 *
 * Import `{ test, expect }` from this file in every e2e/preview/*.spec.ts.
 */
import { test as base, expect } from '@playwright/test'
import { isIgnorablePreviewNoiseUrl } from './lib/preview-checks'

type FailedResponse = { url: string; status: number }

type PreviewFixtures = {
  /** Uncaught browser-side errors thrown while the page was open. Assert this is empty. */
  pageErrors: string[]
  /**
   * Failed (status >= 400) responses to the app's own requests, with known
   * Clerk/Vercel preview noise (telemetry beacons, the Vercel Live toolbar,
   * insights/speed-insights) already filtered out. Assert this is empty.
   */
  failedResponses: FailedResponse[]
}

export const test = base.extend<PreviewFixtures>({
  pageErrors: async ({ page }, fixtureUse) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await fixtureUse(errors)
  },

  failedResponses: async ({ page }, fixtureUse) => {
    const failures: FailedResponse[] = []
    page.on('response', (response) => {
      const status = response.status()
      if (status < 400) return
      const url = response.url()
      if (isIgnorablePreviewNoiseUrl(url)) return
      failures.push({ url, status })
    })
    await fixtureUse(failures)
  },
})

export { expect }
