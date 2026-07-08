## ADDED Requirements

### Requirement: Client-scoped activity timeline

The Activity tab SHALL present a day-grouped, client-scoped timeline of the client's activity, every row derived from that client's real records or audit rows.

#### Scenario: Manager opens the client's activity

- **WHEN** a manager opens `/pro/clients/[clientId]/activity`
- **THEN** events are shown newest-first, bucketed under day headers (Today, Yesterday, This week, Earlier)
- **AND** each row shows a category icon, a description, the property it concerns, and a relative timestamp
- **AND** every event belongs to only the properties whose `clientId` matches this client (or the manager's own unassigned portfolio for the own-portfolio view)

#### Scenario: Timestamps are request-time

- **WHEN** the timeline renders day buckets and relative timestamps
- **THEN** "Today"/"Yesterday"/"This week" and relative times are computed relative to request time (the route is dynamic), not build time

### Requirement: Real audit log surfaced alongside synthesized events

The timeline SHALL merge the client's real `activities` audit-log rows (who/what/when) with the synthesized payment/work-order/lease events, so the tab shows actions taken, not only records that exist.

#### Scenario: Audit rows appear with their stored detail

- **WHEN** the audited write path has recorded activity for this client (e.g. a manager on-behalf edit or a change-request approval)
- **THEN** those rows appear in the timeline with their stored title/description, mapped to a category, and an "Updates" filter surfaces the ones that are not payment/maintenance/lease
- **AND** the audit read is scoped to the client's org (`client.orgId`), or to the client's property ids for an own-portfolio or null-org client, and never returns rows from another org

#### Scenario: Synthesized events still shown when the audit log is empty

- **WHEN** a client has payments/work-orders/leases but no `activities` rows (e.g. seeded data)
- **THEN** the synthesized payment/maintenance/lease events still populate the timeline, so the tab is never emptier than before

### Requirement: Honest actor attribution

The timeline SHALL show an actor only where one is recorded, and SHALL NOT fabricate a display name.

#### Scenario: Manager's own action reads as "You"

- **WHEN** an audit row's `userId` matches the signed-in manager's Clerk id
- **THEN** the row shows an actor line reading "You"

#### Scenario: No stored name means no invented name

- **WHEN** an audit row's actor is not the signed-in manager and no display name is stored
- **THEN** the row shows what is stored (or omits the actor line) rather than inventing a name
- **AND** synthesized record-events, which have no actor, render no actor line

### Requirement: Category filtering

The timeline SHALL keep the existing category filter pills and extend them to cover audit events.

#### Scenario: Manager filters the timeline

- **WHEN** the manager selects a filter pill (All / Financial / Maintenance / Leasing / Updates)
- **THEN** only events in that category remain, and the day grouping recomputes over the filtered set
- **AND** the existing Financial/Maintenance/Leasing pills keep their current icons and colors

### Requirement: Load-more paging

The timeline SHALL show a bounded set of rows initially and reveal more on demand, rather than rendering an unbounded list.

#### Scenario: Manager reveals older activity

- **WHEN** the client has more events than the initial page
- **THEN** an initial batch is shown with a "Load more" control that reveals the next batch client-side
- **AND** when no more events remain, the control is not shown

### Requirement: Overview snapshot links to the tab

The client Overview SHALL show a compact recent-activity snapshot that links to the Activity tab, and SHALL NOT duplicate the full grouped timeline.

#### Scenario: Overview shows a snapshot

- **WHEN** the manager is on the client Overview tab
- **THEN** a compact flat list of the most recent events is shown with a "View all activity" link to the Activity tab
- **AND** the same `ActivityFeed` component renders both the snapshot (flat) and the tab (grouped), so the two presentations cannot drift

### Requirement: Informative empty state

The Activity tab SHALL show an actionable empty state when the client has no activity at all.

#### Scenario: Client with no records or audit rows

- **WHEN** a client has no synthesized events and no audit rows
- **THEN** the tab shows a titled empty state (icon + short prompt) explaining that activity will appear as the portfolio is managed, rather than a bare empty list
