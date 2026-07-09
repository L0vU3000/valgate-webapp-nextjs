## Context

A property's photos are split across two stores that don't reference each other:

1. **`properties.photoStorageIds`** — an ordered `text[]` on the property row. The sidebar `PropertyPhotoManager` reads/writes it; "cover" is a convention (index 0). Uploading here does **not** create a document.
2. **`documents` table** — rows with `kind = "photo"` (`category = "Photos"`) shown in the Documents tab. Each has its own `storageId`. These are **not** in `photoStorageIds`.

Meanwhile the two places a "hero" appears don't show a property photo at all: the overview hero renders a Mapbox map, and the home map drawer renders a **hardcoded Unsplash URL** (`HomePage.tsx:304`) identical for every property — a stub that breaks the project's "no mocks" rule.

Storage ids are opaque S3 keys; the bytes are not directly browsable, so any photo shown in the browser needs a short-lived signed URL from `lib/services/storage.ts` (the same presign/sign path documents and gallery photos already use).

Constraints: Server Components by default; DB access only through `lib/services/*` called from Server Actions; validate + authenticate + authorize every mutation (org-scoped, IDOR-safe); never return raw error messages; select only what the UI needs.

## Goals / Non-Goals

**Goals:**
- One explicit, property-level "cover photo" that every surface reads from a single field.
- A picker that shows *all* photos already on the property (both stores) and can upload new ones in the same modal.
- Overview hero and home drawer both reflect the cover, with a map → placeholder fallback ladder, killing the Unsplash stub.
- Reuse the existing presign/sign/attach/delete plumbing; minimal new backend surface.

**Non-Goals:**
- Collapsing the two photo stores into one (bigger refactor; deferred).
- Changing the sidebar `PropertyPhotoManager` behavior or the `photoStorageIds` cover-is-index-0 convention it uses internally.
- The edit-wizard stepper → section-tabs work (tracked as a separate change).
- Cropping/repositioning the cover (out of scope; pick-only).

## Decisions

### D1: Store the cover as a dedicated `coverStorageId` column (not array reorder)

Add a nullable `coverStorageId text` column to `properties`. "Set cover" writes the chosen storage id to it; every reader signs that id.

- **Why:** The cover now has three independent readers (overview hero, home drawer, picker's "current cover" badge) and can point at a photo that lives *only* in `documents` — which is not in `photoStorageIds` at all. Encoding "cover = index 0 of the gallery array" forces document-photos into the gallery array and muddies what that array means.
- **Alternative considered — prepend into `photoStorageIds[0]`:** zero migration, but pollutes the gallery array with photos the user only chose as a cover, and every reader must still learn the index-0 convention. Rejected: implicit coupling for no real saving.
- **Alternative considered — collapse stores:** correct long-term, far larger blast radius. Deferred.

### D2: Unified photo list = documents(kind=photo) ∪ photoStorageIds, deduped by storage id

A new server action returns `{ storageId, url, source }[]` for a property, unioning both stores, deduped by `storageId`, each signed. Org scope enforced by reading the property (and documents) scoped to `ctx.orgId`, exactly like the existing `getPropertyPhotoUrls`.

- **Why:** Matches the user's mental model ("all the photos I've uploaded") without merging the stores. Single grid, one source of truth for the picker.
- **Alternative — two tabs (Existing / Upload):** more UI, and still needs the same union for "existing." A single grid (Tripadvisor/Cosmos pattern) is simpler and is what was asked for.

### D3: New uploads in the picker become a document (`kind=photo`, `category=Photos`)

The picker's upload reuses the presign → POST bytes → record flow, but records the new photo as a **document** (via `documents` service) rather than only appending to `photoStorageIds`.

- **Why:** A photo uploaded "to set as cover" should not be a hidden orphan; recording it as a Photos document makes it show up in the Documents tab and in the unified list next time. It also means the cover can point at a real, listable object.
- **Note:** the property must be able to store a document in its own org even when a manager acts on a client's portfolio — reuse `createDocumentForOrg` if that path applies (mirrors existing manager-on-behalf handling).

### D4: Resolve cover URLs lazily, per surface

The overview hero already renders client-side; it fetches its cover URL when it mounts (same as `PropertyPhotoManager` fetches gallery URLs). The home drawer fetches the cover URL when a property is selected/opened, not for the whole list.

- **Why:** Signing every property's cover up front is wasted work for a map of many pins where at most one drawer is open at a time. Signed URLs are short-lived anyway, so eager signing can also go stale before use.
- **Alternative — sign all covers in the home query:** simpler call site, but O(properties) signing on every home load and staleness risk. Rejected.

### D5: Home "Edit property" reuses the overview wizard via `?edit=1`

`HomePage` lives outside the property shell, so it cannot call `openPropertyWizard()`. The drawer's edit button navigates to `/property/[id]/overview?edit=1`; the overview reads that param on mount and opens the existing `PropertyProfileWizard`.

- **Why:** Reuses the entire existing edit flow with zero new wizard state or lifting. One param + one effect.
- **Alternative — lift the wizard so it opens over the map:** more state, more code, only useful if editing-without-leaving-the-map is a hard requirement. Not requested.

### D6: Fallback ladder is identical on both heroes

`cover (signed) → property Mapbox static map (if lat/lng) → neutral placeholder`. Extract the decision so overview and drawer behave the same.

## Risks / Trade-offs

- **Signed-URL latency / flash** on the client-fetched hero → show the map (or a skeleton) until the cover URL resolves, so the hero never flashes empty; reuse the loading pattern already in `PropertyPhotoManager`.
- **Deleting the underlying photo leaves a dangling `coverStorageId`** → when signing fails or the id is gone, fall back to the map; optionally clear the stale `coverStorageId` on read. No hard error surfaced to the user.
- **Two stores still exist** → the union list can show what looks like duplicates if the same file was uploaded to both stores as different objects. Dedup is by `storageId`, so genuinely-different uploads show twice (acceptable; they are different objects).
- **Manager-on-behalf org scoping** → uploading a cover document for a managed client's property must file under the client's org, not the manager's (D3 note); miswiring would hide the photo from the client. Mitigate by reusing the existing `createDocumentForOrg` path and its `assertOrgAdmin` check.

## Migration Plan

1. Add nullable `coverStorageId` column to `properties` (`db:generate` → `db:migrate`). No backfill — existing rows get `null` and fall back to the map, so the change is backward-compatible and safe to deploy before any UI ships.
2. Ship the service/action layer (read/write `coverStorageId`, unified list, upload-as-document).
3. Ship the picker modal + overview hero wiring.
4. Ship the home drawer wiring (remove the Unsplash `src`) + edit button.
5. Rollback: revert UI; the column can remain unused and null (no destructive step). Never run `seed:reset`.

## Open Questions

- Should selecting a **document** photo as cover also add it to `photoStorageIds` (so the sidebar gallery shows it too), or stay purely a `coverStorageId` pointer? Leaning: pointer only — keep the stores independent.
- Should the picker allow **clearing** the cover (revert to map), or only swapping it? Leaning: allow clear, since "no cover → map" is already a valid state.
