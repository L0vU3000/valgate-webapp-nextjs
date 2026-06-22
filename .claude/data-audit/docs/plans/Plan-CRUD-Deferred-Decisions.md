# Plan — the 5 deferred owner decisions

> Follow-up to the CRUD/workflow build (phases 0–6). These are the items the autonomous run
> deliberately did NOT do because they need a schema change or a product decision. Written for
> a frontend-expert / backend-beginner: each item explains *what*, *why*, a recommendation, and
> the concrete steps. Backend stack = **Neon Postgres + Drizzle** (never Convex).

## First — how a schema change works here (read once)
You almost never write SQL by hand. The flow is:
1. Edit the Drizzle schema in `lib/db/schema/*.ts` (TypeScript — describes the tables).
2. `npm run db:generate` — Drizzle reads your edit and writes a `.sql` migration file. **Read that
   SQL** before applying; it's the source of truth for what will change.
3. `npm run db:migrate` — applies the SQL to the database.
4. `npm run db:ping` to confirm the connection; the app picks up the new types automatically.

**Safety:** do this against a **Neon dev branch first**, verify, then run on prod. **Never run
`seed:reset`** (it wipes the evolved seed data). These five are independent — do them in any order,
but the recommended sequence is at the bottom.

---

## 1. Create a general `activities` table  ★ recommended first
**What / why (plain):** Every delete/edit in a sensitive app should leave a trail — "who did what,
when". Phase 0 built a `logActivity()` helper, but the only audit table that exists
(`estate_activity_events`) is locked to estate/document/successor events. So today, property
deletes, payments, work orders, etc. write nothing — there are `// TODO: audit` markers all over
phases 1–5, and the Phase 6 activity-log screen has nothing to show.

**Recommendation:** Create one general-purpose `activities` table (cleaner than stretching the
estate enum, which would mix unrelated concepts). Model it on the existing
`estate_activity_events` table so it feels native:

```ts
// lib/db/schema/activity.ts  (new file, add to schema/index.ts)
export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),       // who did it (Clerk user id)
  entity: text("entity").notNull(),         // "property" | "document" | "payment" | ...
  entityId: text("entity_id").notNull(),    // the affected row's id
  action: text("action").notNull(),         // "created" | "updated" | "removed" | "archived" | ...
  summary: text("summary").notNull(),       // human line: "Deleted 3 documents"
  propertyId: text("property_id").references(() => properties.id),  // nullable, for the per-property panel
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [ index("ix_activities_org").on(t.orgId), index("ix_activities_property").on(t.propertyId) ]);
```
> Use plain `text` for `entity`/`action` (not a Postgres enum) so adding a new event type later
> needs zero migration.

**Then:** point `logActivity()` at this table, delete the enum guard, and remove the `// TODO: audit`
markers across phases 1–5 (wire the real call). Finally, the Phase 6 activity-log UI
(`06-hardening-audit-qa.md` task 1) can be built: a read-only list on the property page + an
org-level view, both org-scoped.

**Effort:** Medium. **Risk:** Low (new table, nothing else changes shape).
**Done when:** a property delete writes an `activities` row; the activity-log screen shows it.

---

## 2. Add cascade deletes so a property can actually be deleted
**What / why (plain):** Phase 2 built guarded hard-delete, but right now it *refuses* to delete any
property that still has leases/payments/documents/etc., because the database is set to block
deletes that would leave "orphan" child rows (the default, called RESTRICT). ~21 child tables
point at `properties.id`. To delete a property fully, those children must go too.

**Two ways to do it (pick the hybrid):**
- **DB cascade** — tell Postgres "when a property is deleted, delete its children automatically"
  (`onDelete: "cascade"`). Least code. **But** it bypasses app code, so it will NOT clean up the
  S3 files behind `documents` and `property_images` — leaving orphaned storage (cost + privacy).
- **App-level ordered delete** — delete children in code before the property. More code, but you
  control S3 cleanup. Matches your "explicit over clever" preference.

**Recommendation — hybrid:** In the `deleteProperty` service, first delete the property's
**documents and images via the existing Phase-1 helpers** (so S3 is cleaned), then let **DB cascade**
handle the purely-relational children (leases, payments, ownership, valuations, safety, verification,
notifications). Best of both: storage stays clean, and you don't hand-write 20 delete calls.

**Schema changes:** add `{ onDelete: "cascade" }` to the `notNull` property FKs in
`safety.ts` (5), `ownership.ts` (4), `rental.ts` (3 notNull), `property.ts` (images, valuations),
`verification.ts` (1), `estate.ts` (assignments). Use `{ onDelete: "set null" }` for the *nullable*
ones (`notifications.ts`, `estate_activity_events.propertyId`, `rental.ts:55`) so history survives.
**Also** cascade the transitive FKs that point at `leases.id` (e.g. `lease_payments`, `lease_parties`)
so the whole chain completes — verify these while editing.

**Effort:** Medium (mechanical, but review the generated SQL carefully). **Risk:** Medium — cascade
deletes are powerful; the typed-confirm + admin-only gate from Phase 2 is the safety net. Test on a
dev branch with a throwaway property.
**Done when:** deleting a property with children removes it + all children + their S3 files, and
cross-property data is untouched.

---

## 3. Add the two missing statuses (Work Order "Cancelled" + Client "Inactive")
These are two different layers — that's why one is a migration and one isn't.

**3a. Work Order "Cancelled" (Postgres enum — small migration):**
Add `"Cancelled"` to `maintenanceStatusEnum` in `lib/db/schema/safety.ts:17`
(`["Open","InProgress","Resolved","Cancelled"]`), run generate/migrate. Note: Postgres adds enum
values with `ALTER TYPE ... ADD VALUE` — Drizzle handles it, but it can't be undone in the same
migration, so get the spelling right. Then wire the "Cancel work order" action + button — the
Phase-4 confirm plumbing is already in place.

**3b. Client "Inactive" (NOT a database change):**
Clients live in the **filesystem layer**, not Postgres (`lib/data/types/client.ts`,
`lib/data/db/clients.ts`). So just add an optional field to the Zod schema:
`status: z.enum(["Active","Inactive"]).optional()` (default Active), handle it in the FS read/write,
and add an Archive/Reactivate affordance behind a confirm. No migration at all.

**Effort:** Small (both). **Risk:** Low.
**Done when:** a work order can be Cancelled; a client can be set Inactive and filtered out of the
active book.

---

## 4. Persist drafts + alert dismissals server-side  (lower priority)
**What / why (plain):** Two things currently live only in the browser, so they don't follow the user
across devices or survive a cache clear: add-property **drafts** and **alert dismissals**.

**4a. Drafts → a `property_drafts` table:**
```ts
export const propertyDrafts = pgTable("property_drafts", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  step: integer("step").notNull(),
  form: jsonb("form").notNull(),   // the whole in-progress form, stored as JSON
  createdAt: timestamp(...).defaultNow(), updatedAt: timestamp(...).defaultNow(),
});
```
Keep localStorage as a fast local cache; the table is the durable copy. Add service + actions
(create/update/delete/list), wire the existing draft UI to them. **Effort:** Medium.

**4b. Alert dismissals → an `alert_dismissals` table:**
Alerts are *derived* (computed from leases + notifications), so there's no row to "mark dismissed".
Store dismissals separately: `(orgId, userId, alertKey, dismissedAt)`, and filter derived alerts
against it. **Effort:** Medium. **Recommendation:** do 4a (drafts) if losing a half-finished
property is a real pain point; treat 4b (alerts) as nice-to-have — derived-data dismissal that
resets on reload is acceptable for launch.

**Risk:** Low. **Done when:** a draft started on one device appears on another; a dismissed alert
stays dismissed after reload.

---

## 5. MFA — decide: leave disabled, or implement
**What / why (plain):** Phase 6 made the multi-factor login path fail gracefully instead of
dead-ending, but second-factor login is **not implemented**. (Device-trust email verification on
unrecognised devices already works — that's separate.)

**The decision (no schema involved — it's Clerk + frontend):**
- **Leave disabled (recommended for launch):** simplest; the device-trust email step already adds a
  factor for new devices. Make sure MFA is turned off in the Clerk dashboard so no user can enable
  it and hit the unimplemented path. **Effort:** tiny.
- **Implement** TOTP (authenticator app) and/or SMS via the Clerk Future/Signals API (this project's
  version): add enrolment UI in settings + a verify step in login. **Effort:** Medium, frontend-heavy
  — squarely in your wheelhouse. Worth it only if a customer/compliance requirement demands it.

**Recommendation:** Leave disabled now; revisit if a client requires MFA. **Done when:** either MFA
is cleanly off in Clerk, or enrol + login-with-second-factor both work end to end.

---

## Recommended sequence
1. **#1 activities table** — unblocks the audit trail (matters most for sensitive data) and finishes the Phase 6 log screen.
2. **#2 cascade deletes** — makes Phase 2 hard-delete actually usable.
3. **#3 statuses** — small, finishes Phase 4's deferred task.
4. **#4 drafts** (skip/defer alerts) — quality-of-life.
5. **#5 MFA** — a decision, not necessarily work; default to "leave disabled".

Items #1–#3 are the ones I'd do before calling the CRUD work "done". #4–#5 are optional/decision.

## Effort summary
| # | Item | Layer | Effort | Blocks |
|---|---|---|---|---|
| 1 | `activities` table | Postgres (new table) | M | Audit trail + Phase 6 log UI |
| 2 | Cascade deletes | Postgres (FK edits) + service | M | Full property hard-delete |
| 3a | WO "Cancelled" | Postgres (enum) | S | Phase 4 task 6 |
| 3b | Client "Inactive" | FS layer (no migration) | S | Phase 4 task 6 |
| 4a | Draft persistence | Postgres (new table) | M | cross-device drafts |
| 4b | Alert dismissals | Postgres (new table) | M | persistent dismissals |
| 5 | MFA | Clerk + frontend | S (off) / M (build) | login hardening |
