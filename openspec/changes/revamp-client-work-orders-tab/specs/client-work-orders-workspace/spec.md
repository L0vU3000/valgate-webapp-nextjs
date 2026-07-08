## ADDED Requirements

### Requirement: Client-scoped work-order KPI header

The Work Orders tab SHALL open with a KPI metric strip summarizing the selected client's maintenance position, every figure derived from that client's real records.

#### Scenario: Manager sees the client's work-order headline
- **WHEN** a manager opens `/pro/clients/[clientId]/work-orders`
- **THEN** a metric strip shows Open, In Progress, Urgent/Emergency open, Resolved, and Open estimated cost
- **AND** every value is computed over only the maintenance items whose property belongs to this client (or the manager's own unassigned portfolio for the own-portfolio view)

#### Scenario: Figures are request-time
- **WHEN** the strip renders open counts and open-cost total
- **THEN** they are computed relative to request time (the route is dynamic), not build time

#### Scenario: Strip fits one row at desktop width
- **WHEN** the strip renders on a wide viewport
- **THEN** it shows exactly five metrics so they occupy one row of the `KpiMetricStrip` 5-wide grid without a sixth metric orphaning to a second row

### Requirement: Client-scoped work-order table

The Work Orders tab SHALL present the full list of the client's work orders (every status), with severity, location, vendor assignment, and status.

#### Scenario: Manager reviews the client's work orders
- **WHEN** the table renders
- **THEN** each row shows a severity dot (Emergency/Urgent/Standard), the work-order title, the property it belongs to, when it was opened, the estimated cost when present, and a status pill (Open/In Progress/Resolved/Cancelled)
- **AND** rows are ordered so items needing attention surface first (by status, then severity, then most-recent)

#### Scenario: Rows reuse the shared work-order table
- **WHEN** the table is built
- **THEN** it is derived by the same `deriveWorkOrderSurfaces` logic and rendered by the same `WorkOrdersTable` component the global `/pro/work-orders` page uses, over this client's scoped maintenance slice — so the two presentations cannot drift

#### Scenario: Redundant client column is dropped on the single-client surface
- **WHEN** the table renders on a single-client tab
- **THEN** the per-row subtitle omits the client name (which would repeat down every row), while the global multi-client `/pro/work-orders` table keeps showing it

### Requirement: Inline status and vendor actions reuse the audited write path

The Work Orders tab SHALL allow the manager to advance a work order's status and assign a vendor inline, reusing the existing audited action — no new write path is introduced.

#### Scenario: Manager advances a work order
- **WHEN** the manager clicks Start, Resolve, or Cancel on a row
- **THEN** the change is applied through the existing `updateWorkOrder` server action (Resolve and Cancel go through the confirm dialog), and the row re-derives from the server on success

#### Scenario: Manager assigns a vendor
- **WHEN** the manager clicks "Assign vendor" (or "Change") on an open/in-progress row
- **THEN** the assign-vendor modal opens over the client's trade-vendor directory and the assignment is saved through the same existing action

### Requirement: Vendor directory on the Work Orders tab

The Work Orders tab SHALL show the trade-vendor directory that feeds the assign-vendor action, reusing the existing card.

#### Scenario: Manager sees who can take the work
- **WHEN** the tab renders
- **THEN** a vendor directory card lists the org's trade vendors (Maintenance, Electrician, Plumber, Inspector) with availability and rating, reusing `VendorsCard`
- **AND** the same trade-vendor list is used both to render the card and to populate the assign-vendor modal

### Requirement: Overview links instead of duplicating

The Overview tab SHALL keep a compact open-queue snapshot that links to the Work Orders tab, and SHALL NOT duplicate the full work-order table.

#### Scenario: Overview shows a snapshot and links
- **WHEN** the manager is on the client Overview tab
- **THEN** the Overview shows the open-queue snapshot (`MaintenanceQueueCard`, top of the queue) with a link to the Work Orders tab, and does not render the full work-order table a second time

### Requirement: Informative empty states

The work-order surfaces SHALL show an actionable empty state when the client has no work orders, consistent with the dashboard cards.

#### Scenario: Client with no work orders
- **WHEN** a client has no maintenance items
- **THEN** the table shows a titled empty state with a short prompt (rather than a bare empty table), and the KPI strip reads zeros without error
