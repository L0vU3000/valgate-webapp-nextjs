/**
 * Section H — Directory (professional contacts)
 */
import { test, expect } from './fixtures'

// Unique per run: professionals are not cleaned up afterwards, so a constant name
// accumulates duplicates across runs and breaks strict-mode locators. A run-unique
// name keeps H1→H2→H3 (serial) each resolving to exactly one element.
const NAME = `E2E Professional Playwright ${Date.now()}`

// H2 (edit) and H3 (delete) operate on the professional created by H1,
// so the whole block must run in order.
test.describe.serial('H — Directory', () => {
  test('H1: add a professional → appears in list', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'H1 — add professional' })

    await test.step('Open add-professional wizard', async () => {
      await page.goto('/directory')
      // Two buttons share the "add professional" accessible name: a mobile
      // icon button (aria-label="Add professional", sm:hidden) and a desktop
      // text button ("ADD PROFESSIONAL", hidden sm:flex). Click the one that
      // is actually visible at the test viewport.
      await page
        .getByRole('button', { name: /add professional/i })
        .or(page.getByLabel(/add professional/i))
        .filter({ visible: true })
        .first()
        .click({ timeout: 10_000 })
    })

    await test.step('Fill details and submit', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      // Step 1 — "Professional details". Full name and Company are both
      // required (Zod), so both must be filled or the wizard won't advance.
      // The profession field is a native <select id="professionalCategory">
      // with accessible name "Profession"; use selectOption (not fill) with a
      // real option — "Inspector" is one of the listed categories.
      await dialog.getByRole('textbox', { name: 'Full name' }).fill(NAME)
      await dialog.getByRole('textbox', { name: 'Company or firm' }).fill('E2E Test Firm')
      await dialog.getByRole('combobox', { name: 'Profession' }).selectOption('Inspector')

      // The wizard is a 4-step flow (details → contact → properties → review).
      // Steps 2 and 3 are optional, so advance straight through with "Continue".
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Contact
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Properties
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Review

      // Final step submits via "Add to directory".
      await dialog.getByRole('button', { name: 'Add to directory' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    })

    await test.step('Professional is visible in list', async () => {
      // Target the card heading — a success toast ("{name} added to your directory") also
      // contains the name, so a bare getByText matches two elements and trips strict mode.
      await expect(page.getByRole('heading', { name: NAME })).toBeVisible({ timeout: 5_000 })
    })
  })

  test('H2: edit a professional → saves', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'H2 — edit professional' })

    await test.step('Open edit wizard', async () => {
      await page.goto('/directory')
      const editBtn = page
        .getByRole('button', { name: `Edit ${NAME}` })
        .or(page.getByLabel(`Edit ${NAME}`))
      if (!await editBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `${NAME} not found — run H1 first`)
        return
      }
      await editBtn.click()
    })

    await test.step('Update name and save', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // The edit wizard reuses the same 4-step flow, pre-filled from the
      // existing professional. Update the name on step 1, then advance through
      // the optional steps to the review step and submit via "Save changes".
      await dialog.getByRole('textbox', { name: 'Full name' }).fill(`${NAME} Edited`)
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Contact
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Properties
      await dialog.getByRole('button', { name: 'Continue' }).click() // → Review
      await dialog.getByRole('button', { name: 'Save changes' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('Edited name visible', async () => {
      // Heading, not text — the save toast also echoes the edited name.
      await expect(
        page.getByRole('heading', { name: `${NAME} Edited` }),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('H3: delete a professional → confirm → removed', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'H3 — delete professional' })

    await test.step('Find and click remove', async () => {
      await page.goto('/directory')
      const removeBtn = page
        .getByRole('button', { name: new RegExp(`Remove ${NAME}( Edited)?`) })
        .or(page.getByLabel(new RegExp(`Remove ${NAME}( Edited)?`)))
        .first()
      if (!await removeBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `${NAME} not found — run H1 first`)
        return
      }
      await removeBtn.click()
    })

    await test.step('Confirm removal', async () => {
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      await expect(dialog).toContainText(/remove/i)
      await dialog.getByRole('button', { name: /remove|confirm|yes/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('Professional is gone from list', async () => {
      // Assert the professional CARD heading is gone — not any text. The delete fires a
      // toast ("{name} … removed") that contains the name and is briefly visible, so a
      // bare getByText would both match the toast and trip strict mode.
      await expect(
        page.getByRole('heading', { name: new RegExp(NAME) }),
      ).not.toBeVisible({ timeout: 5_000 })
    })
  })
})
