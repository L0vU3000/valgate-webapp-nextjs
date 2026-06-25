/**
 * Section N — Pro — Compliance
 */
import { test, expect } from './fixtures'
import {
  createThrowawayProperty,
  seedResolvedSafetyRisk,
  cleanupSafetyRisk,
  cleanup,
} from './helpers/db'

test.describe('N — Pro Compliance', () => {
  test('N0: compliance page loads', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'N0 — compliance page loads' })

    await test.step('Navigate and confirm heading', async () => {
      await page.goto('/pro/compliance')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test('N1: resolve safety risk → confirm modal required first', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'N1 — resolve risk confirm modal' })

    await test.step('Find and click resolve', async () => {
      await page.goto('/pro/compliance')
      const resolveBtn = page.getByRole('button', { name: /resolve/i }).first()
      if (!await resolveBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, 'No open safety risks to resolve — seed data may have none')
        return
      }
      await resolveBtn.click()
    })

    await test.step('Confirm modal appears before resolution', async () => {
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      await expect(dialog).toBeVisible({ timeout: 3_000 })
      await expect(dialog).toContainText(/resolve/i)
      await dialog.getByRole('button', { name: /cancel/i }).click()
      await expect(dialog).not.toBeVisible()
    })
  })

  test('N2: "Show resolved" toggle → resolved risks appear', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'N2 — show-resolved toggle' })

    // The "Show resolved" checkbox is DISABLED whenever there are zero resolved
    // safety risks in the demo org — so we must seed one before the page loads,
    // otherwise the toggle can never be enabled or clicked. We create a throwaway
    // property (scoped to ORG-0001, the org the compliance page reads from) and
    // attach a status='Resolved' risk to it. Both are torn down in `finally`.
    let propertyId: string | undefined
    let resolvedRiskId: string | undefined

    try {
      await test.step('Seed a resolved safety risk so the toggle is enabled', async () => {
        const ids = await createThrowawayProperty()
        propertyId = ids.propertyId
        resolvedRiskId = await seedResolvedSafetyRisk(propertyId)
      })

      await test.step('Checkbox is enabled now that a resolved risk exists', async () => {
        await page.goto('/pro/compliance')
        const showResolvedCb = page
          .getByLabel(/show resolved/i)
          .or(page.getByRole('checkbox', { name: /show resolved/i }))
        await expect(showResolvedCb).toBeVisible({ timeout: 10_000 })
        await expect(showResolvedCb).toBeEnabled()
        // It starts unchecked (page default hides resolved risks).
        await expect(showResolvedCb).not.toBeChecked()
      })

      await test.step('Toggle on → the seeded resolved risk row becomes visible', async () => {
        const showResolvedCb = page
          .getByLabel(/show resolved/i)
          .or(page.getByRole('checkbox', { name: /show resolved/i }))
        await showResolvedCb.check()
        await expect(showResolvedCb).toBeChecked()
        // The resolved row renders the risk title plus a read-only "Resolved" badge.
        await expect(page.getByText('E2E Resolved Risk')).toBeVisible({ timeout: 5_000 })
      })
    } finally {
      // Risk first (it cascades with the property anyway, but be explicit),
      // then the throwaway property. Never touches seed data.
      await cleanupSafetyRisk(resolvedRiskId)
      await cleanup(propertyId)
    }
  })

  test('N3: certifications section renders', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'N3 — certifications render' })

    await test.step('Confirm certification/inspection content visible', async () => {
      await page.goto('/pro/compliance')
      await expect(
        page.getByText(/certif|inspection|compliance/i).first(),
      ).toBeVisible({ timeout: 10_000 })
    })
  })
})
