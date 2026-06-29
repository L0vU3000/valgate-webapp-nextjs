/**
 * Section E — Photos
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'
import { existsSync } from 'fs'
import path from 'path'

const PHOTO_FIXTURE = path.resolve(process.cwd(), 'e2e', 'fixtures', 'test-photo.jpg')

// Photos live directly on the property Overview page (PropertyOverviewPage renders
// <PropertyPhotoManager/> inline) — there is no separate Photos tab or /photos route.
// So we just navigate to /property/{id}/overview and let the manager render.
async function gotoPhotos(page: import('@playwright/test').Page, propId = 'PROP-0001') {
  await page.goto(`/property/${propId}/overview`)
  // The "Photos" section heading confirms the manager has mounted before we assert.
  await page.getByRole('heading', { name: 'Photos' }).waitFor({ state: 'visible', timeout: 15_000 })
}

// Serial: E2 (delete) and E3 (set-cover) depend on the photo that E1 (upload) creates.
// Under workers:1 this runs E1→E2→E3→E4 in file order.
test.describe.serial('E — Photos', () => {
  // E1-E3 share one throwaway property. The seed catalog lives under ORG-0009 while the
  // demo context is ORG-0001, so PROP-0001 is not reachable in DEMO_MODE — a throwaway
  // (created under ORG-0001) is. See QA-FINDINGS for the seed-org mismatch.
  let sharedPropId: string

  test.beforeAll(async () => {
    const ids = await createThrowawayProperty()
    sharedPropId = ids.propertyId
  })

  test.afterAll(async () => {
    await cleanup(sharedPropId)
  })

  test('E1: upload a photo → appears in grid', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'E1 — upload photo' })

    await test.step('Check fixture file exists', async () => {
      if (!existsSync(PHOTO_FIXTURE)) {
        test.skip(true, 'Run: node e2e/fixtures/generate.mjs to create test-photo.jpg')
        return
      }
    })

    await test.step('Navigate to photos section', async () => {
      await gotoPhotos(page, sharedPropId)
      // The upload control is a <button> whose visible label is "Add photo"
      // (or "Uploading…" mid-flight); the empty state offers "Add the first photo →".
      await expect(
        page.getByRole('button', { name: /add photo|add the first photo/i }).first(),
      ).toBeVisible({ timeout: 10_000 })
    })

    await test.step('Set file on hidden input and confirm photo appears', async () => {
      // The real input is <input type="file" accept="image/*" class="hidden">.
      // setInputFiles works on hidden inputs directly — no need to unhide it.
      const fileInput = page.locator('input[type="file"][accept="image/*"]')
      await fileInput.setInputFiles(PHOTO_FIXTURE)
      // On success the manager re-fetches and renders the uploaded photo. The first
      // photo is the cover (alt="Cover photo"); subsequent ones are
      // alt="Property photo N". Either confirms a photo landed in the grid.
      await expect(
        page
          .getByRole('img', { name: 'Cover photo' })
          .or(page.getByRole('img', { name: /^Property photo \d+$/ }))
          .first(),
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test('E2: delete a photo → confirm modal → gone', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'E2 — delete photo' })

    await test.step('Navigate to photos', async () => {
      await gotoPhotos(page, sharedPropId)
    })

    await test.step('Click delete and count changes', async () => {
      // Each photo tile has a hover button with aria-label="Delete photo".
      const deleteBtn = page.getByRole('button', { name: 'Delete photo' }).first()
      if (!await deleteBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, 'No photos to delete — upload one first (E1)')
        return
      }
      const countBefore = await page.getByRole('button', { name: 'Delete photo' }).count()
      await deleteBtn.click()
      // ConfirmAction renders a Radix AlertDialog (role="alertdialog") titled
      // "Delete this photo?" with a confirm button labelled "Delete photo".
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toContainText(/delete this photo/i)
      await dialog.getByRole('button', { name: 'Delete photo' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      await expect(
        page.getByRole('button', { name: 'Delete photo' }),
      ).toHaveCount(Math.max(0, countBefore - 1), { timeout: 5_000 })
    })
  })

  test('E3: set-cover → chosen photo becomes cover', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'E3 — set cover photo' })

    await test.step('Navigate to photos', async () => {
      await gotoPhotos(page, sharedPropId)
    })

    await test.step('Click set-cover on a non-cover photo', async () => {
      // Only non-cover tiles render the set-cover button (aria-label="Set as cover
      // photo"); the current cover shows a "Cover" badge instead. So needing >=1 of
      // these buttons already implies there are at least 2 photos.
      const coverBtns = page.getByRole('button', { name: 'Set as cover photo' })
      if ((await coverBtns.count()) < 1) {
        test.skip(true, 'Need at least 2 photos (one non-cover) to test set-cover')
        return
      }
      await coverBtns.first().click()
      // On success the manager fires a sonner toast "Cover photo updated".
      await expect(
        page.getByText(/cover photo updated/i),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('E4: empty state shown when property has no photos', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'E4 — empty state' })
    const ids = await createThrowawayProperty()

    try {
      await test.step('Navigate to photos of throwaway property', async () => {
        await gotoPhotos(page, ids.propertyId)
      })

      await test.step('Empty state text is visible', async () => {
        // The empty state renders "No photos yet." plus an "Add the first photo →" button.
        await expect(
          page.getByText('No photos yet.').or(
            page.getByRole('button', { name: /add the first photo/i }),
          ).first(),
        ).toBeVisible({ timeout: 8_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })
})
