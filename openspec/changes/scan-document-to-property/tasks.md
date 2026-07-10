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

## 7b. Accuracy — swappable model + self-consistency

- [x] 7b.1 `SCAN_MODEL` env var selects provider+model in `document-scan.ts` (`claude*` → Anthropic,
      else OpenAI); `generateObject` + Zod schema unchanged. Added `@ai-sdk/anthropic`.
- [x] 7b.2 Self-consistency: `scanDocument` runs N extractions (`SCAN_SAMPLES`, default 3) in parallel →
      `reconcileExtractions` (pure, unit-tested) votes per field → `{ extracted, lowConfidence }`.
      Route returns `lowConfidence`; Step0 → AddPropertyFlow → Step2 carry it as transient UI state.
- [x] 7b.3 Step 2 confidence UI: "auto-filled from your document" banner + per-field badges
      ("Auto-filled" / amber "Check this") + amber ring on low-confidence inputs; badges clear on edit.
- [x] 7b.4 **Bench result** (2026-07-10). Only `OPENAI_API_KEY` usable (`ANTHROPIC_API_KEY` empty → Opus
      4.8 untested but swappable; no Google key → Gemini out). Benched on 3 real handwritten Khmer
      consular samples (printed Khmer + handwritten Khmer names/addresses/dates/phones). Scored on
      address (street # + zip) vs. ground truth `5555 16th St NW, Washington DC 20011`, romanized names,
      latency, structured-output robustness:
      - `gpt-4o` — **failed 2/3 with "Invalid JSON response"**. Rejected.
      - `gpt-5.5` — address 0/3 (5355/5561/5655), weak names, **14–110 s** (110 s alone exceeds the 60 s
        route cap; ×3 self-consistency impossible). Rejected on latency + accuracy.
      - `gpt-5.6-luna` — address 1/3, weak names ("STITH NERREY"), 12–18 s.
      - `gpt-5.6-sol` — address 1/3 (hallucinated a street name once), 9–59 s.
      - **`gpt-5.6-terra` — address 2/3 exact + 1 near, exact names ("Sith Neardey"), 4–12 s, clean
        output every run. → DEFAULT.**
      - Handwritten dates/phones were unstable across ALL models — confirms the self-consistency premise.
      - Caveat: samples are consular forms, not deeds, so property-specific fields (area/price/type)
        are absent; the bench measured handwritten-Khmer address/name reading, the discriminating axis.

## 7. Verify

- [x] 7.1 `/verify` (2026-07-10) — drove the real flow end-to-end against the demo-mode dev server
      (bundled-Chromium Playwright): Scan a document → wizard opened at Step 2 pre-filled ("Riverside
      Villa", area 320, full address) with 3 "Auto-filled" badges → finished the wizard → submitted →
      **property `PROP-1087` created** AND **`synthetic-deed.png` attached as document `DOC-0085`**
      (S3 `storage_id ORG-0001/DOC-0084/synthetic-deed.png`), confirmed via direct DB query. Test
      property + document row + S3 object cleaned up afterward.
- [x] 7.2 Edge checks: real Khmer consular samples translated + null-disciplined (no hallucinated
      property fields, confirmed live via the scan route); sparse doc leaves fields blank; the route's
      try/catch returns a generic error so a failed scan degrades to manual entry; MIME + 10 MB caps
      enforced client-side AND in the route (`ALLOWED_MIME`/`MAX_BYTES`).
