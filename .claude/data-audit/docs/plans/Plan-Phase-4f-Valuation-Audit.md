# Plan — Phase 4f: Run page audit on `/property/[id]/valuation` (sixth page)

## Context

`/property/[id]/valuation` is the sixth of the 7 routes to audit using the new folder + audit/plan format. It's the **first single-entity-dominant test** — unlike prior pages which spread surfaces across multiple entity families, this page is dominated by one entity: PropertyValuation (catalog §16). After Phase 4f, PropertyValuation's `Surfaces unlocked` count in `pages/INDEX.md` will jump significantly (it currently sits at 1 from overview alone — the "Property Valuation $24.85M" KPI), likely pushing it from rank 3+ into the top 3 of the cross-page entity backlog.

This is also the page that resolves overview row 7's "blocked on seed backfill or PropertyValuation" decision — if the valuation tab needs trend history (line chart, year-over-year, methodology), the "right path" (build PropertyValuation as its own entity) becomes clearly justified, not just the quick path of backfilling `currentMarketValue`.

This page is greenfield (no existing per-datapoint audits expected — confirm during execution by greping `INDEX.md`).

The intended outcome: one new folder `.claude/data-audit/pages/property-id-valuation/` with `audit.md` + `plan.md`, the page-level INDEX row added, and `pages/INDEX.md` refreshed to show PropertyValuation re-ranked based on its true cross-page importance (overview + valuation combined).

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format.
- **Phase 3 complete** — `pages/INDEX.md` exists.
- **Phase 4a/4b complete** — `pages/portfolio/` and `pages/property-id-rental/` exist.
- (Phase 4c/4d/4e may or may not have run; the cross-page math in `pages/INDEX.md` will reflect whatever pages are present at execution time.)

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/property-id-valuation/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/property-id-valuation/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** any pre-existing `.claude/data-audit/property-id-valuation--*.md` files — insert TL;DR back-link bullets (per skill §9). **Expected count: 0** based on current INDEX.md state, but verify before assuming.
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/property/[id]/valuation`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog. **PropertyValuation likely re-ranks upward.**

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/property/[id]/valuation` → `app/(shell)/property/[id]/valuation/page.tsx`. Slug is `property-id-valuation`. Folder will be `.claude/data-audit/pages/property-id-valuation/`.
2. **Walk the components.**
   - Read `app/(shell)/property/[id]/valuation/page.tsx`
   - Read `app/(shell)/property/[id]/valuation/queries.ts` (if it exists; absence is potentially a PFn — same `PropertyListItem`-style narrowing question as overview)
   - Read `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` (or whatever component the page renders)
   - Read `components/property/PropertyLayout.tsx` — same wrapper as overview/rental/safety/ownership, MUST be walked again (per skill §3)
   - Read any sub-components: current valuation card, valuation history chart, comparable sales table, market trend graph, AVM result block, manual revaluation form, methodology badge
3. **Build the inventory.** Classify every JSX-rendered surface. Expected categories:
   - Header (PropertyLayout) — same WIRED rows as overview (code, type, health badge)
   - Tab nav — same CHROME as overview
   - Page-specific surfaces:
     - **Current valuation big number** ("$24.8M") — likely HARDCODED (mock value, but `property.currentMarketValue` field exists on the type — could be PARTIAL/half-wired)
     - **YoY change badge** ("+12% vs last year") — likely HARDCODED (derived would need PropertyValuation history)
     - **Valuation history line chart** (with data points like "Jan 2026: $24.5M", "Mar 2026: $24.8M") — likely HARDCODED (`<svg>` with hardcoded path data or array of dummy points)
     - **Comparable sales table** (similar properties + sale prices + dates) — likely HARDCODED (mock comparables; needs Property + recent-sales query)
     - **Market trend chart** (regional or country-level) — likely HARDCODED (no entity for market data exists; would be a new concept)
     - **AVM (Automated Valuation Model) result block** with confidence range — likely HARDCODED
     - **Methodology badge** ("Comparable sales / AVM / Manual / Bank appraisal") — likely PARTIAL or HARDCODED (badge text + colour)
     - **"Request appraisal" / "Add manual valuation" / "Refresh AVM" buttons** — CHROME (no real action wired)
     - **Trend arrow icons (up/down)** — DECORATIVE
4. **File PFn entries.** Likely overlapping with overview:
   - Full Property to Client Component (if no `queries.ts` narrowing exists)
   - Multi-tenant shim
   - Missing audit log (especially relevant — valuation changes affect mortgage decisions, tax assessments, sale strategy)
   - Plus valuation-specific possibilities:
     - Hardcoded methodology → colour mapping (PARTIAL pattern)
     - No `queries.ts` narrowing for PropertyValuation read paths (once entity lands)
     - Currency normalisation (Q5.H — valuation values are USD/local-currency mixed; flag here if visible)
5. **Build the Entity Backlog.** New entities to introduce:
   - **PropertyValuation** (catalog §16) — RE-USED from overview (row 7); cross-page count INCREASES SIGNIFICANTLY. Likely the dominant entity for this page (5+ surfaces).
   - **MarketComparable** (NEW — not in catalog) — similar properties for comparison. May not warrant a separate entity; could be a query that returns nearby `Property` records filtered by type/size/recent-sale. File as Q5.<next> if undecided.
   - **MarketTrend** (NEW — not in catalog) — region-level price-trend data. Likely external data source, not an owned entity. File as Q4.<next> for "external data integration".
   - **Property** (catalog §1) — `currentMarketValue` field is referenced by row 7 on overview already; if the valuation page also reads it, that's a shared field, not a new entity contribution.
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. None expected for this route, so all WIRED rows will be `_to-do_` with the recommended template (lite vs full).
7. **Compute SHAs** for every walked file (`git hash-object <path>`).
8. **Insert back-links** into any pre-existing `property-id-valuation--*.md` files (expect zero; verify and skip if so).
9. **Append a row to `INDEX.md`'s Page-level audits table:**
   `| [property-id-valuation](pages/property-id-valuation/audit.md) | /property/[id]/valuation | <wired> | <hardcoded> | <pfn> | <verdict> | 1 |`
   Sort alphabetically — should land near the end of the property-id-* group.
10. **Regenerate `pages/INDEX.md`** by reading all existing `pages/*/plan.md` files (overview + portfolio + rental + valuation, plus documents/safety/ownership if they ran), summing entity surfaces across pages, re-sorting. **Expect PropertyValuation to jump up the ranking** — combining overview's 1 surface + valuation's likely 5+ surfaces makes it the entity with the most impact relative to its current rank.

## Verification

After Phase 4f lands:

1. **New folder exists:** `.claude/data-audit/pages/property-id-valuation/audit.md` and `plan.md` are present and cross-link each other.
2. **PropertyLayout was walked:** the inventory includes the header property-code badge and the health-score badge (otherwise the layout was missed).
3. **No per-datapoint audits restated:** if any pre-existing `property-id-valuation--*.md` files were found, they got back-links rather than their findings duplicated as PFn.
4. **INDEX.md row added:** alphabetical sort places it correctly in the Page-level audits table.
5. **PropertyValuation cross-page count summed correctly:** open `pages/INDEX.md` and verify PropertyValuation's `Surfaces unlocked` is overview's count + valuation's count. Its `Pages it touches` lists both `property-id-overview` and `property-id-valuation`.
6. **PropertyValuation re-ranked:** if PropertyValuation was previously rank 3 with 1 surface, it should now be higher (likely rank 2 or even rank 1 depending on valuation page density). The `Recommended next moves` line in `pages/INDEX.md` should reflect the new top-of-list.
7. **Resolves overview row 7's blocked status:** the existence of this audit's Entity Backlog entry for PropertyValuation gives the user the "right path" justification for that earlier decision. The value-history line chart on this page makes the entity necessary, not just the seed backfill.
8. **Existing entity rankings unchanged where untouched:** Lease/Tenant/Payment counts unchanged from earlier phases (valuation page doesn't touch them); they keep their existing rank.
9. **No source files touched:** `git status` shows changes only under `.claude/`.
10. **New open questions filed correctly (if any):** if MarketComparable or MarketTrend get filed as Q-numbers, they should appear in `ref/05-open-questions.md` with cross-links to `pages/property-id-valuation/audit.md`.

## What unblocks after Phase 4f

- **Phase 4g** — run the seventh and final page audit on `/property/[id]/location` (catalog §1 Property location fields + likely Map/Geocoding integration). Completes the property-tab family.
- **Strong wiring decision:** PropertyValuation's promotion in the cross-page ranking gives the user a concrete path to address overview row 7. Once the entity is built, both overview and valuation rows wire in one batched audit.

## Time estimate

~15–20 minutes:
- Walk + classify surfaces on `/property/[id]/valuation`: ~10 min
- Build Entity Backlog with PropertyValuation re-use + new market-data Q-number filings: ~3 min
- INDEX.md row + regenerate `pages/INDEX.md` with PropertyValuation re-ranking: ~3 min
- Verification grep + cross-page sum check + ranking-shift verification: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/property/[id]/valuation` only.
- Re-running any prior page audit. Their content is settled.
- Modifying any source code, seed data, or reference corpus (except filing new Q-numbers if needed for MarketComparable/MarketTrend).
- Building any entity from the backlog.
- Designing the AVM integration or external market-data feed — that's a follow-up workstream once PropertyValuation as a stored entity lands.
