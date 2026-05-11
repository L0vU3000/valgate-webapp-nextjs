# Plan — Phase 4e: Run page audit on `/property/[id]/ownership` (fifth page)

## Context

`/property/[id]/ownership` is the fifth of the 7 routes to audit using the new folder + audit/plan format. It's the **first ownership/legal-domain test** — the ownership tab introduces an entity family (OwnershipRecord + OwnershipHistoryItem + Successor + EstateDocument + Professional, catalog §13 + §14 + §15 + §21 + §22) that does not appear in any prior audit (overview, portfolio, rental, safety). It also re-surfaces Document (catalog §2) since ownership artifacts are typically deeds, contracts, and signed transfers — the cross-page count for Document will increase if Phase 4c (documents) ran, or this will be Document's first appearance if not.

This page is greenfield (no existing per-datapoint audits expected — confirm during execution by greping `INDEX.md`). It tests the skill's handling of legal/historical surfaces that have a different shape from operational surfaces (ownership history is a chronological list with transactions, unlike the time-of-day "alerts" or "activity" lists on overview).

The intended outcome: one new folder `.claude/data-audit/pages/property-id-ownership/` with `audit.md` + `plan.md`, the page-level INDEX row added, and `pages/INDEX.md` refreshed to show new ownership-domain rows alongside an updated Document ranking (and possibly a Successor/Professional debut).

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format.
- **Phase 3 complete** — `pages/INDEX.md` exists.
- **Phase 4a/4b complete** — `pages/portfolio/` and `pages/property-id-rental/` exist.
- (Phase 4c documents and Phase 4d safety may or may not have run; the cross-page math in `pages/INDEX.md` will reflect whatever pages are present at execution time.)

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/property-id-ownership/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/property-id-ownership/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** any pre-existing `.claude/data-audit/property-id-ownership--*.md` files — insert TL;DR back-link bullets (per skill §9). **Expected count: 0** based on current INDEX.md state, but verify before assuming.
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/property/[id]/ownership`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog.

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/property/[id]/ownership` → `app/(shell)/property/[id]/ownership/page.tsx`. Slug is `property-id-ownership`. Folder will be `.claude/data-audit/pages/property-id-ownership/`.
2. **Walk the components.**
   - Read `app/(shell)/property/[id]/ownership/page.tsx`
   - Read `app/(shell)/property/[id]/ownership/queries.ts` (if it exists; absence is potentially a PFn — same `PropertyListItem`-style narrowing question as overview)
   - Read `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` (or whatever component the page renders)
   - Read `components/property/PropertyLayout.tsx` — same wrapper as overview/rental/safety, MUST be walked again (per skill §3)
   - Read any sub-components: ownership history timeline, current owner card, co-owner list, successor/heir block, estate document table, professional contact list (lawyer, notary, agent)
3. **Build the inventory.** Classify every JSX-rendered surface. Expected categories:
   - Header (PropertyLayout) — same WIRED rows as overview (code, type, health badge)
   - Tab nav — same CHROME as overview
   - Page-specific surfaces:
     - **Current owner card** (name, ownership %, since date) — likely HARDCODED
     - **Ownership history timeline** (past owners, transfer dates, transaction values) — likely HARDCODED
     - **Co-owner list** (if shared ownership) — likely HARDCODED
     - **Successors / heirs block** — likely HARDCODED
     - **Estate documents table** (deed, contract, transfer record, with type + uploaded-by + date) — likely HARDCODED
     - **Professional contacts** (lawyer, notary, real estate agent) — likely HARDCODED
     - **Ownership share donut / pie chart** (if shared ownership visualized) — likely HARDCODED
     - **Title/deed status badge** — likely PARTIAL (text from `property.title` but colour locked, similar to overview's status badge pattern)
     - **"Add owner" / "Transfer ownership" / "Add successor" buttons** — CHROME (no real action wired)
4. **File PFn entries.** Likely overlapping with overview:
   - Full Property to Client Component (if no `queries.ts` narrowing exists)
   - Multi-tenant shim
   - Missing audit log (especially relevant on this page — ownership changes MUST be auditable)
   - Plus ownership-specific possibilities:
     - Hardcoded title/deed-status colour mapping (PARTIAL pattern)
     - No `queries.ts` narrowing for OwnershipRecord read paths (once entity lands)
     - Missing transactional integrity for ownership transfers (write path doesn't exist yet, but worth noting)
5. **Build the Entity Backlog.** New entities to introduce:
   - **OwnershipRecord** (catalog §21) — current owner, share %, since date, ownership type
   - **OwnershipHistoryItem** (catalog §22) — chronological transfer events with dates and transaction values
   - **Successor** (catalog §14) — heirs, beneficiaries, succession order
   - **EstateDocument** (catalog §15) — deed, contract, transfer record metadata (likely uses `Document` as substrate)
   - **Professional** (catalog §13) — lawyer, notary, real estate agent contacts associated with this property
   - **Document** (catalog §2) — RE-USED from Phase 4c if it ran; cross-page count INCREASES. If 4c didn't run, this is Document's first appearance.
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. None expected for this route, so all WIRED rows will be `_to-do_` with the recommended template (lite vs full).
7. **Compute SHAs** for every walked file (`git hash-object <path>`).
8. **Insert back-links** into any pre-existing `property-id-ownership--*.md` files (expect zero; verify and skip if so).
9. **Append a row to `INDEX.md`'s Page-level audits table:**
   `| [property-id-ownership](pages/property-id-ownership/audit.md) | /property/[id]/ownership | <wired> | <hardcoded> | <pfn> | <verdict> | 1 |`
   Sort alphabetically — should land between `property-id-overview` and `property-id-rental` in the table.
10. **Regenerate `pages/INDEX.md`** by reading all existing `pages/*/plan.md` files (overview + portfolio + rental + ownership, plus documents and/or safety if they ran), summing entity surfaces across pages, re-sorting. **Expect new rows for OwnershipRecord, OwnershipHistoryItem, Successor, EstateDocument, Professional** that did not appear in any prior plan, and **Document's surface count to increase** (if 4c ran).

## Verification

After Phase 4e lands:

1. **New folder exists:** `.claude/data-audit/pages/property-id-ownership/audit.md` and `plan.md` are present and cross-link each other.
2. **PropertyLayout was walked:** the inventory includes the header property-code badge and the health-score badge (otherwise the layout was missed).
3. **No per-datapoint audits restated:** if any pre-existing `property-id-ownership--*.md` files were found, they got back-links rather than their findings duplicated as PFn.
4. **INDEX.md row added:** alphabetical sort places it correctly in the Page-level audits table (between `property-id-overview` and `property-id-rental`).
5. **pages/INDEX.md gained NEW entity rows:** OwnershipRecord, OwnershipHistoryItem, Successor, EstateDocument, Professional appear as fresh rows — they did NOT exist in the table before this run. Their `Pages it touches` column lists only `property-id-ownership`.
6. **Document ranking updated (conditional):** if Phase 4c (documents) already ran, Document's `Surfaces unlocked` count is now SUM of documents-page contribution + ownership-page contribution. Check `Pages it touches` lists both. If 4c hasn't run, Document appears as a fresh row from this audit alone.
7. **Existing entity rankings unchanged where untouched:** Lease/Tenant/Payment counts unchanged from earlier phases (ownership page doesn't touch them); they keep their existing rank.
8. **No source files touched:** `git status` shows changes only under `.claude/`.
9. **Sanity check:** open `pages/INDEX.md` and confirm the entity table is still correctly sorted by `Total surfaces unlocked` descending, with the new ownership-domain entities slotted in at their correct rank based on ownership-page contribution alone.
10. **Audit log relevance flagged:** PF for "missing audit log" should explicitly call out that ownership changes are the highest-stakes mutation surface in the app — without this, the PF body will read identically to overview's, missing the page-specific severity.

## What unblocks after Phase 4e

- **Phase 4f** — run the next page audit. Recommend `/property/[id]/valuation` next (catalog §16 PropertyValuation — a single-entity page that will dramatically push PropertyValuation up the priority ranking since it's the entity dedicated to that one page).
- **Cross-page priority continues to refine:** the long tail of single-page entities (SafetyRisk, OwnershipRecord, etc.) is filling in. Top of the ranking (Lease+Tenant+Payment+Document) is increasingly stable.

## Time estimate

~15–20 minutes:
- Walk + classify surfaces on `/property/[id]/ownership`: ~10 min
- Build Entity Backlog with new ownership-domain entries: ~3 min (catalog §13–§22 already document the shapes)
- INDEX.md row + regenerate `pages/INDEX.md` with new entity rows + Document recount: ~3 min
- Verification grep + new-row sanity check + Document cross-page sum check: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/property/[id]/ownership` only.
- Re-running any prior page audit. Their content is settled.
- Modifying any source code, seed data, or reference corpus (unless a brand-new open question must be filed — cite Q-number then).
- Building any entity from the backlog.
- Designing the audit-log mechanism for ownership transfers — that's a follow-up workstream once the entity lands.
