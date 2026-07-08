## Context

`getClientPortfolioData(clientId)` (`app/(pro)/pro/queries.ts`) already builds a `scoped: ProContext` whose `leases`, `payments`, `maintenance`, `certifications`, and `properties` are filtered to a single client's properties. It returns `rollup`, `ownerStatement`, `financialSeries`, `compliance`, `workOrders`, and `activity` — but the Financials tab (`financials/page.tsx`) consumes only `rollup` + `financialSeries` (FinancialsCard) and occupancy fields (OccupancyCard).

The global `/pro/rent` page (`getRentPageData` → `RentCollectionsPage`) is the reference "informative financials" surface. It derives a rent roll, overdue list, expiring-leases list, collection rate, and cashflow series from `ctx`, and renders them with `KpiMetricStrip`, `RentRollTable`, `OverdueList`, `ExpiringLeasesCard`, `FinancialsCard`. Crucially `RentCollectionsPage` already supports a per-client filter (`row.clientId === clientFilter`), so these components are proven to work on a single-client slice.

The Owner Statement (`OwnerStatementCard` + `OwnerReportModal`) is derived per-client (`buildOwnerStatement`) and currently rendered on the Overview tab only.

## Goals / Non-Goals

**Goals:**
- Make the Financials tab a complete, client-scoped rent-and-collections + owner-statement workspace.
- Reuse the exact derivations and components the `/pro/rent` and Overview surfaces use — zero new business logic, zero new schema.
- Keep Standard (client shell) and Pro (manager) aligned by sharing the rent-roll and statement components rather than forking presentation.
- Give each tab one job: Overview = snapshot + links; Financials = the deep financial view.

**Non-Goals:**
- No new financial calculations (NOI, accruals, collection rate already exist).
- No new mutations/write paths — this is a read/compose change (writes stay on the `align-client-manager-parity` audited path).
- No changes to the global `/pro/rent` page or its components' props.
- No schema migration.

## Decisions

### Decision 1: Add derived rent fields to `getClientPortfolioData`, reusing existing helpers over the `scoped` slice
Extend `ClientPortfolioData` with `rentRoll: RentRollRow[]`, `overdue: RentRollRow[]`, `expiring: ExpiringLease[]`, and `collectionRate: number`. Compute them exactly as `getRentPageData` does, but pass the already-built `scoped` context instead of `ctx`:
- `rentRoll` = `scoped.leases.filter(Signed & not-ended).map(l => buildRentRollRow(l, scoped, monthStart)).filter(...).sort(rentStatusRank)`
- `overdue` = `rentRoll.filter(Overdue | Unpaid)`
- `expiring` = the same ≤90-day projection block `getRentPageData` uses, over `scoped.leases`
- `collectionRate` = `rollup.monthlyExpected === 0 ? 0 : round(rollup.monthlyCollected / rollup.monthlyExpected * 100)`

**Why:** the derivations are pure functions of a context slice; `scoped` is that slice. **Alternative considered:** call `getRentPageData` and filter client-side — rejected because it re-loads and re-derives the entire manager portfolio just to throw most of it away, and duplicates the month/now anchors.

**Refactor to avoid drift:** extract the rent-roll + expiring derivation from `getRentPageData` into a small shared helper (e.g. `deriveRentSurfaces(ctx, monthStart)` in `pro-derive.ts`) and call it from both `getRentPageData` and `getClientPortfolioData`. This guarantees the two never diverge. If extraction proves noisy, fall back to duplicating the ~20 lines with a comment pointing at the source — but prefer the helper.

### Decision 2: New `ClientFinancialsPage` client component composes reused cards
`financials/page.tsx` (server) stays thin: `await params`, `getClientPortfolioData`, `notFound()` guard, render `<ClientFinancialsPage data={...} />`. The new `_components/ClientFinancialsPage.tsx` mirrors `RentCollectionsPage`'s two-column layout:
```
KpiMetricStrip (value · expected · collected% · outstanding · occupancy · NOI)
┌─────────────────────────────┬───────────────────────────┐
│ RentRollTable (no client    │ FinancialsCard (trend)    │
│   filter — already scoped)  │ OverdueList               │
│ OwnerStatementCard          │ ExpiringLeasesCard        │
└─────────────────────────────┴───────────────────────────┘
```
`RentRollTable` currently takes `clients`, `clientFilter`, `onClientFilterChange`. On a single-client page the filter is meaningless — pass a no-op/hidden filter, OR (preferred) make those three props optional so the table renders without the filter chrome when omitted. This is the only component prop change; it is additive and backward-compatible with `/pro/rent`.

**Why a client component:** `RentRollTable`/`OverdueList`/`FinancialsCard`/`OwnerStatementCard` are already `"use client"`, and the rent-roll filter + statement modal are interactive.

### Decision 3: Overview trims the full Owner Statement to a snapshot + link
In `ClientPortfolioPage.tsx`, replace `<OwnerStatementCard .../>` with a compact snapshot (reuse FinancialsCard + OccupancyCard already present, plus a "View full financials & owner statement →" link to the Financials tab). The full ledger lives only on the Financials tab.

**Why:** removes the duplicate ledger, gives the new tab a clear reason to exist, and shortens the already-long Overview. **Alternative:** leave Overview untouched — rejected as intentional duplication that will drift.

### Decision 4: Empty states reuse the shared `EmptyState`
The rent roll, overdue list, and owner-statement surfaces show titled `EmptyState`s (icon + prompt + CTA) when the client has no leases/payments — consistent with the dashboard-card empty states already shipped. `OverdueList` empty = a positive "all rent collected" state, not a CTA.

## Risks / Trade-offs

- **`RentRollTable` prop change touches a shipped component** → keep the change additive (make filter props optional); `/pro/rent` keeps passing them, so its behavior is unchanged. Verify `/pro/rent` still renders after the prop signature change.
- **Overview trim is a visible behavior change for managers used to the statement there** → mitigated by the explicit "view full financials" link and the statement remaining one click away.
- **Refactor of `getRentPageData`** (extracting `deriveRentSurfaces`) risks regressing the global rent page → guard by keeping the extracted helper a pure move (same inputs/outputs) and confirming `/pro/rent` KPIs/rent roll are unchanged before and after.
- **Own-portfolio view** (`OWN_PORTFOLIO_ID`) must also get the new fields → the `scoped` slice already covers it (`belongsToView = p => !p.clientId`), so the same derivation applies with no special-casing.

## Migration Plan

Pure additive/compose change, no data migration. Rollback = revert the commit; no persisted state changes. Ship behind no flag (read-only UI). Verify on the seeded `CLI-0011` client (has 1 lease, 6 paid months, 3 work orders, 3 certs) and on an empty client (e.g. `CLI-0006`) for the empty states.

## Open Questions

- Should the Financials-tab rent roll keep a status filter (Paid/Overdue/Pending) even though the client filter is dropped? Lean yes if `RentRollTable` already supports it cheaply; otherwise defer.
- Does the compact Overview snapshot need its own tiny sparkline, or is the KPI + link enough? Lean: KPI + link, no new component.
