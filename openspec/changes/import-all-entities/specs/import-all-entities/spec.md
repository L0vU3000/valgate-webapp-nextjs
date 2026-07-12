# Spec — import-all-entities

## Overview

All 14 Valgate entity types can be bulk-imported from a spreadsheet via one unified upload. One
AI call reads the workbook and maps every entity type's fields in a single pass. The user uploads,
waits ~5 seconds, and sees all detected entities in tabbed review tables — ready to review and
import.

## Architecture

```
upload → parseWorkbook → extractAllAction (one AI call, ~5s) → review (all tabs) → commit
```

One AI call replaces the previous detect + per-entity map approach (N+1 calls). The model sees all
sheets at once and returns a mapping plan for all 14 entity types. Code applies the plan
deterministically to populate all review tabs immediately.

## Entities

### `EntityPlan`

Per-entity mapping plan returned by the AI.

| Field | Type | Purpose |
|---|---|---|
| `sheet` | `string` | Primary sheet name holding this entity's register |
| `sources` | `Record<string, string>` | Map of Valgate field → source column header |
| `joins` | `Join[]?` | Cross-sheet joins (if fields come from other sheets) |

### `Join`

| Field | Type | Purpose |
|---|---|---|
| `sheet` | `string` | Other sheet to pull fields from |
| `joinColumn` | `string` | Column in that sheet used to match back to primary |
| `primaryColumn` | `string` | Column in primary sheet whose value equals joinColumn |

### `UnifiedPlan`

One nullable `EntityPlan` per entity type (14 total). `null` = entity not found in workbook.

### `PerEntityRows`

`Record<EntityType, ReviewRow[]>` — populated review rows for each detected entity type. Returned
by `applyPlan` and sent to the client in one response.

## Per-entity fields

### Properties (25 fields)
propertyName, propertyType, status, addressLine, addressLine2, city, province, zip, country,
yearBuilt, totalArea, bedrooms, bathrooms, parkingSpaces, storageUnit, purchasePrice, purchaseDate,
currentMarketValue, outstandingMortgage, monthlyPayment, interestRate, annualPropertyTax,
taxAssessmentValue, annualInsurance, ownershipStatus

### Tenants (7 fields)
name, unit, rent, status, email, phone, property

### Valuations (3 fields)
property, price, valuationDate

### Leases (9 fields)
property, unit, stage, startDate, endDate, monthlyRent, termMonths, renewalStatus, tenant

### Payments (7 fields)
property, lease, date, kind, amount, method, status

### Expenses (5 fields)
property, date, category, amount, note

### Co-owners (9 fields)
property, name, role, sharePercent, email, phone, address, taxEntity, tax1099Status

### Maintenance (5 fields)
property, severity, title, status, cost

### Inspections (6 fields)
property, type, inspector, status, inspectedAt, issues

### Certifications (6 fields)
property, name, status, issuedAt, expiresAt, inspector

### Safety risks (5 fields)
property, severity, title, description, status

### Emergency contacts (4 fields)
property, name, phone, sub

### Successors (6 fields)
name, relation, role, share, email, phone

### Land parcels (9 fields)
property, sizeM2, widthM, lengthM, zoningCode, zoningClass, elevationM, slopeAngleDeg, terrainType

## Behaviors

### Upload + extraction

1. User drops or browses a `.csv` or `.xlsx` file (max 20 MB).
2. `parseWorkbook` parses it client-side into `SheetMatrix[]`.
3. `extractAllAction` sends sheet previews (name + headers + 3 sample rows) to one AI call.
4. The AI returns a `UnifiedPlan` with a mapping for each detected entity type (null for absent).
5. `applyPlan` applies the plan deterministically: extracts rows, maps columns, normalizes values,
   resolves property linkage, and returns `PerEntityRows` — all tabs populated.
6. The review screen appears with all detected entity tabs immediately.

No detection stage. No per-tab mapping. No lazy loading. One call, one apply, all tabs ready.

### Review + commit

- Tab bar groups entities by category (Portfolio / Rental / Financial / Compliance / Estate).
- Each tab renders `IngestionReview` with the entity's column config.
- Per-tab "Import N entities" button commits just that tab.
- "Import everything" commits in dependency order, re-querying lists between steps.

### Property linkage

`resolveProperty` (exact match on id/name/code/title) runs in `applyPlan` for all entities with a
`property` field. Unmatched rows get a property picker in the review table.

### IDOR

All entities with `propertyId` pass an `idorCheck` to `persistCandidates`. Successors are
user-scoped (no IDOR needed). Payments with `leaseId` resolve at apply time.

### Degraded mode

If `OPENAI_API_KEY` is missing, extraction returns properties-only with an empty source map (the
user sees the properties tab with unmapped columns to fill manually).

## Constraints

- **Max 100 rows** per entity type per batch.
- **Max 20 MB** file size.
- **One AI call** per upload (gpt-4o-mini, ~5s).
- **Synchronous processing** — no background jobs.
- **Org-scoped writes** via `requireCtx` + each `createFn`.
- **Zod validation** before DB insert (inside each `createFn`).
- **Generic error strings** to client.

## Non-goals

- No new entity types beyond the 14 existing ones.
- No changing existing create functions.
- No document scan for these entities (spreadsheet only).
- No cross-entity validation in the review step.
