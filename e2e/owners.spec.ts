/**
 * Section G — Owners / co-owners
 *
 * Co-owners are NOT edited in an inline form — they live inside the Ownership
 * wizard (FeatureUnlockWizard). The ownership page opens the wizard via the
 * header button ("Unlock feature" when no record exists, otherwise "Edit
 * ownership") or the "Edit Split" button on the Ownership Split card.
 *
 * The wizard is a Radix dialog with three data steps: Structure → Loan →
 * Co-owners. To reach the Co-owners step you must pick a holding type that is
 * not "Sole Ownership" and click "Continue →" through Structure and Loan.
 *
 * On the Co-owners step each owner is a row with:
 *   - name input  → placeholder "Full name *"
 *   - role        → native <select> (Primary / Minor)
 *   - share input → placeholder "Share %"
 *   - a "Add co-owner" button to append a row
 *   - a Trash2 icon button per row to drop it
 * Shares must total 100% before the step validates. The footer button reads
 * "Save & verify →" on the last data step (the wizard has a verification step).
 * Clicking it persists the co-owners, then advances to the verification phase —
 * so we close the wizard (Escape) to return to the page, which refreshes and
 * shows the saved co-owner.
 *
 * Removing a co-owner is simplest from the page itself: each OwnerCard has a
 * "Remove {name}" button that opens a confirm alertdialog with a "Remove owner"
 * button.
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'

test.describe('G — Owners / co-owners', () => {
  test('G1: add co-owner → appears, split updates', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'G1 — add co-owner' })
    const ids = await createThrowawayProperty()

    try {
      await test.step('Open the ownership wizard', async () => {
        await page.goto(`/property/${ids.propertyId}/ownership`)
        await page
          .getByRole('button', { name: /unlock feature|edit ownership|edit split/i })
          .first()
          .click({ timeout: 10_000 })
      })

      const dialog = page.getByRole('dialog')

      await test.step('Pick a co-owned holding type and advance to the co-owners step', async () => {
        await expect(dialog).toBeVisible({ timeout: 5_000 })
        // Structure step. Holding type is an sr-only <input type="radio"> wrapped in a
        // <label>; the input sits outside the viewport so check() fails even with force.
        // Click the visible <label> instead — it toggles the wrapped radio. Picking a
        // non-sole type reveals the Distribution Method group; waiting for it confirms.
        await dialog.locator('label').filter({ hasText: 'Tenancy in Common' }).click()
        const proRata = dialog.locator('label').filter({ hasText: 'Pro-Rata by Share' })
        await expect(proRata).toBeVisible({ timeout: 5_000 })
        await proRata.click()
        // Structure → Loan (loan fields are all optional). Wait for each step heading
        // before clicking Continue again so we never click mid-render.
        await dialog.getByRole('button', { name: /continue/i }).click()
        await expect(dialog.getByRole('heading', { name: 'Loan & financing' })).toBeVisible({ timeout: 5_000 })
        // The Loan step claims "all fields optional", but loanTermYears is
        // z.coerce.number().positive(): an empty input coerces to 0, which fails
        // .positive() and blocks Continue. Fill a valid term so the step validates.
        await dialog.getByPlaceholder('30').fill('30')
        // Loan → Co-owners.
        await dialog.getByRole('button', { name: /continue/i }).click()
        await expect(dialog.getByRole('heading', { name: 'Co-owners' })).toBeVisible({ timeout: 5_000 })
      })

      await test.step('Add a co-owner that holds the full 100% share', async () => {
        await dialog.getByRole('button', { name: /add co-owner/i }).click()
        await dialog.getByPlaceholder('Full name *').fill('E2E Co-Owner')
        await dialog.getByPlaceholder('Share %').fill('100')
        // The step only validates once shares total 100% — wait for the live indicator
        // to confirm before saving so we don't race the share-total recompute.
        await expect(dialog.getByText(/100\.0%\s*✓/)).toBeVisible({ timeout: 5_000 })
        // Last data step → "Save & verify →". This persists the co-owner before
        // advancing to the verification phase.
        await dialog.getByRole('button', { name: /save & verify|save/i }).click()
      })

      await test.step('Close the wizard so the page refreshes, then see the co-owner', async () => {
        // The wizard moves to the verification phase after saving; close it to
        // return to the page (which refreshes on close because data changed).
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
        await expect(page.getByText('E2E Co-Owner').first()).toBeVisible({ timeout: 8_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('G2: edit a co-owner → saves', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'G2 — edit co-owner' })
    const ids = await createThrowawayProperty({ withCoOwner: true })

    try {
      await test.step('Seeded co-owner is on the page, then open the wizard', async () => {
        await page.goto(`/property/${ids.propertyId}/ownership`)
        await expect(page.getByText('E2E Co-Owner').first()).toBeVisible({ timeout: 10_000 })
        await page
          .getByRole('button', { name: /unlock feature|edit ownership|edit split/i })
          .first()
          .click()
      })

      const dialog = page.getByRole('dialog')

      await test.step('Advance to the co-owners step', async () => {
        await expect(dialog).toBeVisible({ timeout: 5_000 })
        // The wizard always opens at Structure (the seeded co-owner exists but there is
        // no ownership record yet, so holdingType is unset). Holding type is an sr-only
        // radio wrapped in a <label> sitting outside the viewport — click the visible
        // <label>, not the hidden radio. The Distribution Method group then appears.
        await dialog.locator('label').filter({ hasText: 'Tenancy in Common' }).click()
        const proRata = dialog.locator('label').filter({ hasText: 'Pro-Rata by Share' })
        await expect(proRata).toBeVisible({ timeout: 5_000 })
        await proRata.click()
        await dialog.getByRole('button', { name: /continue/i }).click()
        await expect(dialog.getByRole('heading', { name: 'Loan & financing' })).toBeVisible({ timeout: 5_000 })
        // loanTermYears is .positive(), so an empty input (coerced to 0) blocks Continue.
        await dialog.getByPlaceholder('30').fill('30')
        await dialog.getByRole('button', { name: /continue/i }).click()
        await expect(dialog.getByRole('heading', { name: 'Co-owners' })).toBeVisible({ timeout: 5_000 })
      })

      await test.step('Rename the seeded co-owner and save', async () => {
        // The seeded co-owner row is preloaded; its name field holds "E2E Co-Owner".
        const nameField = dialog.getByPlaceholder('Full name *').first()
        await expect(nameField).toHaveValue('E2E Co-Owner', { timeout: 5_000 })
        await nameField.fill('E2E Co-Owner Updated')
        // Make the single owner hold 100% so the step validates and saves.
        await dialog.getByPlaceholder('Share %').first().fill('100')
        await expect(dialog.getByText(/100\.0%\s*✓/)).toBeVisible({ timeout: 5_000 })
        await dialog.getByRole('button', { name: /save & verify|save/i }).click()
      })

      await test.step('Close the wizard and confirm the new name shows', async () => {
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
        await expect(page.getByText('E2E Co-Owner Updated').first()).toBeVisible({ timeout: 8_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('G3: remove co-owner → owner gone, split empties', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'G3 — remove co-owner / split rebalance' })
    const ids = await createThrowawayProperty({ withCoOwner: true })

    try {
      await test.step('Remove the co-owner from its owner card and confirm', async () => {
        await page.goto(`/property/${ids.propertyId}/ownership`)
        // Each OwnerCard has a "Remove {name}" button (aria-label) that opens a
        // confirm alertdialog with a "Remove owner" button.
        const removeBtn = page.getByRole('button', { name: /remove e2e co-owner/i })
        await expect(removeBtn).toBeVisible({ timeout: 10_000 })
        await removeBtn.click()

        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/remove/i)
        await dialog.getByRole('button', { name: /remove owner/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
      })

      await test.step('Co-owner is gone and the split shows the empty state', async () => {
        // The only co-owner is removed, so the split has no owners left.
        await expect(page.getByText('E2E Co-Owner')).toHaveCount(0, { timeout: 8_000 })
        await expect(page.getByText(/no co-owners yet/i).first()).toBeVisible({ timeout: 5_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })
})
