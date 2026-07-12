## 1. Unified scan schema + extraction

- [ ] 1.1 `lib/services/document-scan.ts` — replace `ExtractedPropertySchema` with
      `UnifiedScanSchema`: one nullable array per entity type (14 total). Each per-entity schema
      has the same fields as the spreadsheet `FieldSpec[]`, with nullable values + enum
      constraints. ~10 lines per entity schema.
- [ ] 1.2 Update `scanDocument(fileBytes, mimeType)` — `extractOnce` now uses
      `UnifiedScanSchema`; returns `UnifiedScanResult` (reconciled). `SCAN_MODEL` + `SCAN_SAMPLES`
      env vars unchanged.
- [ ] 1.3 Update the extraction prompt — list all 14 entity types + their fields. "Extract ALL
      entity types you can identify. Return null for types not present in the document."

## 2. Generalized reconciliation

- [ ] 2.1 `lib/services/reconcile-extractions.ts` — generalize from flat `ExtractedProperty` to
      nested `UnifiedScanSchema`. Per-entity-per-field majority vote. `lowConfidence` keyed by
      `"entityType.field"` or `"entityType[index].field"`. Handle arrays of different lengths
      across runs (reconcile by index up to shortest; keep extras if ≥ ceil(N/2) runs have them).
- [ ] 2.2 `UnifiedScanResult` type: `{ extracted: UnifiedExtraction; lowConfidence: string[] }`.

## 3. `applyScanResult`

- [ ] 3.1 `lib/services/document-scan.ts` (or `unified-extract.ts`) — `applyScanResult(result,
      ctx): Promise<PerEntityRows & { lowConfidence: string[] }>`. For each non-null entity array:
      call `toCandidate` normalizer (shared with spreadsheet path), `resolveProperty` for entities
      with a `property` field, map `lowConfidence` entries to `ReviewRow.issues` as warnings,
      convert to `ReviewRow[]`. One `listProperties(ctx)` call.

## 4. Scan route update

- [ ] 4.1 `app/api/add-property/scan/route.ts` — call `scanDocument` + `applyScanResult`; return
      `{ ok: true, ...perEntityRows, lowConfidence }`. Same MIME + 10 MB caps. Same `requireCtx`.
      Same `maxDuration = 60`.

## 5. Step0 scan handler → review

- [ ] 5.1 `Step0NewOrDraft.tsx` — `handleScanChange`: POST to scan route → receive `PerEntityRows`
      → show tabbed review inline (same `IngestionReview` component as spreadsheet import). Keep
      the scanning spinner state. Keep the file input + MIME/size validation.
- [ ] 5.2 Low-confidence fields render as `ReviewRow.issues` with `severity: "warning"` —
      `IngestionReview` already shows these. Amber highlight on affected cells (same visual as
      today's Step 2 scan badges, just in the review table).
- [ ] 5.3 File staging: after the property is created via the review commit, stage the scanned
      file as a document on the property (same `uploadDraftFileAction` or direct document create,
      triggered from the commit handler).

## 6. Remove old scan → wizard path

- [ ] 6.1 `AddPropertyFlow.tsx` — remove `handleScanComplete`, `scanFilledFields`,
      `scanLowFields`, `pendingScanFileRef`, `stagingScanRef`, and the scan-file staging effect.
      Scan no longer prefills the wizard.
- [ ] 6.2 Delete `app/_shared/add-property/_lib/scan-to-form.ts` (replaced by shared
      `toCandidate` normalizers).
- [ ] 6.3 Remove scan-confidence UI from Step 2 (`Step2BasicInfo.tsx`) — `scanFilledFields` /
      `scanLowFields` props, auto-filled badges, amber rings. Step 2 reverts to plain wizard
      fields (used only by "Enter manually").

## 7. Verify

- [ ] 7.1 `npx tsc --noEmit` passes
- [ ] 7.2 Upload a title deed PDF → one vision call → review tabs show property + co-owners →
      user confirms → commit → property + co-owners created, PDF attached as document
- [ ] 7.3 Upload a lease PDF → review tabs show property + tenant + lease → commit
- [ ] 7.4 Upload a properties-only spreadsheet → still works (spreadsheet path unchanged)
- [ ] 7.5 "Enter manually" wizard still works (unchanged)
- [ ] 7.6 Low-confidence fields show amber warnings in the review table
