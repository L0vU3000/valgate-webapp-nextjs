## 1. Unified extraction service

- [ ] 1.1 `lib/services/unified-extract.ts` (`server-only`) — `UnifiedPlan` Zod schema (one
      nullable `EntityPlan` per entity type, using `z.record` for sources), `extractAll(previews):
      Promise<UnifiedPlan>` — one `generateObject` call with gpt-4o-mini. Prompt describes all 14
      entity types and their fields. Hallucinated sheet/column names filtered in `applyPlan`.
      Degraded mode (no API key) → properties-only, first sheet, empty sources.
- [ ] 1.2 `applyPlan(sheets, plan, ctx): Promise<PerEntityRows>` — deterministic: for each
      non-null entity plan, `extractRows` → `applySources` (generalized `assembleRows`) →
      `toCandidate` normalizer → `resolveProperty` → convert to `ReviewRow[]`. One
      `listProperties(ctx)` call for all property linkages.
- [ ] 1.3 `app/actions/unified-extract.ts` — `extractAllAction(sheets):
      ActionResult<PerEntityRows>` — auth-gated, calls `extractAll` + `applyPlan`, returns
      populated rows for all detected entities in one response.

## 2. Per-entity normalizers + bulk-create (11 new files, ~60 lines each)

Each file: `FIELD_SPECS` (for reference/validation), `toCandidate` (pure normalizer),
`bulkCreate` (delegates to `persistCandidates`). No `mapXxx` function — mapping is done by the
unified plan.

- [ ] 2.1 `lib/services/lease-import.ts`
- [ ] 2.2 `lib/services/payment-import.ts`
- [ ] 2.3 `lib/services/expense-import.ts`
- [ ] 2.4 `lib/services/co-owner-import.ts`
- [ ] 2.5 `lib/services/maintenance-import.ts`
- [ ] 2.6 `lib/services/inspection-import.ts`
- [ ] 2.7 `lib/services/certification-import.ts`
- [ ] 2.8 `lib/services/safety-risk-import.ts`
- [ ] 2.9 `lib/services/emergency-contact-import.ts`
- [ ] 2.10 `lib/services/successor-import.ts`
- [ ] 2.11 `lib/services/land-parcel-import.ts`

## 3. Per-entity bulk-create actions (11 new files, ~40 lines each)

Each: `bulkCreateAction(drafts): ActionResult<BulkResult>` — auth + delegate to service's
`bulkCreate` + revalidate cache tag. No `mapAction` — mapping is done by the unified plan.

- [ ] 3.1 `app/actions/lease-import.ts`
- [ ] 3.2 `app/actions/payment-import.ts`
- [ ] 3.3 `app/actions/expense-import.ts`
- [ ] 3.4 `app/actions/co-owner-import.ts`
- [ ] 3.5 `app/actions/maintenance-import.ts`
- [ ] 3.6 `app/actions/inspection-import.ts`
- [ ] 3.7 `app/actions/certification-import.ts`
- [ ] 3.8 `app/actions/safety-risk-import.ts`
- [ ] 3.9 `app/actions/emergency-contact-import.ts`
- [ ] 3.10 `app/actions/successor-import.ts`
- [ ] 3.11 `app/actions/land-parcel-import.ts`

## 4. Column configs (added to column-configs.ts)

- [ ] 4.1 `leaseColumns`, `paymentColumns`, `expenseColumns`, `coOwnerColumns`,
      `maintenanceColumns`, `inspectionColumns`, `certificationColumns`, `safetyRiskColumns`,
      `emergencyContactColumns`, `successorColumns`, `landParcelColumns`

## 5. ImportFlow rewrite

- [ ] 5.1 Simplify flow: `upload → extractAllAction (one call) → review (all tabs populated) →
      commit`. Remove "detecting" stage and per-tab lazy mapping.
- [ ] 5.2 Expand `EntityType` union to 14 types. Add `tabGroups` constant for grouped tab bar
      (Portfolio / Rental / Financial / Compliance / Estate).
- [ ] 5.3 Per-tab commit: calls the entity's `bulkCreateAction` with reviewed rows.
- [ ] 5.4 "Import everything" button: commits in dependency order (properties → land parcels →
      co-owners → tenants → leases → payments → valuations → expenses → maintenance →
      inspections → certifications → safety risks → emergency contacts → successors), re-querying
      lists between steps.
- [ ] 5.5 Done screen: combined summary across all committed entity types.

## 6. Delete old detection

- [ ] 6.1 Delete `lib/services/spreadsheet-detect.ts` and `app/actions/spreadsheet-detect.ts`
      (replaced by `unified-extract.ts`).
- [ ] 6.2 Remove `detectWorkbookContentsAction` import from `ImportFlow.tsx`.

## 7. Verify

- [ ] 7.1 `npx tsc --noEmit` passes
- [ ] 7.2 Existing tests pass (`npx vitest run tests/property-import.test.ts tests/tenant-import.test.ts tests/valuation-import.test.ts`)
- [ ] 7.3 Upload a properties-only spreadsheet → one AI call → properties tab populated →
      review → import → properties created
- [ ] 7.4 Upload a multi-entity workbook → one AI call → all tabs populated → tab bar shows
      grouped tabs → "Import everything" commits in dependency order
