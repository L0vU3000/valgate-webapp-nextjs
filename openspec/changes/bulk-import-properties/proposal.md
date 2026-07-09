## Why

New users almost always already keep their portfolio somewhere — a Google Sheet or an Excel
file with one row per property. Today the only working way into Valgate is the 6-step **Enter
manually** wizard, one property at a time. The two other entry cards on `/add-property`
(**Take a photo**, **Upload document**) are disabled "Coming soon" stubs.

Re-keying 20, 50, 200 properties by hand is the single biggest thing standing between a new user
and a populated portfolio. Before single-document OCR, we want the higher-leverage path: let a
user drop their existing spreadsheet, have an AI map their arbitrary columns onto Valgate's fields
and clean the values up, let the user review, and bulk-create every property in one go. The user
brings the messy sheet; Valgate + the AI do the organisation.

## What Changes

- Add a new **"Import from spreadsheet"** entry card on `/add-property` (`Step0NewOrDraft`). It
  routes to a dedicated batch flow at **`/add-property/import`** (the single-property step wizard is
  the wrong shape for a batch, so this is a separate page, not a new wizard step).
- The import flow has **three stages on one page**:
  1. **Upload** — drop a `.csv` or `.xlsx` file. Parsed in the browser (`papaparse` for CSV — already
     installed; a small library for `.xlsx`) into headers + rows. Capped at **100 rows** for v1.
  2. **AI mapping (map-once)** — the column headers + ~5 sample rows are sent to a server action that
     asks the AI for a **`sourceColumn → Valgate field` mapping** (plus light per-field
     normalization hints), returned as a validated structured object. **Code then applies that one
     mapping to every row** — the AI is called once regardless of row count, so it is cheap, fast,
     and the mapping is shown to the user (not a black box).
  3. **Review** — an editable table of the candidate properties, with problem rows flagged (missing
     required field, address that would not geocode). An **"Import N properties"** button commits.
- **Addresses are geocoded to `lat`/`lng`** (properties require coordinates) via the existing Mapbox
  endpoint, server-side, during mapping. A row that will not geocode is not blocked — it is flagged
  "needs location" and the user can drop a pin / fix it in the review step, or import it against the
  Cambodia centroid fallback (same fallback the manual wizard already uses).
- **Commit is per-row, partial-success**: each candidate is validated through the existing property
  Zod schema and created via the existing org-scoped `createProperty`. Valid rows are created even if
  some rows fail; the result reports how many succeeded and which rows (and why) did not. One bad row
  never discards the good ones.
- The disabled **Upload document** / **Take a photo** cards stay as-is ("Coming soon") — this change
  does not touch single-document OCR.

## Capabilities

### New Capabilities
- `bulk-import-properties`: A user can upload a CSV/Excel of properties; an AI maps their columns to
  Valgate's fields and normalizes values once; addresses are geocoded; the user reviews an editable
  table; and Valgate bulk-creates the valid properties in the caller's organization, reporting
  per-row success/failure.

## Impact

- **Schema**: **none.** Reuses the existing `properties` table and `createProperty`. No migration, no
  new columns — a deliberate scope choice so there is no DB checkpoint.
- **Dependencies**: `papaparse` (CSV) and the AI SDK (`ai` + `@ai-sdk/openai`) are **already
  installed**. The **only** new dependency is a small `.xlsx` reader (see design — this is the one
  open dependency decision; CSV-only is the zero-new-dep fallback).
- **Actions** (`app/actions/property-import.ts`, new): `mapSpreadsheetColumnsAction` (AI, map-once),
  `geocodeAddressesAction` (server-side Mapbox), `bulkCreatePropertiesAction` (per-row create).
- **Services** (`lib/services/property-import.ts`, new, `server-only`): the `generateObject` AI
  mapping + Zod schema, the deterministic row→`NewProperty` application (reusing existing currency/
  number parsers), and the per-row create loop over `createProperty`.
- **UI** (new, under `app/(shell)/add-property/import/`): `page.tsx` shell + `ImportFlow.tsx`
  orchestrator + `UploadStep`, `MappingReview` (table) components. One new method card wired into
  `Step0NewOrDraft.tsx`.
- **Security** (CLAUDE.md trust-boundary rules): every row validated through the property Zod schema
  before insert; `createProperty` is already authenticated + org-scoped (IDOR-safe); only headers +
  sample rows are sent to the AI (no secrets); generic error strings to the client; file size + row
  count capped. Rate-limiting on the bulk mutation is noted as a follow-up (project-wide "decide
  later").
- **Non-goals**: no single-document OCR, no background/async processing (v1 is synchronous, ≤100
  rows), no importing child records (leases, tenants, documents) — properties only, no new
  dependency on the draft system.
