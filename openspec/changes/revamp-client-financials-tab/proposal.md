## Why

The manager's client Financials tab (`/pro/clients/[clientId]/financials`) renders only two dashboard cards (FinancialsCard + OccupancyCard) — it reads as "empty" even for a client with a live lease and six months of collected rent. This is not a data problem: the query layer already derives a full Owner Statement (income/expense ledger + NOI), a client-scoped payments/leases slice, and everything the global `/pro/rent` page uses — but the tab wires none of it. The richest financial pieces (rent roll, overdue list, owner statement) already exist and are already client-filterable; they are simply not composed onto this tab.

## What Changes

- **Financials tab becomes a client-scoped Rent & Collections + Owner Statement workspace.** Replace the 2-card layout with: a KPI metric strip (Portfolio value · Expected · Collected % · Outstanding · NOI), a client-scoped **rent roll** table (per lease: property · tenant · rent · Paid/Overdue/Pending status · last paid · lease end · renewal), a collected-vs-expected trend, an overdue/unpaid list, an expiring-leases card, and the existing **Owner Statement** (ledger, NOI, "Open report" PDF).
- **Compose existing, tested components** — `KpiMetricStrip`, `RentRollTable`, `OverdueList`, `ExpiringLeasesCard`, `FinancialsCard`, `OccupancyCard`, `OwnerStatementCard` — rather than build new widgets. Reusing the same rent-roll + statement components the client (Standard) side uses is what keeps Standard and Pro aligned by construction.
- **Add a client-scoped `rentRoll` (+ overdue/expiring) to `getClientPortfolioData`** by running the existing `buildRentRoll` derivation over the already-computed `scoped` payments/leases slice. No new business logic, no schema change.
- **Overview tab keeps a compact financials snapshot** (FinancialsCard + Occupancy) that links into the Financials tab; the full ledger + rent roll live only on the tab, so each surface has one job and the two stop duplicating the whole Owner Statement.

## Capabilities

### New Capabilities
- `client-financials-workspace`: The manager's per-client Financials tab presents a complete, client-scoped rent-and-collections workspace — KPI header, rent roll with per-lease payment status, collections trend, overdue and expiring-lease surfacing, and the monthly Owner Statement with exportable report — all derived from real records for that one client.

### Modified Capabilities
<!-- No archived specs in openspec/specs/ to modify. This tab composes surfaces defined by the still-active `align-client-manager-parity` change; the alignment principle (shared rent-roll/statement components across Standard and Pro) is captured in prose above and in design.md, to be reconciled as a delta once that change is archived. -->

## Impact

- **Query layer:** `app/(pro)/pro/queries.ts` — `ClientPortfolioData` gains `rentRoll`, `overdue`, `expiring`, `collectionRate`; `getClientPortfolioData` calls the existing `buildRentRoll`/overdue/expiring derivations over the `scoped` slice it already builds. No new derivation logic in `lib/services/pro-derive.ts`.
- **New tab composition:** `app/(pro)/pro/clients/[clientId]/financials/page.tsx` replaced with a `ClientFinancialsPage` client component (new `_components/ClientFinancialsPage.tsx`) that composes the reused cards.
- **Reuse (no changes):** `RentRollTable`, `OverdueList`, `ExpiringLeasesCard` (from `app/(pro)/pro/rent/_components/`), `OwnerStatementCard`/`OwnerReportModal`, `KpiMetricStrip`, `FinancialsCard`, `OccupancyCard`.
- **Overview trim:** `app/(pro)/pro/clients/[clientId]/_components/ClientPortfolioPage.tsx` drops the full `OwnerStatementCard` in favor of a compact snapshot + link to the Financials tab.
- **No schema migration.** Every field comes from existing tables (leases, payments, certifications, maintenance_items) already loaded by `loadProContext`.
