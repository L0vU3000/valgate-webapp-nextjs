## ADDED Requirements

### Requirement: Owner can navigate directly to any edit section

The property edit form SHALL present its sections (Details, Address, Financial) as selectors that let the owner open any section directly, in any order, without passing through the others. Navigating between sections SHALL NOT be blocked by validation of the current or any other section.

#### Scenario: Jump to a later section first

- **WHEN** the owner opens the edit form and selects the Financial section
- **THEN** the Financial fields are shown immediately without first completing Details or Address

#### Scenario: Switch sections freely with unsaved edits

- **WHEN** the owner has edited a field in one section and selects another section
- **THEN** the other section opens, the edit is retained in form state, and no validation gate blocks the switch

### Requirement: A single save validates the whole form

The edit form SHALL present a Save action at all times (independent of which section is active). On save, the system SHALL validate the entire form; if any section has invalid fields, the save SHALL be blocked and the owner SHALL be shown which section needs attention. On success the changes SHALL be persisted via the existing edit action and the form closed.

#### Scenario: Save from any section

- **WHEN** the owner is on any section and activates Save with all fields valid
- **THEN** the whole property profile is saved and the form closes

#### Scenario: Save with an error in another section

- **WHEN** the owner activates Save while a field in a non-active section is invalid
- **THEN** the save is blocked and the owner is directed to the section containing the error

### Requirement: Sections are reachable on small screens

On viewports where the side rail is hidden, the edit form SHALL provide a horizontal section selector (tabs or a section picker) so every section remains reachable in one interaction, replacing the linear progress indicator.

#### Scenario: Mobile section switch

- **WHEN** the owner uses the edit form on a small screen
- **THEN** a section selector is visible and tapping a section opens it directly

### Requirement: Fields and saved data are unchanged

The set of editable fields, their validation rules, and the persisted result SHALL be identical to the prior stepper. Only the navigation model changes.

#### Scenario: Same data saved

- **WHEN** the owner edits and saves the same fields they could edit before
- **THEN** the saved property profile is identical to what the stepper would have saved
