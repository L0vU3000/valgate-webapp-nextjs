## Why

Today the import pipeline makes **N+1 AI calls**: one to detect what's in the workbook, then one
per detected entity type to map its fields. A workbook with properties + tenants + leases + payments
= 5 AI calls, 10–30 seconds each, up to 2 minutes of spinners. That's not lightweight or fast.

The fix is simple: **one AI call reads the whole workbook and returns a mapping plan for every
Valgate entity type at once.** The AI sees all sheets, all headers, and all sample rows in one
prompt. It returns:

- Which sheet holds each entity type (or null if not present)
- Which source column maps to each Valgate field
- Which cross-sheet joins are needed (if any)

Code then applies that plan to every row deterministically — the same `assembleRows` logic that
exists today, just driven by one unified plan instead of N separate ones.

**One call in, everything out.** The user uploads, waits once (~5s with gpt-4o-mini), and all their
tabs are populated and ready for review. No detection step, no lazy per-tab mapping, no sequential
spinners.

## What Changes

### 1. Unified extraction service (`lib/services/unified-extract.ts`, new)

One function, one AI call:

```ts
type EntityPlan = {
  sheet: string;                    // primary sheet name
  sources: Record<string, string>;  // field → source column name
  joins?: { sheet: string; joinColumn: string; primaryColumn: string }[];
};

type UnifiedPlan = {
  properties?: EntityPlan | null;
  tenants?: EntityPlan | null;
  leases?: EntityPlan | null;
  payments?: EntityPlan | null;
  // ... one per entity type — null when not found in the workbook
};
```

`extractAll(previews: SheetPreview[]): Promise<UnifiedPlan>` — one `generateObject` call with
gpt-4o-mini. The prompt describes all 14 Valgate entity types and their fields. The schema has one
nullable `EntityPlan` per type. The model returns null for types it doesn't find — no separate
detection step.

### 2. Unified apply (`lib/services/unified-extract.ts`)

`applyPlan(sheets: SheetMatrix[], plan: UnifiedPlan): PerEntityRows` — pure, deterministic. For
each entity type with a non-null plan, runs the same `extractRows` + `assembleRows` logic that
exists today, then normalizes via the entity's `toCandidate` function. Returns
`Record<EntityType, ReviewRow[]>` — all tabs populated in one pass.

### 3. Remove detect + per-entity map actions

- `detectWorkbookContentsAction` → deleted (one AI call does everything)
- `mapSpreadsheetAction`, `mapTenantsAction`, `mapValuationsAction` → still exist for backward
  compat but the unified import page doesn't call them
- The unified page calls one new action: `extractAllAction(sheets) → ActionResult<UnifiedPlan>`

### 4. ImportFlow simplification

The flow becomes:

```
upload → parseWorkbook → extractAllAction (one call, ~5s) → review (all tabs populated)
```

No "detecting" stage. No lazy per-tab mapping. No spinners per tab. The user sees all detected
entity tabs immediately, each already populated with reviewable rows.

### 5. Per-entity normalizers (one per entity type)

Each entity needs a `toCandidate` normalizer (parse numbers, coerce enums, clean strings) — same
pure functions that exist today for tenants/valuations, extended to all 14 types. These run in
`applyPlan`, not in separate AI calls.

### 6. Column configs (one per entity type)

Same `ColumnConfig[]` per entity as before — declarative, no logic.

### 7. Property linkage

`resolveProperty` runs in `applyPlan` for every entity that has a `property` field. Requires the
org's property list, so `applyPlan` takes `ctx` and calls `listProperties` once.

### 8. All 14 entity types

| Entity | Fields the AI maps | Exists today? |
|---|---|---|
| Properties | name, type, status, address, city, province, zip, country, year built, area, beds/baths/parking, purchase price, market value, mortgage, monthly payment, interest rate, tax, insurance, ownership status | yes (sheet-first) |
| Tenants | name, unit, rent, status, email, phone, property | yes (field-first) |
| Valuations | property, price, valuation date | yes (field-first) |
| Leases | property, unit, stage, start date, end date, monthly rent, term months, renewal status, tenant | new |
| Payments | property, lease, date, kind, amount, method, status | new |
| Expenses | property, date, category, amount, note | new |
| Co-owners | property, name, role, share %, email, phone, address, tax entity, tax 1099 status | new |
| Maintenance | property, severity, title, status, cost | new |
| Inspections | property, type, inspector, status, date, issues count | new |
| Certifications | property, name, status, issued, expires, inspector | new |
| Safety risks | property, severity, title, description, status | new |
| Emergency contacts | property, name, phone, sub-role | new |
| Successors | name, relation, role, share, email, phone | new (user-scoped, no property) |
| Land parcels | property, size m², width, length, zoning code, zoning class, elevation, slope, terrain | new |

## Capabilities

### New Capabilities
- `import-all-entities`: All 14 Valgate entity types can be bulk-imported from a spreadsheet via
  one unified upload. One AI call reads the workbook and maps every entity type's fields in a
  single pass. The user uploads, waits ~5 seconds, and sees all detected entities in tabbed review
  tables — ready to review and import.

## Impact

- **Schema**: **none.** No DB changes. All 14 `createFn` functions already exist.
- **New files**:
  - `lib/services/unified-extract.ts` (`server-only`) — `UnifiedPlan` schema, `extractAll()` (one
    AI call), `applyPlan()` (pure deterministic application + normalization + property linkage)
  - `lib/services/{entity}-import.ts` — 11 new files, each ~60 lines: just the `FieldSpec[]` +
    `toCandidate` normalizer + `bulkCreate` delegating to `persistCandidates`. No `mapXxx`
    function (the unified plan replaces it).
  - `app/actions/unified-extract.ts` — `extractAllAction(sheets): ActionResult<UnifiedPlan>`
  - `app/actions/{entity}-import.ts` — 11 new files, each ~40 lines: `bulkCreateAction` only
    (no `mapAction` — mapping is done by the unified plan)
- **Modified files**:
  - `app/_shared/ingestion/column-configs.ts` — 11 new column configs
  - `app/(shell)/add-property/import/_components/ImportFlow.tsx` — simplified: upload → one
    `extractAllAction` call → all tabs populated → review + commit. Tab-bar grouping.
- **Deleted files**:
  - `lib/services/spreadsheet-detect.ts` — replaced by `unified-extract.ts`
  - `app/actions/spreadsheet-detect.ts` — replaced by `unified-extract.ts`
- **Security** (CLAUDE.md): `extractAllAction` calls `requireCtx()`; only sheet names + headers +
  3 sample rows sent to the model (no full dataset, no secrets); `UnifiedPlan` validated by Zod
  schema (`generateObject` throws on mismatch); generic errors. Per-entity `bulkCreateAction`
  calls `requireCtx()` + IDOR check on `propertyId` (via `persistCandidates`). Successors are
  user-scoped (no IDOR needed).
- **Non-goals**:
  - No new entity types beyond the 14 existing.
  - No changing existing create functions.
  - No document scan for these entities (spreadsheet only).
  - No cross-entity validation in review (property picker re-query handles it).
