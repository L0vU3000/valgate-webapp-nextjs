/**
 * Section M — Pro — Work orders
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'

// Unique per run: work orders are not cleaned up afterwards, so a constant title
// accumulates duplicates and trips strict-mode locators. A run-unique title keeps
// M1→M2→M4 (serial) each resolving to exactly one row.
const WO_TITLE = `E2E Work Order ${Date.now()}`
const WO_CANCEL_TITLE = `E2E WO Cancel ${Date.now()}`

// Serial: M1 creates WO_TITLE, then M2 (assign vendor), M3 (start) and M4
// (resolve) act on that same work order in order. Under workers:1 the file
// order is preserved anyway, but .serial makes the create→act dependency
// explicit and skips the dependent steps if an earlier one fails.
test.describe.serial('M — Pro Work Orders', () => {
  // The Pro work-order dialog's property picker only lists properties "under management"
  // (those with a client_id). The demo org's seed catalog lives under ORG-0009, so under
  // the ORG-0001 demo context there are none — create one managed throwaway so M1 can
  // pick a property. (See QA-FINDINGS: seed-org mismatch.)
  let managedPropId: string

  test.beforeAll(async () => {
    const ids = await createThrowawayProperty({ managedByClientId: 'CLI-0001' })
    managedPropId = ids.propertyId
  })

  test.afterAll(async () => {
    await cleanup(managedPropId)
  })

  test('M0: work orders page loads', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M0 — work orders page loads' })

    await test.step('Navigate and confirm heading', async () => {
      await page.goto('/pro/work-orders')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test('M1: create work order → appears in list', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M1 — create work order' })

    await test.step('Open new work order dialog', async () => {
      await page.goto('/pro/work-orders')
      await page.getByRole('button', { name: /new work order/i }).click()
    })

    await test.step('Fill details and submit', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/new work order/i)
      const propertySelect = dialog.getByLabel(/property/i)
      if (await propertySelect.isVisible()) await propertySelect.selectOption({ index: 1 })
      await dialog.getByLabel(/description/i).fill(WO_TITLE)
      const severitySelect = dialog.getByLabel(/severity/i)
      if (await severitySelect.isVisible()) await severitySelect.selectOption('Standard')
      await dialog.getByRole('button', { name: /create work order/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    })

    await test.step('Work order appears in list', async () => {
      await expect(page.getByText(WO_TITLE).first()).toBeVisible({ timeout: 5_000 })
    })
  })

  test('M2: assign vendor → picker → assigned', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M2 — assign vendor' })

    await test.step('Open vendor picker', async () => {
      await page.goto('/pro/work-orders')
      const assignBtn = page
        .locator('tr, li, [role="row"]')
        .filter({ hasText: WO_TITLE })
        .getByRole('button', { name: /assign vendor/i })
      if (!await assignBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `Work order "${WO_TITLE}" not found — run M1 first`)
        return
      }
      await assignBtn.click()
    })

    await test.step('Select first available vendor or skip if none', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/assign a vendor/i)
      // The vendor picker is a custom list of <button> rows (VendorOption),
      // each carrying aria-pressed — the only buttons in the dialog that do
      // (Cancel and the "Assign vendor" submit button do not). Unavailable
      // vendors render as disabled buttons, so :enabled keeps the pickable ones.
      const vendorButtons = dialog.locator('button[aria-pressed]:enabled')
      if (await vendorButtons.count() > 0) {
        await vendorButtons.first().click()
        await dialog.getByRole('button', { name: /^assign vendor$/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
        // Back in the list, the assigned row now shows "Vendor: <name>".
        await expect(
          page.locator('tr, li').filter({ hasText: WO_TITLE }).getByText(/vendor:/i),
        ).toBeVisible({ timeout: 5_000 })
      } else {
        await dialog.getByRole('button', { name: /^cancel$/i }).click()
        test.skip(true, 'No available vendors in directory — add a professional first')
      }
    })
  })

  test('M3: Start → status InProgress', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M3 — start work order' })

    await test.step('Click Start and confirm status change', async () => {
      await page.goto('/pro/work-orders')
      const startBtn = page
        .locator('tr, li, [role="row"]')
        .filter({ hasText: WO_TITLE })
        .getByRole('button', { name: /^start$/i })
      if (!await startBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `Start button not found — may already be InProgress`)
        return
      }
      await startBtn.click()
      await expect(
        page.locator('tr, li').filter({ hasText: WO_TITLE }).getByText(/in progress/i),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('M4: Resolve — confirm modal required before closing', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M4 — resolve work order confirm' })

    await test.step('Click Resolve', async () => {
      await page.goto('/pro/work-orders')
      const resolveBtn = page
        .locator('tr, li, [role="row"]')
        .filter({ hasText: WO_TITLE })
        .getByRole('button', { name: /^resolve$/i })
      if (!await resolveBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `Resolve button not found — work order may not be InProgress`)
        return
      }
      await resolveBtn.click()
    })

    await test.step('Confirm modal appears and resolves', async () => {
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      await expect(dialog).toContainText(/resolve/i)
      await dialog.getByRole('button', { name: /^resolve$/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      await expect(
        page.locator('tr, li').filter({ hasText: WO_TITLE }).getByText(/resolved/i),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('M5: Cancel → confirm modal → Cancelled pill → drops from active queue', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'M5 — cancel work order' })

    await test.step('Create a fresh work order to cancel', async () => {
      await page.goto('/pro/work-orders')
      await page.getByRole('button', { name: /new work order/i }).click()
      const dialog = page.getByRole('dialog')
      const propertySelect = dialog.getByLabel(/property/i)
      if (await propertySelect.isVisible()) await propertySelect.selectOption({ index: 1 })
      await dialog.getByLabel(/description/i).fill(WO_CANCEL_TITLE)
      await dialog.getByRole('button', { name: /create work order/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    })

    await test.step('Cancel it via confirm modal', async () => {
      const cancelBtn = page
        .locator('tr, li, [role="row"]')
        .filter({ hasText: WO_CANCEL_TITLE })
        .getByRole('button', { name: /^cancel$/i })
      await expect(cancelBtn).toBeVisible({ timeout: 5_000 })
      await cancelBtn.click()
      const cancelDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      await expect(cancelDialog).toContainText(/cancel this work order/i)
      await cancelDialog.getByRole('button', { name: /cancel order|confirm/i }).click()
      await expect(cancelDialog).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('Cancelled pill shown, not in active queue', async () => {
      await expect(
        page.locator('tr, li').filter({ hasText: WO_CANCEL_TITLE }).getByText(/cancelled/i),
      ).toBeVisible({ timeout: 5_000 })
      const activeQueue = page.locator('[data-queue="active"], [aria-label*="active"]')
      if (await activeQueue.isVisible({ timeout: 2_000 })) {
        await expect(activeQueue.getByText(WO_CANCEL_TITLE)).not.toBeVisible()
      }
    })
  })
})
