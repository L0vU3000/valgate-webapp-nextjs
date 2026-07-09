## Why

The `/add-property` entry screen shows three cards. Two of them — **Take a photo** and **Upload
document** — are disabled "Coming soon" stubs, and they are really the *same* action: give Valgate a
document (a title deed, lease, or listing) as a photo or a file, and have it read the details for you.
Keeping them as two dead cards is clutter and a broken promise.

They should collapse into one working **"Scan a document"** action powered by an AI that OCR-reads the
document, translates any non-English text (many local documents are in Khmer), extracts the property
details, and pre-fills the add-property wizard — so a user with a deed in hand can add a property in
seconds instead of typing every field. As with the spreadsheet importer, the AI does the reading and
the user confirms; nothing is trusted blindly.

## What Changes

- **Merge** the `Take a photo` and `Upload document` cards on `Step0NewOrDraft` into a single active
  **"Scan a document"** card, backed by one file input (`accept="application/pdf,image/*"`) — on
  mobile the OS picker offers *camera* and *files*, on desktop it is file browse, so one control
  covers both original cards.
- On pick, the file is sent to a new endpoint that runs **one AI call** (`gpt-4o-mini`, the model
  already used for document summaries — it reads PDFs and images directly and translates inline) and
  returns the property's details as a **validated structured object** mapped to the wizard's fields
  (name, type, status, address parts, area, beds/baths, purchase price, market value, dates). The
  model is told to **translate non-English text to English** and to **leave a field blank rather than
  guess**.
- The wizard is **pre-filled** with the extracted values and the user is dropped at **Step 2 (Basic
  Information)** to review, correct, and continue — skipping the now-redundant blank type picker.
- The **scanned file is kept**: once the wizard's draft exists, the picked file is staged into it via
  the existing `uploadDraftFileAction`, so the source document auto-attaches to the property (as a
  `document`) on submit — no orphan, no re-upload.
- A **"Scanning…" state** covers the AI call; if extraction fails, the user gets a clear message and
  can still continue into the wizard manually (the pick is never a dead end).

## Capabilities

### New Capabilities
- `scan-document-to-property`: A user can add a property by photographing or uploading a single
  document; an AI reads and translates it, extracts the property details into Valgate's fields, and
  pre-fills the wizard for the user to confirm, while the source file is attached to the property.

## Impact

- **Schema**: **none.** No new columns, no migration. Reuses the wizard, the draft/staging system,
  and `createProperty`.
- **Dependencies**: none new — the AI SDK (`ai` + `@ai-sdk/openai`) is already installed and already
  used for document summaries.
- **New**: `lib/services/document-scan.ts` (`server-only`: the extraction Zod schema + one
  `generateObject` call) and `app/api/add-property/scan/route.ts` (`POST` multipart → auth →
  `scanDocument` → extracted fields; `nodejs` runtime, `maxDuration = 60`, generic errors).
- **UI**: `Step0NewOrDraft.tsx` (merge two cards into one, single input, scanning state);
  `AddPropertyFlow.tsx` (prefill + jump to Step 2 + stage the picked file into the draft once it
  exists); small helper `_lib/scan-to-form.ts` to turn the extracted object into a wizard-form patch.
- **Types**: add `"scan"` to the `method` union in `app/_shared/add-property/types.ts`.
- **Constraints (aligned with the staging path)**: the scan input is limited to the draft staging
  allowlist — **PDF, JPEG, PNG, WebP — and the 10 MB cap** — so a file that scans can also be
  attached (no "scanned but couldn't save" mismatch).
- **Security** (CLAUDE.md trust-boundary rules): the endpoint authenticates via `requireCtx`; the AI
  output is schema-validated (never free-text parsed); only the user's own file is sent to the model;
  generic error strings to the client; the staged file is IDOR-checked inside `uploadDraftFileAction`
  against the caller's draft.
- **Non-goals**: no multi-document batch (that's the spreadsheet importer), no persisting the raw AI
  response, no new document category taxonomy, no server-side translation service (the model
  translates inline).
