# mcp-rental-write-tools Specification

## Purpose
TBD - created by archiving change add-mcp-rental-write-tools. Update Purpose after archive.
## Requirements
### Requirement: Lease write tools
The MCP server SHALL expose `create_lease`, `update_lease`, and `delete_lease` tools that wrap `createLease`, `updateLease`, and `deleteLease` in `lib/services/leases.ts`. Inputs SHALL be validated with the same `NewLease` / `LeasePatch` Zod schemas the website uses.

#### Scenario: Create a lease
- **WHEN** a member-or-higher caller invokes `create_lease` with a valid lease payload and its workspace `orgId`
- **THEN** the lease is created in that workspace and the created record is returned

#### Scenario: Update only the passed fields
- **WHEN** a caller invokes `update_lease` with an id and a partial `patch`
- **THEN** only the fields in `patch` change and all other fields are left as-is

#### Scenario: Reject an invalid lease payload
- **WHEN** a caller invokes `create_lease` with a payload that fails the `NewLease` schema
- **THEN** the tool returns a tool-level error and writes nothing

### Requirement: Tenant write tools
The MCP server SHALL expose `create_tenant`, `update_tenant`, and `delete_tenant` tools that wrap the corresponding functions in `lib/services/tenants.ts`, validated with the `NewTenant` / `TenantPatch` schemas.

#### Scenario: Add a tenant
- **WHEN** a member-or-higher caller invokes `create_tenant` with a valid tenant payload and its workspace `orgId`
- **THEN** the tenant is created in that workspace and the created record is returned

### Requirement: Payment write tools
The MCP server SHALL expose `record_payment` (create), `update_payment`, and `delete_payment` tools that wrap the corresponding functions in `lib/services/payments.ts`, validated with the `NewPayment` / `PaymentPatch` schemas.

#### Scenario: Record a rent payment
- **WHEN** a member-or-higher caller invokes `record_payment` with a valid payment payload and its workspace `orgId`
- **THEN** the payment is created against the referenced lease/property and the created record is returned

### Requirement: Authorization is enforced by the service layer, not re-implemented
Each new tool SHALL delegate all authorization to the underlying service — org-scope, role (member-or-higher for writes; admin for destructive deletes where the service requires it), and demo read-only. The tools SHALL NOT re-implement any of these checks.

#### Scenario: A viewer is refused a write
- **WHEN** a caller whose role in the target workspace is `viewer` invokes any create/update/delete tool
- **THEN** the service refuses the mutation and the tool returns a generic "not authorized" error, writing nothing

#### Scenario: A caller cannot write to a workspace they do not belong to
- **WHEN** a caller passes an `orgId` for a workspace they are not an active member of
- **THEN** the tool returns a generic "not authorized" error and writes nothing

### Requirement: Writes resolve their workspace explicitly
Each new write tool SHALL resolve its Ctx with `requireExplicitOrg = true`, so a caller who belongs to more than one workspace MUST name the `orgId`; the tool SHALL NOT guess a workspace for a write.

#### Scenario: Multi-workspace caller omits the orgId
- **WHEN** a caller who belongs to more than one workspace invokes a write tool without an `orgId`
- **THEN** the tool returns actionable guidance to call `list_workspaces` and retry with an explicit `orgId`, and writes nothing

### Requirement: Every mutation is audited
Each successful mutation SHALL write an audit row via `logActivity`, and an audit failure SHALL NOT roll back or hide the mutation that already succeeded.

#### Scenario: Successful write is audited
- **WHEN** any new write tool completes a mutation
- **THEN** an activity record describing the change (entity, action, id) is written

### Requirement: Destructive deletes are gated behind confirm + preview
Where a delete cascades to child records, the corresponding `delete_*` tool SHALL require an explicit `confirm: true`; when `confirm` is false or omitted, the tool SHALL delete nothing and instead return a blast-radius preview of what would be destroyed.

#### Scenario: Delete without confirmation shows the preview
- **WHEN** a caller invokes a `delete_*` tool with `confirm` false or omitted
- **THEN** nothing is deleted and the tool returns the count of records that would be destroyed

#### Scenario: Delete with confirmation removes the record
- **WHEN** a caller invokes a `delete_*` tool with `confirm: true` and sufficient role
- **THEN** the record and its cascading children are permanently removed and the deleted id is returned

### Requirement: Errors never leak internal detail
On any failure a tool SHALL log the real error server-side and return a generic client-facing message, never `err.message`.

#### Scenario: Internal failure returns a generic message
- **WHEN** an underlying service throws for any reason
- **THEN** the tool logs the error internally and returns a generic failure string with no internal detail

