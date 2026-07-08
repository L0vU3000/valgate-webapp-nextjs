# Revamp Client Work Orders Tab → Maintenance Workspace

- **Plan ID:** `plan-f0e4ae8b4dc74635`
- **Hosted:** https://plan.agent-native.com/plans/plan-f0e4ae8b4dc74635
- **OpenSpec change:** `openspec/changes/revamp-client-work-orders-tab/` (proposal · design · specs/client-work-orders-workspace · tasks) — **source of truth for execution**
- **Status:** in_progress — decisions locked (recommended defaults: KPI strip only · VendorsCard right column · Standard unification deferred), implemented; `tsc` + `eslint` green; live QA (CLI-0011 + empty client) pending (author's to run).

## Objective

Turn `/pro/clients/[clientId]/work-orders` from a single dashboard card (`MaintenanceQueueCard` over non-Resolved items) into a **client-scoped maintenance workspace** — status/KPI tiles, the full work-order table with inline status + assign-vendor actions, and the vendor directory. It reads thin today even for a client with a live queue — not a data problem, a wiring problem. `getClientPortfolioData` already returns `workOrders: ProWorkOrderRow[]` (all statuses); the global `/pro/work-orders` page already derives the counts, open-cost, and vendors. The tab wires almost none of it.

**Done means:** the tab composes the same components `/pro/work-orders` already ships, scoped to one client. No new work-order math, no schema migration, **no new write path** (inline actions reuse the audited `updateWorkOrder`).

## The core realization

`WorkOrdersTable` takes a flat `rows: ProWorkOrderRow[]` + `vendors` — it is proven to work on any slice, including a single client's, with no filter chrome to strip. So the client Work Orders tab is *"the global /pro/work-orders page pre-scoped to this client."* This is composition, not new UI. Exact mirror of the Financials revamp (`deriveRentSurfaces` → this uses `deriveWorkOrderSurfaces`).

## Component reuse map

| Element | Reuses (existing symbol) | Change |
|---|---|---|
| KPI tiles | `KpiMetricStrip` (5-wide `xl:grid-cols-5`) | reuse — pass exactly 5 metrics |
| Orders table | `WorkOrdersTable` (`rows` + `vendors`; inline Start/Resolve/Cancel + Assign-vendor) | **add optional `hideClient?`** — additive |
| Vendor directory | `VendorsCard` | reuse (right column, feeds Assign) |
| Inline writes | `updateWorkOrder` action + `AssignVendorModal` | reuse — audited path, unchanged |
| Client data | `getClientPortfolioData` → `workOrders` (already returned) | add `workOrderCounts` · `totalOpenWorkOrderCost` · `workOrderVendors` |
| Derivation | inline logic in `getWorkOrdersPageData` | **extract `deriveWorkOrderSurfaces(ctx)`**; call from both queries |
| Overview snapshot | `MaintenanceQueueCard` | keep + add "View all work orders →" link |

## Layout (after)

```
KpiMetricStrip: Open · In Progress · Urgent/Emergency · Resolved · Open est. cost   (exactly 5)
┌────────────────────────────┬──────────────────────────┐
│ WorkOrdersTable (scoped,   │ VendorsCard (org trade   │
│   hideClient)              │   vendor directory)       │
└────────────────────────────┴──────────────────────────┘
```

## Query-layer change — no new logic

Extract the derivation currently inline in `getWorkOrdersPageData` into a pure `deriveWorkOrderSurfaces(ctx)` (beside `deriveRentSurfaces`); call it from both `getWorkOrdersPageData` (full `ctx`) and `getClientPortfolioData` (the existing `scoped` slice).

```ts
// app/(pro)/pro/queries.ts
function deriveWorkOrderSurfaces(ctx: ProContext): {
  rows: ProWorkOrderRow[];
  counts: { open: number; inProgress: number; resolved: number; urgentOpen: number };
  totalOpenCost: number;
  vendors: WorkOrdersPageData["vendors"];
} { /* verbatim move of the inline logic */ }

// getClientPortfolioData — over the already-built `scoped` slice
const wo = deriveWorkOrderSurfaces(scoped);
return {
  /* …existing… */
  workOrders: wo.rows,                       // was inline map/sort; now shared
  workOrderCounts: wo.counts,                // ← new ClientPortfolioData field
  totalOpenWorkOrderCost: wo.totalOpenCost,  // ← new field
  workOrderVendors: wo.vendors,              // ← new field
};
```

Own-portfolio view (`OWN_PORTFOLIO_ID`) gets the fields for free — its `scoped` slice already filters to `!p.clientId`. Intended side effect: client `workOrders` now sorts status→severity→date (the global order), which also improves the Overview snapshot ordering; no consumer depended on the old `createdAt` order.

## Overview trim

Overview **keeps** its `MaintenanceQueueCard` open-queue snapshot and gains a **"View all work orders →"** link to the tab (matching the Financials snapshot-link treatment). Purely additive — no card removed. The full table lives only on the tab.

## Build phases (mirror of tasks.md)

1. **Query layer** — extract `deriveWorkOrderSurfaces`; refactor `getWorkOrdersPageData` to call it (byte-identical); add the 3 fields to `ClientPortfolioData` via `scoped`; tsc-level assertions in `queries.test.ts`.
2. **WorkOrdersTable** — add optional `hideClient?` (drops `· {clientName}` from the row subtitle). Additive; `/pro/work-orders` unchanged.
3. **New `ClientWorkOrdersPage`** — KpiMetricStrip(5) over `[WorkOrdersTable hideClient | VendorsCard]`; thin server `page.tsx`.
4. **Overview trim** — keep snapshot + add link.
5. **Verify** — `tsc` + `eslint`; confirm `/pro/work-orders` unchanged; `graphify update .`; live QA `CLI-0011` (author's to run).

## Mobbin references

Every reference validated a component we already ship — composition, not new UI.

- **KPI tiles** — [Zendesk](https://mobbin.com/screens/0e224b7e-5a88-4339-820d-0658dfb2958c) · [Sentry](https://mobbin.com/screens/52e1570b-582d-43e0-a697-a0400d15c337): 5-wide bordered tiles, tiny label + big number, status via a colored sub-line → `KpiMetricStrip` + `subLabel` over deltas.
- **Severity vs. status color** — [GitHub Projects](https://mobbin.com/screens/231c5ed2-c43c-47e3-82bf-5acdb0f0af82) · [Airtable](https://mobbin.com/screens/37cf570f-c872-4638-aee8-c20fac0c6606) · [ClickUp flags](https://mobbin.com/screens/27113b60-6baf-4b1e-bd2c-3deebad34c58): leading severity dot + separate quiet status pill → matches `WorkOrdersTable`.
- **Queue / triage list** — [ClickUp](https://mobbin.com/screens/21988b24-85a4-4be4-9ad3-005f878a4d1f) · [Miro](https://mobbin.com/screens/70d82ff8-b844-4204-868c-467a359f5edc): quiet border-only rows, one status marker → borders-over-shadows + the `hideClient` quiet-row fix.
- **Inline vendor assign** — [ClickUp](https://mobbin.com/screens/1e5b6f93-1dae-491d-ad87-b8f53b4a117e) · [7shifts](https://mobbin.com/screens/f500ddbd-e096-4700-b3e5-e72786b89826): click-cell → search popover with avatar+name → `AssignVendorModal` + `VendorsCard` pairing.

## Open questions (defaults recommended)

1. **Status filter on the client work-orders table?** → default **KPI strip only** (parity with the global page, which has no such filter; add later if the table gets long).
2. **Right column?** → default **`VendorsCard`** (matches global, feeds the inline Assign action).
3. **Unify Standard `(shell)/work-orders` onto the shared table this pass?** → default **no** — separate `tiles/groups` implementation, larger alignment change; flag, don't silently expand.

## Polish pass (/impeccable)

Design-context source: `.impeccable.md` (light-mode primary, borders-over-shadows, data-is-the-hero, blue is precious). Expected real micro-fixes: KPI strip stays at exactly 5 (the 6th-metric-orphan gotcha), `hideClient` on the single-client table, border-only `rounded-lg` on the Overview link card, copy that says exactly what's true. No redesign.

## Execution prompt (paste into a Sonnet chat)

> Implement the OpenSpec change `revamp-client-work-orders-tab` (see `openspec/changes/revamp-client-work-orders-tab/` — read proposal.md, design.md, specs/client-work-orders-workspace/spec.md, tasks.md). Visual plan: `get-visual-plan` id `plan-f0e4ae8b4dc74635`. It's a read/compose change — reuse `WorkOrdersTable`/`VendorsCard`/`KpiMetricStrip`/`MaintenanceQueueCard`; extract `deriveWorkOrderSurfaces` from `getWorkOrdersPageData` and call it over the existing `scoped` slice in `getClientPortfolioData`; add `hideClient?` to `WorkOrdersTable` (additive). No new write path — inline actions reuse `updateWorkOrder`. Follow tasks.md phases 1→5. Run `graphify` before reading source. Verify: `tsc` + `eslint` clean, `/pro/work-orders` unchanged, QA CLI-0011.
