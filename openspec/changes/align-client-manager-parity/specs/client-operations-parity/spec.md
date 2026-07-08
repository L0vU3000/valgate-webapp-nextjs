## ADDED Requirements

### Requirement: Client Work Orders surface

The client SHALL have a portfolio-level Work Orders page (`/work-orders`, shell) to view and manage maintenance items across all of their properties, backed by the existing `maintenance-items` service and actions.

#### Scenario: Client views their maintenance across the portfolio
- **WHEN** a signed-in owner opens `/work-orders`
- **THEN** every maintenance item in their org is listed, grouped/filterable by status (Open, In Progress, Overdue, Resolved), showing property, unit, assigned vendor, and priority
- **AND** the page is reachable from a Work Orders entry in the client sidebar

#### Scenario: Client creates and updates a work order
- **WHEN** the owner creates a maintenance item or edits its status/vendor/priority on `/work-orders`
- **THEN** the change is written through the existing `maintenance-items` action under the owner's own ctx and the list reflects it without a full reload

#### Scenario: Overdue detection is request-time
- **WHEN** the page renders "Overdue" counts and labels
- **THEN** they are computed relative to request time, not build time (the route is dynamic)

### Requirement: Client Compliance surface

The client SHALL have a portfolio-level Compliance page (`/compliance`, shell) that rolls up `certifications`, `inspections`, and `safety-risks` across all of their properties with expiry and overdue tracking, complementing the existing per-property Safety tab.

#### Scenario: Client sees a compliance overview
- **WHEN** a signed-in owner opens `/compliance`
- **THEN** they see a progress summary plus a "needs attention" breakdown for Certifications, Inspections, and Safety Risks, over a register table showing item, property, expiry date, an "Overdue by N days" label when past due, and a status badge
- **AND** the page is reachable from a Compliance entry in the client sidebar

#### Scenario: Client acts on a compliance item
- **WHEN** the owner adds, edits, resolves, or removes a certification, inspection, or safety risk from `/compliance`
- **THEN** the change is written through that entity's action under the owner's own ctx and the rollup updates

### Requirement: No self-service action gaps

Every entity family the client owns SHALL expose the full set of create/update/delete actions its UI needs, with no missing operations.

#### Scenario: Safety risks are fully manageable by the client
- **WHEN** the owner creates or deletes a safety risk
- **THEN** a `safety-risks` action exists and performs it under the owner's ctx (today only manager "resolve" exists)

#### Scenario: Payments are fully manageable by the client
- **WHEN** the owner edits or deletes a payment
- **THEN** a `payments` update and delete action exists and performs it under the owner's ctx (today only `create` exists)
