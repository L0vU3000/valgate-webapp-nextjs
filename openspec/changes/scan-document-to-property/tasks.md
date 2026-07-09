## 1. AI extraction service

- [x] 1.1 `lib/services/document-scan.ts` (`server-only`): `ExtractedPropertySchema` (Zod) — nullable
      value per wizard field; `propertyType`/`status` as `z.enum` of the wizard's allowed values
- [x] 1.2 `scanDocument(fileBytes, mimeType)` → one `generateObject({ model: openai("gpt-4o-mini") })`
      call with the file part + an extraction prompt that translates non-English text and returns null
      (not a guess) for absent fields

## 2. Scan endpoint

- [x] 2.1 `app/api/add-property/scan/route.ts`: `POST` multipart → `requireCtx()` → read the `File` →
      validate MIME (PDF/JPEG/PNG/WebP) + size (≤10 MB) → `scanDocument` → return extracted fields
- [x] 2.2 `runtime = "nodejs"`, `maxDuration = 60`; generic client errors, real error logged server-side

## 3. Extracted → form helper

- [x] 3.1 `app/_shared/add-property/_lib/scan-to-form.ts`: pure `scanToForm(extracted) → Partial<FormData>`
      (null → "", enums → wizard `propertyType`/`status`)
- [x] 3.2 Unit test: extracted object in → expected form patch out, incl. a null-heavy document

## 4. Types

- [x] 4.1 Add `"scan"` to the `method` union — in BOTH duplicate types files
      (`app/_shared/add-property/types.ts` AND `app/(shell)/add-property/_components/types.ts`); they
      are structurally identical and must stay in sync or cross-assignment breaks

## 5. Step0 — merge the two cards

- [x] 5.1 Replace the `photo` + `upload` card objects with one active **"Scan a document"** card
      (single hidden input `accept="application/pdf,image/*"`, drop the separate `capture` input)
- [x] 5.2 `handleScanChange`: validate type/size → `scanning` state → POST to `/api/add-property/scan`
      → on success call `onScanComplete(patch, file)`; on failure toast + let the user continue manually

## 6. AddPropertyFlow — prefill, land at Step 2, attach file

- [x] 6.1 `handleScanComplete(patch, file)`: prefill form (`method: "scan"`), assign a draft handle,
      `setStep(2)`; hold the `File` in a ref
- [x] 6.2 Extend the existing "activeId became DRFT-" effect: if a pending scan file exists, stage it
      once via `uploadDraftFileAction(draftId, "document", fd)`, merge the staged ref into
      `documents`/`stagedDocuments`, clear the ref 🔴 file write — reuse existing IDOR-safe action
- [x] 6.3 Staging failure is non-fatal (toast; property + fields intact)

## 7. Verify

- [ ] 7.1 `/verify` — drive the real flow: on `/add-property`, Scan a document → pick a sample
      deed/listing (image or PDF) → confirm the wizard opens at Step 2 pre-filled → finish → confirm
      the property exists AND the scanned file is attached as a document
- [ ] 7.2 Edge checks: a non-English (Khmer) document is translated; a sparse document leaves fields
      blank (no hallucinated values); a failed scan still lets the user continue manually; an
      oversized/unsupported file is rejected with a clear message
