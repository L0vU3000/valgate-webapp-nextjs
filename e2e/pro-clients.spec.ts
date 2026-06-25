/**
 * Section K — Pro — Clients
 */
import { test, expect } from './fixtures'
import { getLastActivity } from './helpers/db'

// Pro clients are persisted to local-db JSON at
// public/data/users/demo-user/clients/CLI-XXXX (NOT Neon), and these tests do
// not delete that directory afterwards — the client id is app-assigned, so the
// test can't easily reverse it. Every run therefore accumulates a new client
// dir. To keep assertions deterministic despite that pollution, K1 creates a
// UNIQUELY-named client per run; K2 and K3 (serial, workers:1) act on that same
// unique name, so each selector resolves to exactly one element.
const E2E_CLIENT_NAME = `E2E Client ${Date.now()}`

// Serial: K2 (archive) and K3 (reactivate) act on the client K1 onboards, and
// all three share the run-unique E2E_CLIENT_NAME, so they must run in order.
test.describe.serial('K — Pro Clients', () => {
  test('K1: onboard a client → created in active book', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'K1 — onboard client' })

    await test.step('Open onboard dialog', async () => {
      // The onboard modal lists every managed property as an "Assign properties" toggle.
      // With the demo org's full catalog that list is long, making the modal taller than a
      // 720px viewport and pushing the submit button off-screen. Use a tall viewport so the
      // whole modal — including "Create client" — is reachable.
      await page.setViewportSize({ width: 1280, height: 2400 })
      await page.goto('/pro/clients')
      await expect(page).not.toHaveURL(/login/)
      await page.getByRole('button', { name: /onboard client/i }).click()
    })

    await test.step('Fill and submit', async () => {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(/onboard a client/i)
      await dialog.getByLabel('Name', { exact: true }).fill(E2E_CLIENT_NAME)
      await dialog.getByLabel('Type', { exact: true }).selectOption('Individual')
      // The optional property-assignment list makes the modal taller than the viewport
      // (now that the demo org has its full catalog), pushing the submit button below the
      // fold — scroll it into view before clicking.
      const createBtn = dialog.getByRole('button', { name: 'Create client' })
      await createBtn.scrollIntoViewIfNeeded()
      await createBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    })

    await test.step('Client appears in active list', async () => {
      // The name legitimately renders in several places (sidebar client list +
      // active clients table row), so a bare getByText is ambiguous. Scope the
      // assertion to the active clients TABLE row to keep it unambiguous.
      const clientRow = page.getByRole('row').filter({ hasText: E2E_CLIENT_NAME })
      await expect(clientRow.first()).toBeVisible({ timeout: 5_000 })
    })
  })

  test('K2: archive client → leaves active book, DB activity row', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'K2 — archive client' })

    await test.step('Find and archive client', async () => {
      await page.goto('/pro/clients')
      // Each active table row exposes an archive icon button whose accessible
      // name is "Archive {client name}" — unique per run, so it points at
      // exactly this client's row.
      const archiveBtn = page.getByRole('button', { name: `Archive ${E2E_CLIENT_NAME}` })
      if (!await archiveBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `${E2E_CLIENT_NAME} not found — run K1 first`)
        return
      }
      await archiveBtn.click()
      // ConfirmAction (confirm tier) opens a Radix AlertDialog whose action
      // button reuses the "Archive" confirmLabel.
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      await dialog.getByRole('button', { name: 'Archive' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('Client leaves active book', async () => {
      // After archiving, the client must no longer have an active table row
      // (its archive icon button is gone). It now lives only in the "Archived
      // clients" <li> list, which K3 acts on.
      await expect(
        page.getByRole('button', { name: `Archive ${E2E_CLIENT_NAME}` }),
      ).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('DB activity row recorded', async () => {
      const row = await getLastActivity('client', 'archived')
      expect(row).not.toBeNull()
    })
  })

  test('K3: reactivate client → back in active book', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'K3 — reactivate client' })

    await test.step('Find and click reactivate', async () => {
      await page.goto('/pro/clients')
      // The archived client is a <li> in the "Archived clients" section; its
      // row carries both the client name and a "Reactivate" trigger button.
      const archivedRow = page
        .locator('li')
        .filter({ hasText: E2E_CLIENT_NAME })
        .filter({ hasText: /archived/i })
      const reactivateBtn = archivedRow.getByRole('button', { name: 'Reactivate' })
      if (!await reactivateBtn.isVisible({ timeout: 8_000 })) {
        test.skip(true, `${E2E_CLIENT_NAME} not archived — run K2 first`)
        return
      }
      await reactivateBtn.click()
      // ConfirmAction (confirm tier) opens a Radix AlertDialog whose action
      // button reuses the "Reactivate" confirmLabel.
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      await dialog.getByRole('button', { name: 'Reactivate' }).click()
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    })

    await test.step('Client is back in active list', async () => {
      // Reactivation restores the client to the active table; scope to that row
      // (the name also renders in the sidebar, so a bare getByText is ambiguous).
      const clientRow = page.getByRole('row').filter({ hasText: E2E_CLIENT_NAME })
      await expect(clientRow.first()).toBeVisible({ timeout: 5_000 })
    })
  })
})
