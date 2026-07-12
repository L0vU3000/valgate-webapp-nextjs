# Spec — unified-spreadsheet-import

## Overview

One spreadsheet upload page replaces three separate routes. The user uploads a file once; an AI
detects what entity types are in it (properties, tenants, valuations, or a combination); the user
reviews each detected type in a tabbed interface and imports them — all from one upload.

## Entities

### `WorkbookContents`

The detection result — which entity types the workbook contains and which sheet holds each.

| Field | Type | Purpose |
|---|---|---|
| `hasProperties` | `boolean` | Whether a property register sheet was found |
| `hasTenants` | `boolean` | Whether a tenant/lease sheet was found |
| `hasValuations` | `boolean` | Whether a valuation history sheet was found |
| `propertySheet` | `string \| null` | Sheet name holding properties (null if not found or hallucinated) |
| `tenantSheet` | `string \| null` | Sheet name holding tenants |
| `valuationSheet` | `string \| null` | Sheet name holding valuations |

### `TabState`

Per-tab state in the unified import flow.

| Field | Type | Purpose |
|---|---|---|
| `status` | `"pending" \| "mapping" \| "ready" \| "committed"` | Lazy mapping lifecycle |
| `rows` | `ReviewRow[]` | The reviewable rows (after mapping completes) |
| `result` | `BulkResult?` | Commit result (after "Import" is clicked) |
| `properties` | `PropertyOption[]?` | Org property list (for tenant/valuation tabs' picker) |

## Behaviors

### Upload + detection

1. User drops or browses a `.csv` or `.xlsx` file (max 20 MB, same as today).
2. `parseWorkbook` parses it client-side into `SheetMatrix[]`.
3. `detectWorkbookContentsAction` sends sheet previews (name + first 8 rows) to the AI.
4. If no entity type is detected: error message, back to upload.
5. If exactly one type: skip tab bar, go directly to that entity's mapping.
6. If multiple types: show tab bar, default to the first detected type.

### Per-tab mapping (lazy)

- Mapping runs only when the user clicks a tab (not all upfront).
- Properties tab uses the sheet-first engine: `detectPropertyLayout` → `extractRows` →
  `mapSpreadsheetAction` → `geocodeCandidates` → `ReviewRow[]`.
- Tenants tab uses the field-first engine: `extractRows` (all sheets) → `mapTenantsAction` →
  `ReviewRow[]`.
- Valuations tab: same as tenants, using `mapValuationsAction`.
- Each tab shows a spinner while its mapping is in progress.

### Per-tab review + commit

- Each tab renders `IngestionReview` with the entity's column config.
- Per-tab "Import N entities" button commits just that tab.
- After Properties commit: `revalidateFeTag("properties")` fires, refreshing the org property list.
- Tenant and valuation tabs re-query the property list when opened after a properties commit, so
  newly created properties appear in the picker.

### "Import everything" button

- Appears only when >1 tab is present.
- Commits in sequence: properties → tenants → valuations.
- Re-queries the property list before tenant and valuation commits so newly created properties
  are available for auto-linkage.
- Shows a combined summary on the done screen: "Imported N properties, M tenants, K valuations."

### Single-entity fast path

- If detection finds exactly one entity type, the tab bar is skipped and the flow goes directly
  to that entity's mapping + review — identical UX to today's single-route import.

### Degraded mode

- If `OPENAI_API_KEY` is missing, detection defaults to "properties only, first sheet" — the
  original behavior. The user can still upload and import properties; tenant/valuation tabs are
  not shown.

## Constraints

- **Max 100 rows** per entity type per batch (unchanged).
- **Max 20 MB** file size (unchanged).
- **Synchronous processing** — no background jobs (unchanged).
- **One detection AI call** per upload (gpt-4o-mini, same model as existing layout detection).
- **One mapping AI call** per tab (lazy, only when the tab is opened).
- **Org-scoped writes** — all commit actions use existing `requireCtx` + org-scoped create functions.
- **IDOR for valuations** — `bulkCreateValuationsAction` already verifies `propertyId` belongs to
  the caller's org (unchanged).
- **Generic error strings to client** (unchanged).

## Non-goals

- Document scan unification (scan → wizard stays separate).
- Auto-detecting entities beyond properties/tenants/valuations.
- Cross-tab validation (property picker re-query handles this implicitly).
- Background/async processing.
- Changing the AI extraction engines themselves.
