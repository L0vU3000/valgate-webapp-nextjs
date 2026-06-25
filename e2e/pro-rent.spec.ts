/**
 * Section L — Pro — Rent & collections
 * addUtcMonths unit tests already live in lib/format.test.ts — this spec tests UI behaviour.
 */
import { test, expect } from './fixtures'

test.describe('L — Pro Rent & Collections', () => {
  test('L0: rent page loads without redirect', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'L0 — rent page loads' })

    await test.step('Navigate and confirm heading', async () => {
      await page.goto('/pro/rent')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test('L1: log payment → confirm summary shown before submit', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'L1 — log payment two-step confirm' })

    await test.step('Open log payment dialog', async () => {
      await page.goto('/pro/rent')
      const logBtn = page.getByRole('button', { name: /log payment/i }).first()
      if (!await logBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, 'No "Log payment" button — seed data may have no overdue leases')
        return
      }
      await logBtn.click()
    })

    await test.step('Fill step 1 and advance to review', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/log a payment/i)
      const amountField = dialog.getByLabel(/amount/i)
      if (await amountField.isVisible()) await amountField.fill('500')
      await dialog.getByRole('button', { name: /review payment/i }).click()
    })

    await test.step('Step 2 shows summary with record + confirm', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/record/i)
      await expect(dialog).toContainText(/confirm/i)
      await dialog.getByRole('button', { name: /back|cancel/i }).click()
    })
  })

  test('L2: mark paid → Undo toast visible', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'L2 — mark paid undo toast' })

    await test.step('Click mark paid', async () => {
      await page.goto('/pro/rent')
      const markPaidBtn = page.getByRole('button', { name: /mark paid/i }).first()
      if (!await markPaidBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, 'No "Mark paid" button — seed data may have no unpaid rent')
        return
      }
      const countBefore = await page.getByRole('button', { name: /mark paid/i }).count()
      await markPaidBtn.click()

      await test.step('Undo toast appears and count decrements', async () => {
        await expect(page.getByRole('button', { name: /undo/i })).toBeVisible({ timeout: 5_000 })
        await expect(page.getByRole('button', { name: /mark paid/i })).toHaveCount(
          Math.max(0, countBefore - 1),
          { timeout: 5_000 },
        )
      })
    })
  })

  test('L3: lease renewal dialog shows projected end date', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'L3 — renewal projected date shown' })

    await test.step('Open renew dialog', async () => {
      await page.goto('/pro/rent')
      const renewBtn = page.getByRole('button', { name: /renew/i }).first()
      if (!await renewBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, 'No "Renew" button — no expiring leases within 90 days in seed data')
        return
      }
      await renewBtn.click()
    })

    await test.step('Dialog shows a projected year (date shown)', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/renew lease/i)
      const dialogText = await dialog.textContent()
      expect(dialogText).toMatch(/\d{4}/)
      await dialog.getByRole('button', { name: /cancel/i }).click()
    })
  })
})
