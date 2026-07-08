## MODIFIED Requirements

### Requirement: Preview remains read-only

Browsing sections in preview SHALL NOT grant write access beyond what the manager's grant allows. A `viewer` grant (or no active grant) is read-only: the only path to change client data is the Propose-changes flow, applied only after the client approves. A full (`admin`/`owner`) grant lets the manager apply changes directly through the grant-aware panel; every such change is still recorded in `change_requests` (see the `manager-act-on-behalf` capability).

#### Scenario: Section inline controls never write in preview
- **WHEN** a manager triggers a mutating control rendered inside a browsed preview section (e.g. "Add Property")
- **THEN** it does not mutate client data — section-page controls stay read-only in preview regardless of grant, because they target the manager's own org rather than the client's

#### Scenario: Viewer grant is propose-only
- **WHEN** a `viewer`-grant (or grantless) manager submits a change via the panel
- **THEN** it is recorded as a pending `change_requests` row and applied only after the client approves

#### Scenario: Full grant applies directly, still recorded
- **WHEN** a full-grant manager submits a change via the panel
- **THEN** it is applied immediately and recorded as an approved `change_requests` row decided by the manager
