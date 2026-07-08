# Revamp Client Financials Tab → Rent & Collections Workspace

- **Plan ID:** `plan-95de3067059e4a7b`
- **Hosted:** https://plan.agent-native.com/plans/plan-95de3067059e4a7b
- **OpenSpec change:** `openspec/changes/revamp-client-financials-tab/` (proposal · design · specs/client-financials-workspace · tasks) — **source of truth for execution**
- **Status:** in_progress — decisions locked (defaults), implemented; tsc + eslint green; live QA (CLI-0011 / CLI-0006) pending

## Objective

Turn `/pro/clients/[clientId]/financials` from two dashboard cards (FinancialsCard + OccupancyCard) into a **client-scoped rent-and-collections + owner-statement workspace**. It reads as empty today even for a client with a live lease and six months of collected rent — not a data problem, a wiring problem. `getClientPortfolioData` already derives a full Owner Statement and a client-scoped payments/leases slice; the tab wires none of it.

**Done means:** the tab composes the same components `/pro/rent` and the client Overview already ship, scoped to one client. No new financial math, no schema migration, no new write path.

## The core realization

`RentCollectionsPage` (the global `/pro/rent`) is already client-filterable (`row.clientId === clientFilter`). So the client Financials tab is *"the Rent & Collections page pre-scoped to this client, plus that client's Owner Statement."* This is composition, not new UI.

## Component reuse map (all already `"use client"`)

| Component | Source | Role | Change |
|---|---|---|---|
| `KpiMetricStrip` | `pro/_components` | 6-metric header (value · expected · collected% · outstanding · occupancy · NOI) | reuse |
| `RentRollTable` | `pro/rent/_components` | per-lease rows: tenant · rent · Paid/Overdue/Pending · last paid · lease end | **filter props optional** |
| `OwnerStatementCard` + `OwnerReportModal` | `clients/[clientId]/_components` | income/expense ledger, NOI, "Open report" PDF | reuse |
| `FinancialsCard` | `dashboard/_components` | collected-vs-expected + 6-mo trend | reuse |
| `OverdueList` | `pro/rent/_components` | outstanding/unpaid this month | reuse |
| `ExpiringLeasesCard` | `pro/rent/_components` | leases ending ≤90d + projected renewal | reuse |

## Layout (after)

```
KpiMetricStrip: Value · Expected · Collected% · Outstanding · Occupancy · NOI
┌────────────────────────────┬──────────────────────────┐
│ RentRollTable (scoped)     │ FinancialsCard (trend)   │
│ OwnerStatementCard         │ OverdueList              │
│                            │ ExpiringLeasesCard       │
└────────────────────────────┴──────────────────────────┘
```

## Query-layer change — no new logic

Extract the rent-roll/overdue/expiring derivation currently inline in `getRentPageData` into a shared `deriveRentSurfaces(ctx, monthStart)`; call it from both `getRentPageData` (over `ctx`) and `getClientPortfolioData` (over the existing `scoped` slice).

```ts
// app/(pro)/pro/queries.ts — getClientPortfolioData
const { rentRoll, overdue, expiring, collectionRate } =
  deriveRentSurfaces(scoped, monthStart);       // scoped is already built today

return {
  rollup, ownerStatement, financialSeries,
  rentRoll, overdue, expiring, collectionRate,   // ← 4 new ClientPortfolioData fields
  /* …existing */
};
```

Own-portfolio view (`OWN_PORTFOLIO_ID`) gets the fields for free — its scoped slice already filters to `!p.clientId`.

## Overview trim

Overview drops the full `OwnerStatementCard`; keeps FinancialsCard + OccupancyCard + a **"View full financials & owner statement →"** link to the tab. Each surface gets one job; no duplicate ledger.

## Build phases (mirror of tasks.md)

1. **Query layer** — extract `deriveRentSurfaces`; refactor `getRentPageData` to call it (confirm `/pro/rent` byte-identical); add the 4 fields to `ClientPortfolioData` via `scoped`.
2. **RentRollTable** — make `clients` / `clientFilter` / `onClientFilterChange` optional (hide the filter dropdown when omitted). Additive; `/pro/rent` unchanged.
3. **New `ClientFinancialsPage`** — KPI strip + RentRollTable + OwnerStatementCard (left) / FinancialsCard + OverdueList + ExpiringLeasesCard (right); thin server page renders it. Empty states via shared `EmptyState` (positive "all collected" for OverdueList).
4. **Overview trim** — snapshot + link.
5. **Verify** — `tsc` + `eslint`; QA `CLI-0011` (populated) and `CLI-0006` (empty states); `/pro/rent` regression; `graphify update .`.

## Mobbin references

Layout grammar:
- [HoneyBook — Bookkeeping](https://mobbin.com/screens/2f78a2c5-0c66-4103-a9b1-2a2b7d5c0358) — Outstanding-vs-Paid split + filter chips → rent-roll status segmentation
- [Deel — Payments](https://mobbin.com/screens/404f9ad2-1d70-4906-b224-50ceb2f06695) — status-pill rows + "View as report" → Owner Statement "Open report"
- [Airbnb — Earnings](https://mobbin.com/screens/8e13b740-99c7-4031-9369-19fafc230d1e) — "$X this month" hero + month trend
- [Zillow — Rental Manager](https://mobbin.com/screens/cdf50e55-6226-4cf9-a7b5-e2c727308707) — stacked labelled cards with "Details" links

Deeper grounding (owner statement / KPI / trend):
- [Posh — P&L](https://mobbin.com/screens/9d74ad25-145a-4a1a-b5bd-6407aaf77ddb) & [HoneyBook — P&L](https://mobbin.com/screens/f74a55af-608b-4752-868d-39007a6d5465) — grouped shaded section rows + distinct **Net** total footer (OwnerStatementCard already matches: emphasis totals + colored NOI footer)
- [QuickBooks — Business at a glance](https://mobbin.com/screens/a1576a19-53f6-498d-80a7-02ece64072d8) & [Revolut Business — Analytics](https://mobbin.com/screens/642f8ac1-17b9-4735-a453-4efa31969116) — KPI card = big value + label + delta/sublabel (our KpiMetricStrip grammar)
- [Quicken — Net Income](https://mobbin.com/screens/c628c6fd-308e-459f-b5e4-416a922b05dd) & [Quicken — Rent category](https://mobbin.com/screens/42770c0d-8fe0-4ca8-baa5-63c9c5ba3851) — trend with average/target line + "$X of $Y" framing (candidate future enhancement for FinancialsCard; not in this pass)

## Polish pass (/impeccable)

Design-context source: `.impeccable.md` (light-mode primary, borders-over-shadows, data-is-the-hero, blue is precious). Real micro-fixes applied — not a redesign:
- **KPI strip 6 → 5 metrics** — 6 metrics orphaned into `KpiMetricStrip`'s `xl:grid-cols-5` (5+1 row at 1496px). Dropped Portfolio value (already on the Overview banner + header); the money-flow figures lead.
- **Overview link card** — `shadow-sm`/`rounded-xl` → border-only `rounded-lg` (borders-over-shadows) to read as one surface with its AssetsTable neighbor; added a purposeful arrow-nudge on hover.
- **RentRollTable `hideClient`** — drops the Client column on the single-client tab (it repeated one name down every row); the global `/pro/rent` keeps it. Kept `NOI` sublabel static ("after fees & maintenance") rather than inventing a delta (KpiMetricStrip's own rule).

## Open questions (defaults recommended)

1. **Status filter on the client rent roll?** → default **keep** Paid/Overdue/Pending.
2. **Overview snapshot fidelity?** → default **KPI cards + link only** (no new sparkline).
3. **Scope this pass?** → default **read/compose only** (writes stay on the `align-client-manager-parity` audited path).

## Execution prompt (paste into a Sonnet chat)

> Implement the OpenSpec change `revamp-client-financials-tab` (see `openspec/changes/revamp-client-financials-tab/` — read proposal.md, design.md, specs/client-financials-workspace/spec.md, tasks.md). Visual plan: `get-visual-plan` id `plan-95de3067059e4a7b`. It's a read/compose change — reuse `RentRollTable`/`OverdueList`/`ExpiringLeasesCard`/`OwnerStatementCard`/`KpiMetricStrip`/`FinancialsCard`; extract `deriveRentSurfaces` from `getRentPageData` and call it over the existing `scoped` slice in `getClientPortfolioData`. Follow tasks.md phases 1→5. Run `graphify` before reading source. Verify: `tsc` + `eslint` clean, QA CLI-0011 (populated) and CLI-0006 (empty states), `/pro/rent` unchanged.
