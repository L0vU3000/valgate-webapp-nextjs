/**
 * Section J — Activity log (audit trail)
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup, getLastActivity } from './helpers/db'

test.describe('J — Activity log', () => {
  test('J1: /activity page loads and lists events', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'J1 — activity page loads' })

    await test.step('Navigate and confirm no redirect', async () => {
      await page.goto('/activity')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.getByRole('heading', { name: /activity log/i })).toBeVisible({ timeout: 10_000 })
    })

    await test.step('Events from seed data are visible', async () => {
      await expect(page.locator('li, [role="listitem"]').first()).toBeVisible({ timeout: 5_000 })
    })
  })

  test('J2: archive action creates activity row', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'J2 — archive creates activity row' })
    const ids = await createThrowawayProperty()

    try {
      await test.step('Archive throwaway property via UI', async () => {
        await page.goto('/portfolio')
        await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
        await page.getByRole('menuitem', { name: 'Archive' }).click()
        const dialog = page.getByRole('alertdialog')
        await dialog.getByRole('button', { name: 'Archive' }).click()
        await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      })

      await test.step('Activity page shows the event', async () => {
        await page.goto('/activity')
        await expect(page.getByText(/archive|archived|property/i).first()).toBeVisible({ timeout: 8_000 })
      })

      await test.step('DB has activity row for archive', async () => {
        // archivePropertyAction logs entity="property", action="updated"
        // (summary: 'Property "..." archived'), not action="archived".
        const row = await getLastActivity('property', 'updated')
        expect(row).not.toBeNull()
      })
    } finally {
      try {
        await page.goto('/portfolio')
        const showArchivedControl = page
          .getByRole('checkbox', { name: /show archived/i })
          .or(page.getByRole('switch', { name: /show archived/i }))
        if (await showArchivedControl.isVisible()) await showArchivedControl.click()
        const restoreBtn = page.getByRole('button', { name: `Actions for ${ids.name}` })
        if (await restoreBtn.isVisible({ timeout: 3_000 })) {
          await restoreBtn.click()
          await page.getByRole('menuitem', { name: 'Restore' }).click()
          const d = page.getByRole('alertdialog')
          await d.getByRole('button', { name: 'Restore' }).click()
        }
      } finally {
        await cleanup(ids.propertyId)
      }
    }
  })

  test('J3: property delete leaves activity row (property_id gone, row survives)', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'J3 — delete leaves activity row' })
    const ids = await createThrowawayProperty()

    await test.step('Delete property via UI', async () => {
      await page.goto('/portfolio')
      await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      const dialog = page.getByRole('alertdialog')
      await dialog.getByRole('textbox').fill(ids.name)
      await dialog.getByRole('button', { name: 'Delete property' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    })

    await test.step('Activity row for deletion still exists in DB', async () => {
      const row = await getLastActivity('property', 'deleted')
      expect(row).not.toBeNull()
    })
  })

  test('J4: estate timeline renders without regression', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'J4 — estate timeline no regression' })

    await test.step('Navigate and confirm no crash', async () => {
      await page.goto('/estate-planning')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('body')).not.toBeEmpty()
      await expect(page.getByText(/something went wrong|error|crash/i)).not.toBeVisible()
    })
  })
})
