# Spec — unify-ingestion-pipeline

## Overview

All data ingestion sources (document scan, spreadsheet import for properties, tenants, and
valuations) share a single post-extraction pipeline. Source-specific extraction stays as-is;
everything after extraction — normalization, review, and persistence — flows through shared types,
a shared review component, and a shared persist function.

## Entities

### `IngestionCandidate<T>`

The unified candidate type that every pipeline produces after extraction:

| Field | Type | Purpose |
|---|---|---|
| `id` | `string` | Client-side UUID for React keys and edit tracking |
| `entity` | `T` | The typed, normalized entity (`NewProperty`, `NewTenant`, or `NewPropertyValuation`) |
| `source` | `IngestionSource` | Where the candidate came from (spreadsheet or scan, sheet name, row number, file name) |
| `issues` | `IngestionIssue[]` | Per-field problems found during extraction/normalization |
| `confidence` | `"high" \| "low"` | Scan: from self-consistency reconciliation; spreadsheet: always `"high"` |

### `IngestionSource`

| Field | Type | Purpose |
|---|---|---|
| `type` | `"spreadsheet" \| "scan"` | The extraction source |
| `sheet` | `string?` | Sheet name (spreadsheet only) |
| `row` | `number?` | 1-indexed row number (for error reporting) |
| `fileName` | `string?` | Original uploaded file name |

### `IngestionIssue`

| Field | Type | Purpose |
|---|---|---|
| `field` | `string` | The entity field with the issue (or `""` for row-level) |
| `severity` | `"error" \| "warning"` | `"error"` blocks the row from import; `"warning"` is informational |
| `message` | `string` | Human-readable description |

### `BulkResult`

| Field | Type | Purpose |
|---|---|---|
| `created` | `number` | Count of successfully created entities |
| `failures` | `{ row: number; name: string; reason: string }[]` | Per-row failures (row is 1-indexed) |

### `ColumnConfig<T>`

Declarative configuration for a column in the review table:

| Field | Type | Purpose |
|---|---|---|
| `field` | `keyof T & string` | The entity field this column displays/edits |
| `label` | `string` | Column header text |
| `editable` | `boolean` | Whether the user can edit this field in the table |
| `control` | `"text" \| "select" \| "number"` | Input type |
| `options` | `{ value: string; label: string }[]?` | For `select` controls |
| `required` | `boolean?` | If true, empty value produces an error issue |
| `validate` | `(value: string) => string \| null?` | Returns error message or null |
| `width` | `string?` | CSS width for the column |
| `format` | `(entity: T) => string?` | Display formatter |
| `parse` | `(input: string) => unknown?` | Parse edited string back to typed value |

## Behaviors

### Extraction adapters

Each adapter is a pure function that converts a pipeline's raw extraction output into
`IngestionCandidate<T>[]`. The extraction itself (AI calls, parsing, self-consistency) is unchanged.

| Adapter | Input | Output |
|---|---|---|
| `property-scan-adapter` | `ExtractedProperty`, `lowConfidence: string[]`, `fileName` | `IngestionCandidate<NewProperty>` |
| `property-spreadsheet-adapter` | `ImportCandidate[]`, `sheetName`, `fileName` | `IngestionCandidate<NewProperty>[]` |
| `tenant-spreadsheet-adapter` | `AssembledRow[]`, `sheetName`, `fileName` | `IngestionCandidate<NewTenant>[]` |
| `valuation-spreadsheet-adapter` | `AssembledRow[]`, `sheetName`, `fileName` | `IngestionCandidate<NewPropertyValuation>[]` |

### Review table (`IngestionReview`)

- Renders one row per candidate.
- Editable cells use the `control` type from `ColumnConfig` (text input, select dropdown, number
  input).
- Non-editable cells display the formatted value (`format` function, or `String(entity[field])`).
- Issues are shown per-row: error issues mark the row as blocked (excluded from commit), warnings are
  informational.
- `dynamicOptions` prop overrides static `options` for columns that need runtime data (e.g. the
  property picker for tenants/valuations).
- On commit, only rows without error-level issues are sent to `onCommit`.

### Persist layer (`persistCandidates`)

- Iterates candidates, calls `createFn(ctx, entity)` per row.
- `idorCheck` (optional) runs before `createFn` — returns `false` to skip the row and record a
  failure.
- `maxRows` (default 100) caps the batch; exceeding it returns an early failure without calling
  `createFn`.
- Partial success: valid rows are created even if some fail; failures are reported as
  `{ row, name, reason }`.
- `entityName` (optional) extracts a human-readable name from the entity for failure messages.
- Each `createFn` internally validates through the entity's Zod schema and enforces org scoping —
  `persistCandidates` does not duplicate this.

### Scan flow (unchanged UX)

The scan adapter emits an `IngestionCandidate<NewProperty>`, but the scan UI continues to route to
the wizard (not the review table) for single-property scans. The adapter exists for future use
(multi-document scan, quick-review mode). No behavioral change to the current scan → wizard path.

## Constraints

- **Max 100 rows** per batch (unchanged from existing importers).
- **Synchronous processing** — no background jobs, no async queues (unchanged).
- **Org-scoped writes** — every `createFn` receives `ctx` and writes `orgId: ctx.orgId` (unchanged).
- **Zod validation before DB** — each `createFn` validates the entity through its schema before
  inserting (unchanged).
- **Generic error strings to client** — `persistCandidates` catches errors and records generic
  reasons; the real error is logged server-side inside `createFn` (unchanged).
- **IDOR for valuations** — `idorCheck` verifies `propertyId` belongs to the caller's org before
  insert (unchanged behavior, moved to the shared persist layer).

## Non-goals

- Merging the three import routes into one page (future change).
- Changing the scan → wizard UX.
- New entity types (leases, work orders).
- Changing the AI extraction engines.
- Background/async processing.
