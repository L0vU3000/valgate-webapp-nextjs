## ADDED Requirements

### Requirement: Changelog is a curated typed data source

The changelog SHALL be a hand-curated, typed data structure (`lib/data/changelog.ts`) — an ordered list of releases, newest first. Each release MUST have a version string, a release date, and a list of entries; each entry MUST have a change type tag (New, Improved, or Fixed) and a plain-language, user-facing description. The changelog MUST NOT be generated or parsed from the git commit log at runtime; the commit log is only a human drafting reference. An entry MUST only describe a change that has already merged to `main` — in-progress branch work MUST NOT appear until it ships.

#### Scenario: Changelog data shape

- **WHEN** the changelog data is read
- **THEN** it yields releases ordered newest-first, each with a version, a date, and tagged entries

#### Scenario: Entries are user-facing

- **WHEN** an entry is authored from an underlying commit
- **THEN** its description is written in plain product language, not the raw commit message

#### Scenario: No entries for unmerged work

- **WHEN** a changelog entry is drafted
- **THEN** it only describes a commit already on `main`, never work still in progress on a feature branch

### Requirement: "What's new" modal renders the changelog

The system SHALL render the changelog in a "What's new" modal (shadcn `Dialog`), opened from the Help menu's Changelog entry. The modal MUST list each release with its version, date, and entries, and each entry MUST show its type tag (New / Improved / Fixed). The modal MUST be dismissible via close button, outside click, and Escape.

#### Scenario: Viewing the changelog

- **WHEN** the user opens the Changelog entry from the Help menu
- **THEN** the modal shows every release grouped by version and date, with tagged entries

#### Scenario: Closing the modal

- **WHEN** the modal is open and the user clicks the close control, clicks outside, or presses Escape
- **THEN** the modal closes

### Requirement: Unread changelog indicator

The Help button SHALL show an unread dot when the newest changelog version is newer than the version the user last viewed. The last-viewed version MUST be persisted per browser in `localStorage`. Opening the "What's new" modal MUST record the newest version as viewed and clear the dot. State MUST be client-only — no server, schema, or account storage.

#### Scenario: New release since last visit

- **WHEN** the newest changelog version is greater than the value stored in localStorage
- **THEN** an unread dot appears on the `?` Help button

#### Scenario: Opening clears the dot

- **WHEN** the user opens the "What's new" modal
- **THEN** the newest version is written to localStorage and the unread dot disappears

#### Scenario: No unread when caught up

- **WHEN** the stored last-viewed version equals the newest changelog version
- **THEN** no unread dot is shown
