/**
 * Section B — Portfolio & property lifecycle
 */
import { test, expect } from './fixtures'
import {
  createThrowawayProperty,
  createStandalonePayment,
  cleanup,
  cleanupPayment,
} from './helpers/db'
import { assertCascadeGone, assertSetNullSurvivors, assertActivityRow, assertS3ObjectGone } from './helpers/verify'

test.describe('B — Portfolio', () => {
  test('B1: portfolio loads in DEMO_MODE — no login redirect', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'B1 — portfolio table loads' })

    await test.step('Navigate and confirm no login redirect', async () => {
      await page.goto('/portfolio')
      await expect(page).not.toHaveURL(/\/login/)
    })

    await test.step('Table or card list is visible', async () => {
      await expect(
        page.locator('table, [role="table"]').or(page.getByRole('list')),
      ).toBeVisible({ timeout: 10_000 })
    })
  })

  test('B2-B3: action menu (…) shows View / Edit / Archive / Delete', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'B2-B3 — row action menu items' })
    // Use a throwaway property: the seed catalog lives under ORG-0009 while the demo
    // context is ORG-0001, so the demo portfolio has no seed rows to act on (see QA-FINDINGS).
    const ids = await createThrowawayProperty()

    try {
      await test.step('Open action menu on the throwaway property', async () => {
        await page.goto('/portfolio')
        await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
      })

      await test.step('All expected menu items are visible', async () => {
        await expect(page.getByRole('menuitem', { name: 'View' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Archive' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
        await page.keyboard.press('Escape')
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('B4-B5: archive → restore cycle', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'B4-B5 — archive/restore' })
    const ids = await createThrowawayProperty()
    // The demo org (ORG-0001) has no seed properties (the seed catalog is under ORG-0009),
    // so archiving our only property would empty the portfolio — and the footer that holds
    // the "Show archived" toggle only renders when the active list is non-empty. Keep a
    // second throwaway active so that toggle stays available for the restore step.
    const keepActive = await createThrowawayProperty()

    try {
      await test.step('Archive via action menu', async () => {
        await page.goto('/portfolio')
        await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
        await page.getByRole('menuitem', { name: 'Archive' }).click()
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(`Archive ${ids.name}?`)
        await dialog.getByRole('button', { name: 'Archive' }).click()
      })

      await test.step('Property leaves the active list', async () => {
        await expect(
          page.getByRole('button', { name: `Actions for ${ids.name}` }),
        ).not.toBeVisible({ timeout: 5_000 })
      })

      await test.step('Show archived and click Restore', async () => {
        // The footer "Show archived" control is a plain <button> (PortfolioPage.tsx);
        // it toggles its own label to "Hide archived" once the archived list is shown.
        await page.getByRole('button', { name: 'Show archived' }).click()
        await page.getByRole('button', { name: 'Hide archived' }).waitFor()
        // The archived row exposes the same per-row kebab menu, with a Restore item.
        await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
        await page.getByRole('menuitem', { name: 'Restore' }).click()
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(`Restore ${ids.name}?`)
        await dialog.getByRole('button', { name: 'Restore' }).click()
        // The dialog only closes after restorePropertyAction resolves — wait for it so
        // the reload below sees the restored (active) state, not a racing stale fetch.
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
      })

      await test.step('Property is back in active list', async () => {
        // After restoring the only archived row, archivedCount hits 0 and the
        // "Hide archived" toggle disappears — so reload to reset to the default active
        // view (archivedFilter off) rather than clicking a button that's now gone.
        await page.goto('/portfolio')
        await expect(
          page.getByRole('button', { name: `Actions for ${ids.name}` }),
        ).toBeVisible({ timeout: 5_000 })
      })
    } finally {
      await cleanup(ids.propertyId, keepActive.propertyId)
    }
  })

  test('B6-B7: delete dialog disabled until name typed exactly', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'B6-B7 — typed-confirm delete' })
    const ids = await createThrowawayProperty()

    await test.step('Open delete dialog', async () => {
      await page.goto('/portfolio')
      await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
    })

    await test.step('Confirm button is disabled before typing', async () => {
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toContainText(`Delete ${ids.name}?`)
      await expect(dialog.getByRole('button', { name: 'Delete property' })).toBeDisabled()
    })

    await test.step('Type the property name → button enables', async () => {
      const dialog = page.getByRole('alertdialog')
      await dialog.getByRole('textbox').fill(ids.name)
      await expect(dialog.getByRole('button', { name: 'Delete property' })).toBeEnabled()
    })

    await test.step('Submit — property is gone', async () => {
      const dialog = page.getByRole('alertdialog')
      await dialog.getByRole('button', { name: 'Delete property' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
      await expect(
        page.getByRole('button', { name: `Actions for ${ids.name}` }),
      ).not.toBeVisible()
    })
    // Property deleted by test — no cleanup needed
  })

  test('B8-B10: cascade deep-check + set-null survivors + activity row', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'B8-B10 — cascade / set-null / activity' })
    const ids = await createThrowawayProperty({
      withLease: true,
      withPayment: true,
      withDocument: true,
      withFolder: true,
      withCoOwner: true,
      withSafetyRisk: true,
    })
    const standalonePayId = await createStandalonePayment(ids.propertyId)

    try {
      await test.step('Delete via UI with cascade counts visible', async () => {
        await page.goto('/portfolio')
        await page.getByRole('button', { name: `Actions for ${ids.name}` }).click()
        await page.getByRole('menuitem', { name: 'Delete' }).click()
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/lease|child|record/i, { timeout: 10_000 })
        await dialog.getByRole('textbox').fill(ids.name)
        await dialog.getByRole('button', { name: 'Delete property' }).click()
        await expect(dialog).not.toBeVisible({ timeout: 10_000 })
      })

      await test.step('DB: all cascaded children are gone', async () => {
        await assertCascadeGone(ids)
      })

      await test.step('DB: S3 file removed (skips if STORAGE_BUCKET not set)', async () => {
        if (ids.documentId) await assertS3ObjectGone(`e2e-fake-${ids.documentId}`)
      })

      await test.step('DB: standalone payment survived with property_id = null', async () => {
        await assertSetNullSurvivors(standalonePayId)
      })

      await test.step('DB: activity row written for the deleted property', async () => {
        await assertActivityRow('property', 'deleted')
      })
    } finally {
      await cleanupPayment(standalonePayId)
    }
  })
})
