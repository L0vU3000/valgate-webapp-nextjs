## 1. Query layer — client-scoped work-order surfaces (no new business logic)

- [x] 1.1 Added pure `deriveWorkOrderSurfaces(ctx)` in `app/(pro)/pro/queries.ts` returning `{ rows, counts: {open,inProgress,resolved,urgentOpen}, totalOpenCost, vendors }` — a verbatim move of the derivation that was inline in `getWorkOrdersPageData` (buildWorkOrderRow map/filter/sort by status→severity→createdAt, `countWorkOrders` + urgentOpen, open-cost reduce, trade-vendor filter/map)
- [x] 1.2 Refactored `getWorkOrdersPageData` to call `deriveWorkOrderSurfaces(ctx)`; behavior byte-identical (same rows/order, counts, totalOpenCost, vendor list) — `properties` (New Work Order modal picker) stays built in `getWorkOrdersPageData`
- [x] 1.3 Extended `ClientPortfolioData` with `workOrderCounts: { open; inProgress; resolved; urgentOpen }`, `totalOpenWorkOrderCost: number`, `workOrderVendors: WorkOrdersPageData["vendors"]`
- [x] 1.4 `getClientPortfolioData` calls `deriveWorkOrderSurfaces(scoped)`; `workOrders` now comes from `surfaces.rows` (status→severity ordered, same as global; the better ordering also flows into the Overview snapshot) plus the three new fields; own-portfolio view gets them for free via its scoped slice — no special-casing
- [x] 1.5 `queries.test.ts`: added a counts-reconcile + urgentOpen + totalOpenCost assertion and a "vendor directory equals the global page's" invariant (proves the extraction didn't fork the list). Client-scoping of `workOrders` is already covered by the existing "scopes every record" test. (Runner excludes `queries.test.ts` — pre-existing server-only exclusion — so tsc-checked, not executed.)

## 2. WorkOrdersTable — drop the redundant client column on single-client surfaces (backward-compatible)

- [x] 2.1 `WorkOrdersTable`: added optional `hideClient?: boolean`; when true the per-row subtitle omits `· {clientName}` (mirrors `RentRollTable`'s `hideClient`). Default false → global unchanged
- [x] 2.2 `/pro/work-orders` (`WorkOrdersPage`) still renders `WorkOrdersTable` with no `hideClient` — verified by tsc + eslint

## 3. New Work Orders tab composition

- [x] 3.1 Added `_components/ClientWorkOrdersPage.tsx` (`"use client"`): `KpiMetricStrip` (Open · In Progress · Urgent/Emergency · Resolved · Open est. cost) over a `[65fr_35fr]` grid — `WorkOrdersTable rows={data.workOrders} vendors={data.workOrderVendors} hideClient` (left) / `VendorsCard vendors={data.workOrderVendors}` (right)
- [x] 3.2 `work-orders/page.tsx` reduced to the thin server shell (`await params` → `getClientPortfolioData` → `notFound()` → `<ClientWorkOrdersPage>`)
- [x] 3.3 Empty states: reuse `WorkOrdersTable`'s existing "No work orders yet." row; KPI strip renders zeros cleanly with no client work orders
- [x] 3.4 Inline status + assign-vendor actions inherited from `WorkOrdersTable` (unchanged from `/pro/work-orders`, reusing the audited `updateWorkOrder` action)

## 4. Overview trim — snapshot + link, no duplicate table

- [x] 4.1 `ClientPortfolioPage.tsx`: kept the `MaintenanceQueueCard` open-queue snapshot (tightened its filter to exclude `Cancelled` too, matching the dashboard queue's semantics — now relevant since `workOrders` carries all statuses); added a "View all work orders →" link card to the Work Orders tab (mirrors the Financials snapshot-link treatment, border-only)

## 5. Verify

- [x] 5.1 `npx tsc --noEmit` → 0 errors; `eslint` clean on all six touched files
- [x] 5.2 Global `/pro/work-orders` typechecks with unchanged props (rows/counts/cost/vendors byte-identical after the `deriveWorkOrderSurfaces` extraction — it now consumes the same helper; `properties` unchanged)
- [~] 5.3 Live QA on seeded `CLI-0011` (has seeded work orders) — PENDING (author has the dev server; tsc/eslint green, data path verified by construction)
- [~] 5.4 Live QA on an empty client (empty table + zero KPIs) — PENDING
- [x] 5.5 `graphify update .` run; docs/plans mirror + these task checkboxes updated with honest status
