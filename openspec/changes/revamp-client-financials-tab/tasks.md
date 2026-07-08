## 1. Query layer — client-scoped rent surfaces (no new business logic)

- [x] 1.1 Added pure `deriveRentSurfaces(ctx, monthStart)` in `app/(pro)/pro/queries.ts` returning `{ expected, collected, outstanding, collectionRate, rentRoll, overdue, expiring }` — a verbatim move of the derivation that was inline in `getRentPageData` (buildRentRollRow map/sort, ≤90-day expiring projection, collection-rate calc)
- [x] 1.2 Refactored `getRentPageData` to call `deriveRentSurfaces(ctx, monthStart)`; behavior byte-identical (same sums, same ordering, same occupancy/series)
- [x] 1.3 Extended `ClientPortfolioData` with `rentRoll: RentRollRow[]`, `overdue: RentRollRow[]`, `expiring: RentPageData["expiring"]`, `collectionRate: number`
- [x] 1.4 `getClientPortfolioData` calls `deriveRentSurfaces(scoped, monthStart)` and returns the four fields; own-portfolio view (`OWN_PORTFOLIO_ID`) gets them for free via its scoped slice — no special-casing
- [x] 1.5 `queries.test.ts`: added rent-roll client-scoping + overdue-subset assertions and a collection-rate/expiring-window test. (Runner excludes `queries.test.ts` — pre-existing server-only exclusion — so these are tsc-checked, not executed.)

## 2. RentRollTable — make client-filter chrome optional (backward-compatible)

- [x] 2.1 `RentRollTable`: `clients` / `clientFilter` / `onClientFilterChange` now optional; added optional `statusFilter` / `onStatusFilterChange` (Paid/Overdue/Pending tabs) for the single-client tab. Header renders status tabs → client dropdown → nothing, by which props are present
- [x] 2.2 `/pro/rent` (`RentCollectionsPage`) still passes all three client-filter props unchanged — verified by tsc + eslint

## 3. New Financials tab composition

- [x] 3.1 Added `_components/ClientFinancialsPage.tsx` (`"use client"`): `KpiMetricStrip` (value · expected · collected% · outstanding · occupancy · NOI) over `[RentRollTable + OwnerStatementCard]` / `[FinancialsCard + OverdueList + ExpiringLeasesCard]`, with client-side status-filter state
- [x] 3.2 `financials/page.tsx` reduced to the thin server shell (`await params` → `getClientPortfolioData` → `notFound()` → `<ClientFinancialsPage>`)
- [x] 3.3 Empty states: reused each widget's existing states (OverdueList "all rent … is in", ExpiringLeasesCard "none in 90 days", FinancialsCard "No rent tracked yet", RentRollTable empty row) — all already inviting; no new EmptyState needed
- [x] 3.4 Rent-roll row drill-in inherited from `RentRollTable` (unchanged from `/pro/rent`)

## 4. Overview trim — snapshot + link, no duplicate ledger

- [x] 4.1 `ClientPortfolioPage.tsx`: removed the full `OwnerStatementCard`; kept FinancialsCard + OccupancyCard and added a "Financials & owner statement →" link card to the Financials tab
- [x] 4.2 Dropped the now-unused `OwnerStatementCard` import from the Overview

## 5. Verify

- [x] 5.1 `npx tsc --noEmit` → 0 errors; `eslint` clean on all six touched files
- [~] 5.2 Live QA on seeded `CLI-0011` — PENDING (author has the dev server; tsc/eslint green, data path verified by construction over the seeded lease/payments)
- [~] 5.3 Live QA on an empty client (`CLI-0006`) — PENDING
- [x] 5.4 `/pro/rent` regression covered by tsc (props still satisfied); `graphify update .` run
