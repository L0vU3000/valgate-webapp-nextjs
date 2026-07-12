## 1. Workbook content detection

- [ ] 1.1 `lib/services/spreadsheet-detect.ts` (`server-only`) — `WorkbookContents` Zod schema +
      `detectWorkbookContents(previews): Promise<WorkbookContents>` — one `generateObject` call
      (gpt-4o-mini), classifies hasProperties/hasTenants/hasValuations + sheet names. Hallucinated
      sheet names filtered out. Degraded mode (no API key) → properties-only, first sheet.
- [ ] 1.2 `app/actions/spreadsheet-detect.ts` — `detectWorkbookContentsAction(previews):
      Promise<ActionResult<WorkbookContents>>` — auth-gated, generic errors.

## 2. Unified ImportFlow

- [ ] 2.1 Rewrite `app/(shell)/add-property/import/_components/ImportFlow.tsx`:
      - Stage "upload" → same file picker + `parseWorkbook`
      - Stage "detecting" → call `detectWorkbookContentsAction`, show spinner
      - Stage "review" → tab bar (one tab per detected entity type) + `IngestionReview` per tab
      - Stage "done" → combined summary (N properties, M tenants, K valuations)
- [ ] 2.2 Tab state: `pending` → `mapping` (lazy on tab click) → `ready` (IngestionReview shown) →
      `committed` (result stored, tab shows success badge)
- [ ] 2.3 Per-tab commit: calls existing `bulkCreatePropertiesAction` / `bulkCreateTenantsAction` /
      `bulkCreateValuationsAction` with the reviewed rows
- [ ] 2.4 "Import everything" button (appears when >1 tab): commits in sequence properties →
      tenants → valuations, re-querying the property list before tenant/valuation commit so newly
      created properties are available for linkage
- [ ] 2.5 Single-entity fast path: if detection finds exactly one entity type, skip the tab bar and
      go straight to that entity's mapping + review

## 3. Per-tab mapping (lazy, reusing existing engines)

- [ ] 3.1 Properties tab: `detectPropertyLayout` (if needed) → `extractRows` →
      `mapSpreadsheetAction` → convert to `ReviewRow[]` → `IngestionReview(propertyColumns)`
- [ ] 3.2 Tenants tab: `extractRows` (all sheets) → `mapTenantsAction` → convert to `ReviewRow[]` →
      `IngestionReview(tenantColumns, propertyOptions)`
- [ ] 3.3 Valuations tab: `extractRows` (all sheets) → `mapValuationsAction` → convert to
      `ReviewRow[]` → `IngestionReview(valuationColumns, propertyOptions)`

## 4. Step0 sub-chip update

- [ ] 4.1 `Step0NewOrDraft.tsx` — all three sub-chip paths ("Properties", "Tenants", "Valuations")
      point to `/add-property/import` (no query param needed — detection handles routing)

## 5. Old route redirects

- [ ] 5.1 `app/(shell)/add-property/import-tenants/page.tsx` → `redirect("/add-property/import")`
- [ ] 5.2 `app/(shell)/add-property/import-valuations/page.tsx` → `redirect("/add-property/import")`
- [ ] 5.3 Delete `TenantImportFlow.tsx` and `ValuationImportFlow.tsx` (logic absorbed into unified
      ImportFlow)

## 6. Verify

- [ ] 6.1 Upload a properties-only spreadsheet → detection finds properties → review table →
      import → properties created
- [ ] 6.2 Upload a multi-entity workbook (properties + tenants + valuations) → detection finds all
      three → tab bar shows all three → each tab maps + reviews independently → "Import everything"
      commits all three in sequence → combined summary
- [ ] 6.3 Upload a tenants-only workbook → single-entity fast path → tenant review with property
      picker → import
- [ ] 6.4 Old routes `/add-property/import-tenants` and `/add-property/import-valuations` redirect
      to `/add-property/import`
- [ ] 6.5 `npx tsc --noEmit` passes
- [ ] 6.6 Existing tests pass (`npx vitest run tests/property-import.test.ts tests/tenant-import.test.ts tests/valuation-import.test.ts`)
