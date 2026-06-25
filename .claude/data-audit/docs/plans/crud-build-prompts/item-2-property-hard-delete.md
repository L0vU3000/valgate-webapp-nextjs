# Item 2 — Full property hard-delete (cascade + S3 cleanup)

> Executable build plan. Backend = **Neon Postgres + Drizzle** (never Convex). This item
> introduces an **approved schema change** (FK cascade rules) and an **irreversible capability**.
> Follow the migration gate. Run **after item-1** so deletes are audit-logged.

## Owner decision (D1) — GATED HARD-DELETE (approved)
Build the full cascade delete, reachable ONLY behind: typed exact property-name confirm
+ admin/owner role + an audit-log row recording what was destroyed. (Archive-only and
empty-only alternatives were declined.)

## Why
Phase 2 built the delete UI but the DB blocks it: 21 FKs reference `properties.id` (plus a
transitive tree) with **zero cascade rules**, so deleting a property with any children fails.
And photos/documents live as S3 objects that a raw DB delete would orphan. This makes a
property fully deletable — DB rows cascade, S3 files get cleaned, and the act is audited.

## Decisions (resolved — build exactly this)
- **DB cascade, not app-level ordered delete** — 21+ FKs across 9 tables + transitive chains;
  the DB does it atomically, an app-level ordered delete is fragile/partial-failure-prone.
- **S3 order mirrors `deleteDocument`:** gather storage ids BEFORE the delete (rows vanish after),
  do the atomic cascade delete, THEN best-effort S3 cleanup (a storage hiccup must not make a
  successful delete look failed).
- **Counts-then-cascade:** expand `countPropertyCascade` to count ALL child categories for the
  confirm dialog's blast-radius display; REMOVE the Phase-2 "refuse if children" guard.

## Migration gate (this item changes the schema)
1. Edit the FK definitions (below) across the schema files.
2. `npm run db:generate` → **STOP and show the generated `drizzle/000N_*.sql` for human review.**
   Verify each line is `DROP CONSTRAINT … ; ADD CONSTRAINT … ON DELETE CASCADE/SET NULL`, constraint
   names match `<table>_<col>_<reftable>_<refcol>_fk`, and the 3 set-null ones are SET NULL.
3. Test on a **Neon dev branch**: seed a property with a row in every child table + a document +
   pillar_verification/evidence/events, delete it, confirm full cascade + the 3 set-nulls + no FK
   error + no orphans. THEN the real DB. Never `seed:reset`.

## Tasks
1. **Add `onDelete: "cascade"`** to these notNull subtree FKs:
   `property.ts:88, 107` · `rental.ts:19, 35, 75` · `ownership.ts:26, 45, 72, 92` ·
   `safety.ts:23, 40, 57, 74, 89` · `documents.ts:17, 31` · `verification.ts:20` · `estate.ts:39`.
   **Transitive cascade:** `rental.ts:56` payments.leaseId · `verification.ts:36/37`
   verificationEvidence.{verificationId,documentId} · `verification.ts:43` verificationEvents.verificationId ·
   `documents.ts:32` documents.folderId.
   **`onDelete: "set null"`** (the nullable property FKs): `rental.ts:55` payments.propertyId ·
   `estate.ts:55` estateActivityEvents.propertyId · `notifications.ts:17` notifications.propertyId ·
   **`activities.propertyId`** (from Item 1 — audit rows must survive, and not block, a property delete.
   If Item 1 already set this to `set null`, confirm it and skip; otherwise add it here).
   (`ownership.ts:79` ownershipDocuments.ownershipRecordId is notNull but has NO FK — logical only;
   it's removed via its own propertyId cascade. Nothing to change.)
2. **Rewrite `deleteProperty`** (`lib/services/properties.ts:51-55`): (a) collect
   `property.photoStorageIds` + every property document's `storageId`/`thumbStorageId` via
   `listDocuments(ctx, id)`; (b) `scopedDelete(ctx, properties, id)` (admin+org gate inside) — the
   atomic cascade; (c) best-effort loop `deleteStorageObject(sid)` (already never-throws). Import
   `listDocuments` + `deleteStorageObject`.
3. **Expand `countPropertyCascade`** (`lib/services/properties.ts:71-100`): keep leases/payments/
   documents as headline counts, add the remaining child categories as a `total` / "and N other
   records". All counts org-scoped.
4. **Update `deletePropertyAction`** (`app/(shell)/property/actions.ts:163-207`): REMOVE the
   refuse-if-children block (lines ~186-196); KEEP role gate + org/existence + typed-name match; call
   the now-cascading `deleteProperty`; add the audit log (this is item-1 site 13 — capture name first).
   Update the doc comment at ~148-162 (point #4 is now "cascade atomically; counts shown beforehand").
5. **Confirm dialog** — ensure the Phase-2 typed-confirm surfaces the full counts from task 3.

## Acceptance
- Deleting a property with children removes it + all children + their S3 files, with no FK error,
  and leaves a `property/deleted` activity row (requires item-1). Cross-org/cross-property data untouched.
- Delete still requires typing the exact name + admin/owner role; a viewer is rejected server-side.
- `npx tsc --noEmit` clean. Add a vitest for the expanded `countPropertyCascade`.

## Stop conditions
- STOP for human review of the generated migration SQL before applying to the real DB.
- STOP and ask before changing any FK not listed above.
- Never commit/push. Output `✅ [task]` after each.
