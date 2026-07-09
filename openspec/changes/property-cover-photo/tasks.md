## 1. Schema & types

- [x] 1.1 Add nullable `coverStorageId text` column to `properties` in `lib/db/schema/property.ts`
- [x] 1.2 Hand-author migration `0024_property_cover_storage_id.sql` + journal entry (drizzle-kit generate blocked); applied via `npm run db:migrate`; verified live via Neon MCP (nullable text, no backfill)
- [x] 1.3 Add `coverStorageId?: string` to the `Property` type in `lib/data/types/property.ts` (`PropertyMediaSchema`)
- [x] 1.4 Confirmed: `db.select().from(properties)` selects all columns and `toDomain` maps `cover_storage_id`→`coverStorageId`, so it flows to every `Property` read incl. `HomeProperty`

## 2. Services

- [x] 2.1 `lib/services/properties.ts`: added `setCoverPhoto(ctx, id, storageId|null)` (dedicated fn so clearing writes SQL NULL, which `PropertyPatch`'s type can't express); reads flow via existing `getProperty`
- [x] 2.2 Unified photo list implemented at the action layer (`listPropertyPhotos`) orchestrating `getProperty` + `listDocuments` — no new DB query needed; keeps Drizzle in the services
- [x] 2.3 Confirmed `resolveDocumentUrl` (storage service) signs any storage id; imported at top-level and reused
- [x] 3.1 Added `listPropertyPhotos(propertyId)` → `CoverPhoto[]` `{ storageId, url, source, isCover }` (signed, gallery∪documents deduped, org-scoped/IDOR-safe)
- [x] 3.2 Added `setPropertyCover(propertyId, storageId)` → verifies id ∈ property's photos then `setCoverPhoto`; generic errors only
- [x] 3.3 Added `clearPropertyCover(propertyId)` → `setCoverPhoto(null)`
- [x] 3.4 Added `getPropertyCoverUrl(propertyId)` → signed URL or null (missing/expired cover degrades to null → map)
- [x] 3.5 Added `attachPropertyPhotoAsDocument` → records a `Photos` document (reuses `presignPropertyPhotoUpload`). Uses plain `createDocument` (own-org), matching existing gallery photo-action scope; cross-org via `createDocumentForOrg` deferred (parity with current behavior)
- [x] 3.6 `revalidateFeTag("properties")` + activity log on set/clear/upload

## 4. Cover picker modal

- [x] 4.1 Built `components/property/SelectCoverPhotoModal.tsx`: single grid of the unified photo list, upload tile as the first cell
- [x] 4.2 Selection state (primary ring + check) + current-cover ★ badge; Cancel / Save footer + "Remove cover"
- [x] 4.3 Loading / error / empty states mirroring `PropertyPhotoManager`
- [x] 4.4 Upload-in-modal (reuses presign → `attachPropertyPhotoAsDocument`), drag-and-drop onto the grid, image-only validation
- [x] 4.5 On Save call `setPropertyCover`/`clearPropertyCover`; `onCoverChanged` updates the hero optimistically; toasts on success/failure
- [x] 5.1 Added shared `lib/property-hero.ts` `pickHeroImage(coverUrl, mapUrl)` → cover → map → null(placeholder)
- [x] 5.2 `PropertyOverviewPage.tsx` fetches the cover url on mount (`getPropertyCoverUrl`) and renders cover-or-map in the hero
- [x] 5.3 Added a "Change cover" control on the hero opening `SelectCoverPhotoModal`
- [x] 5.4 Overview reads `?edit=1` (`useSearchParams`) and auto-opens `PropertyProfileWizard`
- [x] 6.1 `HomePage.tsx`: removed the hardcoded Unsplash `src`; fetches the cover url when a drawer opens (keyed on `selectedPin`)
- [x] 6.2 Drawer hero renders cover → map → placeholder via the shared ladder (`ImageWithFallback` covers the placeholder tier)
- [x] 6.3 Added a small "Edit property" button in the drawer title overlay → `/property/[id]/overview?edit=1`
- [x] 7.1 `tsc` clean (0 errors) + eslint clean on all changed files (0 errors; only pre-existing unused-var warnings)
- [ ] 7.2 Manual QA (live): set a cover from an existing document photo; from a gallery photo; from a fresh upload — hero + drawer both reflect it, and the upload appears in the Documents tab
- [ ] 7.3 QA fallbacks (live): property with no cover shows the map; no cover + no coords shows the placeholder; deleted cover photo falls back cleanly
- [ ] 7.4 QA org isolation (live): picker never lists another org's photos; home edit button opens the wizard on the overview
