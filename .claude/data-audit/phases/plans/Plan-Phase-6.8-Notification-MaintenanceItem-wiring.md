# Plan — Phase 6.8: Notification + MaintenanceItem wiring (Rank 8, two-page entity, wire-only)

## Context

Notification + MaintenanceItem is **rank 8 — the final 6.x phase** in the build order (`pages/SUMMARY.md`) with 4 surfaces unlocked across 2 pages: 1 on `/property/[id]/overview` (row 16, HVAC Fault item in the alerts strip) and 3 on `/property/[id]/rental` (rows 28-30, the Maintenance card with count + 2 items). Phase 6.8 is **wire-only** — both entities exist with full Zod (Batch 3) and have seeds for PROP-0001. The work is split between resolving Q4.F (the long-deferred "Auto-create Notification rows on events?" question) and connecting two small surfaces sets to two existing entities.

**Q4.F resolution — committed up-front in this plan.** Q4.F asks:

> **Q4.F — Auto-create Notification rows on events?** E.g., document uploaded, lease expiring soon, certificate expiring. Cron-driven (Convex scheduled function) or event-driven (mutation side-effects)? Both?

**Decision: HYBRID per source.** Reasoning:

1. **Auto-creation needs infrastructure not present in FS demo era.** Cron-driven Notification creation needs a Convex scheduled function (or equivalent). Event-driven needs server-action mutation hooks. Neither exists today; both belong to the backend phase.
2. **Phase 6.1 already established a pattern that works without Notification rows.** Lease-expiring alerts on overview row 16 are *derived at query time* from `Lease.endDate` against the current date. No Notification rows are stored for these. That pattern ships to production unchanged.
3. **Stored Notifications are still useful for things that DON'T derive.** Manually-created alerts (admin sends "Inspection scheduled for next Tuesday"), or alerts that survive across system events (a maintenance issue that needs to stay surfaced even when the underlying MaintenanceItem changes status), need a stored row. NOTIF-0001 (burst pipe alert) is exactly this case: it exists separately from MAINT-0001 (the maintenance issue itself) so it can persist as an alert.
4. **Rendered alerts strip becomes a UNION of three sources:**
   - Derived lease-expiring alerts (Phase 6.1 — already wired)
   - Derived maintenance alerts (NEW: open MaintenanceItem with severity=Emergency or Urgent → render as alert. Optional; can be deferred if scope creep.)
   - Stored Notification rows for the property (NEW in 6.8)

**For Phase 6.8 scope, default = sources (1) + (3) only.** Skip the derived-maintenance-alerts source — keep the alerts strip simple. If Notification entity ever needs the derived bridge, that's a follow-up. Document this in the audit. The current hardcoded HVAC Fault alert maps cleanly to the Notification entity (NOTIF-0001 is exactly this kind of alert).

5. **Notification has no propertyId.** Per the schema, `Notification = {id, userId, category, title, description, createdAt, read, linkTo?}` — there is NO `propertyId` field. Filtering Notifications to a specific property requires either: (a) parsing the `linkTo` URL pattern (e.g. `/property/PROP-0001/safety` → match PROP-0001), or (b) accepting the design that Notifications are user-scoped and ALL of a user's Notifications surface on every property's alerts strip. **Decision: Option (a) — parse `linkTo` for `/property/<id>/` and filter.** This keeps the strip property-scoped without changing the schema. Note as a future improvement: add `propertyId?: idSchema.optional()` to NotificationSchema in a future schema PR (file as Q5.\<next\> if not already tracked).

**MaintenanceItem is straightforward.** It has `propertyId` (required), so filtering to the page's property is one `.filter()` call — same pattern as every other entity wiring since 6.0.

**No PF traps to spring.** The 4 surfaces are inline JSX literals; no module-level constants like `kpiData` or `chartData` to delete (those were sprung in earlier phases). Wire each surface in place.

**4 surfaces breakdown:**
- Row 16 — Overview alerts strip "HVAC Fault" item (lines 150-157, currently hardcoded "Building A — Central unit cooling efficiency below threshold."). Wired via Notification entity, filtered by `linkTo` URL pattern.
- Row 28 — Rental Maintenance card "2 Open" badge (line 369). Wired as `count(maintenanceItems where status='Open')`.
- Row 29 — Rental Maintenance "Leaky faucet — Kitchen" item (lines 375-376). Wired from MaintenanceItem entity.
- Row 30 — Rental Maintenance "HVAC Filter Replacement" item (lines 382-383). Same source as row 29 — same `maintenanceItems` array, second slot.

**Cross-page derivation note:** rows 28, 29, 30 ALL derive from the same filtered `maintenanceItems` array (filtered to property + sorted by severity DESC then date DESC, taking first 2 for display). One rendering pattern, three slots. Same combined-derivation pattern as Phase 6.7 (Folder location-tree rows 19+20 share one derivation).

The intended outcome: 4 hardcoded surfaces become real-data reads; Q4.F resolved with the HYBRID decision documented; both Notification and MaintenanceItem flip from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; **the entire Phase 6 sprint completes** (this is rank 8, the last phase); 2 new per-datapoint audit reports land (per WIRING-PLAYBOOK Step C combined-derivation pattern); overview + rental pages reach near-100% wired.

## Prerequisites

- **Phase 6.0 through 6.7 complete.** All upstream entities shipped (PropertyValuation, Lease+Tenant, Payment+Expense, Document, LandParcel, CoOwner, OwnershipRecord §21, Folder).
- **Phase 6.1 specifically:** the alerts strip on overview row 16 already renders derived lease-expiring alerts; Phase 6.8 ADDS Notification reads to the same strip without removing the derivation.
- **WIRING-PLAYBOOK.md Step C wins read.** Combined-derivation pattern applies (rows 28+29+30 share one derivation).
- **Verified during exploration:**
  - `lib/data/types/notification.ts` exists with full Zod (Batch 3). Fields: id, userId, category (5-enum), title, description, createdAt, read, linkTo?. **No propertyId.**
  - `lib/data/types/maintenance-item.ts` exists with full Zod (Batch 3). Fields: id, userId, propertyId, severity (3-enum: Emergency/Urgent/Standard), title, status (3-enum: Open/InProgress/Resolved), createdAt.
  - Both DB modules exist (`lib/data/db/notifications.ts`, `lib/data/db/maintenance-items.ts`); both exported from `db/index.ts`.
  - 5 Notification seeds total; NOTIF-0001 for PROP-0001 (linkTo="/property/PROP-0001/safety", category="MAINTENANCE", title="Burst pipe at PP00016").
  - 3 MaintenanceItem seeds total; MAINT-0001 for PROP-0001 (severity="Emergency", status="InProgress", title="Burst pipe in kitchen — water shut off").
  - `overview/queries.ts` fetches `propertyValuations, leases, tenants, payments, expenses` — needs notifications + maintenanceItems added.
  - `rental/queries.ts` fetches `leases, tenants, payments, expenses, documents, folders` — needs maintenanceItems added (no notifications needed for rental — only overview alerts strip uses them).
  - PropertyOverviewPage.tsx already has Lease-derived alerts wired (Phase 6.1, lines 133-147). HVAC Fault hardcoded (lines 150-157) — Phase 6.8 target.
  - PropertyRentalPage.tsx maintenance card hardcoded (lines 365-391) — Phase 6.8 target.

## Step 0 — Pre-flight (~10 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog rows.** `pages/property-id-overview/plan.md` §3 Notification entry (row 16). `pages/property-id-rental/plan.md` §3 MaintenanceItem entry (rows 28-30).
2. **Resolve Q4.F now.** Update `ref/05-open-questions.md` Q4.F from "Open" to "Resolved 2026-05-06 in Phase 6.8: HYBRID per source. Lease-expiring alerts derived at query time (Phase 6.1 pattern — no Notification rows stored for these). Manual/cross-cutting alerts read from stored Notification rows (Phase 6.8 — NOTIF-0001 etc.). Auto-creation of Notification rows from events (cron-driven or event-driven mutation hooks) deferred to backend phase when Convex/Neon infrastructure exists." Update PHASES.md "Active Q-number blockers" — strike Q4.F from blockers; add a `(resolved Phase 6.8)` note.
3. **Acknowledge Notification.propertyId schema gap.** File as new Q5.\<next\> in `ref/05-open-questions.md` titled "Notification.propertyId for property-scoped alerts" — open, doesn't block 6.8 (workaround: parse `linkTo` URL), revisit when Notification needs richer property-scoping (e.g. notifications without `linkTo`, or notifications scoped to a property without a deep-link target).
4. **Plan Notification filter for overview row 16.** Use a `linkTo` URL parser: match against pattern `/^\/property\/([^/]+)\//`, extract propertyId, filter to current property. Notifications without `linkTo`, or with `linkTo` that doesn't match the property pattern, are skipped. Document this in audit.
5. **Plan MaintenanceItem display rule for rental rows 29-30.** Filter to property + status="Open" + sort by severity DESC (Emergency > Urgent > Standard) then createdAt DESC. Take first 2 for display. Row 28 count badge uses the unsorted/full open-count (`length` of the filtered-by-status array, before slice).
6. **Spot-check entity catalog.** Both Notification and MaintenanceItem should be in `ref/00-entity-catalog.md` from Batch 3. If missing, add brief sections (~5 min).

## Scope of this change

**Files to MODIFY (4 source files + corpus):**

1. **`app/(shell)/property/[id]/overview/queries.ts`** — extend `OverviewPageData` with `notifications: Notification[]` and `maintenanceItems: MaintenanceItem[]`; extend `Promise.all` with `db.notifications.list(userId)` and `db.maintenanceItems.list(userId)`. Filter Notifications by `linkTo` URL parse → propertyId. Filter MaintenanceItems by `propertyId === current`.
2. **`app/(shell)/property/[id]/rental/queries.ts`** — extend `RentalPageData` with `maintenanceItems: MaintenanceItem[]`; extend `Promise.all` with `db.maintenanceItems.list(userId)`. Filter by propertyId. **Don't** add notifications to rental — only overview alerts strip uses them.
3. **`app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx`** — accept `notifications: Notification[]` and `maintenanceItems: MaintenanceItem[]` props. Replace hardcoded HVAC Fault alert (lines 150-157) with rendered Notification rows (alongside existing Phase 6.1 lease-expiring derivation). **Do NOT touch the Phase 6.1 lease-expiring derivation** — it stays.
4. **`app/(shell)/property/[id]/_components/PropertyRentalPage.tsx`** — accept `maintenanceItems: MaintenanceItem[]` prop. Replace 3 hardcoded surfaces (lines 369, 375-376, 382-383) with: count of open items (line 369) + first 2 items by severity from filtered list (lines 375-376, 382-383). **Do NOT touch other Phase 6.1/6.2/6.3 wiring** in this file.

**Files NOT modified:**

- `lib/data/types/notification.ts` and `lib/data/db/notifications.ts` — settled.
- `lib/data/types/maintenance-item.ts` and `lib/data/db/maintenance-items.ts` — settled.
- `lib/data/db/index.ts` — both entities already exported.
- No other components, no other queries.ts files.
- No seed expansion needed (1 each for PROP-0001 is enough for visual proof; can be expanded post-phase if richer demo wanted).

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 2 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — Notification + MaintenanceItem rows: `not built` → `shipped, fully wired`.
- `.claude/data-audit/pages/SUMMARY.md` — Rank 8 row: same status change.
- `pages/property-id-overview/plan.md` §5 Fix Log — append entry: row 16 alerts strip extended with Notification reads; Q4.F resolved.
- `pages/property-id-rental/plan.md` §5 Fix Log — append entry: rows 28-30 maintenance card wired.
- `ref/05-open-questions.md` — Q4.F: Open → Resolved with date + decision note. Append new Q5.\<next\> for Notification.propertyId schema gap.
- `.claude/data-audit/docs/PHASES.md` — flip 6.8 status emoji (when phase ships); strike Q4.F from "Active Q-number blockers"; add `Plan-Phase-6.8-Notification-MaintenanceItem-wiring.md` to archived plan files NOW (drafted); bump "Last updated."

## Step A — Wiring (~50 min) with per-surface rule annotations

Broken into 3 sub-steps. Run the ★ self-review pass at the end.

### A.1 — Resolve Q4.F + queries.ts extension (~15 min)

1. **Update `ref/05-open-questions.md`** — Q4.F resolution per Step 0. Append new Q5.\<next\> for Notification.propertyId.
2. **Update PHASES.md "Active Q-number blockers"** — strike Q4.F.
3. **Extend `overview/queries.ts`:**
   - Add `Notification` and `MaintenanceItem` imports
   - Extend `OverviewPageData` type: `notifications: Notification[]; maintenanceItems: MaintenanceItem[]`
   - Extend `Promise.all` to include `db.notifications.list(userId)` and `db.maintenanceItems.list(userId)`
   - Filter Notifications: write a small helper `notificationMatchesProperty(notification, propertyId): boolean` that parses `linkTo` for `/property/<id>/`. Apply.
   - Filter MaintenanceItems by `propertyId === current`
4. **Extend `rental/queries.ts`:**
   - Add `MaintenanceItem` import only (no Notification)
   - Extend `RentalPageData` type: `maintenanceItems: MaintenanceItem[]`
   - Extend `Promise.all` to include `db.maintenanceItems.list(userId)`
   - Filter by propertyId

### A.2 — Component prep + derivations (~10 min)

1. **PropertyOverviewPage.tsx:** accept `notifications` + `maintenanceItems` props. At top of component, no derivation needed — Notifications are already filtered server-side; alerts strip just renders them.
2. **PropertyRentalPage.tsx:** accept `maintenanceItems` prop. At top of component:
   ```
   const openMaintenance = maintenanceItems.filter(m => m.status === "Open");
   const openCount = openMaintenance.length;
   const displayItems = openMaintenance
     .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.createdAt - a.createdAt)
     .slice(0, 2);
   ```
   Where `severityRank` maps Emergency→3, Urgent→2, Standard→1.

### A.3 — Wire 4 surfaces (~25 min)

**Row 16 — Overview alerts strip HVAC Fault item (lines 150-157):**
- **Wire:** delete the hardcoded HVAC Fault block. In its place, map over `notifications` → render alert items. Each item shows `notification.title` + `notification.description`, with category-based color/icon (e.g. MAINTENANCE = amber, COMPLIANCE = red, etc.).
- **Rule 1 sweep:** Phase 6.1's lease-expiring alerts (lines 133-147) STAY. The merged strip renders both: lease-expiring (derived) FIRST, then Notifications (stored). Or interleave by severity — pick one ordering and document.
- **Rule 2 trigger:** if no notifications match the property, the alerts strip can still show lease-expiring alerts only. If both empty, render an empty state (e.g. "No alerts" or hide the strip entirely).
- **Full-template audit** (Notification.linkTo URL parse + merge with Phase 6.1 lease derivation).

**Row 28 — Rental Maintenance "2 Open" badge (line 369):**
- **Wire:** `<span>{openCount} Open</span>` — use the count derived in A.2.
- **Rule 2:** if `openCount === 0`, the badge can hide or render `"0 Open"` — pick one matching file convention.

**Row 29 — Rental Maintenance "Leaky faucet — Kitchen" item (lines 375-376):**
- **Wire:** `displayItems[0]` — render `displayItems[0].title` with severity badge (color from severity enum).
- **Rule 2:** if `displayItems.length === 0`, hide the item slot entirely (don't render an empty card).

**Row 30 — Rental Maintenance "HVAC Filter Replacement" item (lines 382-383):**
- **Wire:** `displayItems[1]` — same render pattern as row 29.
- **Rule 2:** if `displayItems.length < 2`, hide the second item slot.

### ★ Self-review pass (~10 min)

After A.1-A.3 done:

1. **Rule 1 sweep:** check adjacent claim-strings near wired surfaces. Two known: "2 Open" badge color (currently amber-50 background — keep static; it's the badge style not a claim about specific items), severity badges on items (derive color from severity enum, don't hardcode).
2. **Rule 2 grep:** in both component files, grep for `"—"`, `"None"`, `"No alerts"`, `"0 Open"`. Confirm new empty states match file convention.
3. **Rule 3 mental walks:**
   - Notification linkTo parse: walk `linkTo="/property/PROP-0001/safety"` → match → render. Walk `linkTo=undefined` → skip. Walk `linkTo="/portfolio"` → no property match → skip.
   - MaintenanceItem severity sort: walk 3 items (Emergency, Standard, Urgent) → render order Emergency, Urgent, Standard ✓. Slice to 2 → Emergency + Urgent.
   - openCount: walk 0 open / 3 total → 0. Walk 2 open / 2 total → 2.
4. **Phase 6.1 boundary verification:** grep `PropertyOverviewPage.tsx` for the lease-expiring alert block (lines 133-147) — must STILL EXIST untouched. Spot-check the strip renders both lease + notification alerts.
5. **Phase 6.2/6.3 boundary verification:** spot-check rental Financial Overview chart (Phase 6.2) and Documents card (Phase 6.3) still render correctly post-changes to the same component.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~10 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/overview` — confirm:
   - Alerts strip shows lease-expiring derived alerts (Phase 6.1) PLUS NOTIF-0001 burst pipe alert (Phase 6.8). Both render visibly.
   - HVAC Fault hardcoded text is GONE.
3. Open `/property/PROP-0001/rental` — confirm:
   - Maintenance card "Open" count reflects MAINT-0001 status (likely "1 Open" — only one MaintenanceItem for PROP-0001)
   - Maintenance items list shows MAINT-0001 ("Burst pipe in kitchen — water shut off") with Emergency severity badge
   - Second item slot is hidden (only 1 open item)
   - Phase 6.2 Financial Overview chart + Phase 6.3 Documents card both still render correctly
4. Open `/property/PROP-0002/overview` — confirm:
   - Alerts strip shows only lease-derived alerts (no Notifications match PROP-0002)
   - Empty state if no lease alerts either
5. **Empty-state test (optional):** temporarily delete NOTIF-0001 → reload PROP-0001/overview → strip shows only lease alerts. Restore.
6. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~45 min, per WIRING-PLAYBOOK Step C wins)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend the rental maintenance card combined-derivation report — covers rows 28+29+30 — since it exercises the filter+sort+slice derivation).
2. **Spot-check dedup machinery + format:**
   - ☐ Cites `Page-wide: see PFn in pages/property-id-rental/audit.md` for systemic findings
   - ☐ Renders **full** template (filter+sort+slice derivation)
   - ☐ Notes that one derivation drives 3 surfaces (rows 28, 29, 30)
   - ☐ Findings use one-liner stubs for systemic findings (Win 2)
   - ☐ TL;DR has the `📄 Page audit:` back-link
   - ☐ Notes Q4.F was resolved in this phase
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **Combined-derivation report 1:** Rental Maintenance card (rows 28, 29, 30) — same `openMaintenance` filter + severity sort + slice, three slots in the same card. ONE full-template report covering 3 surfaces. Slug: `property-id-rental--maintenance-card.md`.
   - **Standalone full report:** Overview alerts strip Notification merge (row 16) — Notification.linkTo URL parse + merge with Phase 6.1 lease derivation. ONE full-template report. Slug: `property-id-overview--alerts-strip-notifications.md`.
   - **Total reports:** 2 full = **2 audit files** covering 4 surfaces.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1) renders as a one-liner stub in both reports.
   - **No bundling cluster** — the 4 surfaces don't share a single direct-read pattern (one is a Notification merge, three are a MaintenanceItem derivation).
5. Update `INDEX.md` (per-datapoint table) with **2 new rows** (annotate the rental report as covering 3 underlying surfaces).
6. Update `pages/INDEX.md` Notification + MaintenanceItem rows.
7. Update `pages/SUMMARY.md` Rank 8 row.
8. Update `docs/PHASES.md`: flip 6.8 status emoji, add archived plan path entry to `(executed)`, strike Q4.F from active blockers, bump "Last updated." **Add a milestone note: "All 6.x phases complete — entity sprint done."**
9. Append fix-log entries to both affected `plan.md` files.

## Verification

After Phase 6.8 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on PROP-0001/overview + rental.** All 4 surfaces show real data; lease-expiring alerts (6.1) still render alongside Notifications (6.8) on the alerts strip; maintenance card shows MAINT-0001 with Emergency badge.
4. **Q4.F resolved** in `ref/05-open-questions.md` (HYBRID decision documented with date) and removed from PHASES.md "Active Q-number blockers."
5. **New Q5.\<next\> filed** in `ref/05-open-questions.md` for Notification.propertyId schema gap.
6. **Phase 6.1 boundary respected.** Lease-expiring alert derivation (lines 133-147) untouched.
7. **Phase 6.2/6.3 boundary respected.** Financial Overview chart, Documents card, all other rental wiring untouched.
8. **2 new per-datapoint audit reports** under `.claude/data-audit/` (1 combined-derivation full covering 3 surfaces + 1 standalone full, total 4 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~77, up from ~75 after Phase 6.7 — combined-derivation means fewer files, not fewer surfaces).
9. **Status fields synced.** Notification + MaintenanceItem read `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.8 reads ✅. **Rank 8 = the last 6.x rank — entity sprint complete.**
10. **Fix logs appended** to both plan.md files with Q4.F note.
11. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings; severity sort verified for 3 items; Notification linkTo parse verified for 3 cases.
12. **No surprise file changes.** `git status` shows: 4 source files modified (2 queries + 2 components), 0 seed JSONs (no expansion needed), 2 audit reports created, ~6 corpus files updated.

## What unblocks after Phase 6.8

- **Entity sprint complete.** All 8 entities (Properties already wired pre-sprint, then PropertyValuation, Lease+Tenant, Payment+Expense, Document, LandParcel, CoOwner, OwnershipRecord §21, Folder, Notification + MaintenanceItem) shipped. Every property page is now ~95-100% wired (PropertyComparable on location is the only remaining 6.x deferred work, gated on Q4.Q).
- **Q4.F formally closed** — no longer in the "Active Q-number blockers" list. Backend phase will revisit auto-creation infrastructure.
- **Phase 7 (finding routing) implicit work continues** — fix logs across pages now reflect 6.0-6.8 deltas. Findings deferred to backend (storage, encryption, RBAC) routed to `deferred-database-migration.md`.
- **Phase 8 (audit non-property routes) becomes the next major workstream.** `/analytics`, `/settings`, `/profile`, `/add-property`, `/auth/*` all still need page audits + entity wiring. Pattern is now well-established; should be fast.
- **Phase 9 (DB migration to Convex/Neon) becomes architecturally meaningful** — all entities are Zod-validated, all pages wired. Migration is mostly a transport/storage swap with minimal logic changes.
- **PHASES.md milestone:** add a "Sprint complete" callout at the top of the doc once 6.8 ships. The 3-step playbook (audit → synthesize → wire) is fully executed.

## Time estimate

~2.5 hours total (small phase, no schema build, 2 audits with combined-derivation):

- Step 0 (pre-flight + Q4.F resolution + Q5.\<next\> file): ~10 min
- Step A.1 (Q4.F updates + queries.ts extensions for both pages): ~15 min
- Step A.2 (component prep + derivations at top of rental component): ~10 min
- Step A.3 (wire 4 surfaces): ~25 min
- ★ self-review: ~10 min
- Step B (visual check across 2 properties): ~10 min
- Step C (2-report batch + dedup spot-check + 6 corpus updates): ~45 min
  - 2 full audits (~20 min total)
  - Index + SUMMARY + PHASES + plan.md + Q-number updates: ~15 min
- Buffer (linkTo parse edge cases, severity sort, Q4.F wording): ~20 min

**Realistic: 2.5 hours. Conservative: 3 hours.**

## Out of scope (deliberate)

- **Auto-creating Notification rows on events** — Q4.F resolution explicitly defers to backend phase (cron-driven or event-driven hooks). No mutation side-effects in 6.8.
- **Adding `propertyId` to Notification schema** — workaround via `linkTo` URL parse for 6.8; new Q5.\<next\> filed for future schema PR.
- **Derived maintenance alerts on overview** — could merge open MaintenanceItems with severity=Emergency into the alerts strip; deferred for scope discipline (the alerts strip already has 2 sources; adding a 3rd is premature).
- **Notification interactivity** — clicking an alert (the `linkTo` URL navigation) is a Next.js `<Link>` concern; mark "read" status is server-action territory; both deferred to future phases.
- **MaintenanceItem CRUD** — clicking "Add Maintenance" or marking an item resolved needs server actions; deferred.
- **Maintenance item assignee / due date** — current MaintenanceItem schema has no assignee or dueDate fields; if these surface in audit later, file as schema extension Q.
- **Rich notification categories** — e.g. PAYMENT, COMPLIANCE — wired generically (color from category enum); rich per-category icons or behaviors are a polish phase.
- **Building or modifying any OTHER entity** — entity sprint is over after this phase.
- **Modifying any Zod schema** — Notification + MaintenanceItem both settled.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` — source code changes confined to wiring.
- DDL or ERD generation refresh — separate workstreams.
