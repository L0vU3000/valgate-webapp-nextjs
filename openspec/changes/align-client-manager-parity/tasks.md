## 1. Phase 1 — Client self-service parity (shell only, no manager coupling)

- [x] 1.1 Add `app/actions/safety-risks.ts` — `createSafetyRisk`/`updateSafetyRisk`/`deleteSafetyRisk` wrapping `lib/services/safety-risks.ts` (requireCtx → Zod → service → `bustCache("safety-risks")`), mirroring an existing action file's shape
- [x] 1.2 Add `payments` update/delete: `updatePayment`/`deletePayment` exports in `app/actions/payments.ts` wrapping `lib/services/payments.ts` (validate with `PaymentPatchSchema`, bust `"payments"`)
- [x] 1.3 Build client Work Orders page: `app/(shell)/work-orders/{page.tsx,loading.tsx,queries.ts,_components/*}` — `queries.ts` reads maintenance items (cached) under the owner ctx; page is `dynamic` for request-time overdue. Jobber status tiles + Linear grouped list per design D4 (built to the existing shell design system)
- [x] 1.4 Build client Compliance page: `app/(shell)/compliance/{page.tsx,loading.tsx,queries.ts,_components/*}` — rollup of certifications+inspections+safety-risks with expiry/overdue derivations. Vanta progress ring + monitoring cards over a register table per design D4
- [x] 1.5 Add "Work Orders" and "Compliance" entries to the client sidebar (`components/layout/Sidebar.tsx` nav list) with icons
- [x] 1.6 Wire create/edit on both pages to the entity actions (maintenance-items; safety-risks) under the owner ctx; reflect changes via transition + revalidate. Compliance certs/inspections deep-link to the property Safety tab (design Q3)
- [x] 1.7 `tsc` + `eslint` clean; live QA both pages as an owner (create/edit/resolve each entity, overdue labels correct) — 10/10 QA steps PASS, no console errors, overdue labels gated to active rows only

## 2. Phase 2 — One audited path for Compliance + Work Orders entities

- [x] 2.1 Extend `_change-request-dispatcher.ts` `REGISTRY` with `certification`, `inspection`, `safety-risk`, `maintenance-item` (each `{createSchema, updateSchema, create, update, delete}` from existing `New*`/`Patch*` schemas + service fns)
- [~] 2.2 Add the same four to the action-layer `ENTITY_SCHEMAS` map in `change-requests.actions.ts` (DONE — schemas + `ENTITY_CACHE_TAGS`) and the `ProposeChangePanel` entity coverage (forms + selectors) — PANEL FORMS PENDING (needs `ClientPreviewShell` to load certs/inspections/risks/maintenance + 4 new form components)
- [x] 2.3 Re-home `app/(pro)/pro/work-orders.actions.ts` (`createWorkOrder`/`updateWorkOrder`) — Option A (hybrid): owning org resolved server-side via `_lib/on-behalf.ts`; own-portfolio/draft → direct write, accepted client → `proposeChangeAction`. No component changes (server-side resolution).
- [x] 2.4 Re-home `app/(pro)/pro/compliance.actions.ts` (`resolveSafetyRisk`) onto the audited path via `resolveOnBehalfForRow(safetyRisks, …)`
- [x] 2.5 Re-home `app/(pro)/pro/rent.actions.ts` (`markRentPaid`/`logRentPayment`/`renewLease`) onto the audited path (reads under the resolved org ctx; writes via `proposeChangeAction`)
- [x] 2.6 Add preview mirror sections `app/(pro)/pro/clients/[clientId]/as-client/{compliance,work-orders}/page.tsx` mounting the shell page components under `viewerCtx` with `readOnly`
- [x] 2.7 "Compliance" + "Work Orders" appear in the preview Sidebar rail — satisfied for free by the Phase 1 shared `sidebarNavItems` edit (preview routes them via `previewBasePath`)
- [x] 2.8 Authz test (`tests/authz/parity-registry.test.ts`): full-grant manager applies a maintenance-item + safety-risk create/update through the ledger (approved row + entity written); viewer-grant rejected before write; delete leaves a tombstone. 6/6 pass; full authz suite 53/53 green.
- [x] 2.9 `tsc` (0 errors) + `eslint` clean. Live QA (demo, direct-write path): `resolveSafetyRisk` persisted to the correct row/org — re-home verified. QA surfaced a stale-cache bug (direct path committed + `revalidatePro()` but never busted the Upstash cached-read tag); FIXED by adding `bustCache(<tag>)` to all six direct-write branches (safety-risks/payments×2/leases/maintenance-items×2), matching the audited path's `ENTITY_CACHE_TAGS` behavior. Audited path proven by the authz suite (53/53).

## 3. Phase 3 — Extend the audited path to the remaining entities

- [ ] 3.1 Confirm org-scoping of `professional` (per-client vs manager-shared directory) before registering it (design open question)
- [ ] 3.2 Add remaining `REGISTRY` entries: `co-owner`, `ownership-record`, `ownership-document`, `property-valuation`, `estate-assignment`, `successor`, `emergency-contact`, `document`, `folder`, (+ `professional` if per-client)
- [ ] 3.3 Extend `change-requests.actions.ts` `ENTITY_SCHEMAS` + `ProposeChangePanel` coverage for the Phase-3 entities that need preview forms
- [ ] 3.4 Verify side-effecting deletes (document, folder → S3 objects) free their objects through the audited path, same as the direct path
- [ ] 3.5 Registry-coverage test: every registered entity round-trips create/update/delete through `applyChangeRequest` with a full-grant ctx
- [ ] 3.6 `tsc` + `eslint` clean; `graphify update .`; full authz suite green
