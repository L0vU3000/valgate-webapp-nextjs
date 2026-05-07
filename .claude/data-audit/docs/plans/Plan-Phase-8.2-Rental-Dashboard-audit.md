# Plan — Phase 8.2-audit: Audit `/rental` (top-level cross-portfolio dashboard)

> **Sub-phase 1 (Audit) only.** Sub-phases 2 (Wiring) and 3 (Post-Wiring) get separate plans after the Q-resolution gate. Output is `pages/rental-dashboard/{audit.md, plan.md}` plus index + Q-number updates. **No code changes** — analysis only. The audit will surface the Heatmap unit-level data gap (38 hardcoded tiles), which is likely the single largest finding of Phase 8 and will gate the order of all subsequent Phase 6.x entity work.
>
> Workflow reference: `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` § Sub-phase 1 — Page Audit.

---

## Context

The `/rental` route is **the top-level cross-portfolio rental dashboard** at `app/(shell)/rental/` — distinct from the property-scoped `/property/[id]/rental` (Phase 4b, wired in 6.1+6.2). The Explore briefing on 2026-05-06 confirmed scope segregation: top-level fetches `leasesDb.list(userId)` + `paymentsDb.list(userId)` + `maintenanceDb.list(userId)` aggregated across the portfolio; property-level filters those entities client-side by `propertyId`.

The route is the right Phase 8.2 starting point — ahead of `/`, `/settings`, `/profile`, `/directory`, `/estate-planning`, `/add-property`, and `/auth/*` — for three reasons:

1. **It cross-validates the Phase 6.1+6.2 entity model in a portfolio aggregation context.** Same Lease + Payment + MaintenanceItem entities, different consumer. If the entities hold up here, the model is robust; if not, the gap is recoverable before moving to peripheral routes.
2. **Worst hardcoded ratio of any audited page so far.** Briefing measured ~65% HARDCODED across ~75 surfaces — vs ~40-50% on the property tabs pre-Phase-6, vs ~10% on `/analytics`. This is the highest-density entity-gap-discovery target left in the codebase.
3. **It surfaces a foundational schema question ahead of any other route.** The Heatmap's 38 hardcoded unit-level tiles imply either a `Unit` entity (multi-tenant Property) or a re-shaping of the demo data into single-unit-per-Property. Either answer reshapes future Phase 6.x work, so resolving it early matters.

The briefing also flagged 4 hardcoded scalar metrics with no formula definition (Recovery Rate `98.2%`, Eviction Risk `4 Units`, Top Spend `$3,240`, progress bar `66.6%`) and one CHROME-misclassified affordance (4 nav tabs that update local state but don't filter content). No correctness bugs in the existing 4 derivations (`computePipeline`, `computeArrears`, `computeMaintenanceSummary`, `computeUpcomingEvents`) — they're cleanly written.

---

## Prerequisites

Read before Step 0:

- `.claude/data-audit/CLAUDE.md` — folder structure + how to record fixes
- `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` — three-sub-phase framework (this plan is sub-phase 1)
- `.claude/data-audit/WIRING-PLAYBOOK.md` — Step C bundling rules (Win 1 / Win 2 / Win 3)
- `.claude/skills/audit-page-datapoints/SKILL.md` — the skill that drives this phase
- `.claude/data-audit/pages/SUMMARY.md` — current build order (rerank likely if `Unit` enters the backlog)
- `.claude/data-audit/pages/INDEX.md` — cross-page entity backlog
- `.claude/data-audit/ref/05-open-questions.md` — Q-numbers; new ones append here
- **Two reference page audits:**
  - `.claude/data-audit/pages/property-id-rental/audit.md` — closest pattern (same domain, single-property scope)
  - `.claude/data-audit/pages/portfolio/audit.md` — pattern for cross-portfolio aggregator
- `.claude/data-audit/ref/00-entity-catalog.md` — for the `Unit` question, scan whether Unit appears anywhere already

**Critical source files to be inventoried:**
- `app/(shell)/rental/page.tsx`
- `app/(shell)/rental/queries.ts`
- `app/(shell)/rental/_components/RentalDashboardPage.tsx`
- `components/rental/KpiCards.tsx` (5 hardcoded cards)
- `components/rental/HeatmapGrid.tsx` (38 hardcoded tiles in `heatmapData` const)
- `components/rental/LeaseTable.tsx` (3 hardcoded property rows)
- `lib/data/derivations/rental.ts` (4 derivation functions — verify clean)

---

## Step 0 — Pre-flight

> Note: prior pending plans (`Plan-Phase-8.1-Analytics-audit.md`, `Plan-Phase-8.2-Rental-Dashboard-audit.md`, `Plan-Entity-Catalog-Refresh.md`) are already archived in `.claude/data-audit/docs/plans/`. No archive recovery work needed.

1. **Re-verify briefing assumptions.** Read the 7 critical source files and spot-check the smoking-gun line numbers (KpiCards.tsx:9–25 hardcoded array, HeatmapGrid.tsx:30–89 `heatmapData`, LeaseTable.tsx:7–35 `propertyRows`, RentalDashboardPage.tsx:114/118/203/207/235/240 hardcoded scalars). If line numbers drifted, note in `audit.md` §Source files.
2. **Scan blocking Q-numbers** in `ref/05-open-questions.md` for: `Unit`, `multi-unit`, `Property.units`, `occupancy formula`, `recovery rate`, `eviction risk`, `vacancy cost`, `top spend`. Resolve, accept default, or commit to filing new sub-letter.
3. **Check `00-entity-catalog.md` for `Unit`** — if it's already filed but unbuilt, the heatmap finding cites it; if not, this audit files it for the first time.
4. **Slug decision:** `pages/rental-dashboard/` (NOT `pages/rental/`) to avoid collision with `pages/property-id-rental/`. Document the slug choice in audit.md §1.
5. **Light dev-server peek** (~5 min): `pnpm dev`, navigate to `http://localhost:3000/rental`, click each of the 4 nav tabs (PF1 validation), hover 2–3 heatmap tiles (PF3 sanity). This is for briefing-line-number verification, not a full visual pass — that comes in sub-phase 3 Post-Wiring.

---

## Step A — Run `/audit-page-datapoints` against `/rental`

**Skill invocation:** `/audit-page-datapoints /rental`

**Expected outputs (skill-managed):**
- `.claude/data-audit/pages/rental-dashboard/audit.md` — surface inventory + page-wide findings (PFn). Stable analysis.
- `.claude/data-audit/pages/rental-dashboard/plan.md` — Entity Backlog + Audit Roadmap + Fix Log scaffold.

**Audit content checklist** (verify the skill produced these — supplement manually if missed):

1. **Surface inventory** — classify all ~75 surfaces. Briefing-derived split:

   | Section | Total | WIRED | HARDCODED | CHROME | Notes |
   |---|---|---|---|---|---|
   | Page header + breadcrumb | 5 | 0 | 0 | 5 | breadcrumb, title, subtitle |
   | Nav tabs (Portfolio/Units/Leases/Financials) | 4 | 0 | 0 | 4 | **PF1** — stateful but no conditional render |
   | Quick action buttons (5) | 5 | 0 | 0 | 5 | "New Lease" / "Add Property" / "Portfolio Report" / "Export" / "Bulk Increase" — non-functional |
   | Hero KPI: Monthly Gross Income + sparkline | 3 | 0 | 3 | 0 | $19,600 + +4.2% + 6-bar sparkline — all hardcoded |
   | KPI grid (4 cards × ~3 surfaces) | 12 | 0 | 12 | 0 | Occupancy 91% / Vacancy Cost $2,450 / Collection 93% / Maintenance $4,800 |
   | LeaseTable (3 rows × 5 fields) | 15 | 0 | 15 | 0 | All from `propertyRows` mock array |
   | HeatmapGrid (38 unit tiles) | 38 | 0 | 38 | 0 | All from `heatmapData` mock — **biggest single finding** |
   | Heatmap summary (occupied/vacant/expiring count) | 1 | 1 | 0 | 0 | Computed from heatmapData (so it's "wired" to mock data — flag as PARTIAL) |
   | Lease pipeline cards (~14) | 14 | 14 | 0 | 0 | Genuinely WIRED via `computePipeline` |
   | Arrears buckets (3) | 3 | 3 | 0 | 0 | Genuinely WIRED via `computeArrears` |
   | Arrears sub-metrics (Recovery / Eviction Risk) | 2 | 0 | 2 | 0 | 98.2% + "4 Units" — formulas undefined |
   | Maintenance items (3) | 3 | 3 | 0 | 0 | WIRED via `computeMaintenanceSummary` |
   | Maintenance Top Spend card | 2 | 0 | 2 | 0 | "$3,240" + 66.6% bar |
   | Upcoming events (≤5) | 5 | 5 | 0 | 0 | WIRED via `computeUpcomingEvents` |
   | **TOTAL** | **~112** | **~26** | **~72** | **~14** | (Briefing said ~75; difference is splitting compound surfaces) |

2. **Page-wide findings (PFn)** — file once at page level:
   - **PF1 — Nav tabs are CHROME, not filters.** `RentalDashboardPage.tsx:22–79` renders 4 tabs (Portfolio/Units/Leases/Financials) with `setActiveNav` state, but no downstream conditional rendering — all content always visible. Decide: wire to view-mode filter OR remove.
   - **PF2 — KpiCards is entirely hardcoded.** `components/rental/KpiCards.tsx:9–25` is a static array of 5 metrics with literal values + a 6-element sparklineHeights array. The component receives no props; nothing ties it to portfolio data. **Largest "entire component is mock" finding.** Implies 5 portfolio-KPI derivations don't exist yet (occupancy %, vacancy cost, collection %, maintenance total, monthly gross income).
   - **PF3 — HeatmapGrid uses hardcoded `heatmapData` constant (38 tiles).** `components/rental/HeatmapGrid.tsx:30–89` defines a 5-property × ~7-unit-per-property nested array with full tenant names, rent amounts, lease end dates. **Implies a `Unit` entity** (multi-unit per Property) or per-property sub-keying that doesn't exist on the current Property schema. Files **new Q-number** for the multi-unit decision.
   - **PF4 — LeaseTable uses hardcoded `propertyRows` (3 rows × 5 fields).** `components/rental/LeaseTable.tsx:7–35` claims a "Property Ranking / By Yield" view with hardcoded NOI, average rent, and market-position labels. Implies a derivation chain (Property → PropertyValuation → Lease/Payment → yield ranking) that doesn't exist. Files **new Q-number** for the yield-ranking formula.
   - **PF5 — Four hardcoded scalar metrics with no formula definition:**
     - Recovery Rate `98.2%` (RentalDashboardPage.tsx:203)
     - Eviction Risk `4 Units` (line 207)
     - Top Spend Category `$3,240` (line 235)
     - Top Spend bar width `66.6%` (line 240)
     Each needs a Q-number for formula definition before wiring. Group as a single PFn that lists all four with cross-refs to the new Q-letters.
   - **PF6 — Heatmap summary count is "wired to mock data".** The `{occupied} occupied · {vacant} vacant · {expiring} expiring` line at HeatmapGrid.tsx:97-105 is computed from the same hardcoded `heatmapData`, so it changes if the mock data changes but it's structurally HARDCODED. Classify as PARTIAL with PF6 reference (not WIRED — it's WIRED-to-mock).

3. **Entity Backlog (plan.md)** — entities/derivations the page renders/implies but doesn't have:
   - **`Unit` (NEW ENTITY)** — heatmap renders 38 unit-level rows with tenant + rent + leaseEnd. Either (a) build a `Unit` entity with Property→Unit FK, or (b) reshape demo data so each Property has one implied unit. **Decision needed via Q-number.** Cross-page surface count: ~38 (heatmap only).
   - **5 portfolio-KPI derivations (NEW DERIVATIONS, not entities)** — for KpiCards: `computeOccupancyRate(properties, leases)`, `computeVacancyCost(properties, leases, payments)`, `computeCollectionRate(payments)`, `computeMaintenanceTotal(maintenance)`, `computeMonthlyGrossIncome(leases, payments)`. Surface count: 12 (KPI grid) + 3 (hero) = 15.
   - **`computePropertyYieldRanking` derivation (NEW)** — for LeaseTable. Combines Property + PropertyValuation + Lease + Payment to compute NOI, average rent, market position. Surface count: 15.
   - **Tenant** (existing entity, not fetched on this page) — for heatmap tenant names. Cross-references Phase 6.1 Tenant entity. Once `Unit` resolves, Tenant gets added to queries.ts.
   - **`computeRecoveryRate` / `computeEvictionRisk` / `computeTopSpendCategory`** — small derivations, formulas TBD via Q-numbers. Surface count: 4 total.

4. **Audit Roadmap** — apply Step C bundling (WIRING-PLAYBOOK Win 1 + Win 2 + Win 3):

   | Audit file | Type | Surfaces | Finding |
   |---|---|---|---|
   | `rental--kpi-strip-mocked.md` | bundled lite | 5 KPI cards (15 inner surfaces) | Cite PF2 |
   | `rental--lease-table-mocked.md` | bundled lite | 3 rows × 5 fields = 15 | Cite PF4 |
   | `rental--heatmap-unit-tiles-mocked.md` | bundled lite | 38 tiles | Cite PF3 |
   | `rental--lease-pipeline-cards.md` | bundled lite | 14 pipeline cards | WIRED — verify formulas |
   | `rental--arrears-buckets.md` | full | 3 buckets + 2 hardcoded sub-metrics | Cite PF5 (Recovery + Eviction) |
   | `rental--maintenance-summary.md` | full | 3 severity items + 2 Top Spend | Cite PF5 (Top Spend) |
   | `rental--upcoming-events.md` | lite | 5 events | WIRED — verify formula |
   | `rental--heatmap-summary-line.md` | lite (1 surface) | 1 PARTIAL summary line | Cite PF6 |

   **Total: 8 audit reports covering ~92 surfaces.** (Without bundling: ~75 individual files. Saves ~5 hours.)

   Filter affordances (nav tabs + 5 quick-action buttons) NOT individually audited — covered by PF1 + page-level scope. CHROME / DECORATIVE NOT individually audited.

---

## Step B — Findings supplement (manual)

After the skill produces `audit.md` + `plan.md`, supplement any PFn rows the skill didn't surface from the briefing:
- File the 6 PFn findings in §8 Findings (PF1–PF6 above) with cross-references to the new Q-letters from Step C
- Add the 5 Entity Backlog rows to `plan.md` (Unit, 5 portfolio-KPI derivations, PropertyYieldRanking, Tenant cross-ref, Recovery/Eviction/Top-Spend small derivations)
- Apply WIRING-PLAYBOOK Step C bundling to the Audit Roadmap §4 (8 reports covering ~92 surfaces)
- Cross-link from the §1 Surface Inventory table (PFn column) to the corresponding §8 Findings entry
- Bump `audit.md` revision to 1; set `plan.md` status: `"audit complete · no wiring yet"`

If the skill's output already contains everything above, this step is a no-op verification. If not, fill the gaps.

---

## Step C — Q-number filings

Append to `.claude/data-audit/ref/05-open-questions.md`. Letter assignment is "next free letter under the right Q-section" — verify against current state of the file before claiming a letter.

- **Q4.X (Q4 — entity / schema design)** — **Multi-unit Property: build a `Unit` entity (Property → Unit FK with Lease.unitId), OR reshape demo so each Property is single-unit?** Heatmap has 38 unit-level tiles; current schema has only Property. **Blocks PF3 fix + entire `Unit` entity backlog row.** Most consequential question of Phase 8 — its resolution determines whether Phase 6.9 builds `Unit` or `PropertyComparable` next.
- **Q3.X (Q3 — KPI definitions)** — Recovery Rate formula. Candidates: `(payments where status="Paid").sum / payments.sum`, or `1 - (overdue.sum / billed.sum)`, or post-arrears recovery (collected after due date). **Blocks PF5 Recovery Rate fix.**
- **Q3.Y** — Eviction Risk formula. Candidates: count of leases with N+ days overdue payments, or count of leases with status flag, or count of payments past 60d threshold. **Blocks PF5 Eviction Risk fix.**
- **Q3.Z** — Vacancy Cost formula. Candidates: `(properties where status="Vacant").sum(expectedMonthlyRent)`, or vacancy-days × per-day rent rate. **Blocks KpiCards fix (one of 5 derivations).**
- **Q3.A2** (or next free) — Collection Rate formula. May overlap with resolved Q3.B (Monthly Income hybrid). **Blocks KpiCards fix.** Possibly resolved by referencing Q3.B.
- **Q3.B2** — Top Spend Category derivation source. Candidates: group `Expense.amount` by `Expense.category` (now possible after Phase 8.1 reframed expenses around the Expense entity), or split Property tax + insurance + maintenance + utilities. **Blocks PF5 Top Spend fix.**
- **Q1.X (Q1 — UX / page scope)** — `/rental` nav tabs purpose: should "Portfolio / Units / Leases / Financials" filter the rendered content (each tab shows a different section), OR is the cross-portfolio dashboard a single view and tabs should be removed? **Blocks PF1 fix decision.**
- **Q1.Y** — `/rental` global nav placement: is this route reachable from app shell nav? If not, decide whether to expose or deprecate.

If letter clashes, bump to the next free letter. Cross-link from PFn rows in audit.md.

---

## Step D — Index updates

1. **`.claude/data-audit/INDEX.md`** — append a row for `/rental` (slug `rental-dashboard`, audit date, finding count).
2. **`.claude/data-audit/pages/INDEX.md`** — append `/rental` rows to cross-page entity backlog. New entries:
   - `Unit` — 38 surfaces (rental-dashboard) — net-new entity row at top of "blocked" section pending Q4.X.
   - `PortfolioKPI` derivations — 15 surfaces (rental-dashboard) — group under existing portfolio-aggregation rows or net-new.
   - `PropertyYieldRanking` — 15 surfaces (rental-dashboard) — net-new derivation row.
   - Existing rows: Tenant +1 surface (heatmap), Lease +14 (pipeline) +5 (events partial), Payment +3 (arrears) +2 (events), MaintenanceItem +3 +2 (events).
3. **`.claude/data-audit/pages/SUMMARY.md`** — re-run sort `(pages_touched DESC, surfaces DESC)`. **`Unit` likely enters as a new top-3 ranked entity** (38 surfaces, 1 page initially but high schema impact). Document the rerank in SUMMARY's "Last updated" line.
4. **`.claude/data-audit/docs/PHASES.md`** — flip Phase 8.2-audit status row to ✅; add this plan to "Archived plan files" as `Plan-Phase-8.2-Rental-Dashboard-audit.md` (already in archive — confirm row exists). Update "Last updated" footer.

---

## Verification

- [ ] `.claude/data-audit/pages/rental-dashboard/audit.md` exists with ~75–112 surfaces classified and ≥6 PFn findings filed
- [ ] `.claude/data-audit/pages/rental-dashboard/plan.md` exists with Entity Backlog (≥5 rows including `Unit` and 3 derivations) + Audit Roadmap (8 reports planned)
- [ ] `pages/INDEX.md` updated with `Unit` (new), `PortfolioKPI` derivations, `PropertyYieldRanking`, plus entity surface-count bumps for Tenant/Lease/Payment/MaintenanceItem
- [ ] `INDEX.md` (root) has new rental-dashboard page-audit row
- [ ] `SUMMARY.md` reranked with `Unit` likely top-3
- [ ] `PHASES.md` Phase 8.2-audit row flipped to ✅; archived plan list confirmed
- [ ] `ref/05-open-questions.md` has 6–8 new Q-letters appended (multi-unit, recovery, eviction, vacancy cost, collection, top spend, nav tabs, nav placement)
- [ ] No code in `app/`, `components/rental/`, or `lib/` is modified — audit-only phase

---

## What this unblocks

- **Q-resolution gate** — Q4.X is the most consequential decision; until it resolves, sub-phase 2 (Wiring) for `/rental` cannot start (no canonical heatmap data source). Q1.X / Q3.X-Z need product input but are smaller-scoped. Async to agent work.
- **Phase 8.2-Wiring** (sub-phase 2) — drafted after Q-resolution lands. Scope depends on which Q-letters resolve: at minimum it'll wire the 5 portfolio-KPI derivations and address PF1; heatmap (PF3) waits on Q4.X.
- **Phase 8.2-Post-Wiring** (sub-phase 3) — runs after sub-phase 2 commits; same shape as `Plan-Phase-8.1-Analytics-Post-Wiring.md` (visual verify · 8 per-surface audits · Q-number close-out · audit.md rev bump · INDEX sync).
- **Downstream entity-build phases** (separate plans, drafted after sub-phase 2):
  - **Phase 6.9 — likely `Unit`** if Q4.X resolves to "build separate entity" (38 surfaces, jumps to top of build order vs PropertyComparable ≈ 9 surfaces).
  - **Phase 6.10 — portfolio-KPI derivation pack.** 5 small derivations consumed by `/rental` KpiCards + likely `/portfolio` + `/analytics` KPI strips. ~half-day.
  - **Phase 6.11 — `computePropertyYieldRanking` derivation.** Single derivation for LeaseTable. ~2 hours.
- **Phase 8.3** — next non-property route audit (sub-phase 1). Likely `/` (home) or `/directory` / `/estate-planning`. `/add-property` waits for a form-completeness lens.

---

## Time estimate

| Step | Effort |
|---|---|
| Step 0 (re-read 7 source files + light dev-server peek) | 15 min |
| Step A (run skill + supplement findings; large surface count, high bundling savings) | 75–90 min |
| Step B (manual findings supplement) | included in Step A |
| Step C (Q-number filings — 6–8 letters) | 15 min |
| Step D (index updates + likely SUMMARY rerank) | 20 min |
| **Total** | **~2 hours** |

Comparable to `/analytics` audit (~2 hours). The ~112 surfaces are mostly absorbed by Step C bundling (8 reports vs 75 individual); SUMMARY rerank for `Unit` adds 5 min vs analytics' nothing.

---

## Out of scope

- **Sub-phase 2 (Wiring) and sub-phase 3 (Post-Wiring) for `/rental`.** Those get separate plans after the Q-resolution gate; see `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` for the structure.
- **Building `Unit` or any of the 5+ portfolio-KPI derivations.** Findings only — building waits for Q4.X resolution and a fresh Phase 6.9+ plan.
- **Wiring or removing nav tabs / quick-action buttons.** Filed as PF1 + Q1.X; decision required first.
- **Replacing `heatmapData` with real fetched data.** Largest finding, but no fix until `Unit` resolves.
- **Replacing `propertyRows` LeaseTable mock.** Filed; gated on yield-ranking formula Q-number.
- **Audits of `/`, `/settings`, `/profile`, `/directory`, `/estate-planning`, `/add-property`, `/auth/*`** — separate Phase 8.x plans.
- **Any code changes in `lib/data/derivations/rental.ts`.** The 4 existing derivations are clean per briefing — no findings.

---

## Critical files (reference)

**To be inventoried (read-only this phase):**
- `app/(shell)/rental/page.tsx`
- `app/(shell)/rental/queries.ts`
- `app/(shell)/rental/_components/RentalDashboardPage.tsx`
- `components/rental/KpiCards.tsx`
- `components/rental/HeatmapGrid.tsx`
- `components/rental/LeaseTable.tsx`
- `lib/data/derivations/rental.ts`

**To be created:**
- `.claude/data-audit/pages/rental-dashboard/audit.md`
- `.claude/data-audit/pages/rental-dashboard/plan.md`

**Already archived (no action needed):**
- `.claude/data-audit/docs/plans/Plan-Phase-8.2-Rental-Dashboard-audit.md` (this plan, archived 2026-05-06)

**To be appended:**
- `.claude/data-audit/INDEX.md`
- `.claude/data-audit/pages/INDEX.md`
- `.claude/data-audit/ref/05-open-questions.md`

**To be updated in-place:**
- `.claude/data-audit/pages/SUMMARY.md`
- `.claude/data-audit/docs/PHASES.md`
