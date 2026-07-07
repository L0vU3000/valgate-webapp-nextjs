## ADDED Requirements

### Requirement: Every entity is act-on-behalf capable

The change-request dispatcher `REGISTRY` SHALL cover every mutable entity family a manager can act on for a client, not just property/lease/tenant/payment.

#### Scenario: A registered entity can be proposed and applied
- **WHEN** a manager submits a create/update/delete for any registered entity (certification, inspection, safety-risk, maintenance-item, co-owner, ownership-record, ownership-document, property-valuation, estate-assignment, successor, emergency-contact, document, folder, professional, plus the original four)
- **THEN** the dispatcher re-validates the patch against that entity's `New*`/`Patch*` schema and applies it via the entity's real service `create`/`update`/`delete` fn

#### Scenario: An unregistered entity is rejected
- **WHEN** a manager submits a change for an entity type not in the registry
- **THEN** the action returns a generic "not supported" error and writes nothing

### Requirement: All manager on-behalf writes are audited

Every manager mutation of a client's portfolio SHALL flow through the `change_requests` ledger — recorded under the client's org with the acting manager — regardless of which surface (preview or Pro book page) initiated it.

#### Scenario: Pro book-page writes are recorded, not direct
- **WHEN** a manager creates/updates a work order, resolves a safety risk, or records/renews rent from a Pro book page
- **THEN** the write is scoped to the client's org (not the manager's own org) and is recorded as a `change_requests` row via the audited path — full grant auto-applies, viewer grant proposes
- **AND** it is NOT written directly under the manager's own `requireCtx()` org

#### Scenario: Grant level decides apply vs propose, server-side
- **WHEN** the audited path handles any on-behalf write
- **THEN** the manager's grant in the client's org is re-derived server-side (never client-supplied), and a full (admin/owner) grant applies instantly while a viewer/absent grant creates a pending proposal

### Requirement: Preview reaches every parity surface

The "view as client" preview SHALL expose the same section surfaces the client has, including Compliance and Work Orders, so a full-grant manager can act on them through the audited path.

#### Scenario: Preview mirrors Compliance and Work Orders
- **WHEN** a manager opens the as-client preview for a client
- **THEN** Compliance and Work Orders sections are available (mirroring the client's shell pages), scoped to the client's org
- **AND** a full-grant manager can create/edit/resolve items there, each recorded in `change_requests`
