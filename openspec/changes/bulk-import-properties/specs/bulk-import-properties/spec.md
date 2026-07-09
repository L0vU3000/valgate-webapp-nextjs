## ADDED Requirements

### Requirement: A user can import many properties from a spreadsheet

The system SHALL provide, from `/add-property`, an "Import from spreadsheet" path that accepts a CSV
(and, if enabled, `.xlsx`) file of properties and creates a Valgate property per data row. The path
SHALL be capped at 100 data rows and at the wizard's existing per-file size limit for v1.

#### Scenario: Entry point

- **WHEN** a user opens `/add-property`
- **THEN** an active "Import from spreadsheet" card is shown alongside the manual entry card, and
  selecting it opens the import flow at `/add-property/import`

#### Scenario: Row cap exceeded

- **WHEN** the uploaded file has more than 100 data rows
- **THEN** the file is rejected with a message stating the 100-row limit, and nothing is imported

### Requirement: The AI maps the user's columns once, and code applies it to all rows

The system SHALL send only the spreadsheet's column headers and a small sample of rows to the AI,
which SHALL return a mapping from each Valgate property field to a source column (or none). The system
SHALL then apply that single mapping to every row deterministically in code, using the same value
parsers as the manual add-property flow. The AI SHALL be invoked at most once per import regardless of
row count.

#### Scenario: Column mapping is shown and editable

- **WHEN** the AI returns a column mapping
- **THEN** the mapping is displayed to the user (e.g. source "Purchase $" → "Purchase price") and the
  user can correct any match before importing

#### Scenario: Unparseable value

- **WHEN** a mapped cell's value cannot be parsed into its field's type (e.g. a non-numeric price)
- **THEN** that field is left empty and the row is flagged for the user, rather than guessing a value

#### Scenario: AI unavailable

- **WHEN** the AI mapping cannot be produced (e.g. no API key)
- **THEN** the flow degrades to an empty mapping the user can fill in manually, without crashing

### Requirement: Addresses are geocoded, and un-geocodable rows are flagged not blocked

Because a property requires coordinates, the system SHALL geocode each row's address to latitude and
longitude server-side. A row whose address cannot be geocoded SHALL NOT block the import; it SHALL be
flagged "needs location" so the user can set the location in review or accept the default-centroid
fallback used by the manual flow.

#### Scenario: Address geocodes

- **WHEN** a row's address resolves via geocoding
- **THEN** the candidate property carries the resolved latitude and longitude

#### Scenario: Address does not geocode

- **WHEN** a row's address cannot be resolved
- **THEN** the row is flagged "needs location" and remains importable once the user fixes or accepts a
  location

### Requirement: The user reviews candidates before any property is created

The system SHALL present the mapped candidates in an editable review table, flagging rows with a
missing required field or an unresolved location, before any property is written. No property SHALL be
created until the user confirms the import.

#### Scenario: Review and confirm

- **WHEN** the user has reviewed and optionally edited the candidate table
- **THEN** pressing "Import N properties" creates the properties, and not before

### Requirement: Import is per-row and partial-success, scoped to the caller's organization

The system SHALL validate each candidate through the property schema and create it via the existing
organization-scoped create path, so imported properties land only in the caller's organization. A
failure on one row SHALL NOT prevent other valid rows from being created. The system SHALL report how
many properties were created and which rows failed and why.

#### Scenario: Mixed success

- **WHEN** an import contains some valid rows and some invalid rows
- **THEN** the valid rows are created, the invalid rows are not, and the result lists the created
  count and each failed row with a reason

#### Scenario: Organization scoping

- **WHEN** a user imports properties
- **THEN** every created property belongs to the user's organization and no cross-organization target
  is possible
