## ADDED Requirements

### Requirement: Client-scoped financials KPI header

The Financials tab SHALL open with a KPI metric strip summarizing the selected client's money position for the current month, every figure derived from that client's real records.

#### Scenario: Manager sees the client's financial headline
- **WHEN** a manager opens `/pro/clients/[clientId]/financials`
- **THEN** a metric strip shows Portfolio value, Expected rent (with active-lease count), Collected (with collection-rate %), Outstanding (with overdue/unpaid count), Occupancy (rented · vacant), and Net Operating Income
- **AND** every value is computed over only the properties whose `clientId` matches this client (or the manager's own unassigned portfolio for the own-portfolio view)

#### Scenario: Figures are request-time
- **WHEN** the strip renders "this month" and overdue counts
- **THEN** they are computed relative to request time (the route is dynamic), not build time

### Requirement: Client-scoped rent roll

The Financials tab SHALL present a rent roll listing every active (Signed, not-yet-ended) lease for the client, with per-lease payment status for the current month.

#### Scenario: Manager reviews who has paid
- **WHEN** the rent roll renders
- **THEN** each row shows property, tenant, unit, monthly rent, a Paid/Pending/Overdue/Unpaid status badge, last-paid date, lease-end date, and renewal status
- **AND** rows are ordered so items needing attention (Overdue, Unpaid) surface first

#### Scenario: Rows reuse the shared rent-roll component
- **WHEN** the rent roll is built
- **THEN** it is derived by the same `buildRentRollRow` logic and rendered by the same `RentRollTable` component the global `/pro/rent` page uses, over this client's scoped lease/payment slice — so the Standard and Pro rent presentations cannot drift

#### Scenario: Row drills into the property
- **WHEN** the manager clicks a rent-roll row
- **THEN** it navigates to that property's detail view

### Requirement: Collections trend, overdue, and expiring surfaces

The Financials tab SHALL surface the client's collections trend, outstanding balances, and near-term lease expirations alongside the rent roll.

#### Scenario: Manager sees the collections trend
- **WHEN** the tab renders
- **THEN** a collected-vs-expected view with a 6-month collected-rent trend chart is shown for this client (reusing `FinancialsCard`)

#### Scenario: Manager sees what is unpaid
- **WHEN** any lease for the client is Overdue or Unpaid this month
- **THEN** those rows appear in an Overdue/Unpaid list; when none exist, an inviting empty state is shown instead

#### Scenario: Manager sees renewal decisions coming due
- **WHEN** a client lease ends within 90 days
- **THEN** it appears in an expiring-leases card with days-left and projected renewal end date (reusing `ExpiringLeasesCard`)

### Requirement: Owner Statement on the Financials tab

The client's monthly Owner Statement SHALL live on the Financials tab as the canonical income/expense ledger, and no longer be duplicated in full on the Overview tab.

#### Scenario: Manager opens the ledger and report
- **WHEN** the manager views the Financials tab
- **THEN** the Owner Statement card shows rent collected, other income, management fee, tax/insurance accruals, maintenance, total expenses, Net Operating Income, an operations snapshot, and upcoming lease/cert expirations, with an "Open report" action that opens the exportable owner report
- **AND** the same `OwnerStatementCard`/`OwnerReportModal` components are reused (not reimplemented)

#### Scenario: Overview links instead of duplicating
- **WHEN** the manager is on the client Overview tab
- **THEN** the Overview shows a compact financials snapshot (collections + occupancy) that links to the Financials tab, and does not render the full Owner Statement ledger a second time

### Requirement: Informative empty states

Each financial surface SHALL show an actionable empty state when the client has no data for it, consistent with the dashboard cards.

#### Scenario: Client with no leases or payments
- **WHEN** a client has no signed leases and no payments
- **THEN** the rent roll, collections, and Owner Statement surfaces each show a titled empty state with a short prompt and a relevant call-to-action, rather than a bare "$0 of $0" or an empty table
