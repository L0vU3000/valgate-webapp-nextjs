## Why

Today Valgate has **four separate ingestion pipelines** that all do the same three things — extract
raw data from a file, transform it into Valgate entities, and persist them — but share no code for
steps 2 and 3:

| Source | Entity | Extract | Transform | Persist |
|---|---|---|---|---|
| Document scan | Property | `scanDocument` → `ExtractedProperty` | `scanToForm` → `FormData` → wizard → `mapWizardToProperty` | `createProperty` |
| Spreadsheet | Property | `parseWorkbook` → AI column map → `applyMapping` → `WizardForm` | `mapWizardToProperty` | `createProperty` |
| Spreadsheet | Tenant | `parseWorkbook` → `planFieldSources` → `assembleRows` | `toTenantCandidate` | `createTenant` |
| Spreadsheet | Valuation | `parseWorkbook` → `planFieldSources` → `assembleRows` | `toValuationCandidate` | `createPropertyValuation` |

The **extraction** step is inherently source-specific (vision model vs. column mapping vs. field-first
engine) — that's correct. But **once raw data is extracted**, the rest of the pipeline should be
identical regardless of where the data came from:

1. **Normalize** raw strings → typed Valgate fields (strip placeholders, parse numbers, coerce enums).
2. **Review** — an editable table where the user confirms/corrects before anything is committed.
3. **Persist** — per-row validation through the entity's Zod schema, then the org-scoped create function,
   partial success, structured failures.

Right now each pipeline reinvents this with its own candidate type, its own review component, and its
own bulk-create loop. The scan flow doesn't even have a review table — it drops into the single-property
wizard instead. Adding a new entity type (e.g. importing leases from a spreadsheet) means writing all
three from scratch.

This change extracts a **shared post-extraction pipeline** so every ingestion source — spreadsheet or
document, any entity type — flows through the same normalize → review → persist path.

## What Changes

### 1. Unified candidate model (`lib/services/ingestion/types.ts`, new)

A generic `IngestionCandidate<T>` that replaces the per-pipeline candidate types:

```ts
type IngestionCandidate<T> = {
  entity: T;            // the typed, normalized entity (NewProperty | NewTenant | NewPropertyValuation)
  source: IngestionSource;  // { type: "spreadsheet" | "scan", sheet?, row?, file? }
  issues: IngestionIssue[]; // { field, severity: "error" | "warning", message }
  confidence?: "high" | "low";  // from scan self-consistency, or per-field mapping confidence
};
```

Every pipeline's raw extraction output is converted into `IngestionCandidate<T>[]` by a
source-specific **adapter** (see below). From that point on, the candidate flows through shared code.

### 2. Per-source extraction adapters (thin, source-specific)

Each adapter is ~30–60 lines and converts its pipeline's raw output into `IngestionCandidate<T>[]`:

- **`property-scan-adapter.ts`** — `ExtractedProperty` → `IngestionCandidate<NewProperty>[]` (one
  candidate). Reuses `scanToForm` + `mapWizardToProperty` internally, but emits a candidate instead of
  prefilling the wizard.
- **`property-spreadsheet-adapter.ts`** — `ImportCandidate[]` → `IngestionCandidate<NewProperty>[]`.
  Thin wrapper around existing `applyMapping` + `mapWizardToProperty`.
- **`tenant-spreadsheet-adapter.ts`** — `AssembledRow[]` → `IngestionCandidate<NewTenant>[]`. Reuses
  `toTenantCandidate` logic.
- **`valuation-spreadsheet-adapter.ts`** — `AssembledRow[]` → `IngestionCandidate<NewPropertyValuation>[]`.
  Reuses `toValuationCandidate` logic.

The extraction itself (AI calls, parsing, self-consistency) **stays where it is** — only the output
shape changes.

### 3. Shared review component (`app/_shared/ingestion/IngestionReview.tsx`, new)

A generic, config-driven review table that replaces `MappingReview`, `TenantReview`, and
`ValuationReview`:

```tsx
<IngestionReview
  candidates={candidates}
  columns={columnConfig}   // per-entity: which fields to show, editable controls, validators
  onCommit={handleCommit}
  onCancel={onCancel}
/>
```

`columnConfig` is a declarative array:
```ts
type ColumnConfig<T> = {
  field: keyof T;
  label: string;
  editable: boolean;
  control: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
  validate?: (value: string) => string | null;  // returns error message or null
  width?: string;
};
```

Pre-built configs: `propertyColumns`, `tenantColumns`, `valuationColumns`. Each is ~20 lines
declaring the fields to show — no component logic.

### 4. Shared persist layer (`lib/services/ingestion/persist.ts`, new)

One function replaces the three bulk-create loops:

```ts
async function persistCandidates<T>(
  ctx: Ctx,
  candidates: IngestionCandidate<T>[],
  createFn: (ctx: Ctx, entity: T) => Promise<T>,
  options: { maxRows?: number; idorCheck?: (entity: T, ctx: Ctx) => boolean },
): Promise<BulkResult>
```

- Iterates candidates, calls `createFn` per row, collects `{ row, name, reason }` failures.
- `idorCheck` is optional (valuations need it; properties/tenants don't because `createProperty` /
  `createTenant` are already org-scoped).
- `maxRows` defaults to 100 (existing cap).
- Revalidates cache after success (existing `revalidateFeTag` + `bustCache`).

The existing `bulkCreateProperties`, `bulkCreateTenants`, `bulkCreateValuations` become thin wrappers
that call `persistCandidates` with their entity's `createFn`.

### 5. Scan flow: optional review-table path

Today the scan flow prefills the wizard and the user walks through 6 steps. For a **single property**
from a document, the wizard is the right UX (it has photos, docs, location picker — things a review
table can't do).

This change **keeps the wizard as the scan's primary path** but adds a **candidate output** from the
scan adapter so the scan *could* feed into the review table in the future (e.g. if a user scans
multiple documents, or if we add a "quick review" mode). The adapter emits the candidate; the UI
decides whether to route to the wizard or the table. No behavioral change to the current scan UX.

### 6. Unified upload page (future, not in this change)

The Step0 card consolidation (done in the previous PR) already points all import sub-types to one
card. A future change can merge the three separate import pages (`/import`, `/import-tenants`,
`/import-valuations`) into one `/import` page with an entity-type selector — but that's a UI
restructuring that depends on this pipeline unification being in place first. **Non-goal for this
change.**

## Capabilities

### New Capabilities
- `unify-ingestion-pipeline`: All data ingestion sources (document scan, spreadsheet import for
  properties/tenants/valuations) share a single post-extraction pipeline: a unified candidate model,
  a config-driven review component, and a generic persist layer. Adding a new entity type or
  extraction source requires only an adapter (~40 lines) and a column config (~20 lines) — no new
  review UI or bulk-create loop.

## Impact

- **Schema**: **none.** No DB changes, no migrations. The persist layer calls the existing
  `createProperty` / `createTenant` / `createPropertyValuation` functions unchanged.
- **New files**:
  - `lib/services/ingestion/types.ts` — `IngestionCandidate`, `IngestionSource`, `IngestionIssue`,
    `BulkResult`, `ColumnConfig`
  - `lib/services/ingestion/persist.ts` — `persistCandidates<T>()` (server-only)
  - `lib/services/ingestion/adapters/property-scan-adapter.ts`
  - `lib/services/ingestion/adapters/property-spreadsheet-adapter.ts`
  - `lib/services/ingestion/adapters/tenant-spreadsheet-adapter.ts`
  - `lib/services/ingestion/adapters/valuation-spreadsheet-adapter.ts`
  - `app/_shared/ingestion/IngestionReview.tsx` — generic review table
  - `app/_shared/ingestion/column-configs.ts` — `propertyColumns`, `tenantColumns`, `valuationColumns`
- **Modified files** (thin wrapping, no logic change):
  - `lib/services/property-import.ts` — `bulkCreateProperties` delegates to `persistCandidates`
  - `lib/services/tenant-import.ts` — `bulkCreateTenants` delegates to `persistCandidates`
  - `lib/services/valuation-import.ts` — `bulkCreateValuations` delegates to `persistCandidates`
  - `app/(shell)/add-property/import/_components/ImportFlow.tsx` — swaps `MappingReview` for
    `IngestionReview` with `propertyColumns`
  - `app/(shell)/add-property/import-tenants/_components/TenantImportFlow.tsx` — swaps `TenantReview`
    for `IngestionReview` with `tenantColumns`
  - `app/(shell)/add-property/import-valuations/_components/ValuationImportFlow.tsx` — swaps
    `ValuationReview` for `IngestionReview` with `valuationColumns`
- **Deleted files** (replaced by `IngestionReview`):
  - `app/(shell)/add-property/import/_components/MappingReview.tsx`
  - `app/(shell)/add-property/import-tenants/_components/TenantReview.tsx`
  - `app/(shell)/add-property/import-valuations/_components/ValuationReview.tsx`
- **Security** (CLAUDE.md trust-boundary rules): `persistCandidates` calls `requireCtx` via the
  existing `createFn` signatures (they all take `ctx` as first arg). The optional `idorCheck` runs
  **before** `createFn` for entity types that reference another entity (valuations check
  `propertyId ∈ orgProperties`). All Zod validation happens inside each `createFn` (unchanged).
  Generic error strings to the client; row count capped at 100.
- **Non-goals**:
  - No merging of the three import pages into one route (future change).
  - No changing the scan → wizard UX (the adapter emits a candidate but the wizard stays primary).
  - No new entity types (leases, work orders) — this is infrastructure, not features.
  - No changing the AI extraction engines (column mapping, field-first, vision) — they stay as-is.
  - No background/async processing (still synchronous, ≤100 rows).
