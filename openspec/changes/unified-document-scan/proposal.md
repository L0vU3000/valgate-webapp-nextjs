## Why

Today the document scan path extracts **one property** from a PDF/image and drops the user into
the 6-step wizard. But a single document often contains more than just property details:

- A **title deed** has property details + co-owners + ownership records
- A **lease agreement** has property + tenant + lease terms
- A **valuation report** has property + valuation data
- A **compliance certificate** has property + certification details

The spreadsheet import path was already unified (`import-all-entities` change) — one upload, one
AI call, all entity tabs populated. The document scan path should work the same way: **one upload,
one vision AI call, all entity types found in the document extracted** — then the same review tabs,
same commit logic.

The two entry points stay separate on Step0 (spreadsheet vs. document), just like today. But after
extraction, both paths produce `PerEntityRows` and feed into the same tabbed review + commit
pipeline. The only difference is the extraction engine:

| Entry point | Engine | Input | Output |
|---|---|---|---|
| Import from spreadsheet | `extractAll` (text mapping) | `.csv` / `.xlsx` | `PerEntityRows` |
| Scan a document | `scanAll` (vision extraction) | `.pdf` / image | `PerEntityRows` |

Same review. Same commit. Same `persistCandidates`. Same tabbed UI. Different extraction.

## What Changes

### 1. Unified scan schema (`lib/services/document-scan.ts`, modified)

The `ExtractedPropertySchema` (17 property fields) is replaced by a `UnifiedScanSchema` that
covers all 14 entity types. Each entity type is a nullable array — a document might have 1
property + 2 co-owners, or 1 property + 1 tenant + 1 lease:

```ts
const UnifiedScanSchema = z.object({
  properties: z.array(ExtractedPropertySchema).nullable(),
  tenants: z.array(ExtractedTenantSchema).nullable(),
  leases: z.array(ExtractedLeaseSchema).nullable(),
  // ... one per entity type — null when not present in the document
});
```

Each per-entity schema has the same fields as the spreadsheet import's `FieldSpec[]`, with
nullable values and enum constraints where applicable (same design as today's
`ExtractedPropertySchema`).

### 2. Self-consistency generalized (`reconcile-extractions.ts`, modified)

The reconciliation logic (run N times, vote per field, flag disagreements) is generalized from
per-field voting on `ExtractedProperty` to per-entity-per-field voting on the unified schema.
The output is `UnifiedScanResult` — one reconciled object + a `lowConfidence` map keyed by
`entityType.field`.

### 3. Scan route returns `PerEntityRows` (`app/api/add-property/scan/route.ts`, modified)

The route currently returns `{ extracted, lowConfidence }` (one `ExtractedProperty`). It now:
1. Calls `scanDocument` → gets `UnifiedScanResult`
2. Calls `applyScanResult(result, ctx)` — normalizes each entity via the same `toCandidate`
   functions used by the spreadsheet path, resolves property linkage, converts to `ReviewRow[]`
3. Returns `PerEntityRows` + `lowConfidence` map

This is the **shared handoff point** — both `extractAllAction` (spreadsheet) and the scan route
(document) return `PerEntityRows`. Everything downstream is identical.

### 4. Scan → review (not wizard)

Today: scan → prefill wizard → 6 steps → submit.

After: scan → `PerEntityRows` → tabbed review (same `IngestionReview` component as spreadsheet
import) → commit.

The scan card on Step0 stays. When the user picks a file:
1. POST to `/api/add-property/scan` (same endpoint, expanded response)
2. Client receives `PerEntityRows`
3. Step0 shows the tabbed review inline (or navigates to a shared review route)

The 6-step wizard is no longer used for the scan path. The wizard stays for "Enter manually" —
it's the right UX for typing fields one by one with photos, docs, and a location picker. But
scan-extracted data goes to the review table, where the user confirms what the AI read.

### 5. Per-entity extracted schemas (new, in `document-scan.ts`)

One small Zod schema per entity type — same fields as the spreadsheet `FieldSpec[]`, but nullable
and with enum constraints (the vision model returns canonical values or null, same as today's
property scan). These are ~10 lines each:

```ts
const ExtractedTenantSchema = z.object({
  name: z.string().nullable(),
  unit: z.string().nullable(),
  rent: z.string().nullable(),
  status: z.enum(["Paid", "Overdue", "Pending"]).nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});
// ... one per entity type
```

### 6. `applyScanResult` (new, in `document-scan.ts` or `unified-extract.ts`)

Pure function that takes the reconciled `UnifiedScanResult` + `Ctx` and produces `PerEntityRows`:
- For each entity type with a non-null array: normalize each item via the entity's `toCandidate`,
  resolve property linkage, convert to `ReviewRow[]`
- Reuses the exact same `toCandidate` normalizers as the spreadsheet path — no duplication
- `lowConfidence` fields are mapped to `ReviewRow.issues` as warnings

### 7. Low-confidence UI in review

The `IngestionReview` component already shows per-row issues. Low-confidence fields from the scan
are added as `IngestionIssue` with `severity: "warning"` and message "AI models disagreed on this
value — please verify". The review table highlights those cells with an amber ring (same visual
treatment as today's Step 2 scan-confidence badges, just in the review table instead).

## Capabilities

### New Capabilities
- `unified-document-scan`: A user can upload a PDF or image document; the vision AI reads it and
  extracts all entity types found (properties, tenants, leases, co-owners, etc.) in one pass with
  self-consistency. The extracted data feeds into the same tabbed review + commit pipeline as the
  spreadsheet import. The user confirms what the AI read and imports — no wizard.

## Impact

- **Schema**: **none.** No DB changes. All `createFn` functions already exist.
- **Modified files**:
  - `lib/services/document-scan.ts` — expand `ExtractedPropertySchema` to `UnifiedScanSchema` with
    14 per-entity extracted schemas; `scanDocument` returns `UnifiedScanResult`; add
    `applyScanResult(result, ctx): PerEntityRows`
  - `lib/services/reconcile-extractions.ts` — generalize from `ExtractedProperty` to
    `UnifiedScanSchema`; per-entity-per-field voting; `lowConfidence` keyed by `entityType.field`
  - `app/api/add-property/scan/route.ts` — call `scanDocument` + `applyScanResult`; return
    `PerEntityRows` + `lowConfidence`
  - `app/(shell)/add-property/_components/Step0NewOrDraft.tsx` — scan handler: POST file → receive
    `PerEntityRows` → show tabbed review inline (or route to shared review)
  - `app/(shell)/add-property/_components/AddPropertyFlow.tsx` — remove scan → wizard prefill path
    (`handleScanComplete`, `scanFilledFields`, `scanLowFields`, pending file staging); scan now
    routes to review, not the wizard
  - `app/_shared/add-property/_lib/scan-to-form.ts` — deleted (replaced by `toCandidate` normalizers
    shared with the spreadsheet path)
- **Security** (CLAUDE.md): scan route calls `requireCtx()`; AI output validated by
  `UnifiedScanSchema` (`generateObject` throws on mismatch); only the user's own file sent to the
  model; `applyScanResult` runs `resolveProperty` (exact match only); `persistCandidates` IDOR
  checks on `propertyId`; generic errors to client; MIME + 10 MB caps enforced (unchanged).
- **Non-goals**:
  - No multi-document batch scan (one file at a time — a document is one entity's worth of data).
  - No changing the "Enter manually" wizard (stays for manual entry with photos/docs/location).
  - No changing the spreadsheet import path (already unified in `import-all-entities`).
  - No new entity types.
