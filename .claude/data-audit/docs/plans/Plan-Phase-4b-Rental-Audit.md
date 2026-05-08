# Plan — Phase 4b: Run page audit on `/property/[id]/rental` (second page)

## Context

`/property/[id]/rental` is the second of the 7 routes to audit using the new folder + audit/plan format. It's deliberately picked second because it's the **first cross-page entity test** — the rental tab is heavily lease/tenant/payment driven, which means the entities it identifies will overlap significantly with the overview page's backlog (Lease appears in both; Payment appears in both). After Phase 4b, `pages/INDEX.md` (cross-page entity backlog) will have **summed surface counts across two pages** — the first time the cross-page roll-up produces a meaningfully different ranking than any single page's view.

This page is also greenfield (no existing per-datapoint audits expected — confirm during execution by greping `INDEX.md`), which makes it the natural complement to Phase 4a's brownfield case. If the skill handles both well, the remaining 5 greenfield routes are mechanical.

The intended outcome: one new folder `.claude/data-audit/pages/property-id-rental/` with `audit.md` + `plan.md`, the page-level INDEX row added, and `pages/INDEX.md` refreshed to show entity priorities re-ranked by overview + portfolio + rental contributions combined.

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format.
- **Phase 3 complete** — `pages/INDEX.md` exists.
- **Phase 4a complete** — `pages/portfolio/` exists; the brownfield-handling pattern (back-links to existing per-datapoint audits) has been proven.

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/property-id-rental/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/property-id-rental/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** any pre-existing `.claude/data-audit/property-id-rental--*.md` files — insert TL;DR back-link bullets (per skill §9). **Expected count: 0** based on current INDEX.md state, but verify before assuming.
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/property/[id]/rental`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog (now aggregating overview + portfolio + rental).

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/property/[id]/rental` → `app/(shell)/property/[id]/rental/page.tsx`. Slug is `property-id-rental`. Folder will be `.claude/data-audit/pages/property-id-rental/`.
2. **Walk the components.**
   - Read `app/(shell)/property/[id]/rental/page.tsx`
   - Read `app/(shell)/property/[id]/rental/queries.ts` (if it exists; this route may not have a queries layer yet — that itself is potentially a PFn)
   - Read `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` (or whatever component the page renders)
   - Read `components/property/PropertyLayout.tsx` — same wrapper as overview, MUST be walked again (per skill §3 "Layout traversal is essential")
   - Read any sub-components (tenant cards, lease tables, rent collection charts, etc.)
3. **Build the inventory.** Classify every JSX-rendered surface. Expected categories:
   - Header (PropertyLayout) — same WIRED rows as overview (code, type, health badge)
   - Tab nav — same CHROME as overview
   - Page-specific surfaces: tenant list, lease summaries, rent payment table, occupancy stats, rental income KPIs — likely heavy on HARDCODED if the page is mocked similarly to overview
4. **File PFn entries.** Likely overlapping with overview:
   - Full Property to Client Component (if no `queries.ts` narrowing exists for this route)
   - Multi-tenant shim (always applies)
   - Missing audit log
   - Plus rental-specific: hardcoded lease colors / status badges / payment-status indicators (PARTIAL pattern)
5. **Build the Entity Backlog.** Expected entities:
   - **Lease** — already top-ranked from overview; rental tab will likely add more lease surfaces (lease list, lease details), pushing the count higher
   - **Tenant** — same; rental tab likely shows full tenant detail
   - **Payment** — rental tab is THE place rent payments are surfaced; expect this to jump significantly in the cross-page ranking
   - Possibly RentalEvent (rent received, lease renewed, etc.)
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. None expected for this route, so all WIRED rows will be `_to-do_` with the recommended template (lite vs full).
7. **Compute SHAs** for every walked file.
8. **Insert back-links** into any pre-existing `property-id-rental--*.md` files (expect zero; verify and skip if so).
9. **Append a row to `INDEX.md`'s Page-level audits table.**
10. **Regenerate `pages/INDEX.md`** by reading `pages/property-id-overview/plan.md` + `pages/portfolio/plan.md` + `pages/property-id-rental/plan.md`, summing entity surfaces across all three pages, re-sorting, and rewriting the table. **Watch for ranking shifts** — Payment may jump above PropertyValuation, RentalEvent counts may consolidate.

## Verification

After Phase 4b lands:

1. **New folder exists:** `.claude/data-audit/pages/property-id-rental/audit.md` and `plan.md` are present and cross-link each other.
2. **PropertyLayout was walked:** the inventory includes the header property-code badge and the health-score badge (otherwise you missed the layout — same trap that nearly bit overview).
3. **No per-datapoint audits restated:** if any pre-existing `property-id-rental--*.md` files were found, they got back-links rather than their findings duplicated as PFn. If none exist, the Audit Roadmap shows all WIRED rows as `_to-do_`.
4. **INDEX.md row added:** the new page-level row is alphabetically sorted (between `portfolio` and `property-id-overview` in the table).
5. **pages/INDEX.md re-ranked:** the cross-page entity backlog now reflects three pages of contributions. Specifically:
   - Lease's `Surfaces unlocked` count is HIGHER than overview's value alone (it's now overview + rental).
   - If Payment appeared on rental, its rank is now visible (likely jumps to top 2 or 3).
   - The "Pages it touches" column for shared entities lists multiple pages.
6. **No source files touched:** `git status` shows changes only under `.claude/`.
7. **Sanity check on cross-page math:** open `pages/INDEX.md` and confirm the surface counts for any entity appearing in BOTH overview and rental are summed correctly (compare to source `plan.md` Entity Backlogs).

## What unblocks after Phase 4b

- **Phase 4c** — run the next page audit. Recommend `/property/[id]/documents` next: it'll introduce a new entity family (Document + Folder) that doesn't appear in overview, portfolio, or rental, so it tests the skill's ability to add brand-new entities to `pages/INDEX.md` rather than just incrementing existing ones.
- **First meaningful priority decision:** after 4b, the cross-page backlog has enough data that the user could already commit to "build Lease + Tenant + Payment first" with confidence. The remaining 5 audits (4c–4g) refine the ranking but don't usually change the top of the list.

## Time estimate

~15–20 minutes:
- Walk + classify surfaces on `/property/[id]/rental`: ~10 min (similar density to overview)
- Build Entity Backlog with attention to cross-page entity dedup: ~3 min
- INDEX.md row + regenerate `pages/INDEX.md` with cross-page math: ~3 min
- Verification grep + cross-page sum check: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/property/[id]/rental` only.
- Re-running `/portfolio` or `/property/[id]/overview`. Their content is settled.
- Modifying any source code, seed data, or reference corpus (unless a brand-new open question must be filed — cite Q-number then).
- Building any entity from the backlog.
