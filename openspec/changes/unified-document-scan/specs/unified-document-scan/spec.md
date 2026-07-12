# Spec — unified-document-scan

## Overview

The document scan path is expanded from extracting one property to extracting all 14 Valgate
entity types in one vision AI call. After extraction, the data feeds into the same tabbed review +
commit pipeline as the spreadsheet import. The two entry points stay separate on Step0, but
post-extraction processing is identical.

## Architecture

```
Spreadsheet: upload → extractAll (text mapping, 1 call) → PerEntityRows → review → commit
Document:    upload → scanAll (vision, N runs + reconcile) → PerEntityRows → review → commit
```

Both produce `PerEntityRows`. Same `IngestionReview` component. Same `persistCandidates` commit.
Different extraction engines.

## Entities

### `UnifiedScanSchema`

One nullable array per entity type (14 total). Each array contains zero or more extracted records
with nullable fields and enum constraints.

| Entity | Fields (same as spreadsheet FieldSpec) | Array? |
|---|---|---|
| Properties | 17 fields (same as today's ExtractedPropertySchema) | typically 1 |
| Tenants | name, unit, rent, status, email, phone | typically 1 |
| Leases | unit, stage, startDate, endDate, monthlyRent, termMonths, renewalStatus | typically 1 |
| Payments | date, kind, amount, method, status | 0–N |
| Expenses | date, category, amount, note | 0–N |
| Co-owners | name, role, sharePercent, email, phone, address, taxEntity, tax1099Status | 1–N |
| Maintenance | severity, title, status, cost | 0–N |
| Inspections | type, inspector, status, inspectedAt, issues | 0–1 |
| Certifications | name, status, issuedAt, expiresAt, inspector | 0–1 |
| Safety risks | severity, title, description, status | 0–N |
| Emergency contacts | name, phone, sub | 0–N |
| Successors | name, relation, role, share, email, phone | 0–N |
| Land parcels | sizeM2, widthM, lengthM, zoningCode, zoningClass, elevationM, slopeAngleDeg, terrainType | 0–1 |
| Valuations | price, valuationDate | 0–1 |

### `UnifiedScanResult`

| Field | Type | Purpose |
|---|---|---|
| `extracted` | `UnifiedExtraction` | One reconciled object (majority vote across N runs) |
| `lowConfidence` | `string[]` | Fields the runs disagreed on (e.g. `"properties.totalArea"`) |

## Behaviors

### Scan extraction

1. User picks a file (PDF or image, max 10 MB, same MIME allowlist as today).
2. `scanDocument` runs the vision model N times in parallel (`SCAN_SAMPLES`, default 3).
3. `reconcileExtractions` votes per entity per field — majority wins, disagreements flagged.
4. `applyScanResult` normalizes each entity via `toCandidate` (shared with spreadsheet path),
   resolves property linkage, maps low-confidence fields to `ReviewRow.issues` as warnings.
5. Returns `PerEntityRows` — same shape as the spreadsheet path.

### Review + commit

- Same `IngestionReview` component, same tabbed UI, same column configs.
- For a single document, most tabs have 1 row — effectively a confirmation screen.
- Low-confidence cells show amber warnings (same visual as today's scan badges, in the review table).
- Per-tab or "Import everything" commit — same as spreadsheet import.
- Scanned file is attached as a document on the created property (same staging logic, triggered
  from the review commit instead of the wizard submit).

### Scan → review (not wizard)

The scan path no longer drops into the 6-step wizard. Extracted data goes directly to the tabbed
review. The wizard stays for "Enter manually" only.

### Self-consistency

Unchanged: N parallel runs, majority vote, low-confidence flagging. Generalized from flat
`ExtractedProperty` to nested `UnifiedScanSchema`. Arrays of different lengths across runs are
reconciled by index (shortest wins; extras kept if ≥ ceil(N/2) runs have them).

### Degraded mode

If `OPENAI_API_KEY` is missing, the scan route returns an error (vision extraction can't degrade
gracefully — there's no fallback OCR). The user can still use "Enter manually."

## Constraints

- **One vision AI call** per scan (× N self-consistency runs, in parallel).
- **Max 10 MB** file size (unchanged).
- **MIME allowlist**: PDF, JPEG, PNG, WebP (unchanged).
- **`SCAN_MODEL` env var** — swappable model (unchanged).
- **`SCAN_SAMPLES` env var** — self-consistency count, default 3 (unchanged).
- **`maxDuration = 60`** on the scan route (unchanged).
- **Org-scoped writes** via `requireCtx` + each `createFn`.
- **IDOR** on `propertyId` via `persistCandidates`.
- **Zod validation** before DB insert (inside each `createFn`).
- **Generic error strings** to client.

## Non-goals

- No multi-document batch scan (one file at a time).
- No changing the "Enter manually" wizard.
- No changing the spreadsheet import path.
- No new entity types.
- No separate per-entity scan calls (one call reads the whole document).
