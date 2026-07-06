## ADDED Requirements

### Requirement: Grouped settings navigation
The `/settings` surface SHALL present a persistent left-hand navigation that groups its sections into two labelled groups: an **Account** group (matters about the user) and an **App** group (matters about app setup). Selecting an item SHALL show that section's content in the adjacent panel. The Account group SHALL contain Profile, Security, Account type, Data & Privacy, and Danger zone. The App group SHALL contain Notifications, Preferences, and Connect Claude.

#### Scenario: User opens settings
- **WHEN** a user navigates to `/settings`
- **THEN** a left-hand navigation is shown with an "Account" group and an "App" group
- **AND** the Account group lists Profile, Security, Account type, Data & Privacy, and Danger zone
- **AND** the App group lists Notifications, Preferences, and Connect Claude

#### Scenario: User selects a section
- **WHEN** a user selects a navigation item
- **THEN** the adjacent panel shows that section's content
- **AND** the selected item is visually marked as active

### Requirement: Managers section placement
The Managers section (inviting and managing people who can access the user's own portfolio) SHALL appear within the Account group, and SHALL remain visible only to users with an owner/admin org role. Non-owner roles SHALL NOT see the Managers section.

#### Scenario: Owner sees Managers under Account
- **WHEN** an owner/admin opens `/settings`
- **THEN** the Managers section is listed within the Account group

#### Scenario: Non-owner does not see Managers
- **WHEN** a viewer or member opens `/settings`
- **THEN** no Managers section is shown

### Requirement: Profile consolidation
The Account group's Profile section SHALL contain the profile information previously shown on the standalone `/profile` page. The standalone `/profile` route SHALL be removed; requests to it SHALL redirect to the Profile section of `/settings` so existing links do not break.

#### Scenario: User visits the old profile route
- **WHEN** a user navigates to `/profile`
- **THEN** they are redirected to the Profile section within `/settings`

#### Scenario: Profile content is available in settings
- **WHEN** a user opens the Profile section in `/settings`
- **THEN** the profile information formerly on `/profile` is shown there
