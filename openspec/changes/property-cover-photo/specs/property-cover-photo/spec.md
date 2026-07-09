## ADDED Requirements

### Requirement: A property has a designated cover photo

A property SHALL have at most one designated cover photo, stored as a nullable `coverStorageId` on the property. A property with no cover set SHALL be a valid state. The cover is a single storage object regardless of which store the photo originated from (the gallery array or a document).

#### Scenario: Property with no cover set

- **WHEN** a property has never had a cover assigned
- **THEN** `coverStorageId` is null and any surface reading the cover falls back to the map (or placeholder)

#### Scenario: Setting the cover

- **WHEN** the owner selects a photo belonging to the property as the cover
- **THEN** the property's `coverStorageId` is set to that photo's storage id and persists across reloads

### Requirement: Cover-source photo list unifies both photo stores

The system SHALL expose the full set of photos available to be a cover for a property by unioning the property's document photos (`documents` where `kind = "photo"`) with the property's `photoStorageIds` gallery, deduplicated by storage id. Each returned photo SHALL include a short-lived signed display URL. The list SHALL be scoped to the caller's organization so photos from other organizations are never returned.

#### Scenario: Both stores contribute

- **WHEN** the picker requests the property's photos
- **THEN** photos from the Documents tab AND the sidebar gallery both appear, once each, with a resolvable signed URL

#### Scenario: Organization isolation

- **WHEN** a caller requests photos for a property their organization does not own
- **THEN** no photos are returned and the request is denied

### Requirement: Owner can select the cover from a picker modal

The system SHALL provide a "Select cover photo" modal that shows the unified photo list as a single grid, indicates the current cover, lets the owner select one photo, and applies it on confirm. The modal SHALL surface loading, empty, and error states consistent with the existing photo manager.

#### Scenario: Choosing an existing photo

- **WHEN** the owner opens the picker, selects a photo, and confirms
- **THEN** that photo becomes the cover and the modal closes

#### Scenario: No photos yet

- **WHEN** the property has no photos in either store
- **THEN** the picker shows an empty state that invites the owner to upload the first photo

### Requirement: Owner can upload a new photo from within the picker

The system SHALL allow uploading a new image from inside the cover picker. A newly uploaded photo SHALL be recorded as a document (`kind = "photo"`, `category = "Photos"`) so it also appears in the Documents tab, and SHALL become selectable as the cover in the same session. Only image files SHALL be accepted.

#### Scenario: Upload then set as cover

- **WHEN** the owner uploads a new image in the picker and confirms it as the cover
- **THEN** the image is stored, recorded as a Photos document, set as the cover, and later visible in the Documents tab

#### Scenario: Non-image rejected

- **WHEN** the owner selects a non-image file to upload
- **THEN** the upload is rejected with a clear message and no document is created

### Requirement: Overview hero reflects the cover photo

The property overview hero SHALL display the signed cover photo when the property has a cover, otherwise the property's Mapbox static map, otherwise a neutral placeholder. The hero SHALL provide a control that opens the cover picker.

#### Scenario: Cover present

- **WHEN** the overview loads for a property that has a cover
- **THEN** the hero shows the cover photo, not the map

#### Scenario: Cover absent

- **WHEN** the overview loads for a property with no cover but known coordinates
- **THEN** the hero shows the Mapbox map

#### Scenario: Opening the picker from the hero

- **WHEN** the owner activates the hero's "Change cover" control
- **THEN** the cover picker modal opens for that property

### Requirement: Home map drawer reflects the cover photo

The home map property drawer hero SHALL display the signed cover photo when present, otherwise the property's map, otherwise a neutral placeholder. It SHALL NOT display a hardcoded or stock placeholder image.

#### Scenario: Drawer shows real cover

- **WHEN** a property with a cover is opened in the home map drawer
- **THEN** the drawer hero shows that property's cover photo

#### Scenario: No stock image

- **WHEN** any property is opened in the home map drawer
- **THEN** the hero never shows a hardcoded stock image; it shows the cover, the map, or the placeholder

### Requirement: Home drawer offers an edit-property entry point

The home map property drawer SHALL provide a control to edit the property. Activating it SHALL navigate to the property's overview with a signal that opens the existing edit wizard automatically.

#### Scenario: Edit from the drawer

- **WHEN** the owner activates the drawer's "Edit property" control
- **THEN** they land on `/property/[id]/overview` with the edit wizard already open

### Requirement: Cover URLs are resolved lazily

Signed cover URLs SHALL be resolved only when a hero or drawer that displays them is rendered, not eagerly for every property in the portfolio.

#### Scenario: Portfolio load does not sign every cover

- **WHEN** the home page loads its list of properties
- **THEN** cover URLs are not signed until a specific property's drawer or hero is shown
