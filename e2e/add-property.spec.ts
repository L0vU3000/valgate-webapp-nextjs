/**
 * Section C — Add property
 *
 * The real wizard at /add-property is a multi-stage flow, not a single form:
 *
 *   Landing (StepIntro)  → "Get Started"
 *   Step 0 (method)      → "Enter manually"  (an AdvisorModal may pop up first)
 *   Gate 1 (How it works)→ "Continue"
 *   Step 1 (type)        → click a type card, e.g. "Residential House" (auto-advances)
 *   Step 2 (location)    → Property Name (placeholder "e.g. Skyline Luxury Lofts") → footer "Continue"
 *   Gate 2 (How it works)→ "Continue"
 *   Step 3 (financial)   → footer "Continue"
 *   Step 4 (photos/docs) → footer "Continue"
 *   Gate 3 (How it works)→ "Start Review"
 *   Step 5 (review)      → footer "Submit"
 *   Step 6 (success)     → "Your property is on Valgate." + the new code (ID: PROP-NNNN)
 *
 * The Step 2 "Property Name" <label> is not associated with its <input> (no htmlFor/id),
 * so getByLabel does not find it — target the input by its placeholder instead.
 *
 * Selectors use flexible role/text matchers — inspect in browser if one fails.
 */
import { test, expect } from './fixtures'
import { cleanup } from './helpers/db'
import type { Page } from '@playwright/test'

// The footer primary CTA on form steps is literally "Continue"; the final step is "Submit".
const CONTINUE = /^continue$/i

// "Continue" is ambiguous in the DOM: the How-it-works gates render BOTH a phone footer
// (lg:hidden) and a desktop footer (hidden lg:flex), each with its own "Continue" button,
// so two nodes match the role+name even though only one is visible. Click the visible one
// to avoid Playwright strict-mode violations. Works for the single footer Continue too.
async function clickContinue(page: Page) {
  await page.getByRole('button', { name: CONTINUE }).filter({ visible: true }).first().click()
}

// Step 0 may be covered by the AdvisorModal ("Set up with an Advisor / Set up on my own"),
// which opens ~800ms after Step 0 mounts and whose backdrop intercepts clicks. Dismiss it
// via the secondary CTA if it appears, then we're free to interact with Step 0.
async function dismissAdvisorModal(page: Page) {
  const ownBtn = page.getByRole('button', { name: /set up on my own/i })
  if (await ownBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await ownBtn.click()
  }
}

// Dismiss the landing screen and the advisor modal, then click "Enter manually"
// and pass through the first "How it works" gate to land on Step 1 (property type).
async function reachStep1(page: Page) {
  await page.goto('/add-property')
  await expect(page).not.toHaveURL(/\/login/)

  // Landing → reveal Step 0
  await page.getByRole('button', { name: /get started/i }).first().click()

  // Step 0 — clear the advisor modal, then choose the manual path
  await dismissAdvisorModal(page)
  await page.getByRole('button', { name: /enter manually/i }).click()

  // Gate 1 — "Step 1 of 3: Tell us about your property"
  await clickContinue(page)
}

// From Step 1, pick a property type (auto-advances to Step 2) and wait for the
// Property Name field. Returns the name input locator.
async function reachStep2(page: Page) {
  await reachStep1(page)
  await page.getByRole('button', { name: /residential house/i }).click()
  const nameField = page.getByPlaceholder(/skyline luxury lofts/i)
  await expect(nameField).toBeVisible({ timeout: 10_000 })
  return nameField
}

test.describe('C — Add property', () => {
  test('C1: full multi-step flow → success screen with property code', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'C1 — full flow to success' })

    let createdCode: string | undefined

    try {
      await test.step('Reach Step 2 and name the property', async () => {
        const field = await reachStep2(page)
        await field.fill('E2E Full Flow Test')
      })

      await test.step('Step 2 → Gate 2 → Step 3', async () => {
        await clickContinue(page) // footer Continue
        await clickContinue(page) // gate 2 Continue
      })

      await test.step('Step 3 (financial) → Step 4 (photos/docs)', async () => {
        // Both steps are optional — the footer Continue advances without input.
        await clickContinue(page)
      })

      await test.step('Step 4 → Gate 3 → Step 5 (review)', async () => {
        await clickContinue(page) // footer Continue
        await page
          .getByRole('button', { name: /start review/i })
          .filter({ visible: true })
          .first()
          .click() // gate 3 (final)
      })

      await test.step('Submit and assert success screen + property code', async () => {
        await page.getByRole('button', { name: /^submit$/i }).click()

        await expect(
          page.getByRole('heading', { name: /your property is on valgate/i }),
        ).toBeVisible({ timeout: 15_000 })

        // The code (e.g. "PROP-0012") is the property id; it surfaces on the success
        // card as "ID: PROP-NNNN", typewritten in after the map loads — allow time.
        const codeLine = page.getByText(/PROP-\d+/)
        await expect(codeLine).toBeVisible({ timeout: 15_000 })

        const text = (await codeLine.textContent()) ?? ''
        createdCode = text.match(/PROP-\d+/)?.[0]
        expect(createdCode).toBeTruthy()
      })
    } finally {
      // The wizard created a real property in ORG-0001. Its code IS its id, so we can
      // delete it directly (cascade removes any children). Keeps the portfolio clean.
      await cleanup(createdCode)
    }
  })

  test('C2: per-step validation blocks empty name', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'C2 — step validation' })

    await test.step('Reach Step 2 (Property Name field visible)', async () => {
      await reachStep2(page)
    })

    await test.step('Continue with an empty name → validation error shown', async () => {
      await clickContinue(page)
      // Field-level error from goNext: exactly "Please enter a property name".
      // (Match the exact string — a loose /required/i also hit the "Required fields" label.)
      await expect(
        page.getByText('Please enter a property name'),
      ).toBeVisible({ timeout: 3_000 })
    })
  })

  test('C3: save draft → resume from Step 0', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'C3 — draft save/resume' })

    await test.step('Start a new property and partially fill (autosaves a draft)', async () => {
      const nameField = await reachStep2(page)
      // Typing a name on Step 2 autosaves the draft to localStorage under the active id.
      await nameField.fill('E2E Draft Property')
      // The autosave is debounced — wait until the draft is actually persisted before
      // navigating away, otherwise the goto can race ahead of the save and lose it.
      await page.waitForFunction(
        () => JSON.stringify(localStorage).includes('E2E Draft Property'),
        undefined,
        { timeout: 5_000 },
      )
    })

    await test.step('Navigate away — simulates abandoning mid-flow', async () => {
      await page.goto('/portfolio')
    })

    await test.step('Return to add-property → draft resume option shown on Step 0', async () => {
      await page.goto('/add-property')
      // A fresh visit shows the landing screen first; dismiss it to reach Step 0.
      await page.getByRole('button', { name: /get started/i }).first().click()
      await dismissAdvisorModal(page)

      // Step 0 always renders the "Resume a draft" section, and our saved draft
      // appears there by its name. Either confirms the resume affordance.
      await expect(page.getByText(/resume a draft/i)).toBeVisible({ timeout: 8_000 })
      await expect(page.getByText('E2E Draft Property')).toBeVisible({ timeout: 8_000 })
    })
  })

  test('C4: delete a draft → confirm modal → draft removed', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'C4 — delete draft' })

    await test.step('Reach Step 0 and check a draft exists (requires C3 to have run)', async () => {
      await page.goto('/add-property')
      await page.getByRole('button', { name: /get started/i }).first().click()
      await dismissAdvisorModal(page)
      if (!(await page.getByText('E2E Draft Property').isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip(true, 'No draft present — run C3 first')
        return
      }
    })

    await test.step('Delete the draft via confirm modal', async () => {
      // Each draft row carries a trash icon button labelled "Delete draft".
      await page.getByRole('button', { name: /delete draft/i }).first().click()
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      await expect(dialog).toBeVisible({ timeout: 3_000 })
      await dialog.getByRole('button', { name: /delete draft|confirm|delete|yes/i }).first().click()
    })

    await test.step('Draft is gone', async () => {
      await expect(page.getByText('E2E Draft Property')).not.toBeVisible({ timeout: 5_000 })
    })
  })
})
