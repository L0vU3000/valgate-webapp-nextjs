# account-type-mode Specification

## Purpose
TBD - created by archiving change standard-pro-account-settings-revamp. Update Purpose after archive.
## Requirements
### Requirement: Account type selection
The system SHALL let a signed-in user choose between two account types — **Standard** and **Pro** — from the Account group of `/settings`. The selection SHALL be presented as a segmented control with both options visible and the current type filled. Selecting a type SHALL take effect immediately without a confirmation step (self-serve), and SHALL persist by reusing the existing `is_manager` flag (Pro ⇔ `is_manager = true`, Standard ⇔ `is_manager = false`) via the managers service.

#### Scenario: Standard user switches to Pro
- **WHEN** a Standard user taps "Pro" in the account-type segmented control
- **THEN** the control immediately shows Pro as selected
- **AND** the underlying `is_manager` flag is set to `true` via the managers service
- **AND** no confirmation dialog is shown

#### Scenario: Pro user switches to Standard
- **WHEN** a Pro user taps "Standard" in the account-type segmented control
- **THEN** the control immediately shows Standard as selected
- **AND** the underlying `is_manager` flag is set to `false`

#### Scenario: Persistence write fails
- **WHEN** the user changes account type and the persistence write fails
- **THEN** the segmented control rolls back to the previously selected type
- **AND** the user is not left showing a state that did not save

### Requirement: Pro cockpit entry visibility
The system SHALL show entry points to the Pro cockpit — the sidebar "Pro" navigation item and the header "Pro" pill — only to users whose account type is Pro. Standard users SHALL NOT see either entry point in any environment.

#### Scenario: Standard user sees no Pro entry points
- **WHEN** a Standard user views the app shell
- **THEN** the sidebar does not render a "Pro" navigation item
- **AND** the header does not render the "Pro" pill

#### Scenario: Pro user sees Pro entry points
- **WHEN** a Pro user views the app shell
- **THEN** the sidebar renders the "Pro" navigation item
- **AND** the header renders the "Pro" pill

### Requirement: Pro route access control
The system SHALL restrict the `/pro` route group to Pro users, enforced server-side. A Standard user who reaches `/pro` by any means SHALL receive a not-found response rather than the cockpit.

#### Scenario: Standard user navigates directly to a Pro URL
- **WHEN** a Standard user requests a `/pro` URL directly
- **THEN** the server responds with not-found
- **AND** the cockpit is not rendered

### Requirement: Downgrade redirect
The system SHALL move a user out of the Pro cockpit if they switch from Pro to Standard while inside `/pro`. The user SHALL NOT remain on a `/pro` screen after downgrading.

#### Scenario: User downgrades while inside the cockpit
- **WHEN** a user viewing a `/pro` screen switches their account type to Standard
- **THEN** the user is redirected out of `/pro` to a Standard-accessible screen

