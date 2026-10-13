/**
 * Section D — Add-property intake: the two file actions on Step 4 (photos and documents).
 *
 * What is being verified, and why each assertion is evidence:
 *
 *  - The wizard's client sends the bytes to a Server Action (`uploadDraftFileAction`), which
 *    presigns, uploads to S3 *from the server*, and only then writes a `property_draft_files` row.
 *    So a row with a `storage_id` is proof the whole chain ran — a local thumbnail appearing proves
 *    nothing, because `stagedPhotos`/`stagedDocuments` hold pending entries before any upload.
 *  - The `Preview <name>` aria-label is only granted once `pending` clears, i.e. once the action
 *    resolved ok. The `img[alt="<name>"]` is stronger still: its `src` comes from
 *    `getDraftFileUrlAction`, so the browser had to fetch the stored object back.
 *  - "Take photo" and "Upload documents" are the same hidden `<input type="file">` paths a real
 *    picker drives; `setInputFiles` fires the same change event a user's pick does.
 *
 * The demo suite runs with DEMO_ALLOW_WRITES, so these rows are real writes to the dev DB. They are
 * removed in `finally`; the S3 objects are not (see cleanupDraftByFileName).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test, expect } from './fixtures'
import { cleanupDraftByFileName, waitForDraftFile } from './helpers/db'
import { reachStep4 } from './helpers/wizard'

const STAMP = Date.now()
const DRAFT_NAME = `E2E Intake ${STAMP}`
const PHOTO_FILE = `e2e-intake-photo-${STAMP}.jpg`
const DOC_FILE = `e2e-intake-doc-${STAMP}.pdf`

const PHOTO_BYTES = readFileSync(resolve('e2e/fixtures/test-photo.jpg'))
const DOC_BYTES = readFileSync(resolve('e2e/fixtures/test-doc.pdf'))

// Both the picker input and its hidden "replace" twin carry the same accept attribute; the picker
// is rendered first in each pair, so `.first()` is the one a user's click actually opens.
const photoInput = (page: import('@playwright/test').Page) =>
  page.locator('input[type="file"][accept^="image/*"]').first()
const docInput = (page: import('@playwright/test').Page) =>
  page.locator('input[type="file"][accept^=".pdf"]').first()

test.describe.serial('D — Add-property intake (Step 4 file actions)', () => {
  test.setTimeout(120_000)

  test('D1: "Add photos" stages the photo and it comes back from storage', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'D1 — photo intake' })
    test.skip(
      !process.env.STORAGE_ACCESS_KEY_ID,
      'storage credentials are not configured, so uploadDraftFileAction fails before it reaches S3',
    )

    try {
      await test.step('Walk the wizard to Step 4 (photos and documents)', async () => {
        await reachStep4(page, DRAFT_NAME)
      })

      await test.step('Set the photo fixture on the hidden image input', async () => {
        await photoInput(page).setInputFiles({
          name: PHOTO_FILE,
          mimeType: 'image/jpeg',
          buffer: PHOTO_BYTES,
        })
      })

      await test.step('Upload completes: the staged photo becomes previewable', async () => {
        // `pending` clears only after the action returns ok — the upload really finished.
        await expect(
          page.getByRole('button', { name: `Preview ${PHOTO_FILE}`, exact: true }),
        ).toBeVisible({ timeout: 30_000 })

        // The src is fetched back from storage by getDraftFileUrlAction.
        const img = page.locator(`img[alt="${PHOTO_FILE}"]`)
        await expect(img).toBeVisible({ timeout: 15_000 })
        const src = await img.getAttribute('src')
        expect(src ?? '').not.toBe('')

        await expect(page.getByText(/could not upload file/i)).toHaveCount(0)
      })

      await test.step('The server recorded a photo row pointing at stored bytes', async () => {
        const rows = await waitForDraftFile(PHOTO_FILE)
        expect(rows).toHaveLength(1)
        expect(rows[0].kind).toBe('photo')
        expect(rows[0].storage_id).toMatch(/\/DOC-\d+\//)
        // Not an exact match: the wizard re-encodes photos client-side before upload, so the stored
        // size is the compressed one. The document path uploads the bytes as-is (asserted in D2).
        const stored = Number(rows[0].size_bytes)
        expect(stored).toBeGreaterThan(0)
        expect(stored).toBeLessThanOrEqual(PHOTO_BYTES.length)
      })
    } finally {
      await cleanupDraftByFileName(PHOTO_FILE)
    }
  })

  test('D2: "Upload" stages the document and it comes back from storage', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'D2 — document intake' })
    test.skip(
      !process.env.STORAGE_ACCESS_KEY_ID,
      'storage credentials are not configured, so uploadDraftFileAction fails before it reaches S3',
    )

    try {
      await test.step('Walk the wizard to Step 4 again', async () => {
        await reachStep4(page, `${DRAFT_NAME} b`)
      })

      await test.step('Set the PDF fixture on the hidden document input', async () => {
        await docInput(page).setInputFiles({
          name: DOC_FILE,
          mimeType: 'application/pdf',
          buffer: DOC_BYTES,
        })
      })

      await test.step('Upload completes: the staged document becomes previewable', async () => {
        await expect(
          page.getByRole('button', { name: `Preview ${DOC_FILE}`, exact: true }),
        ).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/could not upload file/i)).toHaveCount(0)
      })

      await test.step('The server recorded a document row pointing at stored bytes', async () => {
        const rows = await waitForDraftFile(DOC_FILE)
        expect(rows).toHaveLength(1)
        expect(rows[0].kind).toBe('document')
        expect(rows[0].storage_id).toMatch(/\/DOC-\d+\//)
        expect(Number(rows[0].size_bytes)).toBe(DOC_BYTES.length)
      })
    } finally {
      await cleanupDraftByFileName(DOC_FILE)
    }
  })
})
