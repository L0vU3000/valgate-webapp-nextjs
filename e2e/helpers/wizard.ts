/**
 * Driving the real /add-property wizard.
 *
 * The flow is a multi-stage walk, not one form — the selectors below were aligned against the live
 * DOM and are the same ones `add-property.spec.ts` and `intake.spec.ts` both depend on, so they live
 * here rather than being copied per spec:
 *
 *   Step 0 (method)      → "Enter manually"
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
 * `/add-property` renders Step 0 directly. The StepIntro landing ("Get Started") only appears when
 * `preFlowStage` is set, so it is not part of the default walk.
 *
 * The Step 2 "Property Name" <label> is not associated with its <input> (no htmlFor/id), so
 * getByLabel does not find it — target the input by its placeholder instead.
 */
import { expect, type Page } from '@playwright/test'

// The footer primary CTA on form steps is literally "Continue"; the final step is "Submit".
const CONTINUE = /^continue$/i

// "Continue" is ambiguous in the DOM: the How-it-works gates render BOTH a phone footer
// (lg:hidden) and a desktop footer (hidden lg:flex), each with its own "Continue" button,
// so two nodes match the role+name even though only one is visible. Click the visible one
// to avoid Playwright strict-mode violations. Works for the single footer Continue too.
export async function clickContinue(page: Page) {
  await page.getByRole('button', { name: CONTINUE }).filter({ visible: true }).first().click()
}

// From `/add-property` (Step 0 renders directly, no landing), click "Enter manually" and pass
// through the first "How it works" gate to land on Step 1 (property type).
export async function reachStep1(page: Page) {
  await page.goto('/add-property')
  await expect(page).not.toHaveURL(/\/login/)

  await page.getByRole('button', { name: /enter manually/i }).click()

  // Gate 1 — "Step 1 of 3: Tell us about your property"
  await clickContinue(page)
}

// Address is required to leave Step 2 (see the guard in AddPropertyFlow.goNext): a property saved
// without a picked address lands on the Cambodia centroid. Picking a suggestion sets BOTH the
// address fields and `mapCenter`, so this is the credentials-free way to satisfy the guard — the
// drag-the-pin route cannot work here, because CI runs NEXT_PUBLIC_MAPBOX_TOKEN=pk.ci-dummy, the
// style request 403s, `map.on("load")` never fires and the draggable marker is never created.
//
// Stubbing the route is what makes this independent of the live provider: CI has no
// STORAGE_ACCESS_KEY_ID/SECRET for GrabMaps, so a real search returns [] and the list never opens.
export const STUB_SUGGESTION = {
  placeId: 'e2e-stub-place',
  label: 'E2E Test Street, Phnom Penh, Cambodia',
  title: 'E2E Test Street',
  street: 'E2E Test Street',
  district: 'Phnom Penh',
  locality: 'Phnom Penh',
  postalCode: '12000',
  country: 'Cambodia',
  position: [104.9282, 11.5564] as [number, number],
}

export async function fillAddress(page: Page) {
  await page.route('**/api/v1/address/suggest*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [STUB_SUGGESTION] }),
    }),
  )

  // The placeholder is "Search address…" with a real ellipsis character, so match on the words
  // only — a literal "Search address..." pattern would never match it.
  const addressInput = page.locator('input[placeholder^="Search address"]').first()
  await addressInput.fill('E2E Test Street')

  // Debounced 300ms, then the results render as buttons. The option handler listens for mousedown;
  // a normal click still works because Playwright dispatches mousedown before click.
  const option = page.getByRole('button', { name: /E2E Test Street/i }).first()
  await option.click({ timeout: 10_000 })

  // The pin banner only renders once mapCenter is set — that is exactly what the guard requires.
  await expect(page.getByText(/location pinned at/i)).toBeVisible({ timeout: 5_000 })
}

// From Step 1, pick a property type (auto-advances to Step 2) and wait for the
// Property Name field. Returns the name input locator.
export async function reachStep2(page: Page) {
  await reachStep1(page)
  await page.getByRole('button', { name: /residential house/i }).click()
  const nameField = page.getByPlaceholder(/skyline luxury lofts/i)
  await expect(nameField).toBeVisible({ timeout: 10_000 })
  return nameField
}

/**
 * Walk to Step 4, the photos-and-documents step, and return the draft id the wizard minted.
 *
 * The draft id is the point of the walk for intake tests: the staged-file rows are keyed on it, so
 * asserting against it is what separates "the thumbnail appeared" from "the server stored the file".
 */
export async function reachStep4(page: Page, name: string): Promise<string> {
  const nameField = await reachStep2(page)
  await nameField.fill(name)
  await nameField.blur()
  await expect(page).toHaveURL(/draftId=DRFT-/, { timeout: 10_000 })
  const draftId = new URL(page.url()).searchParams.get('draftId') ?? ''

  await fillAddress(page)
  await clickContinue(page) // Step 2 footer
  await clickContinue(page) // Gate 2
  await clickContinue(page) // Step 3 footer (financial is optional)

  await expect(page.getByText(/add photos/i).first()).toBeVisible({ timeout: 10_000 })
  return draftId
}
