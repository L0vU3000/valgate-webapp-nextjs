## ADDED Requirements

### Requirement: One "Scan a document" action replaces the photo and upload cards

The `/add-property` entry screen SHALL present a single active "Scan a document" action that accepts a
document as either a photograph or an uploaded file, replacing the previous separate "Take a photo" and
"Upload document" cards. The action SHALL accept PDF, JPEG, PNG, and WebP up to 10 MB.

#### Scenario: Single entry point

- **WHEN** a user opens `/add-property`
- **THEN** exactly one active card offers scanning a document (via camera or file), and the two old
  "Coming soon" cards are gone

#### Scenario: Unsupported or oversized file

- **WHEN** the user picks a file that is not PDF/JPEG/PNG/WebP, or is larger than 10 MB
- **THEN** the file is rejected with a clear message and no scan is attempted

### Requirement: An AI reads, translates, and extracts the property details

The system SHALL send the picked document to an authenticated endpoint that performs a single AI
extraction, returning the property's details as a structured, schema-validated object mapped to the
add-property fields. The AI SHALL translate non-English text into English and SHALL leave a field
absent rather than inventing a value the document does not contain.

#### Scenario: Details are extracted

- **WHEN** a legible property document is scanned
- **THEN** the returned object contains the fields the document states (e.g. address, type, area,
  price), validated against the extraction schema

#### Scenario: Non-English document

- **WHEN** the document contains non-English text (e.g. Khmer)
- **THEN** the extracted field values are returned in English

#### Scenario: Sparse document

- **WHEN** the document does not state a given field
- **THEN** that field comes back empty rather than guessed

#### Scenario: Authentication

- **WHEN** the scan endpoint is called
- **THEN** it requires an authenticated caller and only the caller's own uploaded file is sent to the
  model

### Requirement: The wizard opens pre-filled for the user to confirm

On a successful scan the system SHALL pre-fill the add-property wizard with the extracted values and
place the user at the Basic Information step to review, edit, and continue. Extracted values SHALL NOT
create a property without the user proceeding through the wizard.

#### Scenario: Prefilled review

- **WHEN** a scan succeeds
- **THEN** the wizard opens at Basic Information with the extracted fields populated and fully editable

#### Scenario: Scan failure is not a dead end

- **WHEN** the AI extraction fails
- **THEN** the user is told, and can still continue adding the property manually

### Requirement: The scanned file is attached to the property

The system SHALL keep the scanned file: once the wizard's draft exists, the picked file SHALL be
staged into it so that, on submit, the source document is attached to the created property. Failing to
attach the file SHALL NOT lose the property or the extracted data.

#### Scenario: Source document attached

- **WHEN** a scanned property is submitted
- **THEN** the created property has the scanned file attached as a document

#### Scenario: Attachment failure is non-fatal

- **WHEN** staging the scanned file fails
- **THEN** the property and its extracted fields are still created, and the user is notified the
  attachment did not finish
