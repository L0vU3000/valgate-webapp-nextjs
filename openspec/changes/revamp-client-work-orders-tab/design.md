## Context

`getClientPortfolioData(clientId)` (`app/(pro)/pro/queries.ts`) already builds a `scoped: ProContext` whose `maintenance`, `properties`, `leases`, `payments`, and `certifications` are filtered to a single client's properties. It already returns `workOrders: ProWorkOrderRow[]` (all statuses, with severity, property, client, and vendor fields) — but the Work Orders tab (`work-orders/page.tsx`) renders only `MaintenanceQueueCard` over the non-Resolved subset, so it reads as thin.

The global `/pro/work-orders` page (`getWorkOrdersPageData` → `WorkOrdersPage`) is the reference "informative work orders" surface. It derives, inline, the sorted row list, the `{open,inProgress,resolved,urgentOpen}` counts, the open-cost total, and the trade-vendor directory from `ctx`, and renders them with `KpiMetricStrip`, `WorkOrdersTable`, and `VendorsCard`. `WorkOrdersTable` already takes a flat `rows: ProWorkOrderRow[]` + `vendors`, so it is proven to work on any slice — including a single-client one — with no filter chrome to strip.

The Standard client shell (`app/(shell)/work-orders`) is currently a **separate** implementation (`tiles`/`groups` shape, its own `WorkOrdersPage`); it does not yet share the Pro `WorkOrdersTable`. Unifying those two is out of scope here (see Open Questions) — this change aligns the manager's client tab with the manager's own global page, which is the drift that actually matters for this tab.

## Goals / Non-Goals

**Goals:**
- Make the Work Orders tab a complete, client-scoped maintenance workspace (status tiles + full table + vendor directory).
- Reuse the exact derivation and components the global `/pro/work-orders` page uses — zero new business logic, zero new schema, zero new write path.
- Guarantee the global page and the client tab can never drift by deriving both from one `deriveWorkOrderSurfaces(ctx)` helper.
- Give each surface one job: Overview = open-queue snapshot + link; Work Orders tab = the deep maintenance view.

**Non-Goals:**
- No new maintenance calculations (counts, urgent, open-cost already exist).
- No new mutations/write paths — inline actions reuse the audited `updateWorkOrder`.
- No changes to the global `/pro/work-orders` page's output or any shared component's existing props (non-additive).
- No unification of the Standard `(shell)/work-orders` implementation (separate change).
- No schema migration.

## Decisions

### Decision 1: Extract `deriveWorkOrderSurfaces(ctx)` and call it from both queries
Move the derivation currently inline in `getWorkOrdersPageData` into a pure helper alongside `deriveRentSurfaces`:
```ts
type WorkOrderSurfaces = {
  rows: ProWorkOrderRow[];
  counts: { open: number; inProgress: number; resolved: number; urgentOpen: number };
  totalOpenCost: number;
  vendors: WorkOrdersPageData["vendors"];
};
function deriveWorkOrderSurfaces(ctx: ProContext): WorkOrderSurfaces { /* verbatim move */ }
```
- `rows` = `ctx.maintenance.map(buildWorkOrderRow).filter(...).sort(status → severity → createdAt desc)`
- `counts` = `countWorkOrders(ctx.maintenance)` + `urgentOpen` (non-closed Emergency/Urgent)
- `totalOpenCost` = sum of `cost` over non-closed items
- `vendors` = `ctx.professionals` filtered to trade categories, mapped to the vendor shape

`getWorkOrdersPageData` calls it and adds only `properties` on top (the New Work Order modal's property picker — global-page-only, since the client tab does not create orders inline). `getClientPortfolioData` calls `deriveWorkOrderSurfaces(scoped)` and takes `workOrders` from `surfaces.rows`.

**Why:** the derivation is a pure function of a context slice; `scoped` is that slice. **Alternative considered:** call `getWorkOrdersPageData` and filter client-side — rejected because it re-derives the whole manager portfolio to throw most away, and duplicates the sort/urgent/cost logic. Mirrors exactly the `deriveRentSurfaces` refactor the Financials change shipped.

**Side effect (intended):** `getClientPortfolioData().workOrders` currently sorts by `createdAt` desc; after this it sorts status→severity→createdAt (the global order). That ordering also flows into the Overview's `MaintenanceQueueCard` snapshot, where severity-first is an improvement for a queue. No consumer breaks (the card slices the top N regardless of order).

### Decision 2: New `ClientWorkOrdersPage` client component composes reused pieces
`work-orders/page.tsx` (server) stays thin: `await params`, `getClientPortfolioData`, `notFound()` guard, render `<ClientWorkOrdersPage data={...} />`. The new `_components/ClientWorkOrdersPage.tsx` mirrors `WorkOrdersPage`'s layout, minus the global header/New-order button (the client workspace has its own tab chrome):
```
KpiMetricStrip (Open · In Progress · Urgent/Emergency · Resolved · Open est. cost)   ← exactly 5
┌─────────────────────────────┬───────────────────────────┐
│ WorkOrdersTable (scoped,    │ VendorsCard (org trade    │
│   hideClient)               │   vendors)                │
└─────────────────────────────┴───────────────────────────┘
```
Five metrics = one row of `KpiMetricStrip`'s `xl:grid-cols-5` grid (the known 6th-metric-orphan gotcha). Counts use `subLabel`, not invented deltas (the component's own rule).

**Why a client component:** `WorkOrdersTable` (inline status/assign actions) and `VendorsCard` are already `"use client"`.

### Decision 3: `WorkOrdersTable` gains an optional `hideClient`
On a single-client tab the row subtitle `{propertyName} · {clientName} · opened …` repeats one client name down every row. Add optional `hideClient?: boolean` that drops `· {clientName}` (mirrors `RentRollTable`'s `hideClient`). Additive; the global page passes nothing and is unchanged.

**Why:** the single distinct-content fix on this surface (Mobbin's "quiet rows, data-is-hero" — [Miro](https://mobbin.com/screens/70d82ff8-b844-4204-868c-467a359f5edc)). **Alternative:** a full client-name column — rejected as redundant on a single-client surface.

### Decision 4: Right column reuses `VendorsCard`
The global page's right column is `VendorsCard` (org-wide trade directory). It stays useful on the client tab because it is exactly the list the inline "Assign vendor" modal draws from — Mobbin's inline-assign pattern ([ClickUp](https://mobbin.com/screens/1e5b6f93-1dae-491d-ad87-b8f53b4a117e), [7shifts](https://mobbin.com/screens/f500ddbd-e096-4700-b3e5-e72786b89826)) pairs a directory with the assign action. **Alternative considered:** a per-client status-breakdown card — rejected as a duplicate of the KPI strip (which already carries the counts).

### Decision 5: Overview keeps the snapshot, adds a link
`ClientPortfolioPage.tsx` keeps `MaintenanceQueueCard` (open-queue snapshot) and adds a "View all work orders →" link to the tab — matching the snapshot-link treatment the Financials trim introduced. The full table lives only on the tab.

## Risks / Trade-offs

- **`deriveWorkOrderSurfaces` extraction risks regressing the global page** → keep it a pure move (same inputs/outputs); verify `/pro/work-orders` rows/counts/cost/vendors are unchanged before and after (tsc + render check).
- **`WorkOrdersTable` prop change touches a shipped component** → additive only (`hideClient` defaults false); `/pro/work-orders` behavior unchanged.
- **Reordered `getClientPortfolioData().workOrders`** affects the Overview snapshot ordering → intended improvement (severity-first queue); no consumer depends on `createdAt` order.
- **Own-portfolio view** (`OWN_PORTFOLIO_ID`) must also get the new fields → the `scoped` slice already covers it (`belongsToView = p => !p.clientId`), so the same derivation applies with no special-casing.

## Migration Plan

Pure additive/compose change, no data migration. Rollback = revert the commit; no persisted state changes. Ships behind no flag (read-only composition + already-audited inline write). Verify on the seeded `CLI-0011` client (has seeded work orders) and on a client with no maintenance for the empty state.

## Design references (Mobbin)

Every reference validated a component we already ship — this is a composition change, not new UI.

- **Status/KPI tiles** — [Zendesk unsolved-tickets strip](https://mobbin.com/screens/0e224b7e-5a88-4339-820d-0658dfb2958c) & [Sentry errors metric row](https://mobbin.com/screens/52e1570b-582d-43e0-a697-a0400d15c337): 5-wide bordered tiles, tiny gray label + big number, status via a small colored sub-line (not a filled tile) → confirms `KpiMetricStrip` + `subLabel` over deltas.
- **Two-axis severity vs. status color** — [GitHub Projects](https://mobbin.com/screens/231c5ed2-c43c-47e3-82bf-5acdb0f0af82), [Airtable](https://mobbin.com/screens/37cf570f-c872-4638-aee8-c20fac0c6606), [ClickUp priority flags](https://mobbin.com/screens/27113b60-6baf-4b1e-bd2c-3deebad34c58): severity as a leading colored dot, status as a separate quiet pill → confirms `WorkOrdersTable`'s red/amber/blue severity dot + separate status pill.
- **Queue / triage list** — [ClickUp status-grouped list](https://mobbin.com/screens/21988b24-85a4-4be4-9ad3-005f878a4d1f), [Miro grouped table](https://mobbin.com/screens/70d82ff8-b844-4204-868c-467a359f5edc): quiet border-only rows, one leading status marker, loud color reserved → confirms the borders-over-shadows table treatment and the `hideClient` quiet-row fix.
- **Inline vendor assignment** — [ClickUp assignee popover](https://mobbin.com/screens/1e5b6f93-1dae-491d-ad87-b8f53b4a117e), [7shifts trade-scoped assign](https://mobbin.com/screens/f500ddbd-e096-4700-b3e5-e72786b89826): click-cell → search popover with avatar+name rows → confirms `AssignVendorModal` + the `VendorsCard` directory pairing.

## Open Questions

- Should the client Work Orders table carry a status filter (Open/In Progress/Resolved) like a segmented control, or is the KPI strip enough? Lean: **KPI strip only** for v1 (the global page has no such filter either — keep parity; add later if the table gets long).
- Right column: `VendorsCard` (org trade directory, feeds assign) vs. drop it for a full-width table? Lean: **keep `VendorsCard`** (matches global, aids the inline assign action).
- Should this pass also unify the Standard `(shell)/work-orders` onto the shared `WorkOrdersTable`? Lean: **no** — out of scope; that's a larger separate alignment change. Flag it, don't silently expand.
