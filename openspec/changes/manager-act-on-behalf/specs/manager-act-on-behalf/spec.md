## ADDED Requirements

### Requirement: Grant-aware preview access

The preview SHALL derive the manager's access level from their active membership role in the client's org, server-side, on every request — never from client-supplied input.

#### Scenario: Full grant enables write
- **WHEN** a manager with an active `admin`/`owner` membership in the client's org opens the preview
- **THEN** the preview ctx carries that role (write-capable) and the UI exposes direct Add/Edit/Delete controls

#### Scenario: Viewer or absent grant is read-only
- **WHEN** a manager has a `viewer` grant, or no active membership row, in the client's org
- **THEN** the preview ctx is `viewer` (read-only) and only the Propose-changes flow is available

#### Scenario: Ownership is still required
- **WHEN** a signed-in manager who does not own the client (`clients.managerUserId` mismatch) requests the preview
- **THEN** the route returns 404 regardless of any membership row

### Requirement: Single audited write path

Every manager mutation of a client's portfolio SHALL be recorded as a `change_requests` row, regardless of grant level.

#### Scenario: Full-grant mutation is recorded and applied instantly
- **WHEN** a full-grant manager creates, updates, or deletes a Tier 1 entity in the preview
- **THEN** a `change_requests` row is written with `managerUserId` = the manager, `status` = `approved`, `decidedByUserId` = the manager, and `decidedAt` set
- **AND** the change is applied to the entity tables in the same transaction via the dispatcher (re-validating the patch)

#### Scenario: Viewer-grant mutation is recorded as pending
- **WHEN** a viewer-grant manager submits a change
- **THEN** a `change_requests` row is written with `status` = `pending` and no `decidedByUserId`, and no entity change is applied until the client approves

#### Scenario: Delete leaves a durable tombstone
- **WHEN** a full-grant manager deletes an entity
- **THEN** the `change_requests` row persists after the entity row is gone, recording who deleted what and when

### Requirement: Apply failures leave no ghost record

A manager mutation that fails validation or application SHALL NOT leave a row marked `approved` without the change being applied.

#### Scenario: Failed apply rolls back
- **WHEN** `recordAndApplyManagerChange` inserts the row and the subsequent apply throws
- **THEN** the transaction rolls back so no `change_requests` row and no partial entity change remain
- **AND** the manager receives a generic error

### Requirement: Client is notified of manager actions

When a full-grant manager's change is auto-applied, the system SHALL notify the client (owner), not the acting manager.

#### Scenario: Client sees what the manager did
- **WHEN** a full-grant manager auto-applies a change
- **THEN** a notification is inserted for the client describing the entity and operation
- **AND** no "your change was approved" notification is sent to the acting manager
