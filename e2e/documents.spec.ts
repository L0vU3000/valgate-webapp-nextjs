/**
 * Section F — Documents & folders
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const DOC_FIXTURE = path.resolve(process.cwd(), 'e2e', 'fixtures', 'test-doc.pdf')
const DOCS = (propId: string) => `/property/${propId}/documents`

test.describe('F — Documents & folders', () => {
  test('F1: create folder → persists after reload', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F1 — create folder persists' })
    const ids = await createThrowawayProperty()

    try {
      await test.step('Open new folder dialog', async () => {
        await page.goto(DOCS(ids.propertyId))
        await page.getByRole('button', { name: /add folder/i }).click()
      })

      await test.step('Fill name and create', async () => {
        // Add Folder uses a Radix <Dialog> (role="dialog"); the heading is "New Folder".
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText(/new folder/i)
        // The folder-name <label> is not htmlFor-linked to the <input>, so target the
        // input by its real placeholder ("e.g. Lease Agreements").
        await dialog.getByPlaceholder(/lease agreements/i).fill('E2E Persistent Folder')
        await dialog.getByRole('button', { name: /create folder/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      })

      await test.step('Folder appears and survives reload', async () => {
        await expect(page.getByText('E2E Persistent Folder')).toBeVisible({ timeout: 5_000 })
        await page.reload()
        await expect(page.getByText('E2E Persistent Folder')).toBeVisible({ timeout: 8_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('F2: upload file → appears in list', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F2 — upload file' })

    await test.step('Check fixture exists', async () => {
      if (!existsSync(DOC_FIXTURE)) {
        test.skip(true, 'Run: node e2e/fixtures/generate.mjs to create test-doc.pdf')
        return
      }
    })

    const ids = await createThrowawayProperty()
    try {
      await test.step('Open upload dialog and set file', async () => {
        await page.goto(DOCS(ids.propertyId))
        await page.getByRole('button', { name: /upload (a )?(document|file)|add (file|files)/i }).first().click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText(/add files|upload/i)
        const fileInput = dialog.locator('input[type="file"]')
        await dialog.evaluate(() => {
          const el = document.querySelector<HTMLInputElement>('input[type="file"]')
          if (el) el.style.display = 'block'
        })
        await fileInput.setInputFiles(DOC_FIXTURE)
        await dialog.getByRole('button', { name: /upload|send/i }).click()
      })

      await test.step('File appears in document list', async () => {
        await expect(page.getByText(/test-doc\.pdf/i)).toBeVisible({ timeout: 20_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('F3: per-file delete → confirm → removed', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F3 — per-file delete' })
    const ids = await createThrowawayProperty({ withDocument: true })

    try {
      await test.step('Find and delete the seeded document', async () => {
        await page.goto(DOCS(ids.propertyId))
        // Each list/grid row renders a Trash button with aria-label `Delete <file name>`.
        const deleteBtn = page.getByRole('button', { name: /delete e2e-test\.pdf/i }).first()
        await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
        await deleteBtn.click()
        // ConfirmAction (tier="confirm") opens a Radix AlertDialog (role="alertdialog")
        // titled `Delete "e2e-test.pdf"?` with a "Delete" action button.
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/delete/i)
        await dialog.getByRole('button', { name: /^delete$/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      })

      await test.step('File is no longer listed', async () => {
        await expect(page.getByText('e2e-test.pdf')).not.toBeVisible({ timeout: 5_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('F4: bulk delete → typed DELETE → removed', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F4 — bulk delete typed DELETE' })
    const ids = await createThrowawayProperty({ withDocument: true })

    try {
      await test.step('Enter select mode and select all', async () => {
        await page.goto(DOCS(ids.propertyId))
        await expect(page.getByText('e2e-test.pdf')).toBeVisible({ timeout: 10_000 })
        // Toolbar toggle reads "Select" (becomes "Done" once active).
        await page.getByRole('button', { name: /^select$/i }).click()
        // The header checkbox is a role="checkbox" button with aria-label "Select all".
        await page.getByRole('checkbox', { name: /select all/i }).click()
      })

      await test.step('Bulk delete with typed delete confirm', async () => {
        // The floating bulk bar shows a "Delete" button (selecting all selects 1 file here).
        await page.getByRole('button', { name: /^delete$/i }).first().click()
        // ConfirmAction (tier="typed") requires the exact string "delete" (lowercase).
        // The confirm button label is "Delete", not "Delete 1 file".
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/delete/i)
        await dialog.getByRole('textbox').fill('delete')
        await dialog.getByRole('button', { name: /^delete$/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 8_000 })
      })

      await test.step('File is gone', async () => {
        await expect(page.getByText('e2e-test.pdf')).not.toBeVisible({ timeout: 5_000 })
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('F5: folder delete → files move to root (not destroyed)', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F5 — folder delete files move to root' })
    const ids = await createThrowawayProperty({ withFolder: true })

    try {
      await test.step('Delete the folder via confirm', async () => {
        await page.goto(DOCS(ids.propertyId))
        // Folder delete lives in the ⋯ menu (aria-label "Actions for {name}"), not a
        // nested "Delete folder E2E Folder" trash button.
        await page.getByRole('button', { name: 'Actions for E2E Folder' }).click()
        await page.getByRole('menuitem', { name: 'Delete' }).click()
        // Custom Dialog (role="dialog") titled `Delete “E2E Folder”?` with a
        // "Delete folder" action button. Empty folders can be deleted immediately.
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText(/delete/i)
        await dialog.getByRole('button', { name: /delete folder/i }).click()
        await expect(dialog).not.toBeVisible({ timeout: 5_000 })
      })

      await test.step('Folder is gone, no orphan error', async () => {
        await expect(page.getByText('E2E Folder')).not.toBeVisible({ timeout: 5_000 })
        await expect(page.getByText(/error|crash|something went wrong/i)).not.toBeVisible()
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })

  test('F6: cancelling a queued upload → file never appears (B2.11)', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'F6 — cancel a queued upload' })
    if (!existsSync(DOC_FIXTURE)) test.skip(true, 'Run: node e2e/fixtures/generate.mjs to create test-doc.pdf')
    const pdf = readFileSync(DOC_FIXTURE)
    const ids = await createThrowawayProperty()
    try {
      // Hold the FIRST upload (a server-action POST) so the second file sits in "queued".
      let release!: () => void
      const held = new Promise<void>((r) => { release = r })
      let holding = false
      await page.route(`**/property/${ids.propertyId}/documents*`, async (route) => {
        const req = route.request()
        if (req.method() === 'POST' && req.headers()['next-action'] && !holding) {
          holding = true
          await held
        }
        await route.continue()
      })

      await test.step('Queue two files, first one held', async () => {
        await page.goto(DOCS(ids.propertyId))
        await page.getByRole('button', { name: /upload (a )?(document|file)|add (file|files)/i }).first().click()
        const dialog = page.getByRole('dialog')
        await dialog.evaluate(() => {
          const el = document.querySelector<HTMLInputElement>('input[type="file"]')
          if (el) el.style.display = 'block'
        })
        await dialog.locator('input[type="file"]').setInputFiles([
          { name: 'f6-first.pdf', mimeType: 'application/pdf', buffer: pdf },
          { name: 'f6-second.pdf', mimeType: 'application/pdf', buffer: pdf },
        ])
        await dialog.getByRole('button', { name: /upload|send/i }).click()
        await expect.poll(() => holding, { timeout: 10_000 }).toBe(true)
      })

      await test.step('Cancel the queued row, then let the batch finish', async () => {
        const row = page.getByText('f6-second.pdf', { exact: true }).locator('xpath=ancestor::div[button][1]')
        await row.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(page.getByText('f6-second.pdf', { exact: true })).toHaveCount(0)
        // The batch ends with router.refresh() (an RSC request); wait for it so the loop is done.
        const refreshed = page.waitForRequest((r) => r.headers()['rsc'] === '1', { timeout: 30_000 })
        release()
        await refreshed
      })

      await test.step('After reload only the first file exists', async () => {
        await page.reload()
        await expect(page.getByText('f6-first.pdf').first()).toBeVisible({ timeout: 15_000 })
        await expect(page.getByText('f6-second.pdf')).toHaveCount(0)
      })
    } finally {
      await cleanup(ids.propertyId)
    }
  })
})
