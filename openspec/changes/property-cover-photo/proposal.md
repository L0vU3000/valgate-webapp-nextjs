## Why

A property has no single "cover photo." Today the concept is fragmented and stubbed:

- The **overview hero** renders a Mapbox map, not any photo.
- The **home map drawer** renders the *same hardcoded Unsplash stock photo for every property* — a placeholder that violates the project's "no mocks, no stubs" UI rule.
- A property's real photos live in **two disconnected stores** that never talk: `properties.photoStorageIds` (the sidebar gallery, where "cover" is implicitly index 0) and the `documents` table (`kind = "photo"`, the Documents tab).

Users have asked to (a) set/change a cover photo, (b) pick it from the photos already uploaded to the property *and* upload new ones in the same modal, and (c) have the overview hero and home drawer reflect that cover (falling back to the map). All of that needs one thing to exist first: a property-level cover photo that every surface can read.

## What Changes

- Introduce an explicit **cover photo** on a property: a new nullable `coverStorageId` column on `properties`. The cover is now "this one photo, wherever it lives" — decoupled from the `photoStorageIds` array ordering.
- Add a server helper that **lists every photo on a property** by unioning `documents` (`kind = "photo"`) with `photoStorageIds`, deduped by storage id, each resolved to a short-lived signed display URL.
- Add a server action to **set the cover** to any of those storage ids, and to **upload a new photo** inside the picker — a new upload also becomes a `documents` row (`kind = "photo"`, `category = "Photos"`) so it is never an orphan.
- Add a **"Select cover photo" picker modal**: a single grid of the property's existing photos with an upload/drop tile, selection + current-cover states, and Cancel/Save (Tripadvisor/Cosmos pattern).
- **Overview hero** reads the cover: signed cover URL → else the Mapbox map → else placeholder. Add a "Change cover" affordance on the hero that opens the picker.
- **Home map drawer hero** reads the cover with the same fallback ladder, **removing the hardcoded Unsplash `src`**. Add a small **"Edit property"** button in the drawer that routes to `/property/[id]/overview?edit=1` (the overview auto-opens its existing edit wizard from that param).
- A cover URL is resolved **lazily** (when a hero/drawer actually renders), not eagerly for the whole portfolio.

## Capabilities

### New Capabilities
- `property-cover-photo`: A property has one designated cover photo, chosen from all photos uploaded to it (documents + gallery) or newly uploaded, and surfaced on the overview hero and home map drawer with a map/placeholder fallback.

### Modified Capabilities
<!-- None: property photos and the home page have no existing OpenSpec capability spec; this is all net-new behavior captured under the new capability above. -->

## Impact

- **Schema**: new nullable `coverStorageId` column on `properties` (one migration; no backfill — existing properties simply have no cover and fall back to the map).
- **Services**: `lib/services/properties.ts` (read/write `coverStorageId`); reuse `lib/services/documents.ts` and `lib/services/storage.ts` (presign + signed URLs) for the unified photo list.
- **Actions**: extend `app/actions/property-photos.ts` (list-all-photos, set-cover-by-storage-id, upload-new-as-document); the existing presign/attach/delete flow is reused.
- **UI**: new cover picker modal component; `PropertyOverviewPage.tsx` hero; `app/(shell)/_components/HomePage.tsx` drawer hero + edit button; overview page reads `?edit=1` to auto-open `PropertyProfileWizard`.
- **Types/queries**: `HomeProperty` already carries `photoStorageIds`; add `coverStorageId` to the `Property` type and select it in the home + overview queries.
- **Non-goals**: not collapsing the two photo stores into one, not touching the sidebar `PropertyPhotoManager` behavior, not the wizard stepper→tabs work (separate change).
