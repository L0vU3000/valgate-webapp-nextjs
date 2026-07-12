## Why

Today there are **three separate spreadsheet import routes**, each with its own upload page, its own
AI detection call, and its own review table:

| Route | Entity | Engine |
|---|---|---|
| `/add-property/import` | Properties | Sheet-first column mapping |
| `/add-property/import-tenants` | Tenants | Field-first (`entity-import.ts`) |
| `/add-property/import-valuations` | Valuations | Field-first (`entity-import.ts`) |

A user with a client workbook that contains properties **and** tenants **and** valuations must:

1. Go to `/add-property`, click "Import from spreadsheet" → upload → review properties → commit.
2. Go back, click "Tenants" chip → `/add-property/import-tenants` → upload the **same file** →
   review tenants → commit.
3. Go back, click "Valuations" chip → `/add-property/import-valuations` → upload the **same file
   again** → review valuations → commit.

That's three uploads of the same workbook, three AI calls, three review sessions — for one file that
contains everything. The user's mental model is: *"I have a spreadsheet, put it in Valgate."* The app
should meet them there.

The previous change (`unify-ingestion-pipeline`) built the shared infrastructure — a generic
`IngestionReview` component, `persistCandidates`, and per-entity adapters. This change uses that
infrastructure to collapse the three routes into **one upload page** that detects what's in the
workbook and routes to the right review table(s).

## What Changes

### 1. One unified import route: `/add-property/import`

The existing `/add-property/import` page becomes the single entry point for all spreadsheet imports.
The Step0 sub-chips ("Properties", "Tenants", "Valuations") all point here instead of to separate
routes. The old routes (`/import-tenants`, `/import-valuations`) become redirects to `/import`.

### 2. Workbook content detection (one new AI call)

After the user uploads a file and `parseWorkbook` parses it into sheets, a **single AI call**
classifies what the workbook contains. The model sees each sheet's name + headers + 3 sample rows and
returns:

```ts
type WorkbookContents = {
  hasProperties: boolean;
  hasTenants: boolean;
  hasValuations: boolean;
  // The sheet name the AI identifies as each entity's primary sheet (if found).
  propertySheet?: string;
  tenantSheet?: string;
  valuationSheet?: string;
};
```

This is one `generateObject` call with `gpt-4o-mini` — the same model already used for layout
detection. It classifies all three entity types at once instead of three separate detection calls.

### 3. Entity-type tabs in the review stage

After detection, the page shows a **tab bar** with one tab per detected entity type (e.g.
"Properties (12)", "Tenants (8)", "Valuations (24)"). Each tab runs its existing mapping engine
(`mapColumns` + `applyMapping` for properties; `planFieldSources` + `assembleRows` for tenants/
valuations) and renders `IngestionReview` with the appropriate column config.

The user reviews each tab independently and can commit **all tabs in one "Import everything" button**
or commit per-tab. Per-tab commit is the default (properties first, then tenants, then valuations —
since tenants/valuations reference properties that may have just been created).

### 4. Progressive mapping (one tab at a time)

Mapping is **lazy**: the AI mapping call for a tab runs only when the user clicks that tab, not all
upfront. This keeps the initial detection fast (one cheap call) and lets the user skip tabs they
don't care about (e.g. "I only want the properties, ignore the tenant data").

### 5. Post-import property list refresh

When the user commits the Properties tab, the org's property list is refreshed (existing
`revalidateFeTag`). The Tenants and Valuations tabs' property pickers re-query the property list when
opened, so newly-created properties appear in the dropdown — no manual refresh needed.

## Capabilities

### New Capabilities
- `unified-spreadsheet-import`: A user uploads one spreadsheet (CSV or .xlsx) and Valgate AI detects
  whether it contains properties, tenants, valuations, or a combination. The user reviews each
  detected entity type in a tabbed interface and imports them — all from one upload, one page.

## Impact

- **Schema**: **none.** No DB changes. Reuses all existing create functions via `persistCandidates`.
- **New files**:
  - `lib/services/spreadsheet-detect.ts` (`server-only`) — `detectWorkbookContents(previews):
    Promise<WorkbookContents>` — one AI call classifying the workbook
  - `app/actions/spreadsheet-detect.ts` — `detectWorkbookContentsAction(previews):
    Promise<ActionResult<WorkbookContents>>` — auth-gated server action wrapper
- **Modified files**:
  - `app/(shell)/add-property/import/_components/ImportFlow.tsx` — rewritten as the unified flow:
    upload → detect → tabbed review (properties / tenants / valuations) → per-tab or bulk commit
  - `app/(shell)/add-property/_components/Step0NewOrDraft.tsx` — update all three sub-chip paths to
    point to `/add-property/import`
  - `app/(shell)/add-property/import-tenants/page.tsx` — becomes a redirect to `/add-property/import`
  - `app/(shell)/add-property/import-valuations/page.tsx` — becomes a redirect to `/add-property/import`
- **Deleted files**:
  - `app/(shell)/add-property/import-tenants/_components/TenantImportFlow.tsx` — logic absorbed into
    the unified flow
  - `app/(shell)/add-property/import-valuations/_components/ValuationImportFlow.tsx` — same
- **Security** (CLAUDE.md trust-boundary rules): the detection action calls `requireCtx()`; only
  sheet names + headers + 3 sample rows are sent to the model (no full dataset, no secrets);
  `WorkbookContents` is validated by a Zod schema (`generateObject` throws on mismatch); generic
  error strings to the client. Per-tab commit reuses the existing auth-gated bulk-create actions
  unchanged.
- **Non-goals**:
  - No document scan unification (scan → wizard path stays separate — it's a single-property flow
    with photos/docs/location that a review table can't do).
  - No auto-detecting entities beyond properties/tenants/valuations (future: leases, work orders).
  - No cross-tab validation (e.g. "this tenant references a property that doesn't exist yet" — the
    property picker handles this by re-querying the property list after each tab's commit).
  - No background/async processing (still synchronous, ≤100 rows per entity type).
