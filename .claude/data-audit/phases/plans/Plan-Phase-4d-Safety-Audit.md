# Plan — Phase 4d: Run page audit on `/property/[id]/safety` (fourth page)

## Context

`/property/[id]/safety` is the fourth of the 7 routes to audit using the new folder + audit/plan format. It's the **first safety/risk-domain test** — the safety tab introduces an entity family (SafetyRisk + Inspection + Certification + EmergencyContact, catalog §17 + §19 + §20) that does not appear in any prior audit (overview, portfolio, rental). It also likely re-surfaces MaintenanceItem (catalog §7), which previously only appeared in overview's alerts strip — the cross-page count for MaintenanceItem will increase.

This page also continues the greenfield pattern (no existing per-datapoint audits expected — confirm during execution by greping `INDEX.md`). With the per-page-execution rhythm now established (Phase 4a brownfield, 4b cross-page entity, plus the safety-domain entities introduced here), the skill's structural variations are well-covered.

The intended outcome: one new folder `.claude/data-audit/pages/property-id-safety/` with `audit.md` + `plan.md`, the page-level INDEX row added, and `pages/INDEX.md` refreshed to show new SafetyRisk/Inspection/Certification/EmergencyContact rows alongside an updated MaintenanceItem ranking.

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format.
- **Phase 3 complete** — `pages/INDEX.md` exists.
- **Phase 4a complete** — `pages/portfolio/` exists.
- **Phase 4b complete** — `pages/property-id-rental/` exists.

(Phase 4c for `/property/[id]/documents` was deferred. If it's executed before 4d, the cross-page math in `pages/INDEX.md` will include documents; if not, this run aggregates only overview + portfolio + rental + safety.)

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/property-id-safety/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/property-id-safety/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** any pre-existing `.claude/data-audit/property-id-safety--*.md` files — insert TL;DR back-link bullets (per skill §9). **Expected count: 0** based on current INDEX.md state, but verify before assuming.
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/property/[id]/safety`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog.

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/property/[id]/safety` → `app/(shell)/property/[id]/safety/page.tsx`. Slug is `property-id-safety`. Folder will be `.claude/data-audit/pages/property-id-safety/`.
2. **Walk the components.**
   - Read `app/(shell)/property/[id]/safety/page.tsx`
   - Read `app/(shell)/property/[id]/safety/queries.ts` (if it exists; absence is potentially a PFn — same `PropertyListItem`-style narrowing question as overview)
   - Read `app/(shell)/property/[id]/_components/PropertySafetyPage.tsx` (or whatever component the page renders)
   - Read `components/property/PropertyLayout.tsx` — same wrapper as overview/rental, MUST be walked again (per skill §3)
   - Read any sub-components: risk register, inspection schedule, certification list, emergency contact card, maintenance log
3. **Build the inventory.** Classify every JSX-rendered surface. Expected categories:
   - Header (PropertyLayout) — same WIRED rows as overview (code, type, health badge)
   - Tab nav — same CHROME as overview
   - Page-specific surfaces:
     - **Risk register / hazard list** — likely HARDCODED (mock risks like "Fire safety: due in 30 days")
     - **Inspection history table** — likely HARDCODED (mock past inspections + dates)
     - **Certification status badges** — likely PARTIAL (text vs colour mismatch, similar to overview's status badge pattern)
     - **Emergency contacts card** — likely HARDCODED (mock contacts: name, role, phone)
     - **Compliance score / safety health %** — likely HARDCODED (derived would need SafetyRisk + Inspection)
     - **Risk severity icons** — DECORATIVE
     - **"Schedule inspection" / "Add risk" buttons** — CHROME (no real action wired)
4. **File PFn entries.** Likely overlapping with overview:
   - Full Property to Client Component (if no `queries.ts` narrowing exists)
   - Multi-tenant shim
   - Missing audit log
   - Plus safety-specific possibilities:
     - Hardcoded severity → colour mapping (PARTIAL pattern if severity is server-sourced but colour locked)
     - No `queries.ts` narrowing for SafetyRisk read paths (once entity lands)
5. **Build the Entity Backlog.** New entities to introduce:
   - **SafetyRisk** (catalog §19) — risk register, hazard list, severity ratings
   - **Inspection** (catalog §17) — inspection history, scheduled inspections, results
   - **Certification** (catalog §17) — certification list, expiry tracking, badge status
   - **EmergencyContact** (catalog §20) — contact card, on-call roster
   - **MaintenanceItem** (catalog §7) — RE-USED entity from overview's alerts strip; this page likely contributes more surfaces (maintenance log, work-order history). Cross-page count will INCREASE.
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. None expected for this route, so all WIRED rows will be `_to-do_` with the recommended template (lite vs full).
7. **Compute SHAs** for every walked file (`git hash-object <path>`).
8. **Insert back-links** into any pre-existing `property-id-safety--*.md` files (expect zero; verify and skip if so).
9. **Append a row to `INDEX.md`'s Page-level audits table:**
   `| [property-id-safety](pages/property-id-safety/audit.md) | /property/[id]/safety | <wired> | <hardcoded> | <pfn> | <verdict> | 1 |`
   Sort alphabetically — should land between `property-id-rental` and any future `property-id-valuation` row.
10. **Regenerate `pages/INDEX.md`** by reading all existing `pages/*/plan.md` files (overview + portfolio + rental + safety, plus documents if Phase 4c ran), summing entity surfaces across pages, re-sorting. **Expect new rows for SafetyRisk, Inspection, Certification, EmergencyContact** that did not appear in any prior plan, and **MaintenanceItem's surface count to increase**.

## Verification

After Phase 4d lands:

1. **New folder exists:** `.claude/data-audit/pages/property-id-safety/audit.md` and `plan.md` are present and cross-link each other.
2. **PropertyLayout was walked:** the inventory includes the header property-code badge and the health-score badge (otherwise the layout was missed).
3. **No per-datapoint audits restated:** if any pre-existing `property-id-safety--*.md` files were found, they got back-links rather than their findings duplicated as PFn.
4. **INDEX.md row added:** alphabetical sort places it correctly in the Page-level audits table.
5. **pages/INDEX.md gained NEW entity rows:** SafetyRisk, Inspection, Certification, EmergencyContact appear as fresh rows — they did NOT exist in the table before this run. Their `Pages it touches` column lists only `property-id-safety`.
6. **MaintenanceItem ranking updated:** if MaintenanceItem appeared in overview's backlog (alerts row 16 → "HVAC Fault"), its `Surfaces unlocked` count is now SUM of overview's contribution + safety's contribution. Check `Pages it touches` lists both.
7. **Existing entity rankings unchanged where untouched:** Lease/Tenant/Payment counts unchanged from Phase 4b (safety page doesn't touch them); they keep their existing rank.
8. **No source files touched:** `git status` shows changes only under `.claude/`.
9. **Sanity check:** open `pages/INDEX.md` and confirm the entity table is still correctly sorted by `Total surfaces unlocked` descending, with the new safety-domain entities slotted in at their correct rank based on safety-page contribution alone.

## What unblocks after Phase 4d

- **Phase 4e** — run the next page audit. Recommend `/property/[id]/ownership` next (catalog §13 Professional, §14 Successor, §15 EstateDocument, §21+§22 OwnershipRecord/OwnershipHistoryItem — yet another distinct entity family). Continues the new-entity-family pattern.
- **Cross-page priority is now stable:** with four pages of contributions (or five if 4c ran), the top of the entity backlog should be locked in. Lease+Tenant+Payment likely remain rank 1–3; safety-domain entities slot in based on this page's surface count alone.

## Time estimate

~15–20 minutes:
- Walk + classify surfaces on `/property/[id]/safety`: ~10 min
- Build Entity Backlog with new SafetyRisk/Inspection/Certification/EmergencyContact entries: ~3 min (catalog §17 + §19 + §20 already document the shapes)
- INDEX.md row + regenerate `pages/INDEX.md` with new entity rows: ~3 min
- Verification grep + new-row sanity check + MaintenanceItem cross-page sum check: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/property/[id]/safety` only.
- Re-running `/portfolio`, `/property/[id]/overview`, `/property/[id]/rental`, or `/property/[id]/documents`. Their content is settled.
- Modifying any source code, seed data, or reference corpus (unless a brand-new open question must be filed — cite Q-number then).
- Building any entity from the backlog.
