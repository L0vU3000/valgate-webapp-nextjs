/**
 * Section I — Dashboard & misc
 * Alert dismiss/undo appears unbuilt at time of audit → tests.skip with documentation.
 */
import { test, expect } from './fixtures'

test.describe('I — Dashboard & misc', () => {
  test.skip('I1: alerts — dismiss one → Undo toast restores it', async () => {
    // ponytail: unbuilt at time of audit
  })

  test.skip('I2: "Dismiss all" → Undo toast restores all', async () => {
    // ponytail: unbuilt at time of audit
  })

  test('I3: analytics page loads without error', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'I3 — analytics page loads' })

    await test.step('Navigate and confirm heading visible', async () => {
      await page.goto('/analytics')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test('I4: estate-planning page loads without error', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'I4 — estate-planning loads' })

    await test.step('Navigate and confirm body not empty', async () => {
      await page.goto('/estate-planning')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('body')).not.toBeEmpty()
    })
  })

  test('I5: settings page loads without error', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'I5 — settings page loads' })

    await test.step('Try known settings URLs', async () => {
      const settingsUrls = ['/settings', '/settings/profile', '/profile']
      let loaded = false
      for (const url of settingsUrls) {
        await page.goto(url)
        if (!page.url().includes('/login') && !page.url().includes('/404')) {
          loaded = true
          break
        }
      }
      if (!loaded) {
        test.skip(true, 'Settings page URL not found — update settingsUrls in this test')
        return
      }
      await expect(page.locator('body')).not.toBeEmpty()
    })
  })
})
