# Design — unified-document-scan

## Architecture: two entry points, one pipeline

```
┌──────────────────────────────┐    ┌──────────────────────────────────────────┐
│  SPREADSHEET ENTRY           │    │  DOCUMENT SCAN ENTRY                     │
│  Step0 → "Import from        │    │  Step0 → "Scan a document"               │
│  spreadsheet" chip           │    │  → file picker (PDF/image)               │
│                               │    │                                          │
│  upload .csv/.xlsx            │    │  POST /api/add-property/scan             │
│  parseWorkbook → SheetMatrix[]│    │  → scanDocument (N vision runs, parallel)│
│  extractAllAction (1 AI call) │    │  → reconcileExtractions (majority vote)  │
│  → PerEntityRows              │    │  → applyScanResult (normalize + link)    │
│                               │    │  → PerEntityRows                          │
└──────────┬───────────────────┘    └──────────┬───────────────────────────────┘
           │                                    │
           └──────────────┬─────────────────────┘
                          │
                          ▼
           ┌──────────────────────────────────────┐
           │  SHARED REVIEW + COMMIT PIPELINE      │
           │  Tabbed review (IngestionReview)      │
           │  Per-tab or "Import everything"       │
           │  persistCandidates → createFn         │
           └──────────────────────────────────────┘
```

## Unified scan schema

Replaces `ExtractedPropertySchema` with one object covering all 14 entity types. Each type is a
nullable array — most documents yield 1 row per entity, but a deed with 2 co-owners yields 2.

```ts
const UnifiedScanSchema = z.object({
  properties: z.array(z.object({
    propertyName: z.string().nullable(),
    propertyType: z.enum([...]).nullable(),
    status: z.enum([...]).nullable(),
    addressLine: z.string().nullable(),
    // ... same 17 fields as today's ExtractedPropertySchema
  })).nullable(),

  tenants: z.array(z.object({
    name: z.string().nullable(),
    unit: z.string().nullable(),
    rent: z.string().nullable(),
    status: z.enum(["Paid", "Overdue", "Pending"]).nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  })).nullable(),

  leases: z.array(z.object({
    unit: z.string().nullable(),
    stage: z.enum(["Approaching", "Offered", "Signed", "Declined"]).nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    monthlyRent: z.string().nullable(),
    termMonths: z.string().nullable(),
    renewalStatus: z.string().nullable(),
  })).nullable(),

  // ... one nullable array per entity type
  // valuations, payments, expenses, coOwners, maintenance, inspections,
  // certifications, safetyRisks, emergencyContacts, successors, landParcels
});
```

### Why arrays (not single objects)

A title deed might list 2 co-owners. A lease document might reference 1 property + 1 tenant + 1
lease. The array shape handles both. For entities where a document typically has exactly 1
(properties, valuations), the array has 1 element — the review table shows 1 row, which is
essentially a confirmation screen.

### Why enums in the schema

Same reason as today's `ExtractedPropertySchema`: the vision model returns a canonical value or
null — no post-hoc normalization needed. This is cleaner than the spreadsheet path, where free-text
values need regex normalizers (because spreadsheet cells can say anything).

## Generalized reconciliation

The existing `reconcileExtractions` votes per field on a flat `ExtractedProperty`. The generalized
version votes per entity per field on the nested `UnifiedScanSchema`:

```ts
type UnifiedScanResult = {
  extracted: UnifiedExtraction;  // one reconciled object
  lowConfidence: string[];       // "properties.totalArea", "coOwners[0].name", etc.
};
```

The voting logic is identical: for each leaf field, tally votes across N runs, majority wins,
disagreements go into `lowConfidence`. The only change is the traversal — instead of iterating
flat fields, we iterate `entityType → array index → field`.

For arrays of different lengths across runs (e.g. run 1 found 2 co-owners, run 2 found 1), we
reconcile by index up to the shortest length. Extra elements from longer runs are kept if they
appear in the majority of runs (≥ ceil(N/2)), otherwise dropped.

## `applyScanResult`

```ts
async function applyScanResult(
  result: UnifiedScanResult,
  ctx: Ctx,
): Promise<PerEntityRows & { lowConfidence: string[] }>
```

For each entity type with a non-null array:
1. Call the entity's `toCandidate` normalizer on each item (same normalizers as spreadsheet import)
2. Run `resolveProperty` for entities with a `property` field (needs `listProperties(ctx)`)
3. Map `lowConfidence` entries to `ReviewRow.issues` as `severity: "warning"` warnings
4. Convert to `ReviewRow[]`

Returns `PerEntityRows` — the same shape that `extractAllAction` returns. Everything downstream
is identical.

## Scan prompt

```
This is a property document — a title deed, lease, listing, sale agreement, valuation report,
compliance certificate, or similar. Extract ALL entity types you can identify in the document.

Valgate tracks 14 entity types. For each one, if the document contains that data, extract it
as an array of records. If the document does not contain a given entity type, return null.

[entity type + field descriptions — same list as the spreadsheet prompt]

Rules:
- Translate any non-English text (e.g. Khmer) into English.
- Return null for any field the document does not clearly state — do NOT guess.
- For numeric fields, return digits only (no units, currency symbols, or separators).
- For enum fields, return the canonical value or null.
- A single document may contain multiple entity types (e.g. a deed has property + co-owners).
```

The prompt is longer than today's (lists 14 entity types instead of 1), but the vision model
handles it fine — it reads the document once and fills in what it sees. The schema enforces
structure; `generateObject` throws on mismatch.

## Scan route change

```ts
// app/api/add-property/scan/route.ts
export async function POST(req: Request) {
  const ctx = await requireCtx();
  // ... validate file (same MIME + size checks)
  const scanResult = await scanDocument(fileBytes, mimeType);
  const perEntityRows = await applyScanResult(scanResult, ctx);
  return Response.json({ ok: true, ...perEntityRows, lowConfidence: scanResult.lowConfidence });
}
```

The route now returns `PerEntityRows` instead of `{ extracted, lowConfidence }`. The client
handles it the same way as `extractAllAction`'s response — show tabbed review.

## Step0 scan handler change

Today: `handleScanChange` → POST to scan route → `onScanComplete(patch, file, lowConfidence)` →
`AddPropertyFlow.handleScanComplete` → prefill wizard → jump to Step 2.

After: `handleScanChange` → POST to scan route → receive `PerEntityRows` → show tabbed review
inline on Step0 (or navigate to a shared review component).

The review is the same `IngestionReview` component used by the spreadsheet import. For a single
document, most tabs have 1 row — the review is effectively a confirmation screen with editable
fields. The user checks what the AI read, fixes any low-confidence fields (amber-highlighted),
and commits.

The scanned file is still attached: once the property is created via `persistCandidates`, the
file is staged as a document on the property (same logic as today, just triggered from the review
commit instead of the wizard submit).

## What gets removed

- `scan-to-form.ts` — replaced by `toCandidate` normalizers (shared with spreadsheet path)
- `handleScanComplete` in `AddPropertyFlow.tsx` — scan no longer prefills the wizard
- `scanFilledFields` / `scanLowFields` state in `AddPropertyFlow.tsx` — low-confidence now lives
  in `ReviewRow.issues`
- The pending-scan-file ref + staging effect in `AddPropertyFlow.tsx` — file staging moves to the
  review commit path
- Step 2's scan-confidence UI (auto-filled badges, amber rings) — replaced by the review table's
  issue indicators

## What stays

- The "Enter manually" wizard (6 steps) — unchanged. It's the right UX for typing fields by hand.
- The scan card on Step0 — same file picker, same `accept="application/pdf,image/*"`.
- The scanning spinner state ("Reading your document…").
- The `SCAN_MODEL` env var (swappable model).
- The `SCAN_SAMPLES` env var (self-consistency count, default 3).
- MIME + 10 MB caps.
- `scanModel()` provider selection (OpenAI vs Anthropic).

## Considered & rejected

- **Keeping the wizard for single-property scans** — rejected. Two paths (wizard vs. review) for
  the same action is confusing. The review table with 1 row is fast to confirm — the user sees
  everything the AI read in one screen instead of walking through 6 wizard steps.
- **Merging scan and spreadsheet into one upload box** — rejected (user explicitly wants them
  separate). Different file types, different UX expectations, different extraction engines.
- **Separate per-entity scan calls** — rejected. One document, one vision call. The model reads
  the whole document and returns everything it sees in one structured response.
