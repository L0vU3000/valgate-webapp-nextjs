## 1. Shared types + persist layer

- [ ] 1.1 `lib/services/ingestion/types.ts` — `IngestionCandidate<T>`, `IngestionSource`,
      `IngestionIssue`, `BulkResult`, `ColumnConfig<T>` (server-safe types, no `server-only` import
      so client components can import the type aliases)
- [ ] 1.2 `lib/services/ingestion/persist.ts` (`server-only`) — `persistCandidates<T>()` with
      `createFn` parameter, optional `idorCheck`, `maxRows` default 100, `entityName` for failure
      messages
- [ ] 1.3 Unit test: 5 candidates, 2 fail (one Zod validation, one IDOR check) → `created: 3`,
      `failures: [{ row: 3, ... }, { row: 5, ... }]`; row count > max → early return with failure

## 2. Adapters (thin, pure)

- [ ] 2.1 `lib/services/ingestion/adapters/property-scan-adapter.ts` — `fromScan(extracted,
      lowConfidence, fileName) → IngestionCandidate<NewProperty>`; reuses `scanToForm` +
      `mapWizardToProperty`
- [ ] 2.2 `lib/services/ingestion/adapters/property-spreadsheet-adapter.ts` — `fromSpreadsheet(
      ImportCandidate[], sheetName, fileName) → IngestionCandidate<NewProperty>[]`; reuses
      `mapWizardToProperty`
- [ ] 2.3 `lib/services/ingestion/adapters/tenant-spreadsheet-adapter.ts` — `fromSpreadsheet(
      AssembledRow[], sheetName, fileName) → IngestionCandidate<NewTenant>[]`; reuses
      `toTenantCandidate` logic
- [ ] 2.4 `lib/services/ingestion/adapters/valuation-spreadsheet-adapter.ts` — `fromSpreadsheet(
      AssembledRow[], sheetName, fileName) → IngestionCandidate<NewPropertyValuation>[]`; reuses
      `toValuationCandidate` logic

## 3. Refactor bulk-create functions to delegate to `persistCandidates`

- [ ] 3.1 `lib/services/property-import.ts` — `bulkCreateProperties` calls `persistCandidates` with
      `createProperty` as `createFn`; existing tests pass
- [ ] 3.2 `lib/services/tenant-import.ts` — `bulkCreateTenants` calls `persistCandidates` with
      `createTenant`; existing tests pass
- [ ] 3.3 `lib/services/valuation-import.ts` — `bulkCreateValuations` calls `persistCandidates` with
      `createPropertyValuation` and `idorCheck` callback; existing tests pass

## 4. `IngestionReview` component + column configs

- [ ] 4.1 `app/_shared/ingestion/column-configs.ts` — `propertyColumns`, `tenantColumns`,
      `valuationColumns` (declarative `ColumnConfig<T>[]`, ~20 lines each)
- [ ] 4.2 `app/_shared/ingestion/IngestionReview.tsx` — generic review table: header row, data rows
      with editable cells (text/select/number), issue indicators, "Import N" button, cancel button;
      accepts `dynamicOptions` prop for the property picker
- [ ] 4.3 Row filtering: rows with `severity: "error"` issues are excluded from the commit payload
- [ ] 4.4 Edit tracking: per-candidate, per-field edit state; re-derives issues on edit (required
      fields, format validators)

## 5. Swap review components (one at a time)

- [ ] 5.1 `ImportFlow.tsx` — replace `MappingReview` with `<IngestionReview columns={propertyColumns}
      />`; verify property import still works end-to-end
- [ ] 5.2 `TenantImportFlow.tsx` — replace `TenantReview` with `<IngestionReview columns=
      {tenantColumns} dynamicOptions={{ propertyId: ... }} />`; verify tenant import works
- [ ] 5.3 `ValuationImportFlow.tsx` — replace `ValuationReview` with `<IngestionReview columns=
      {valuationColumns} dynamicOptions={{ propertyId: ... }} />`; verify valuation import works

## 6. Cleanup

- [ ] 6.1 Delete `MappingReview.tsx`, `TenantReview.tsx`, `ValuationReview.tsx` (replaced by
      `IngestionReview`)
- [ ] 6.2 Remove any now-unused imports from the import flow files

## 7. Verify

- [ ] 7.1 Property spreadsheet import: upload a CSV → AI mapping → review table (editable,
      issues flagged) → import → properties created, partial success on bad rows
- [ ] 7.2 Tenant spreadsheet import: upload a workbook → AI field sourcing → review table with
      property picker → import → tenants created, unmatched properties blocked
- [ ] 7.3 Valuation spreadsheet import: upload a workbook → review table → import → valuations
      created, IDOR-checked
- [ ] 7.4 Document scan: scan a PDF → wizard prefill (unchanged UX) → submit → property created
      with attached document
- [ ] 7.5 `npx tsc --noEmit` passes with no new errors
