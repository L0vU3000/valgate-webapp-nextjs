# help-menu Specification

## Purpose
TBD - created by archiving change add-help-menu-changelog. Update Purpose after archive.
## Requirements
### Requirement: Help menu is present in both shells

The system SHALL render a Help affordance — a `?` icon button — in the top header of both the Standard shell and the Pro shell, positioned alongside the existing notifications control. The affordance MUST be visible to every authenticated user regardless of account type (owner or manager).

#### Scenario: Standard user sees the Help button

- **WHEN** an owner (Standard) user views any shell route
- **THEN** a `?` Help button appears in the header next to the notifications bell

#### Scenario: Pro user sees the Help button

- **WHEN** a manager views any `/pro` route
- **THEN** a `?` Help button appears in the Pro header next to the notifications bell

### Requirement: Help menu opens a dropdown of support entries

The Help button SHALL open a dropdown menu (shadcn `DropdownMenu`) containing exactly these entries, in order: Send Feedback, Changelog, Docs, Keyboard Shortcuts. The dropdown MUST close on outside click, on Escape, and after an entry is selected.

#### Scenario: Opening the menu

- **WHEN** the user clicks the `?` Help button
- **THEN** a dropdown appears listing Send Feedback, Changelog, Docs, and Keyboard Shortcuts

#### Scenario: Dismissing the menu

- **WHEN** the dropdown is open and the user clicks outside it or presses Escape
- **THEN** the dropdown closes without navigating

### Requirement: Help menu entry destinations

Each Help menu entry SHALL route to its destination: Send Feedback opens a `mailto:` link, Changelog opens the "What's new" modal in place, and Docs and Keyboard Shortcuts open their designated links. Placeholder destinations (Feedback, Docs, Keyboard Shortcuts) MUST be wired as explicit links rather than inert text so the affordance is functional.

#### Scenario: Selecting Send Feedback

- **WHEN** the user selects "Send Feedback"
- **THEN** the system opens a `mailto:` compose window addressed to the feedback inbox

#### Scenario: Selecting Changelog

- **WHEN** the user selects "Changelog"
- **THEN** the "What's new" modal opens without a full-page navigation

