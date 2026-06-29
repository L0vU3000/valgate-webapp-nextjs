# Item 1 — General `activities` audit table + activity-log UI

> Executable build plan. Backend = **Neon Postgres + Drizzle** (never Convex). This item
> introduces an **approved schema change** (a new table) — follow the migration gate below.
> Recommended run order across the deferred items: **item-3 → item-1 → item-2** (do this one
> BEFORE item-2 so property deletes get audited).

## Why
Phase 0 built `logActivity()`, but the only audit table (`estate_activity_events`) is enum-locked
to 7 estate/document/successor kinds. So 13 mutation sites across phases 1–5 left
`// TODO: audit once activities table exists` and write nothing, and the Phase 6 activity-log UI
had no data to show. This creates a general audit trail and the read-only screens to view it.

## Decisions (resolved — build exactly this)
- **Columns:** plain `text` for `entity` and `action` (NO enum) — so new event types never need a migration.
- **ID:** `crypto.randomUUID()` default, NOT the `nextId` counter (append-only high-volume log; avoids the global `id_counters` lock and the missing "ACT" collection). This means a small dedicated insert, not `scopedInsert` — but it MUST keep the same guards (`assertCanMutate()` + `requireMember(ctx)`) and stamp `orgId`/`userId`.
- **Dual-write (non-breaking):** `logActivity` ALWAYS writes the new `activities` row; ADDITIONALLY, when the (entity,action) still maps to one of the 7 estate kinds, it ALSO writes `estate_activity_events` exactly as today. Remove the "throw on unsupported kind" behavior. This keeps the existing estate timeline (`listEstateActivityEvents`) un-regressed while `activities` becomes the complete superset.
- **UI (D2 = both):** a read-only "Recent activity" panel on each property page AND an org-wide `/activity` page. Both call one `listActivities` service. Server-rendered reads (no new server action).

## Migration gate (this item changes the schema)
1. Edit `lib/db/schema/activities.ts` (new) + register in `lib/db/schema/index.ts`.
2. `npm run db:generate` → **STOP and show the generated `drizzle/000N_*.sql` for human review.**
3. Apply on a **Neon dev branch** (`npm run db:migrate`), verify, THEN the real DB. Never `seed:reset`.

## Tasks
1. **Schema** — new `lib/db/schema/activities.ts` modeled on `estateActivityEvents`
   (`lib/db/schema/estate.ts:48-61`): `id` (text PK, `$defaultFn(() => crypto.randomUUID())`),
   `orgId` (FK organizations, notNull), `userId` (text), `entity` (text), `action` (text),
   `entityId` (text, nullable), `title` (text), `description` (text), `propertyId` (FK properties,
   nullable), `createdAt`/`updatedAt`. Indexes `ix_activities_org`, `ix_activities_property`.
   Add `export * from "./activities";` to `lib/db/schema/index.ts`. Add Zod type
   `lib/data/types/activity.ts` mirroring `estate-activity-event.ts`.
2. **Rewrite `logActivity`** (`lib/services/activity.ts:99-129`): widen `LogActivityInput.entity/action`
   to `string`; do the dedicated UUID insert into `activities` with `assertCanMutate()` +
   `requireMember(ctx)` + `orgId`/`userId` stamping; keep the estate dual-write for the 7 mapped kinds;
   delete the unsupported-kind throw.
3. **Read service** — new `lib/services/activities.ts`: `listActivities(ctx, propertyId?, limit=50)`
   mirroring `lib/services/estate-activity-events.ts:13-21` (org-scoped, `desc(createdAt), asc(id)`, `.limit`).
4. **Wire the 13 TODO sites** — add `await logActivity(ctx, {...})` after each successful mutation,
   before `revalidate*`, inside an inner `try/catch` so an audit hiccup can't roll back the real change.
   Remove each TODO comment. Sites (entity / action):
   - `app/(pro)/pro/actions.ts:61` markRentPaid → `payment` / `updated`
   - `app/(pro)/pro/actions.ts:98` logRentPayment → `payment` / `created` (propertyId = lease.propertyId)
   - `app/(pro)/pro/actions.ts:216` updateWorkOrder → `workOrder` / `updated`
   - `app/(pro)/pro/actions.ts:318` resolveSafetyRisk → `safetyRisk` / `updated`
   - `app/actions/folders.ts:65` deleteFolder → `folder` / `deleted`
   - `app/actions/co-owners.ts:55` removeCoOwner → `coOwner` / `deleted` (propertyId = existing.propertyId)
   - `app/actions/professionals.ts:48` deleteProfessional → `professional` / `deleted`
   - `app/actions/property-photos.ts:90/127/163` → `photo` / `added` · `removed` · `updated` (propertyId set)
   - `app/(shell)/property/actions.ts:108` archive → `property` / `updated`
   - `app/(shell)/property/actions.ts:120` restore → `property` / `updated`
   - `app/(shell)/property/actions.ts:199` delete → `property` / `deleted` (capture name first; propertyId omitted)
   (Sites 1-4 use `authCtx`; 5-13 use `ctx`.)
5. **UI** — per-property "Recent activity" read-only card on `app/(shell)/property/[id]/overview/`;
   org-wide read-only page `app/(shell)/activity/page.tsx` calling `listActivities(ctx, undefined, N)`.
   Show actor/action/entity/time; cap at latest N with a "showing latest N" note. Use `/impeccable harden`
   for the empty state ("No activity yet").

## Acceptance
- Running each of the 13 actions writes a row visible on `/activity` AND the per-property panel.
- The estate timeline still shows successor/document/estate events (no regression).
- `npx tsc --noEmit` clean. Add vitest: `logActivity` still dual-writes the 7 estate kinds; `listActivities` org-scopes + caps at limit.

## Stop conditions
- STOP for human review of the generated migration SQL before applying to the real DB.
- STOP and ask before any schema change beyond the single `activities` table.
- Never commit/push. Output `✅ [task]` after each.
