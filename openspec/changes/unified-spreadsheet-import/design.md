# Design — unified-spreadsheet-import

## Flow

```
Step0: user clicks "Import from spreadsheet" (any sub-chip)
   → /add-property/import (one route)
   → upload a .csv or .xlsx file
   → parseWorkbook(file) → SheetMatrix[] (client-side, same as today)

Stage 1 — DETECT (one AI call):
   → detectWorkbookContentsAction(sheet previews)
      → gpt-4o-mini classifies: hasProperties? hasTenants? hasValuations?
      → returns WorkbookContents { hasProperties, hasTenants, hasValuations,
         propertySheet?, tenantSheet?, valuationSheet? }
   → if nothing detected → error: "Couldn't find properties, tenants, or valuations in that file."
   → if exactly one entity type → skip tabs, go straight to that entity's mapping stage
   → if multiple → show tab bar, default to the first detected type

Stage 2 — MAP (per-tab, lazy):
   → user clicks a tab (or auto-selected if only one)
   → run that entity's mapping engine:
      Properties: detectPropertyLayout (if multi-sheet) → extractRows → mapColumns → applyMapping
                  → geocodeCandidates → IngestionReview(propertyColumns)
      Tenants:    extractRows(all sheets) → mapTenantsAction → IngestionReview(tenantColumns)
      Valuations: extractRows(all sheets) → mapValuationsAction → IngestionReview(valuationColumns)
   → mapping spinner per tab (not blocking other tabs)

Stage 3 — REVIEW + COMMIT:
   → user reviews each tab's IngestionReview table (editable, same as today)
   → per-tab "Import N properties/tenants/valuations" button
   → OR "Import everything" button (commits all tabs in sequence: properties → tenants → valuations)
   → after Properties commit: revalidateFeTag("properties") → property pickers in other tabs
      re-query on open
   → done screen: combined summary (N properties, M tenants, K valuations imported)
```

## Detection AI call

```ts
// lib/services/spreadsheet-detect.ts
const contentsSchema = z.object({
  hasProperties: z.boolean(),
  hasTenants: z.boolean(),
  hasValuations: z.boolean(),
  propertySheet: z.string().nullable().describe("Sheet name that holds the property register, if any"),
  tenantSheet: z.string().nullable().describe("Sheet name that holds tenant/lease data, if any"),
  valuationSheet: z.string().nullable().describe("Sheet name that holds valuation history, if any"),
});

export type WorkbookContents = z.infer<typeof contentsSchema>;

export async function detectWorkbookContents(
  previews: { name: string; rows: string[][] }[],
): Promise<WorkbookContents> {
  if (!env.OPENAI_API_KEY) {
    // Degraded: assume properties only (the original default).
    return { hasProperties: true, hasTenants: false, hasValuations: false,
             propertySheet: previews[0]?.name ?? null, tenantSheet: null, valuationSheet: null };
  }
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: contentsSchema,
    prompt: [
      "A workbook has multiple sheets. For each entity type below, determine whether the workbook",
      "contains a sheet that is a register of that entity, and name the sheet if so.",
      "",
      "Entity types:",
      "- properties: one row per real-estate property (columns like address, area, type, owner).",
      "- tenants: one row per tenant/lease (columns like tenant name, unit, rent, payment status).",
      "- valuations: one row per valuation event (columns like property, market value, valuation date).",
      "",
      "A single workbook may contain all three, or any combination. A sheet about taxes, documents,",
      "or succession is NOT any of these — return false for all if no entity register is present.",
      "",
      `Sheets (name + first rows): ${JSON.stringify(previews)}`,
    ].join("\n"),
  });
  // Guard against hallucinated sheet names.
  const names = new Set(previews.map((p) => p.name));
  return {
    hasProperties: object.hasProperties,
    hasTenants: object.hasTenants,
    hasValuations: object.hasValuations,
    propertySheet: object.propertySheet && names.has(object.propertySheet) ? object.propertySheet : null,
    tenantSheet: object.tenantSheet && names.has(object.tenantSheet) ? object.tenantSheet : null,
    valuationSheet: object.valuationSheet && names.has(object.valuationSheet) ? object.valuationSheet : null,
  };
}
```

### Degraded mode

If `OPENAI_API_KEY` is missing, detection falls back to "properties only, first sheet" — the
original behavior before tenant/valuation import existed. The user can still manually navigate to
a different tab if the page shows them (but in degraded mode, only the properties tab would be shown).

## Tab bar design

```
┌─────────────────────────────────────────────────────────────────────┐
│  [ Properties (12) ] [ Tenants (8) ] [ Valuations (24) ]            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  <IngestionReview columns={propertyColumns} ... />                  │
│                                                                     │
│  [ Import 12 properties ]                              [ Cancel ]   │
│                                                                     │
│  ── or ──                                                           │
│                                                                     │
│  [ Import everything (44 records) ]                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Tab labels show the entity count after mapping completes (spinner while mapping is in progress).
- Clicking a tab triggers that entity's mapping if it hasn't been run yet (lazy).
- The "Import everything" button appears only when multiple tabs are present; it commits in
  sequence (properties → tenants → valuations) so property pickers refresh between commits.
- Per-tab "Import N entities" commits just that tab.

## ImportFlow state shape

```ts
type Stage = "upload" | "detecting" | "review" | "done";

type TabState = {
  status: "pending" | "mapping" | "ready" | "committed";
  rows: ReviewRow[];
  result?: BulkResult;
  properties?: PropertyOption[];  // for tenant/valuation tabs' property picker
};

type UnifiedState = {
  stage: Stage;
  sheets: SheetMatrix[];          // parsed workbook
  contents?: WorkbookContents;    // detection result
  tabs: {
    properties?: TabState;
    tenants?: TabState;
    valuations?: TabState;
  };
  activeTab: "properties" | "tenants" | "valuations";
  doneSummary?: { properties?: BulkResult; tenants?: BulkResult; valuations?: BulkResult };
};
```

## Mapping per tab — reusing existing engines

### Properties tab

Same as today's `ImportFlow`:
1. If `contents.propertySheet` is set, use that sheet; otherwise fall back to `detectPropertyLayout`.
2. `extractRows` → `mapSpreadsheetAction(headers, rows)` → get `ImportCandidate[]`.
3. Convert to `ReviewRow[]` (same conversion as today's ImportFlow).
4. Render `IngestionReview` with `propertyColumns`.

### Tenants tab

1. `extractRows` on every sheet (same as `TenantImportFlow`).
2. `mapTenantsAction(sheetData)` → get `TenantCandidate[]` + `PropertyOption[]`.
3. Convert to `ReviewRow[]`.
4. Render `IngestionReview` with `tenantColumns` + `propertyOptions`.

### Valuations tab

Same pattern as tenants, using `mapValuationsAction` + `valuationColumns`.

## Old route redirects

```ts
// app/(shell)/add-property/import-tenants/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/add-property/import"); }

// app/(shell)/add-property/import-valuations/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/add-property/import"); }
```

## Commit sequence for "Import everything"

```
1. Commit properties tab → bulkCreatePropertiesAction → revalidateFeTag("properties")
2. Commit tenants tab → bulkCreateTenantsAction → revalidateFeTag("tenants")
   (property picker already refreshed because the tab's propertyOptions were loaded
   at mapping time; for "Import everything", we re-query properties BEFORE tenant commit
   so newly created properties appear)
3. Commit valuations tab → bulkCreateValuationsAction → revalidateFeTag("valuations")
   (same re-query for property list)
```

The re-query before tenant/valuation commit ensures properties created in step 1 are available
in the property linkage — this is the key UX win: the user's spreadsheet might have a property
name in the tenant sheet that matches a property they're importing in the properties tab, and
the auto-resolution works because the property now exists.

## Considered & rejected

- **One AI call that maps all three entity types at once** — the property engine is sheet-first
  (column mapping) while tenant/valuation are field-first (cross-sheet sourcing). They use different
  prompts and different schemas. Forcing them into one call would produce a massive, unwieldy schema
  and a slower, less reliable response. Three separate mapping calls (one per tab, lazy) is cleaner.
- **Auto-committing properties before showing the tenant tab** — rejected because the user might
  want to fix property rows before they're created. The review step is the human checkpoint;
  auto-committing skips it.
- **Single unified table showing all entities mixed together** — properties, tenants, and valuations
  have completely different fields. A mixed table would be confusing and uneditable. Tabs keep each
  entity's review focused.
- **Merging document scan into this page** — scan is a single-property flow with photos, docs, and
  a location picker. It doesn't fit a tabbed review table. Stays as a separate entry point.
