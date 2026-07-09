# Design — scan-document-to-property

## Flow

```
Step0: user picks a file on the "Scan a document" card (camera or file)
   → client validates type/size (PDF/JPEG/PNG/WebP, ≤10 MB)
   → POST multipart to /api/add-property/scan
        route: requireCtx → scanDocument(bytes, mimeType) → extracted fields   (ONE gpt-4o-mini call)
   → client merges extracted fields into the wizard FormData (scanToForm)
   → AddPropertyFlow: create the draft handle, jump to Step 2 (Basic Info), prefilled
   → once the draft id resolves, stage the picked file into it (uploadDraftFileAction)
        → the source document is attached to the property on submit
```

## AI extraction — mirror the summarize route

`lib/services/document-scan.ts` (`server-only`), same pattern as
`app/api/documents/[id]/summarize/route.ts`:

```ts
const { object } = await generateObject({
  model: openai("gpt-4o-mini"),          // reads PDF + images directly; translates inline
  schema: ExtractedPropertySchema,
  messages: [{ role: "user", content: [
    { type: "text", text: EXTRACTION_PROMPT },
    { type: "file", data: fileBytes, mediaType },
  ]}],
});
```

`ExtractedPropertySchema` returns one nullable value per wizard field. **Type and status are `z.enum`
of the wizard's allowed values** (`residential…other`; `Rented|Vacant|Owner-Occupied`) so the model
returns a canonical value or null — no post-hoc normalization needed (cleaner than the importer's
free-text normalizers, which exist because a spreadsheet's values are arbitrary). Everything else is a
nullable string carried verbatim into the form and cleaned later by the wizard's own parsers on
submit.

Prompt rules: "This is a property document (title deed, lease, listing, invoice, or similar). Extract
the property's details. **Translate any non-English text (e.g. Khmer) into English.** Return null for
any field the document does not state — do not guess or infer."

## Why a route handler, not a server action

The input is an uploaded file. A route handler takes multipart `FormData` with the `File` cleanly
(the summarize route is already a route handler), and a ≤10 MB file is a normal request body — not a
serialized server-action argument. `nodejs` runtime + `maxDuration = 60` (same as summarize) give the
model time to read the file.

## scanToForm helper (pure, testable)

`_lib/scan-to-form.ts`: `scanToForm(extracted) → Partial<FormData>`. Maps each extracted field to its
FormData key, coercing nulls to `""` and the enums to the wizard's `propertyType`/`status` types. Pure
and dependency-free, so it carries the ponytail self-check (a small unit test: extracted object in →
expected form patch out, including a null-heavy document).

## Landing at Step 2 + attaching the file (AddPropertyFlow)

- A new `handleScanComplete(patch, file)` in `AddPropertyFlow`:
  1. `setForm({ ...defaultForm, ...patch, method: "scan" })`, assign a draft handle (same temp-id →
     autosave-creates-DRFT dance as `advanceToStep1`), `setStep(2)`.
  2. Hold the picked `File` in a ref (a File is not serializable, so it can't live in form/draft
     state).
- An effect already reflects `activeId` once it becomes a `DRFT-…` id. Extend that moment: if a
  pending scan file exists, call `uploadDraftFileAction(draftId, "document", fd)` **once**, then merge
  the returned staged ref into `form.documents` / `form.stagedDocuments` (so Step 4 shows it) and
  clear the ref. This reuses the exact Step 4 staging path — no new upload code.
- Failure to stage the file is **non-fatal**: the property + extracted fields are intact; a toast
  notes the attachment didn't finish (mirrors the existing submit-time file-notice behavior).

## Merging the two cards

In `Step0NewOrDraft`, replace the `photo` and `upload` card objects with one `scan` card (active,
`FileScan`/`ScanLine` icon, "New" badge). Keep the single hidden input
`accept="application/pdf,image/*"`; drop the separate `capture="environment"` photo input (the merged
input still offers the camera on mobile). `handleScanChange` validates, flips a `scanning` state,
POSTs to the scan endpoint, and on success calls the parent's `onScanComplete`.

## Security checkpoints (CLAUDE.md)

- **Auth**: the scan route calls `requireCtx()` — no anonymous extraction.
- **Validate**: AI output is validated by `ExtractedPropertySchema` (generateObject throws on
  mismatch); nothing free-text-parsed.
- **IDOR**: file staging goes through `uploadDraftFileAction` → `stageDraftFile`, which re-checks the
  draft belongs to the caller.
- **Least exposure**: only the user's own uploaded file is sent to the model; no other data.
- **Client errors**: generic strings; the real error is logged server-side; a failed scan degrades to
  manual entry rather than blocking.
- **Limits**: type + 10 MB size enforced client-side AND re-enforced by `uploadDraftFileAction`.
