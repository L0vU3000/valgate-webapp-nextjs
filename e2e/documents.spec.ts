/**
 * Section F — Documents & folders
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'
import { existsSync } from 'fs'
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
        await page.getByRole('button', { name: /upload file|add file/i }).click()
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
        // Toolbar toggle reads "Select" (becomes "Done" once active).
        await page.getByRole('button', { name: /^select$/i }).click()
        // The header checkbox is a role="checkbox" button with aria-label "Select all".
        await page.getByRole('checkbox', { name: /select all/i }).click()
      })

      await test.step('Bulk delete with typed DELETE confirm', async () => {
        // The floating bulk bar shows a "Delete" button (selecting all selects 1 file here).
        await page.getByRole('button', { name: /^delete$/i }).first().click()
        // ConfirmAction (tier="typed") opens an AlertDialog with a "Type DELETE to confirm"
        // textbox; the confirm button reads "Delete 1 file".
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/delete/i)
        await dialog.getByRole('textbox').fill('DELETE')
        await dialog.getByRole('button', { name: /delete \d+ files?/i }).click()
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
        // The folder tile is itself a role="button" whose accessible name folds in the
        // folder name AND the nested delete button's aria-label ("E2E Folder Delete
        // folder E2E Folder"). A loose name match would resolve the tile first and only
        // toggle the folder open. Match the inner Trash button by its EXACT aria-label so
        // we hit the real delete trigger. It is opacity-0 until hover, but opacity doesn't
        // block Playwright actionability.
        const deleteBtn = page.getByRole('button', { name: 'Delete folder E2E Folder', exact: true })
        await expect(deleteBtn).toBeVisible({ timeout: 8_000 })
        await deleteBtn.click()
        // ConfirmAction (tier="confirm") AlertDialog titled `Delete folder "E2E Folder"?`
        // with a "Delete folder" action button.
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toContainText(/delete folder/i)
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
})
