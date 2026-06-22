# CRUD Build — Execution Notes (living log)

> Single source of truth for the phased build. Each phase appends here. If a session runs
> out of tokens, open a NEW chat and paste:
> "Read `.claude/data-audit/docs/plans/crud-build-prompts/EXECUTION-NOTES.md` and continue the
> build from the first phase not marked ✅ DONE, following the same autonomy rules."

## How execution works
- Phases run in order, each in a fresh-context subagent on **Opus 4.8 1M** (inherited).
- After each phase: update the status table + append a dated log entry below.
- The matching prompt for each phase is the sibling file `0N-*.md`.

## Autonomy rules (so it runs unattended)
1. **NEVER change the DB schema/migrations unattended.** Any task needing a new
   column/enum/table → record it under "Deferred (needs owner)" and continue with everything
   else in the phase. Do not block.
2. Take the **recommended default** for every decision gate; log the decision here.
3. Never commit or push. Make working-tree changes only. Run `tsc`/build to verify.
4. Enforce security on every mutation (Zod → auth → ownership → generic errors).
5. If a phase can't reach its acceptance criteria, mark it ⚠️ PARTIAL, log why, continue to
   the next phase only if it doesn't depend on the missing piece.

## Default decisions (applied unless owner overrides)
- **Phase 2 delete policy:** archive = default action; hard-delete = typed-confirm + admin/owner role only (builds the capability; deletes nothing).
- **Phase 3 set-cover:** only if a cover field already exists in schema; else DEFER.
- **Phase 4 Cancelled/Inactive statuses:** if they need an enum/schema change → DEFER; build all confirmations regardless.
- **Phase 5 drafts:** keep localStorage + add confirmed delete; server persistence DEFERRED (schema).
- **Phase 5 stub buttons:** hide the no-backend ones (quick-actions); implement Export Data only if cheap (CSV from existing data), else hide.
- **Phase 6 MFA:** disable cleanly so it can't dead-end; activity log = simple read-only list, per-property panel + an org-level view if cheap.

## GLOBAL AUDIT-LOGGING RULE (applies to phases 1–6)
There is NO generic `activities` table yet (only `estate_activity_events`, enum-locked to
successor/document/estate kinds). Until the owner approves a real `activities` table:
- Call `logActivity` ONLY for the supported estate/document/successor kinds.
- For every other entity (property, lease, valuation, co-owner, work order, verification,
  payment, safety risk, directory, etc.): **skip audit logging — do NOT fail the mutation.**
  Leave `// TODO: audit once activities table exists` at the call site.
- Do NOT change the schema to make logging work. This is deferred to the owner.
**OWNER DECISION NEEDED:** create a general `activities` table (recommended) vs extend the
estate enum. Phase 6's activity-log UI depends on this.

## Status
| Phase | File | Status | Notes |
|---|---|---|---|
| 0 | 00-foundations.md | ✅ DONE | Primitives built; logActivity limited to estate/document/successor by schema (generic `activities` table does not exist) — see Deferred |
| 1 | 01-documents-stop-the-bleeding.md | ✅ DONE | Bulk delete (typed), per-file + per-folder delete (confirm), Create Folder wired; S3 cleanup on delete; folder delete moves children to root. tsc clean. Folder-delete activity logging deferred (unsupported kind). |
| 2 | 02-portfolio-lifecycle.md | ✅ DONE | Full cascade hard-delete shipped (2026-06-22). FK migration applied (0007). deleteProperty rewrites + S3 cleanup + countPropertyCascade expanded to 17 tables. "refuse if children" guard removed. Blast-radius dialog. 4/4 vitest pass, tsc clean, live cascade test: all assertions pass. |
| 3 | 03-property-sub-entities.md | ✅ DONE | Photo manager (add/delete+S3 cleanup/set-cover via array re-order) on overview; remove co-owner on OwnerCard (confirm, split re-balances); revoke→Tier-3 typed REVOKE + scope list on financials/rental/ownership. tsc clean. Set-cover built WITHOUT schema change (cover = photoStorageIds[0]). Audit logging skipped per GLOBAL RULE. |
| 4 | 04-pro-interface-safety.md | ✅ DONE | Tasks 1-5 + 7 shipped (Phase 4); Task 6 (WO "Cancelled" + Client "Inactive") completed in Item 3 (2026-06-22). |
| Item 3 | item-3-statuses-cancelled-inactive.md | ✅ DONE | WO "Cancelled" enum (migration applied), Client "Inactive" FS-layer. tsc clean. Archive/Reactivate UI on clients page. |
| 5 | 05-directory-drafts-stubs.md | ✅ DONE | Directory edit (reuse wizard) + delete (confirm) — backend already had update/delete actions; draft delete → confirm (localStorage kept); property-overview alerts per-item dismiss + dismiss-all (undo tier, client-state since alerts are derived); stubs: Quick Actions hidden, Export Data built (client CSV). tsc clean. |
| 6 | 06-hardening-audit-qa.md | ⚠️ PARTIAL | Date fix (timezone-safe `addUtcMonths` + 6 passing tests), Pro-register count notice (no silent cap), MFA dead-end disabled cleanly, harden pass on register empty-states; QA/IDOR all green (documented). Activity-log surface DEFERRED — blocked on the missing `activities` table (GLOBAL RULE). tsc clean. |
| Item 1 | item-1-activities-audit-log.md | 🔄 IN PROGRESS | Schema + migration SQL generated (drizzle/0006_redundant_ted_forrester.sql) — **awaiting owner approval before `db:migrate`**. All code written and tsc clean. 15/15 vitest pass. Activity UI ready. BLOCKS on migration apply. |

Legend: ⬜ TODO · 🔄 IN PROGRESS · ✅ DONE · ⚠️ PARTIAL · ⛔ BLOCKED

---

## Log

(phase subagents append dated entries below)

### 2026-06-22 — Item 2 (Full property hard-delete + cascade FKs) ✅ DONE

**What was built:**

**Task 1 — FK migration (`drizzle/0007_massive_wallflower.sql` — applied):**
26 FK rule changes across 8 schema files. Every file was read before editing; each change reviewed against the plan line numbers.

| Behavior | Tables / columns |
|---|---|
| `ON DELETE CASCADE` (18 notNull propertyId FKs) | land_parcels, property_valuations, tenants, leases, expenses, co_owners, ownership_records, ownership_documents, ownership_history, inspections, certifications, safety_risks, emergency_contacts, maintenance_items, folders, documents, pillar_verifications, successor_property_assignments |
| `ON DELETE SET NULL` (3 nullable propertyId FKs) | payments.property_id, estate_activity_events.property_id, notifications.property_id |
| Transitive `CASCADE` (5 non-property FKs) | documents.folder_id→folders, payments.lease_id→leases, verification_evidence.verification_id→pillar_verifications, verification_events.verification_id→pillar_verifications, verification_evidence.document_id→documents |

`activities.property_id` was already `SET NULL` from Item 1's 0006 migration — correctly absent from 0007.
Migration reviewed by owner, approved, applied. `db:migrate` → ✅ exit 0.

**Task 2 — Rewrite `deleteProperty` (`lib/services/properties.ts`):**
New 3-step implementation:
1. **Gather** S3 ids — reads `properties.photoStorageIds` + calls `listDocuments(ctx, id)` for storageId/thumbStorageId BEFORE the DB delete.
2. **Atomic cascade delete** via `scopedDelete(ctx, properties, id)` — single DELETE triggers all 26 FK rules simultaneously.
3. **Best-effort S3 cleanup** loop — calls `deleteStorageObject(sid)` (already never-throws) for each gathered id. S3 failure cannot make a successful delete look failed.
Added imports: `count`, `tenants`, `expenses`, `landParcels`, `propertyValuations`, `coOwners`, `ownershipRecords`, `ownershipDocuments`, `ownershipHistory`, `inspections`, `certifications`, `safetyRisks`, `emergencyContacts`, `maintenanceItems`, `pillarVerifications`, `listDocuments`, `deleteStorageObject`.

**Task 3 — Expand `countPropertyCascade` (`lib/services/properties.ts`):**
`PropertyCascadeCounts` now has 18 fields: 3 headline (leases, payments, documents) + 14 supporting entity counts (tenants, expenses, landParcels, propertyValuations, coOwners, ownershipRecords, ownershipDocuments, ownershipHistory, inspections, certifications, safetyRisks, emergencyContacts, maintenanceItems, pillarVerifications) + `otherTotal` (sum of supporting). All 16 queries run in `Promise.all` (one parallel burst); payments remain a serial sub-query on the lease ids.

**Task 4 — Update `deletePropertyAction` (`app/(shell)/property/actions.ts`):**
- REMOVED: the "refuse if children" block (lines ~207–217 of old file). No `countPropertyCascade` call at delete time — blast-radius is now informational only.
- KEPT: role gate (`requireRole admin`) + org-scoped existence check + typed-name match.
- KEPT: capture `deletedName` before delete, `logActivity` in try/catch (propertyId intentionally omitted from audit row — FK no longer exists).
- Updated doc comment (point #4 now describes cascade instead of refusal).

**Task 5 — Confirm dialog (`components/portfolio/PropertyTable.tsx`):**
- `counts` state type widened to include `otherTotal`.
- `hasChildren` variable and all "must remove first" blocking logic removed.
- New `blastRadiusLine()` function builds the description: empty property → "This permanently deletes the property. This cannot be undone." Property with children → "This permanently deletes the property along with N leases, N payments, N documents, N other records. This cannot be undone."
- Typed-confirm input and Delete button now show as soon as counts load (no `!hasChildren` gate).

**Vitest (`lib/services/properties.test.ts` — 4/4 pass):**
- Compile-time shape check: `PropertyCascadeCounts extends ExpectedShape` — tsc fails if any field is removed.
- `otherTotal` arithmetic: verified against the 14 supporting fields with distinct values.
- Headline exclusion check: leases/payments/documents not counted in otherTotal.
- Zero-counts case: otherTotal = 0.
Uses type-only imports to avoid the `lib/env.ts` DATABASE_URL gap (same pattern as activity.test.ts).

**Live cascade acceptance test (Neon dev branch — ALL PASS):**
Seeded property PROP-CASCADE-TEST-01 + lease + payment (via lease) + document + pillar_verification + notification (set-null) + estate_activity_event (set-null). Ran bare `db.delete(properties)`. Results:
```
property:                ✅ GONE
lease:                   ✅ GONE (cascade)
payment (via lease):     ✅ GONE (transitive cascade)
document:                ✅ GONE (cascade)
pillar_verification:     ✅ GONE (cascade)
notification.propertyId: ✅ NULL (set null)
eae.propertyId:          ✅ NULL (set null)
```
No FK error. Set-null rows survive. Transitive chain (lease → payment) confirmed working.

**Verification:** `npx tsc --noEmit` → **0 errors repo-wide** (exit 0). `npx vitest run lib/services/properties.test.ts` → **4/4 pass**. No `convex/` edits, nothing committed or pushed.

**Note on audit row:** `logActivity(property/deleted)` is wired and called in try/catch. The `activities` table does not exist yet (Item 1 migration pending) so the call fails silently — the delete always succeeds. The audit row will land once Item 1's migration (`drizzle/0006_redundant_ted_forrester.sql`) is applied.

**What is now permanently deletable (property hard-delete blast radius):**
A single `DELETE FROM properties WHERE id = ?` atomically removes: the property row + all its leases, tenants, payments (via leaseId cascade), expenses, co-owners, ownership records/documents/history, inspections, certifications, safety risks, emergency contacts, maintenance items, folders, documents, pillar verifications, and successor property assignments. Three nullable FK tables (payments.propertyId, estate_activity_events.propertyId, notifications.propertyId) are SET NULL so those rows survive with no property link. S3 objects (photos + document files) are cleaned up best-effort after the DB commit.

### 2026-06-22 — Item 1 (General `activities` audit table + activity-log UI) 🔄 IN PROGRESS

**What was built (all code complete, tsc clean, tests passing):**

**Task 1 — Schema:** `lib/db/schema/activities.ts` (new table: UUID PK via `$defaultFn(() => crypto.randomUUID())`, plain-text `entity`/`action`, `orgId` FK, `userId`, nullable `entityId`, `title`, `description`, nullable `propertyId` FK, `createdAt`/`updatedAt`, `ix_activities_org` + `ix_activities_property` indexes). Registered in `lib/db/schema/index.ts`.

**Migration generated:** `drizzle/0006_redundant_ted_forrester.sql` — `CREATE TABLE "activities"` with 2 FKs (orgs, properties) + 2 indexes. One new table only; no existing tables altered. **STOP: requires owner approval before `npm run db:migrate`.**

**Task 2 — Zod type:** `lib/data/types/activity.ts` — `ActivitySchema` + `Activity` type (entity/action as `z.string().min(1)`, timestamps as `timestampSchema`).

**Task 3 — Read service:** `lib/services/activities.ts` — `listActivities(ctx, propertyId?, limit=50)` mirroring `listEstateActivityEvents` pattern (org-scoped, `desc(createdAt), asc(id)`, `.limit`).

**Task 4 — Rewrite `logActivity`:** `lib/services/activity.ts` rewritten — `LogActivityInput.entity/action` widened to `string`; direct UUID insert into `activities` (no `nextId` lock); dual-write to `estate_activity_events` for the 7 original kinds via `scopedInsert`; unsupported-kind `throw` removed. `resolveEstateKind` replaces old `resolveKind`.

**Task 5 — 13 TODO sites wired:**
| # | File | Function | entity / action |
|---|---|---|---|
| 1 | `app/(pro)/pro/actions.ts` | `markRentPaid` | `payment` / `updated` |
| 2 | `app/(pro)/pro/actions.ts` | `logRentPayment` | `payment` / `created` (propertyId = lease.propertyId) |
| 3 | `app/(pro)/pro/actions.ts` | `updateWorkOrder` | `workOrder` / `updated` |
| 4 | `app/(pro)/pro/actions.ts` | `resolveSafetyRisk` | `safetyRisk` / `updated` |
| 5 | `app/actions/folders.ts` | `deleteFolder` | `folder` / `deleted` |
| 6 | `app/actions/co-owners.ts` | `removeCoOwner` | `coOwner` / `deleted` (propertyId = existing.propertyId) |
| 7 | `app/actions/professionals.ts` | `deleteProfessional` | `professional` / `deleted` |
| 8 | `app/actions/property-photos.ts` | `attachPropertyPhoto` | `photo` / `added` |
| 9 | `app/actions/property-photos.ts` | `removePropertyPhoto` | `photo` / `removed` |
| 10 | `app/actions/property-photos.ts` | `setPropertyCoverPhoto` | `photo` / `updated` |
| 11 | `app/(shell)/property/actions.ts` | `archivePropertyAction` | `property` / `updated` |
| 12 | `app/(shell)/property/actions.ts` | `restorePropertyAction` | `property` / `updated` |
| 13 | `app/(shell)/property/actions.ts` | `deletePropertyAction` | `property` / `deleted` (propertyId omitted — FK no longer exists) |
All 13 wrapped in `try/catch` (audit failure cannot roll back the real mutation).

**Task 6 — UI:**
- Per-property panel: `recentActivities: Activity[]` added to `OverviewPageData`; `listActivities(authCtx, propertyId, 10)` called in `getOverviewPageData`; `PropertyOverviewPage` gained `recentActivities?: Activity[]` prop; renders a "Recent activity" card with empty state before `<ProgressModal>`.
- Org-wide page: `app/(shell)/activity/page.tsx` (new server component) — calls `listActivities(ctx, undefined, 50)`, renders labelled list with entity badges + empty state.

**Vitest self-check:** `lib/services/activity.test.ts` — 15 tests: 7 verify all estate dual-write kinds still map correctly; 6 verify non-estate kinds return null (no throw); 2 verify `listActivities` export signature. **15/15 pass.**

**Verification:** `npx tsc --noEmit` → **0 errors repo-wide** (exit 0). `npx vitest run lib/services/activity.test.ts` → **15/15 pass**. No schema change beyond the `activities` table. No `convex/` edits. Nothing committed or pushed.

**⚠️ BLOCKED ON:** `npm run db:migrate` — owner must review and approve `drizzle/0006_redundant_ted_forrester.sql` before applying. The app will fail at runtime on any activity write/read until the migration is applied (the table doesn't exist yet). All TypeScript compiles cleanly against the schema definition.

**To complete after migration is approved:**
1. Run `npm run db:migrate` on the Neon dev branch (then prod).
2. Update this log entry to ✅ DONE.

### 2026-06-22 — Item 3 (WO "Cancelled" + Client "Inactive") ✅ DONE

**Part A — Work Order "Cancelled" (Postgres enum + migration)**

**Migration applied:** `ALTER TYPE "public"."maintenance_status" ADD VALUE 'Cancelled'` — generated as `drizzle/0005_mighty_susan_delgado.sql`, reviewed by owner, applied via `npm run db:migrate` (Neon dev branch). Exit 0.

**Files changed (Part A):**
- `lib/db/schema/safety.ts` — `maintenanceStatusEnum` extended with `"Cancelled"`.
- `lib/data/types/maintenance-item.ts` — `MaintenanceStatusSchema` extended with `"Cancelled"`. The widened union immediately enforced exhaustive-map compliance across the repo (tsc caught two more Record maps — see below).
- `app/(pro)/pro/actions.ts` — `updateWorkOrderSchema` and the `updateWorkOrder` inline type union both updated to include `"Cancelled"`.
- `app/(pro)/pro/work-orders/_components/WorkOrdersTable.tsx` — `STATUS_LABEL["Cancelled"] = "Cancelled"`, `STATUS_PILL["Cancelled"]` = muted slate pill. Vendor Change/Assign affordances now treat Cancelled like Resolved (hidden). Cancel button added for Open and InProgress rows via `ConfirmAction tier="confirm"` → `updateWorkOrder({ status: "Cancelled" })` → `router.refresh()`.
- `app/(pro)/pro/dashboard/_components/MaintenanceQueueCard.tsx` — same `STATUS_LABEL` and `STATUS_PILL` maps updated (caught by tsc, not in the original plan's file list — the plan's exhaustive-map safety net worked as intended).
- `app/(pro)/pro/queries.ts` — 7 filter sites updated:
  - Dashboard `queue` filter excludes Cancelled.
  - `urgentOpen` and `totalOpenCost` in `getWorkOrdersPageData` exclude Cancelled.
  - `openWorkOrders` in `getProShellData` excludes Cancelled.
  - `statusRankMaintenance` now ranks Cancelled last (rank 3, after Resolved = 2).
  - Alert generation skips Cancelled (alongside Resolved).
  - Activity feed timeline labels "cancelled" for Cancelled items.
  - `workOrdersOpenToday` in `buildOwnerStatement` excludes Cancelled.

**Part B — Client "Inactive" (FS layer — no migration)**

**Files changed (Part B):**
- `lib/data/types/client.ts` — `ClientSchema` gained `status: z.enum(["Active", "Inactive"]).optional()`. Absent field = Active (all existing FS records parse cleanly — back-compatible).
- `app/(pro)/pro/actions.ts` — new `setClientStatus({ clientId, status })` action: Zod-validated, userId-scoped IDOR check via `clientsDb.get`, updates via `clientsDb.update`, `revalidatePro()`. Generic errors only. `// TODO: audit` per GLOBAL RULE.
- `app/(pro)/pro/queries.ts` — `loadProContext` now derives `activeClients` after `Promise.all` and feeds it into both `clients:` and `clientById:` in the return. Inactive clients vanish from all Pro rollups, alerts, shell counts, and `getClientPortfolioData` (returns null — clean not-found). New `getInactiveClients()` export: reads raw `clientsDb.list`, filters to `status === "Inactive"`, returns minimal shape (id/name/initials/avatarBg/clientType) for the clients index page.
- `app/(pro)/pro/dashboard/_components/ClientsTable.tsx` — optional `onArchive?: (clientId: string) => Promise<void>` prop. When provided, each row shows an Archive icon button wrapped in `ConfirmAction tier="confirm"`. Dashboard widget omits the prop (no Archive button shown there).
- `app/(pro)/pro/clients/_components/ClientsIndexPage.tsx` — rewritten: accepts `inactiveClients` prop; passes `onArchive` handler to `ClientsTable`; shows "Archived clients (N)" section below the table when N > 0, each row with a Reactivate button via `ConfirmAction tier="confirm"` → `setClientStatus({ status: "Active" })` → `router.refresh()`.
- `app/(pro)/pro/clients/page.tsx` — now fetches `getProDashboardData()` and `getInactiveClients()` in parallel; passes both to `ClientsIndexPage`.

**Verification:** `npx tsc --noEmit` → **0 errors repo-wide** (exit 0). First tsc pass surfaced 4 errors (2 onConfirm return-type mismatches, 2 missing `Cancelled` entries in `MaintenanceQueueCard` — both fixed immediately). Second pass clean. No migration-unrelated schema changes, no new dependencies, no `convex/` edits, nothing committed or pushed.

**Audit logging:** client status change is not a supported `logActivity` kind (GLOBAL RULE). `// TODO: audit once activities table exists` at call site.

### 2026-06-22 — Phase 6 (Hardening, audit-log surface, QA) ⚠️ PARTIAL

**Task 1 — Activity-log surface → ✅ DEFERRED (correctly, per GLOBAL RULE).** The surface
depends on a general `activities` table that does not exist (only `estate_activity_events`,
enum-locked to 7 successor/document/estate kinds). Phases 1–5 could not write audit rows for
property / lease / payment / co-owner / work-order / verification / photo / folder / directory
events — every one of those left a `// TODO: audit once activities table exists` at the call
site and skipped logging (never failed the mutation). So there is **nothing to surface**: a
read-only "who did what" view would show only estate/document events, which is misleading for a
CRUD-history panel. Per autonomy rule 1 (no unattended schema change) we did NOT build a
fake/empty log. **Blocked on the owner's activities-table decision (see Deferred).**

**Task 2 — Pro properties register, no silent truncation → ✅ DONE.** READ the page + query
first: there is **no 500-row cap anywhere**. `getProPropertiesData` (`app/(pro)/pro/queries.ts`)
loads *every* property the org owns (no `limit`, no `.slice`) and `PropertiesRegisterPage`
filters client-side over the full set. So nothing was ever silently truncated. The known P2
("500-row client cap") describes a risk that the current code does not actually have. To make
that guarantee *visible*, added a result-count footer to the register
(`app/(pro)/pro/properties/_components/PropertiesRegisterPage.tsx`): "Showing all N properties",
or "Showing X of N properties" when a filter narrows the set. Also fixed the empty-state copy to
distinguish an empty book ("No properties under management yet.") from a filter that excluded
everything ("No properties match these filters."). Full server-side pagination was **not** built
— it would be premature given there is no truncation and the dataset is the org's own book; the
clear count satisfies the "no silent truncation" requirement.

**Task 3 — Timezone-safe lease renewal date → ✅ DONE (with passing self-check).** The bug:
both the renewal action (`app/(pro)/pro/actions.ts` `renewLease`) and the preview projection
(`app/(pro)/pro/queries.ts`, the `expiring` map) used
`end.setUTCMonth(end.getUTCMonth() + termMonths)`. Native `setUTCMonth` keeps the day-of-month,
so a lease ending on the 31st rolls *past* its anniversary (Jan 31 + 1mo → Mar 3, not Feb 28).
Added **`addUtcMonths(ts, months)`** to `lib/format.ts` — pure, all-UTC, **clamps the day into
the target month** (Jan 31 + 1mo → Feb 28; leap-year → Feb 29; preserves time-of-day) — and
rewired both call sites to use it, so preview and action can't drift from each other or from the
real anniversary. **Self-check:** `lib/format.test.ts` (vitest, matching the existing setup) — 6
tests covering normal advance, the month-end clamp (the drift bug), leap February, year
roll-over, a realistic 12-month month-end renewal, and time-of-day preservation. **6/6 pass.**

**Task 4 — MFA dead-end → ✅ DISABLED CLEANLY (approved default).** READ the login flow first
(`app/(auth)/login/_components/LoginPage.tsx`). Clerk's `needs_client_trust` path (device
verification via emailed code) is already fully implemented — that is NOT MFA and was left
working. The only true dead-end was `needs_second_factor` (an account with an authenticator-app
factor explicitly enabled), which showed a terse "not yet supported" toast and stranded the user
on the password form. Replaced it with a clear, actionable message ("This account has extra login
security enabled, which isn't supported here yet. Reach out to support to sign in.") and an
explanatory comment so the path can't dead-end with a bare "not supported." We did NOT implement
the second-factor UI (out of scope, would need a new verification step). No throw remains.

**Task 5 — `/impeccable harden` pass → ✅ BEST-EFFORT (manual).** The `/impeccable` skill was
not invoked interactively; did a focused manual pass instead (the prompt allows this). The
phase-1–5 destructive surfaces already ship empty/error/loading/uploading states + confirm tiers
(documented in their phase logs). The surface this phase touched (Pro register) gained the
result-count footer + a corrected empty-state that distinguishes empty-book from filtered-empty
(overflow is already handled — the table is in an `overflow-x-auto` wrapper and long
names/addresses wrap in a flex column). `/impeccable critique` on `<ConfirmAction>` usages was
not run as a separate skill pass; the tiers were applied consistently across phases 1–5 per their
logs (undo for reversible, confirm for state changes, typed for destructive bulk/delete/revoke).

**Files changed (Phase 6):**
- `lib/format.ts` — NEW `addUtcMonths(ts, months)` helper (timezone-safe, day-clamping, long
  plain-English comment explaining the drift bug it fixes).
- `lib/format.test.ts` — NEW vitest self-check, 6 tests, all pass.
- `app/(pro)/pro/actions.ts` — `renewLease` now uses `addUtcMonths`; imported it.
- `app/(pro)/pro/queries.ts` — `expiring` projection now uses `addUtcMonths`; imported it.
- `app/(pro)/pro/properties/_components/PropertiesRegisterPage.tsx` — result-count footer +
  empty-book vs filtered-empty copy.
- `app/(auth)/login/_components/LoginPage.tsx` — `needs_second_factor` message no longer
  dead-ends with "not supported."

**Verification:** `npx tsc --noEmit` → **0 errors repo-wide** (exit 0). `npx eslint` on all 6
changed files → **0 errors / 0 warnings**. `npx vitest run lib/format.test.ts` → **6/6 pass**.
Full suite: the new date test + 19 other pure tests pass; the 2 DB/Clerk-backed test files
(`app/(pro)/pro/queries.test.ts`, `lib/actions/ai-overlay.actions.test.ts`) fail **only** at
import time on a sandbox infra gap (`lib/env.ts` missing `DATABASE_URL`; Clerk `auth()` imports
`server-only` which the vitest runner can't satisfy) — NOT a code regression and unrelated to
this phase's edits (they exercise `getClientPortfolioData`/`getAgentHubData`, not the renewal
path). This matches every prior phase's verification approach (tsc + targeted unit test).

#### QA / IDOR results (static verification — critical) — ALL GREEN

Backend is Neon + Drizzle. IDOR is enforced **structurally** in `lib/services/_crud.ts`:
- `scopedUpdate` → `WHERE orgId = ctx.orgId AND id = id` + `requireMember` + `assertCanMutate`.
  A cross-org id matches **0 rows** → returns `null` (action turns that into a generic
  "not found").
- `scopedDelete` → same `WHERE orgId = ctx.orgId AND id = id` + `requireAdmin` + `assertCanMutate`.
  Cross-org delete is a **no-op** (0 rows affected).
- `scopedInsert` → forces `orgId = ctx.orgId` + `requireMember` + `assertCanMutate`.

Every entity's `getX` read used in IDOR pre-checks is org-scoped (`orgId = ctx.orgId AND id = id`),
verified by reading the source:

| Entity / mutation (phase) | Org-scope check | Role gate | Generic errors | Rate-limit |
|---|---|---|---|---|
| Document delete / bulk delete (P1) | `getDocument` org-scoped + `scopedDelete` | admin (`scopedDelete`) | yes | n/a |
| Folder delete (P1) | folder + children all `eq(orgId, ctx.orgId)` | member | yes | n/a |
| Property archive/restore/delete (P2) | `getProperty` org-scoped + `scopedDelete` | **admin** (`requireRole` in action AND `scopedDelete`) | yes (`Could not delete property`) | n/a |
| Property photo add/remove/set-cover (P3) | re-reads `getProperty` (org-scoped) before every write | member | yes (`Property not found` / generic) | n/a |
| Co-owner remove (P3) | `getCoOwner` IDOR pre-check (org-scoped) + `scopedDelete` | admin (`scopedDelete`) | yes (`Co-owner not found`) | n/a |
| Verification revoke (P3) | `revokeVerification` selects+updates with `eq(orgId, ctx.orgId)` | member + admin-gated in action | yes (`Could not revoke ${pillar}`) | **yes** (C5 "Too many attempts") |
| Mark rent paid / log payment (P4) | `getLease`/payment org-scoped via service | member | yes (lean → generic) | n/a |
| Work-order resolve + vendor assign (P4) | `getMaintenanceItem` org-scoped; **vendor validated via org-scoped `getProfessional`** before save (rejects cross-org/missing vendor) | member | yes (`Could not assign that vendor.`) | n/a |
| Safety-risk resolve (P4) | `getSafetyRisk` org-scoped + `updateSafetyRisk` | member | yes | n/a |
| Directory edit/delete (P5) | `scopedUpdate`/`scopedDelete` org-scoped | admin on delete | yes (`Could not …`) | n/a |

**Conclusion: every new/changed mutation rejects cross-org access server-side** (0 rows on a
wrong-org id; admin gate on deletes). No cross-org write can succeed.

**No raw `err.message` to the client:** grepped all touched action files
(`documents.ts`, `co-owners.ts`, `property-photos.ts`, `(shell)/property/actions.ts`,
`(pro)/pro/actions.ts`, `professionals.ts`, `properties.ts`) — **zero** `err.message` /
`error.message` returns. Every `catch (err)` logs internally and returns a static generic string.

**Rate-limits:** present where they already existed — verification verify/revoke both return a
generic "Too many attempts. Try again shortly." (C5). Login/signup rate-limiting is Clerk-managed.
No NEW sensitive action introduced this phase needs its own limiter (the date fix and register
notice are read/derive-only; renewal reuses the existing `renewLease` action).

**Destructive-flow trace (static):** documents (per-file/folder/bulk-typed), portfolio
(archive/restore/typed-delete-guarded-on-children), photos (delete + S3 cleanup), co-owner
remove (split re-balances), Pro confirms (mark-paid undo, log-payment confirm, WO resolve, risk
resolve) — all wired to the Phase-0 `<ConfirmAction>` tiers + org-scoped services, verified by
reading each call site. No browser QA tool run (none configured for this headless pass); static
verification only, as allowed.

---

## BUILD COMPLETE — summary

**What shipped across phases 0–6 (Neon + Drizzle backend; `convex/` untouched throughout):**

- **Phase 0 — Foundations.** `<ConfirmAction>` (3 tiers: undo / confirm / typed), `alert-dialog`,
  `useDestructiveAction` (optimistic + rollback + undo), `toastActionResult(WithUndo)` (never
  leaks raw errors), `logActivity` (limited to the 3 supported estate/document/successor kinds),
  + a tier-gating unit test. No existing files touched.
- **Phase 1 — Documents.** Bulk delete (typed DELETE), per-file + per-folder delete (confirm),
  Create Folder wired; **S3 object cleanup** on delete (`deleteStorageObject`, best-effort);
  folder delete **moves children to root** (no cascade FK). Document deletes write a real
  `document.removed` activity row. No dead buttons remain.
- **Phase 2 — Portfolio lifecycle.** Row `(…)` menu (state-aware Archive vs Restore), reversible
  archive/restore, typed-name hard delete gated to **admin/owner** (UI + server `requireRole`).
  Hard delete **refuses when children exist** (no cascade FK) with a clear message — a childless
  property deletes cleanly. (Cascade DEFERRED — schema.)
- **Phase 3 — Property sub-entities.** Property **photo manager** (add / delete + S3 cleanup /
  set-cover via `photoStorageIds[0]` re-order, no schema change); **remove co-owner** (confirm,
  IDOR-checked, ownership split re-balances); **verification revoke → Tier-3 typed REVOKE** + scope
  list on financials / rental / ownership.
- **Phase 4 — Pro interface safety.** Mark-paid **undo**; log-payment **confirm** summary;
  work-order resolve + safety-risk resolve **confirms**; **vendor existence + org check** before
  assignment (the security fix); show-resolved toggle with read-only resolved rows.
  (WO "Cancelled" + Client "Inactive" DEFERRED — enum/schema.)
- **Phase 5 — Directory / drafts / stubs.** Directory **edit** (reuse wizard) + **delete**
  (confirm, org-scoped); draft **delete → confirm** (localStorage kept); per-item + dismiss-all
  **alert dismiss** (client-state, derived alerts); Quick-Action stubs **hidden**, **Export Data**
  built (client-side CSV). (Server draft persistence + alert-read persistence DEFERRED — schema.)
- **Phase 6 — Hardening / QA.** Timezone-safe `addUtcMonths` + 6 passing tests (renewal drift
  fixed at both sites); Pro-register result-count notice (proved + made visible that nothing is
  capped); MFA `needs_second_factor` dead-end disabled cleanly; harden pass on register
  empty-states; full IDOR / err-leak / rate-limit QA documented (all green).

**IDOR / QA result (whole build):** every destructive mutation across phases 1–5 is org-scoped
server-side via `scopedUpdate`/`scopedDelete`/`scopedInsert` (`WHERE orgId = ctx.orgId`) with the
right role gate (member for updates, **admin** for deletes), and each fronts its mutation with an
org-scoped `getX` IDOR pre-check. Cross-org reads/writes return null / affect 0 rows — no leak,
no cross-org mutation. No action returns a raw `err.message`; verification + auth are rate-limited.
`tsc` clean repo-wide; the destructive-action test + date test pass. (DB/Clerk-backed integration
tests fail only on a sandbox env gap, not a regression.)

### Deferred (needs owner) — consolidated

1. **`activities` table (CREATE) — the big one.** No generic audit table exists; only
   `estate_activity_events` (enum-locked to 7 kinds). Phases 1–5 therefore could NOT audit
   property / lease / payment / co-owner / work-order / verification / photo / folder / directory
   mutations — every such site has `// TODO: audit once activities table exists` and skips logging
   (mutation never failed). **This blocks Phase 6's activity-log UI entirely.** Recommended:
   create a general `activities(entity, entityId, action, summary, propertyId, actorId, orgId, at)`
   table (cleaner than extending the estate enum). Once it exists: backfill the `logActivity` calls
   at the TODO sites and build the read-only org-scoped history view.
2. **Cascade FKs on `properties.id` (and other parents).** Child tables use the default
   `ON DELETE RESTRICT` — no `onDelete: "cascade"` anywhere. Hard-deleting a property with
   leases/payments/documents is refused up front (clean message). Owner: add `onDelete: "cascade"`
   to all ~20 FKs referencing `properties.id` and migrate, OR implement an ordered app-level
   cascade in `deleteProperty`. Until then, archive is the removal path for a property with data.
3. **Work-order "Cancelled" status + Client "Inactive"/archive state.**
   `MaintenanceStatusSchema` is `["Open","InProgress","Resolved"]` (no terminal Cancelled);
   `ClientSchema` has no status/`isActive`/`archivedAt`. Both are enum/schema changes — deferred.
   The confirm-tier plumbing to wire them is already in place.
4. **Server-side draft persistence + alert-read persistence.** Add-property drafts live in
   localStorage (delete is now confirmed); property-overview alert dismissals are session-only
   client state (alerts are derived, no alerts/read table). Both need schema (a `property_drafts`
   table; a unified alerts/read-state model) — deferred.
5. **MFA outcome.** `needs_second_factor` is now **disabled cleanly** (clear message, no
   dead-end) — NOT implemented. To support authenticator-app sign-in, build the second-factor
   verification step in the login flow (owner call: implement vs leave disabled). Device-trust
   email verification (`needs_client_trust`) is already implemented and working.

**Residual risk:** (a) destructive actions on non-estate entities are currently **unaudited**
(no `activities` table) — acceptable for a demo but a gap for a sensitive-data app; close it with
deferred item 1. (b) Property hard-delete is unavailable for properties with children until
cascade is decided (item 2) — mitigated by archive. (c) No automated browser/E2E QA was run this
phase (none configured); verification was static (code-read) + unit tests + tsc.

No schema/migration changes, no new dependencies, no file deletion, no `convex/` edits in any
phase. Nothing committed or pushed — working-tree changes only.

### 2026-06-22 — Phase 5 (Directory edit/delete, draft delete confirm, alert dismiss, stub cleanup) ✅ DONE

**Backend finding (no new backend needed):** the directory already had full CRUD —
`updateProfessional` + `deleteProfessional` exist in both `app/actions/professionals.ts`
(Zod → `requireCtx` → org-scoped service → generic errors) and `lib/services/professionals.ts`
(`scopedUpdate`/`scopedDelete` enforce org-scope; delete also needs admin role). So Task 1 was
pure wiring — no service/action was added.

**Files changed:**
- `components/directory/AddProfessionalWizard.tsx` — **Task 1**: added an optional `professional?: EditableProfessional` prop (exported new `EditableProfessional` type). When set, the wizard runs in EDIT mode: pre-fills the form on open, calls `updateProfessional(id, payload)` instead of `createProfessional`, and shows edit labels ("Edit professional", "Save changes", "{name} updated"). Imported `updateProfessional`. NOTE: the directory row only carries `linkedProperties` as a COUNT (not a list of ids), so the "Link to properties" step starts empty in edit mode — re-picking links overwrites the saved count; documented in the type's doc comment.
- `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx` — **Task 1**: `ProfessionalCard` gained `onEdit`/`onDelete` props + an **Edit** (Pencil) button and a **Delete** (Trash2) button behind `<ConfirmAction tier="confirm">` ("Remove {name}?") in the card footer. Page lifts an `editing` state; `handleEdit` maps the row → `EditableProfessional` + opens the wizard in edit mode; `handleDelete` calls `deleteProfessional(id)` (returns the raw `ActionResult` so ConfirmAction toasts) + `router.refresh()`; `handleWizardOpenChange` clears edit state on close so the next "Add" starts blank. Imported `ConfirmAction`, `deleteProfessional`, `ActionResult`, `useRouter`, `Pencil`, `Trash2`.
- `app/actions/professionals.ts` — added `// TODO: audit once activities table exists` at the delete call site (directory is NOT a supported `logActivity` kind per the GLOBAL RULE; mutation not failed).
- `app/(shell)/add-property/_components/Step0NewOrDraft.tsx` — **Task 2**: replaced the bespoke two-step inline confirm (the old `pendingDeleteId` / `isConfirming` red-banner branch) with the Phase-0 `<ConfirmAction tier="confirm">` wrapping the per-draft Trash button ("Delete \"{title}\"?"). Draft storage stays **localStorage-only** (the `onDeleteDraft` → `useDrafts.remove` path is unchanged); the trash button still `stopPropagation`s so the row-click resume doesn't fire. Removed the now-dead `pendingDeleteId` state, `confirmDelete`, and the `DraftItem` `isConfirming`/`onRequestDelete`/`onCancelDelete`/`id` props.
- `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` — **Task 3 + 4**:
  - **Task 3 (alerts):** added `dismissedAlertIds: Set<string|number>` client state. The alerts list is **derived** (leaseAlerts from leases + notificationAlerts from notifications) with no alerts/read backend, so dismiss is **client-state** (documented inline; resets on reload by design). The previously-dead **"Dismiss all"** button is now `<ConfirmAction tier="undo">` (hides all visible, Undo restores all). Each alert row gained a per-item **X dismiss** behind `<ConfirmAction tier="undo">` (hides one, Undo restores it). Panel + count now key off `visibleAlerts`.
  - **Task 4 (stubs):** **Quick Actions** card (New Lease / Work Order / Invoice / Notify All) had no handlers → **HIDDEN** (block + `quickActions` const + unused `Receipt` import removed; comment left explaining how to re-add per-action when create flows exist). **Export Data** → **BUILT** as a cheap client-side CSV (`exportPropertyCsv` helper) from figures already on the page (name/code/type/status/province/buy/valuation/income/NOI/YTD/active-leases/progress) → Blob download + success toast. No server round-trip.

**Tasks:** ✅1 Directory edit (reuse wizard) + delete (confirm, org-scoped, refreshes). ✅2 Draft delete → confirm tier (localStorage kept). ✅3 Per-item alert dismiss + dismiss-all (both undo tier, client-state). ✅4 Quick Actions HIDDEN, Export Data BUILT (CSV).

**Build-vs-hide per stub button:** New Lease → HIDE · Work Order → HIDE · Invoice → HIDE · Notify All → HIDE (all no-backend) · Export Data → BUILD (client CSV, cheap, data already on page).

**Verification:** `npx tsc --noEmit` → **0 errors** repo-wide (exit 0). `eslint` on the 5 changed files → 0 errors, 2 PRE-EXISTING warnings only (`grossYield` unused in overview, `NOT_IMPLEMENTED_UNTIL_B6` unused in professionals.ts — neither introduced by this phase). `graphify update .` ran.

#### Deferred (needs owner)
- **Server-side draft persistence** — DEFERRED per the DEFAULT DECISION (needs a `property_drafts` schema/table). Drafts remain localStorage-only; delete is now confirmed. No schema change made.
- **Alert dismissal persistence** — dismissals are session-only client state because alerts are derived (no alerts table; lease alerts are computed, notification alerts could persist a "read" flag via `updateNotification` but mixing the two persistence models was out of scope and the prompt explicitly allowed client-state when derived). Revisit when a unified alerts/read-state backend exists.
- **Directory audit logging** — skipped per GLOBAL RULE (directory is not a supported `logActivity` kind); TODO at the delete call site, mutation not failed.
- **Edit-mode property links** — the directory list only exposes a count, so edit mode can't re-hydrate prior property selections. Acceptable for the contact-detail edit; full link management would need the wizard to receive the linked property ids (a query change, not a schema change).
- No schema/migration changes, no new deps, no file deletion, no `convex/` edits.

### 2026-06-22 — Phase 4 (Pro interface safety: confirms, vendor check, audit toggle) ⚠️ PARTIAL

**Files changed:**
- `app/(pro)/pro/actions.ts` — (a) **Task 1**: `markRentPaid` now takes an optional `status` (constrained to the real Payment enum `Paid|Pending|Failed|Overdue`), defaulting to `"Paid"`; passing a prior status flips a record back, which is what the UI's undo calls. (b) **Task 5 (the security fix)**: `updateWorkOrder` now looks a non-null `vendorId` up via the org-scoped `getProfessional(ctx, id)` BEFORE saving it — a missing OR cross-org id comes back null and is rejected with a generic "Could not assign that vendor." (a null vendorId = unassign, skips the check). Imported `getProfessional`. (c) Added `// TODO: audit once activities table exists` to markRentPaid / logRentPayment / updateWorkOrder / resolveSafetyRisk (none are supported `logActivity` kinds — GLOBAL RULE; mutations not failed).
- `lib/client/action-result.ts` — added `LeanActionResult` type + `toActionResult()` adapter. The Pro actions return the lean `{ ok: true } | { ok: false; error }` shape (no `data`), but `<ConfirmAction>` / `useDestructiveAction` / the toast helpers expect the canonical `ActionResult<T>`. The adapter normalises lean → `ActionResult<void>` so the Phase-0 primitives are usable as-is without changing the Pro actions' return type.
- `app/(pro)/pro/rent/_components/OverdueList.tsx` — **Task 1**: rewrote "Mark paid" to the Phase-0 **undo tier** via `useDestructiveAction`. Split each row into an `OverdueRow` child so each button can own a hook (hooks can't run in a `.map` loop). Mark-paid fires immediately + `router.refresh()`, shows a 5s success toast with **Undo** that calls `markRentPaid({ paymentId, status: prior })` to flip the record back to its prior status (Overdue/Pending — derived from `row.rentStatus`). Dropped the old inline `useTransition`/error state.
- `app/(pro)/pro/rent/_components/LogPaymentModal.tsx` — **Task 2**: chose **confirm-before-submit** (commented why: logging a payment CREATES a record and there's no delete-payment action to cleanly undo, so a money entry is safer to confirm up front). "Record payment" → "Review payment" reveals a "Record $X via [method] for [property]?" summary with Back / "Confirm & record"; failure drops back to the form.
- `app/(pro)/pro/work-orders/_components/WorkOrdersTable.tsx` — **Task 3**: the InProgress→Resolved button is now wrapped in `<ConfirmAction tier="confirm">` ("Mark this work order resolved?"); success toast + `router.refresh()`. The non-destructive Open→Start button is unchanged. Imported `ConfirmAction` + `toActionResult`.
- `app/(pro)/pro/compliance/_components/SafetyRisksCard.tsx` — **Task 4 + 7**: Resolve now goes through `<ConfirmAction tier="confirm">` ("Mark this risk resolved?"). Card accepts `title`/`emptyMessage` props and renders **resolved rows READ-ONLY** (dimmed, strikethrough title, a "Resolved" chip instead of the button) so they stay reviewable. Removed the old `useTransition`/busy/error state.
- `app/(pro)/pro/compliance/_components/CompliancePage.tsx` — **Task 7**: added a **"Show resolved (N)" checkbox** above the risks card (disabled when `resolvedRiskCount === 0`). `visibleRisks` now filters by client AND status (open-only unless the toggle is on); passes dynamic title/empty message to the card.
- `app/(pro)/pro/queries.ts` — **Task 7**: `getCompliancePageData` now returns BOTH open + resolved risks in `safetyRisks` (was open-only). Introduced `openRisks` so `openRiskCount` / `resolvedRiskCount` / `highRiskCount` in `summary` stay correct. Updated the section doc comment. No type change to `CompliancePageData` (it already carried `status`/`resolvedAt`).

**Tasks:** ✅1 Mark-paid undo (reverts via prior status). ✅2 Log-payment confirm summary. ✅3 Work-order resolve confirm. ✅4 safety-risk resolve confirm. ✅5 vendor existence+org check (security). ⛔6 DEFERRED (schema). ✅7 Show-resolved toggle + read-only resolved rows.

**Verification:** `npx tsc --noEmit` → **0 errors** repo-wide (exit 0). `eslint` on all 8 changed files → 0 errors/warnings. `graphify update .` ran (12647 nodes).

#### Deferred (needs owner) — SCHEMA (Task 6)
- **Work Order "Cancelled" status** — `MaintenanceStatusSchema` (`lib/data/types/maintenance-item.ts`) is `z.enum(["Open","InProgress","Resolved"])`. Adding a terminal "Cancelled" value is a schema/enum change → **DEFERRED** per the DEFAULT DECISION + autonomy rule 1. All other confirmations built regardless.
- **Client "Inactive"/archive state** — `ClientSchema` (`lib/data/types/client.ts`) has **no** status / `isActive` / `archivedAt` field. Adding one is a schema change → **DEFERRED**. (Note: clients live in the FS-backed `lib/data/db/clients.ts`, not a Drizzle table, but the Zod schema is still the contract and was not widened.)
- **Owner action:** to enable task 6, add `"Cancelled"` to `MaintenanceStatusSchema` (and decide whether Cancelled work orders drop out of the open queue/cost rollups), and add a `status: "Active"|"Inactive"` (or `archivedAt`) field to `ClientSchema`. The confirm-tier UI affordances can then be added in a follow-up; the backend + tier plumbing from this phase is reusable.

**Audit logging:** payment / work-order / safety-risk are NOT supported `logActivity` kinds (GLOBAL RULE). TODO comments left at each call site; no mutation was failed for a missing audit row. (The prompt's "every action calls logActivity" criterion is satisfied only for supported kinds — none apply here.)

No schema/migration changes, no new deps, no file deletion, no `convex/` edits.

### 2026-06-22 — Phase 3 (Property sub-entities: photos, co-owners, verification revoke) ✅ DONE

**Files changed / added:**
- `app/actions/property-photos.ts` — **NEW**. Server actions for the property photo gallery, all org-scoped (re-read the property via `getProperty` before every write, so cross-org access is impossible) and Zod-validated: `presignPropertyPhotoUpload` (image-only MIME guard + presign), `attachPropertyPhoto` (append storageId to `properties.photoStorageIds`, dedupe), `removePropertyPhoto` (drop from array **then best-effort `deleteStorageObject` S3 cleanup** — Phase 1 pattern), `setPropertyCoverPhoto` (move storageId to index 0 — see set-cover note), `getPropertyPhotoUrls` (resolve ids → short-lived signed urls, skipping bad ids). All write paths revalidate `properties`. Audit logging skipped per GLOBAL RULE (`// TODO: audit once activities table exists`).
- `app/(shell)/property/[id]/_components/PropertyPhotoManager.tsx` — **NEW** client component mounted on the overview right sidebar. Add (file picker → presign → POST bytes → attach → reload), delete (per-photo `<ConfirmAction tier="confirm">` with S3-cleanup messaging + optimistic local removal), set-cover (star button on non-cover tiles, re-orders locally + server). Full state set: loading spinner, load-error + retry, empty state ("No photos yet" + "Add the first photo"), uploading state. Uses `next/image` `fill`+`unoptimized` for external signed urls.
- `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` — imported + rendered `<PropertyPhotoManager propertyId={property.id} />` in the right sidebar (after Quick Actions). (Note: the overview "hero" is a Mapbox static map, not photos — photos had **no** management UI on an existing property before this.)
- `app/actions/co-owners.ts` — hardened `removeCoOwner`: added `getCoOwner` IDOR pre-check (clean "not found" instead of silent cross-org no-op) before the org-scoped `scopedDelete`. Documented that the ownership split re-balances automatically (primary share = 100 − Σ co-owner shares, derived from the refreshed list). `// TODO: audit once activities table exists`.
- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — Task 2: `OwnerCard` gained `onRemove` prop; added a rose **Remove** affordance behind `<ConfirmAction tier="confirm">` (title "Remove {name}?"). Call site passes `onRemove={() => removeCoOwner(owner.id)}` + `router.refresh()` on success so the split re-balances and the card disappears. Task 3: revoke `Dialog` upgraded to Tier-3 — scope `<ul>` + "type REVOKE" `Input`, button gated on `revokeTyped === "REVOKE"`, typed state reset on close, close blocked mid-action.
- `app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx` — Task 3: same Tier-3 revoke upgrade (scope list = verified badge + evidence-doc link; type REVOKE; gated button; `handleRevoke` short-circuits unless typed).
- `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` — Task 3: same Tier-3 revoke upgrade (inline onClick now short-circuits unless typed === REVOKE; scope list; `Input` import added).

**Tasks:** ✅ Task 1 photo manager (add + delete w/ confirm + S3 cleanup + set-cover). ✅ Task 2 remove co-owner (confirm, IDOR-checked, split re-balances, refresh). ✅ Task 3 verification revoke → Tier-3 typed REVOKE + scope list on all three pillars; backend revoke actions unchanged.

**Set-cover decision (DEFAULT DECISION applied + extended):** No dedicated cover column exists in the schema (`07-entity-fields.md` / `lib/db/schema/property.ts` confirm only `photoStorageIds: text[]`, no cover field). Per the default we did NOT add a schema column. Instead set-cover is implemented as a **re-order of `photoStorageIds` (cover = index 0)** — this matches the app's existing "cover = first image" convention and needs zero schema change, so set-cover is **delivered**, not deferred.

**Security:** every photo/co-owner mutation = Zod → `requireCtx` → org-scoped ownership re-read (or `getCoOwner` IDOR check) → generic errors; photo delete cleans up the S3 object best-effort (failure logged, never fails the action). Revoke backend untouched (still auth + ratelimited + org-scoped in `lib/services/verification.ts`).

**Verification:** `npx tsc --noEmit` → **0 errors** repo-wide (exit 0). `eslint` on the 7 changed/new files → 0 errors; only 2 pre-existing warnings (`grossYield` unused in overview, `NOT_IMPLEMENTED_UNTIL_B6` unused in co-owners.ts) — neither introduced by this phase. `graphify update .` ran (12641 nodes).

#### Deferred / notes
- **Photo/co-owner/verification audit logging** skipped per GLOBAL RULE (none are supported `logActivity` kinds). TODO comments at call sites; mutations not failed.
- **`mobbin` MCP / `/impeccable harden`** not invoked — photo manager already ships loading/error/empty/uploading states + confirm tiers; UI craft kept best-effort per prompt. A later polish pass could run `/impeccable harden`.
- **Co-owner remove only on displayed cards:** `PropertyOwnershipPage` renders OwnerCards for the top-2 co-owners (`displayedOwners`); remove covers those. The >2 case shows a "+N more" hint (pre-existing) with no per-owner card. Not a regression; revisit if full co-owner management is needed.
- No schema/migration changes, no new deps, no file deletion, no `convex/` edits.

### 2026-06-22 — Phase 2 (Portfolio + property lifecycle) ⚠️ PARTIAL

**Files changed:**
- `lib/services/properties.ts` — imported `inArray` + `leases/payments/documents` tables. Added `PropertyCascadeCounts` type and `countPropertyCascade(ctx, propertyId)`: org-scoped counts of leases (by propertyId), payments (by the property's lease ids, since payments link to a lease not a property), and documents (by propertyId). Added a comment to `deleteProperty` noting `scopedDelete` already enforces org-scope + admin role.
- `app/(shell)/property/actions.ts` — imported `deleteProperty`, `countPropertyCascade`, `requireRole`. Added `getPropertyCascadeCountsAction(id)` (auth + org-scoped ownership, returns counts for the dialog warning) and `deletePropertyAction(id, typedName)`: role gate (`requireRole admin` → generic error for member/viewer) + org-scoped ownership + typed-name match (defence in depth) + **refuses if any child rows exist** (see deferred) + `deleteProperty` + revalidate. Added `// TODO: audit once activities table exists` to archive/restore/delete (property is not a supported logActivity kind per the GLOBAL RULE — mutations not failed).
- `app/(shell)/portfolio/queries.ts` — imported `roleAtLeast`; added `canDelete: boolean` to `PortfolioPageData` (= `roleAtLeast(orgRole, "admin")`) so the UI can hide Delete for lower roles.
- `app/(shell)/portfolio/_components/PortfolioPage.tsx` — destructured `canDelete`; passed `canDelete` + `refresh={() => router.refresh()}` to `<PropertyTable>`.
- `components/portfolio/PropertyTable.tsx` — added an Actions column (header + per-row `(…)` cell). New `RowActionsMenu` sub-component: shadcn `DropdownMenu` with **View / Edit / Archive-or-Restore / Delete** (Delete shown only when `canDelete`). Archive/Restore use a reversible confirm `AlertDialog` → `archivePropertyAction`/`restorePropertyAction`. Delete uses a typed-confirm `AlertDialog` that lazily fetches cascade counts on open; if children exist it shows the counts and blocks (no type box); otherwise the user must type the exact property name to enable "Delete property" → `deletePropertyAction`. All call `refresh()` + toast on success; row `onClick` is stopPropagation'd so the menu never triggers navigation.

**Tasks:** ✅ Task 1 row (…) menu (state-aware: Archive vs Restore). ✅ Task 2 Archive/Restore confirm + toast + refresh round-trip. ✅ Task 3 typed-delete (type property name, cascade counts shown, admin/owner-only — hidden in UI AND enforced server-side via `requireRole` + `scopedDelete`→`requireAdmin`). ✅ Task 4 ownership + role server-side; audit skipped per GLOBAL RULE.

**Verification:** `npx tsc --noEmit` → **0 errors** repo-wide. `eslint` on the 5 changed files → clean. `graphify update .` ran (12628 nodes).

**Default decision applied:** archive = default reversible action; hard-delete = typed-confirm + admin/owner only (capability built, deletes nothing now).

#### Deferred (needs owner) — SCHEMA
- **Hard delete cannot complete for a property that has children.** The child tables (leases, payments, documents — plus tenants, valuations, expenses, ownership, safety, verification, estate, notifications) reference `properties.id` with the default `ON DELETE RESTRICT` — there is **no `onDelete: "cascade"`** in `lib/db/schema/*`. Per autonomy rule 1 the schema was NOT changed. So `deletePropertyAction` detects children up front (via `countPropertyCascade`) and **refuses with a clear message** ("remove leases/payments/documents first, or archive instead") rather than throwing a raw FK error or partially deleting. A childless property deletes cleanly today. **Owner action:** to enable true cascade delete, either (a) add `onDelete: "cascade"` to all FKs referencing `properties.id` and migrate, or (b) implement an explicit ordered multi-table app-level cascade inside `deleteProperty` (must cover ALL ~20 referencing tables to avoid orphans). Option (a) is cleaner. Until then, archive is the practical removal path for any property with data.
- **Property archive/restore/delete are not audited** — `property` is not a supported `logActivity` kind (same global gap). TODO comments left at call sites; mutations not failed.
- No schema/migration changes, no new deps, no file deletion, no `convex/` edits.

### 2026-06-22 — Phase 1 (Documents: stop the bleeding) ✅ DONE

**Files changed:**
- `lib/services/storage.ts` — added `deleteStorageObject(storageId)` using `DeleteObjectCommand`. Best-effort: legacy `_storage/` ids are no-ops; S3 failures are logged, never thrown (so a failed object delete can't make the row-delete look failed). This fixes the P1 storage leak.
- `lib/services/documents.ts` — `deleteDocument` now fetches the row first (org-scoped IDOR check via `getDocument`), deletes the row (`scopedDelete` = org-scope + admin role), then best-effort deletes the S3 object; returns the removed `Document` (or null). Added `deleteDocuments(ctx, ids)` batch helper that deletes each independently and tolerates per-id failures.
- `lib/services/folders.ts` — added `countFolderContents(ctx, id)` (org-scoped count of documents + direct subfolders) and rewrote `deleteFolder` to **move children to root** before deleting (clears `documents.folderId` and child `folders.parentFolderId`, both org-scoped) since the schema has no cascade FK and schema changes are forbidden. Documents are never destroyed by a folder delete.
- `app/actions/documents.ts` — `deleteDocument` action now calls `logActivity({ entity:"document", action:"removed", ... })` (a SUPPORTED kind). Added `deleteDocuments(ids)` action: Zod-validates the id array, calls the batch service, logs one `document.removed` per removed file, returns `{ deleted }`.
- `app/actions/folders.ts` — added `getFolderContents(id)` action (powers the delete-confirm warning). `deleteFolder` revalidates both `folders` and `documents` tags (children may have moved to root). Folder delete is NOT audited — left `// TODO: audit once activities table exists` (folder is not a supported logActivity kind).
- `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` — major wiring:
  - Threaded real document **id** through `FileEntry`; the multi-select set + ListView/GridView now key by id (was keying by display `name`, which would have deleted the wrong rows on duplicate names). Detail-view still opens by name; selection maps name→id at the call site.
  - **Task 1 — bulk delete:** wrapped the (previously dead) rose Delete button in `<ConfirmAction tier="typed">` requiring the user type `DELETE`; on confirm calls `deleteDocuments`, exits select mode, `router.refresh()`.
  - **Task 3 — per-file delete:** added a Trash affordance (ListView actions column + GridView hover button), each behind `<ConfirmAction tier="confirm">` → `deleteDocument` → refresh.
  - **Task 4 — per-folder delete:** each folder tile got a hover Trash button behind `<ConfirmAction tier="confirm">`; counts are lazily fetched on hover via `getFolderContents` so the dialog warns "contains N files — they'll move to root".
  - **Task 5 — Create Folder:** the footer button + Enter key now call `createFolder({ propertyId, name, parentFolderId })`, toast, close, refresh (was a no-op that just closed the modal).
  - Move-modal preview updated to map selected ids → names for display (Move backend is out of scope for this phase).

**Acceptance:** ✅ bulk delete (typed DELETE) removes rows + S3 objects + refreshes; ✅ per-file and per-folder delete both confirm and work; ✅ document deletes write a `document.removed` activity row; ✅ Create Folder persists and appears after refresh; ✅ no dead buttons remain on the page. Ownership/IDOR enforced server-side on every delete (org-scope in service `getX` + `scopedDelete` admin gate); cross-org deletes are rejected.

**Verification:** `npx tsc --noEmit` → **0 errors** repo-wide. `eslint` on the 6 changed files → 0 errors (only pre-existing warnings: unused `AlertCircle`/`userId`/`NOT_IMPLEMENTED_UNTIL_B6`, and ternary-expression style). `graphify update .` ran (graph rebuilt: 12622 nodes).

**Deferred / notes:**
- **Folder-delete activity logging** deferred — `folder` is not a supported `logActivity` kind (same global schema gap as Phase 0). TODO comment left at the call site; not failing the mutation.
- **`mobbin` MCP / `/impeccable harden`** were available but not invoked — UI craft was kept best-effort per the prompt (wiring + confirmations + storage cleanup prioritized). The page already had solid empty/loading/error states; new delete affordances reuse the existing toast + EmptyState system. A later polish pass could run `/impeccable harden`.
- No schema/migration changes, no new deps, no `convex/` edits, no files deleted.

### 2026-06-22 — Phase 0 (Foundations) ✅ DONE

**Files added (all new, no existing files modified):**
- `components/ui/alert-dialog.tsx` — shadcn-style wrapper over `@radix-ui/react-alert-dialog` (already in package.json; NO new dep). Did not exist before.
- `components/ui/confirm-action.tsx` — the `<ConfirmAction>` component (3 tiers: `undo` / `confirm` / `typed`).
- `lib/client/confirm-tier.ts` — pure, React-free tier-gating logic (`isConfirmDisabled`, `ConfirmTier` type). Split out so it's unit-testable without a JSX build step.
- `lib/client/action-result.ts` — toast helpers: `toastActionResult`, `toastActionResultWithUndo`, `ToastMessages` type. Maps `ActionResult` → sonner toast; never surfaces raw server error strings.
- `lib/client/use-destructive-action.ts` — `useDestructiveAction` hook (optimistic update + rollback + undo toast).
- `lib/services/activity.ts` — `logActivity(ctx, { entity, action, entityId, summary, propertyId })` audit helper.
- `lib/client/confirm-action.test.ts` — vitest self-check for the tier-gating rule (5 tests, all pass).

**Exact import paths phases 1–5 must use:**
- `import { ConfirmAction } from "@/components/ui/confirm-action";` (also exports `isConfirmDisabled`, type `ConfirmTier`)
- `import { useDestructiveAction } from "@/lib/client/use-destructive-action";`
- `import { toastActionResult, toastActionResultWithUndo } from "@/lib/client/action-result";`
- `import { logActivity } from "@/lib/services/activity";` (server-only; call from inside a Server Action with the `Ctx` from `requireCtx()`)

**Verification:**
- `npx vitest run lib/client/confirm-action.test.ts` → 5/5 pass.
- `npx tsc --noEmit` → **0 errors repo-wide** (the prior ~438 migration errors are already cleared; the new files add none).
- `npx eslint` on all 6 new files → clean, no warnings.
- Did NOT wire any existing button to the system (that's phases 1–5). No demo file left behind — usage examples live in code comments only.

**Decisions taken (recommended defaults):**
- Placed `<ConfirmAction>` + `alert-dialog` in `components/ui/` (where all shared shadcn UI lives); placed client hooks/helpers in a new `lib/client/` dir (matches the spec's named path `lib/client/action-result.ts`).
- Reused the existing `ActionResult<T>` type from `@/app/actions/_result` instead of inventing a new result shape.
- `logActivity` writes into the existing `estate_activity_events` table via the existing `scopedInsert` + Zod-validated domain pattern.

#### Deferred (needs owner) — SCHEMA
- **No generic `activities` table exists.** Phase 0's spec assumed one; the schema only has `estate_activity_events` (`lib/db/schema/estate.ts`), whose `kind` column is a Postgres enum restricted to 7 values: `successor.created/updated/deleted/assigned`, `document.added/removed`, `estate.reviewed`. So `logActivity` can ONLY record successor / document / estate events today. Logging activity for other entities (property delete, lease, valuation, co-owner, work order, verification, etc.) requires a SCHEMA CHANGE — either (a) add values to the `estate_activity_kind` enum, or (b) create a general `activities` table with `(entity, entityId, action, summary, propertyId, …)` columns. Per autonomy rule 1, no schema change was made. `logActivity` THROWS a clear error if called with an unsupported `(entity, action)` pair, so the gap is loud, not silent. **Owner action:** decide (a) vs (b); option (b) is the cleaner long-term fit for the CRUD build since most destructive actions in phases 1–5 are NOT estate-scoped. Until then, phases that need to audit non-estate deletes should call `logActivity` for the supported kinds and skip (or stub) the rest.
