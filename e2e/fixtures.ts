/**
 * Shared Playwright test fixture.
 *
 * Why this exists: the DEMO_MODE e2e server still loads a real Clerk publishable key
 * (it leaks from .env.local), so Clerk's browser SDK mounts. Sidebar.tsx calls
 * useOrganization(), and because the Clerk *development* instance has no Organizations
 * feature enabled, Clerk's hosted clerk-js renders a full-screen "Enable Organizations"
 * setup modal (plus a "Configure your application" keyless prompt). That overlay sits on
 * top of the app and intercepts every pointer event, so almost any test that clicks
 * something times out. It is a Clerk *development-mode* artifact only — it never appears
 * in production. Worse, Clerk renders it inside a shadow DOM, so a page-level stylesheet
 * cannot hide it.
 *
 * Fix (two layers):
 *  1) Network: abort every request to Clerk's hosted script host (clerk.accounts.dev).
 *     Without clerk-js the dev modal / keyless prompt never initialize. ClerkProvider
 *     still mounts and renders children (it just stays in its "loading" state, which is
 *     fine — DEMO_MODE already bypasses auth server-side), so pages render normally.
 *  2) CSS: also inject a stylesheet hiding any Clerk overlay classes, as belt-and-braces
 *     for anything that slips through, and re-enable pointer events on the page.
 *
 * Import `{ test, expect }` from this file instead of '@playwright/test' in every spec.
 */
import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    // Layer 1 — block Clerk's hosted dev script so its modal/keyless prompt never load.
    await page.route('**clerk.accounts.dev/**', (route) => route.abort())

    // Mark the page as an e2e run so useDismissable suppresses always-on dev onboarding
    // popovers (e.g. the "What is Progress?" tour) whose backdrop would block clicks.
    await page.addInitScript(() => {
      ;(window as { __E2E__?: boolean }).__E2E__ = true
    })

    // Stabilize motion for actionability. Some fixed overlays animate on mount
    // (fade-slide-up) while an infinite `animate-ping` runs elsewhere on the page;
    // together they keep Playwright's "element is stable" check from ever settling on
    // the fixed bulk-action bar, so a click on it can hang until timeout. Zeroing
    // animation/transition durations removes the motion without touching layout,
    // colors, or any assertion — a standard e2e stabilization, not a weakened test.
    await page.addInitScript(() => {
      const style = document.createElement('style')
      style.setAttribute('data-e2e-no-motion', 'true')
      // Use `animation: none` (full removal), NOT `animation-duration: 0s`. Zeroing the
      // duration of an *infinite* animation (Tailwind's animate-ping) makes it cycle every
      // frame — constant repaint that keeps the fixed bulk bar perpetually "unstable".
      // Removing the animation outright freezes it.
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `
      document.documentElement.appendChild(style)
    })

    // Layer 2 — hide any Clerk overlay that still renders, and unlock page pointer events.
    await page.addInitScript(() => {
      const style = document.createElement('style')
      style.setAttribute('data-e2e-clerk-hide', 'true')
      style.textContent = `
        .cl-modalBackdrop,
        [class*="cl-modal"],
        [class*="cl-keylessPrompt"],
        [class*="cl-impersonationFab"] {
          display: none !important;
          pointer-events: none !important;
        }
        html, body { pointer-events: auto !important; }
      `
      document.documentElement.appendChild(style)
    })

    await use(page)
  },
})

export { expect }
