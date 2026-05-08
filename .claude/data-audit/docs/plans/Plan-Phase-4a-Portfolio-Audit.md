# Plan — Phase 4a: Run page audit on `/portfolio` (first page)

## Context

`/portfolio` is the first of the 7 routes to audit using the new folder + audit/plan format. It's deliberately picked first because it's the **brownfield case** — `/portfolio` already has 14 per-datapoint audits in `.claude/data-audit/portfolio--*.md` (most resolved). This makes it the strongest test of the skill's behavior on an established route:

- The Audit Roadmap should reference the 14 existing per-datapoint audits rather than recommending duplicates.
- The PFn list will likely be smaller than overview's 4 — many systemic concerns (`queries.ts` narrowing, `PropertyListItem`) were already fixed during the per-datapoint audit cycle.
- Each of the 14 existing per-datapoint audits will get a back-link inserted into its TL;DR (per skill §9).

If the page-audit skill handles this brownfield case cleanly, the remaining 6 greenfield routes (rental, documents, safety, ownership, valuation, location) will be straightforward.

The intended outcome: one new folder `.claude/data-audit/pages/portfolio/` with `audit.md` + `plan.md`, 14 existing per-datapoint reports gain a back-link, the page-level INDEX row is added, and `pages/INDEX.md` (cross-page entity backlog) is refreshed.

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format (proves the format works on a real example).
- **Phase 3 complete** — `pages/INDEX.md` exists and is being maintained by the skill.

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/portfolio/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/portfolio/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** up to 14 files at `.claude/data-audit/portfolio--*.md` — insert one TL;DR back-link bullet in each. (Per skill §9: "On first run for a route, edit existing per-datapoint reports for that route to add a back-link.")
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/portfolio`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog (now aggregating overview + portfolio).

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus (`ref/00`, `ref/03`, `ref/05`) unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/portfolio` → `app/(shell)/portfolio/page.tsx`. Slug is `portfolio`. Folder will be `.claude/data-audit/pages/portfolio/`.
2. **Walk the components.**
   - Read `app/(shell)/portfolio/page.tsx`
   - Read `app/(shell)/portfolio/queries.ts` (already exists for portfolio — uses `PropertyListItem` narrowing)
   - Read `app/(shell)/portfolio/_components/PortfolioPage.tsx`
   - Read any layout wrappers imported by `page.tsx` (likely `app/(shell)/layout.tsx` or `app/(shell)/_components/HomePage.tsx` for the home-page legend variant)
   - Read `app/(shell)/_components/PortfolioLegend.tsx` if referenced
   - Read `components/portfolio/PropertyTable.tsx` and `components/portfolio/PropertyFilters.tsx`
3. **Build the inventory.** Classify every JSX-rendered surface as WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE. Expected: most KPI cards are WIRED (matches the 14 existing audits); the table columns are WIRED; some chrome (search bar, filter chips, "Add property" button) is CHROME.
4. **File PFn entries.** Likely fewer than overview's 4 — `PortfolioListItem` narrowing already exists, so the "full Property to client" PFn does not apply. Possible candidates: multi-tenant shim (still applies), missing audit log, hardcoded analytics-card growth percentages (if the home page legend is included).
5. **Build the Entity Backlog.** Some HARDCODED rows on `/portfolio` likely need entities not yet built (e.g. the "attention" KPI was removed, but if any new alert-style surface exists, it'd want Notification). For each, check `ref/00-entity-catalog.md` and group as in overview.
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. Reference it directly with verdict; do **not** recommend a new run.
7. **Compute SHAs** for every walked file (`git hash-object <path>`). Store in `audit.md`'s source-files `<details>`.
8. **Insert back-links** into all 14 existing `portfolio--*.md` TL;DRs:
   `- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)`
9. **Append a row to `INDEX.md`'s Page-level audits table:**
   `| [portfolio](pages/portfolio/audit.md) | /portfolio | <wired> | <hardcoded> | <pfn> | <verdict> | 1 |`
10. **Regenerate `pages/INDEX.md`** by reading both `pages/property-id-overview/plan.md` and `pages/portfolio/plan.md`, summing entity surfaces across pages, re-sorting, and rewriting the table.

## Verification

After Phase 4a lands:

1. **New folder exists:** `.claude/data-audit/pages/portfolio/audit.md` and `plan.md` are present and cross-link each other.
2. **Surface inventory is exhaustive:** every visible element on `/portfolio` (header, KPI cards, filter chips, table rows, table columns, footer) appears in `audit.md`'s §1 — none missed.
3. **Audit Roadmap references existing audits:** the 14 existing per-datapoint audits each appear once in the Roadmap, with their slug + verdict. No duplicate audit recommendations are made for already-audited surfaces.
4. **Back-links inserted:** each of the 14 `portfolio--*.md` files has the new 4th-bullet back-link in its TL;DR. Verify by grep: `grep -l "📄 Page audit:" .claude/data-audit/portfolio--*.md` should return all 14.
5. **INDEX.md row added:** the new page-level row is sorted alphabetically (between `property-id-overview` if present and any other future entries).
6. **pages/INDEX.md refreshed:** the cross-page entity backlog table now includes contributions from BOTH overview and portfolio. Entities appearing on both pages (if any) have summed surface counts and re-ranked priority.
7. **Brownfield handling correct:** no per-datapoint findings are restated as PFn — page-wide PFn entries cover only NEW systemic concerns not already filed in the existing 14 audits.
8. **No source files touched:** `git status` shows changes only under `.claude/`.
9. **Sanity check on Audit Roadmap accuracy:** open one existing audit (e.g. `portfolio--monthly-income.md`) and confirm it's referenced in `pages/portfolio/plan.md`'s Audit Roadmap with the correct verdict copied from `INDEX.md`.

## What unblocks after Phase 4a

- **Phase 4b** — run the next page audit (recommend `/property/[id]/rental` next, since it's the first greenfield route in the property-tabs family and shares Lease/Tenant entities with overview, which lets the cross-page count for those entities update meaningfully).
- The brownfield handling pattern proven here applies to any future re-audit when a route gains/loses surfaces.

## Time estimate

~15–20 minutes:
- Walk + classify ~25–35 surfaces on `/portfolio` (it's a denser page than overview): ~10 min
- Cross-reference 14 existing audits + insert back-links: ~5 min
- INDEX.md row + regenerate `pages/INDEX.md`: ~3 min
- Verification grep + click-through: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/portfolio` only.
- Re-validating the 14 existing per-datapoint audits' findings — back-link insertion is a path-level edit, not a content review.
- Modifying any source code, seed data, or reference corpus.
- Building any entity from the backlog.
