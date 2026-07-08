## ADDED Requirements

### Requirement: Client-scoped compliance KPI header

The Compliance tab SHALL open with a KPI metric strip summarizing the selected client's compliance posture, every figure derived from that client's real records.

#### Scenario: Manager sees the client's compliance headline
- **WHEN** a manager opens `/pro/clients/[clientId]/compliance`
- **THEN** a metric strip shows Valid certs, Expiring certs, Expired certs, Open safety risks (with the critical/high count and, when any exist, a resolved count), and Failed inspections
- **AND** every value is computed over only the properties whose `clientId` matches this client (or the manager's own unassigned portfolio for the own-portfolio view)
- **AND** the strip passes exactly five metrics, matching `KpiMetricStrip`'s five-wide grid

#### Scenario: Status counts reconcile to the certificate total
- **WHEN** the KPI strip renders the Valid / Expiring / Expired counts
- **THEN** those three counts sum to the number of certificates shown in the timeline, because they partition on `cert.status` (not on the date)

#### Scenario: Figures are request-time
- **WHEN** the strip and timeline render "Overdue" / "in Nd" horizon labels
- **THEN** they are computed relative to request time (the route is dynamic), not build time

### Requirement: Client-scoped certification timeline

The Compliance tab SHALL present the client's certificates as an expiry timeline grouped by how far off each renewal is.

#### Scenario: Manager reviews upcoming renewals
- **WHEN** the timeline renders
- **THEN** certificates are grouped into Overdue, Due in 30 days, 31–90 days, and Later buckets, each row showing the certificate name, its property, a due label, and a Valid/Expiring/Expired status pill
- **AND** rows within each bucket stay ordered soonest-expiry first

#### Scenario: Timeline reuses the shared component
- **WHEN** the timeline is built
- **THEN** it is derived by the same `buildComplianceRows` logic and rendered by the same `CertTimeline` component (and `STATUS_PILL`) the global `/pro/compliance` page uses, over this client's scoped certificate slice — so the global and per-client presentations cannot drift

### Requirement: Client-scoped safety-risk register

The Compliance tab SHALL present the client's safety risks, ranked most-severe first, with resolve and show-resolved controls.

#### Scenario: Manager reviews standing hazards
- **WHEN** the register renders
- **THEN** each row shows a Critical/High/Medium/Low severity badge, the risk title, and its property, ordered so the most severe (and, on ties, most recently raised) surface first
- **AND** open risks show a Resolve action (behind the existing confirm dialog, reusing the already-audited `resolveSafetyRisk`); resolved risks render read-only

#### Scenario: Show-resolved toggle
- **WHEN** the client has at least one resolved risk
- **THEN** a "Show resolved (N)" toggle reveals the resolved rows read-only; when there are none, the toggle is disabled so it never offers an empty view

### Requirement: Client-scoped inspection log

The Compliance tab SHALL present the client's recent inspections, newest first.

#### Scenario: Manager sees the inspection history
- **WHEN** the inspection log renders
- **THEN** each row shows the inspection type, a Passed/Satisfactory/Failed outcome pill, the issue count, its property, and how long ago it occurred, newest inspection first (reusing `InspectionsCard`)

### Requirement: Compliance surfaces are scoped to one client

Every certificate, safety risk, and inspection shown on the tab SHALL belong to the requested client.

#### Scenario: No cross-client leakage
- **WHEN** the tab data is derived for a client
- **THEN** every certificate, safety risk, and inspection has that client's `clientId`, derived over the `scoped` slice (extended to carry safety risks and inspections), so no other client's records appear

### Requirement: Overview links instead of duplicating

The client Overview tab SHALL keep a compact certificate snapshot and link to the Compliance tab rather than duplicating the full compliance workspace.

#### Scenario: Overview shows a snapshot + link
- **WHEN** the manager is on the client Overview tab
- **THEN** the Overview shows the compact `ComplianceTable` certificate snapshot and a "View full compliance →" link to the Compliance tab
- **AND** the full timeline, safety-risk register, and inspection log render only on the Compliance tab

### Requirement: Informative empty states

Each compliance surface SHALL show an inviting empty state when the client has no data for it.

#### Scenario: Client with no risks or inspections
- **WHEN** a client has certificates but no safety risks and no inspections
- **THEN** the timeline renders the certificates while the safety-risk register and inspection log each show their titled empty state ("No open safety risks." / "No inspections on record."), rather than a bare empty card
