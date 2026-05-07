---
produced_after: Phases 1–4g (all 8 pages audited)
date: 2026-05-05
---

# Cross-page Audit Summary

> Produced after Phases 1–4g of the page-audit sweep. Synthesis of all 8 page audits — ranked entity priorities, surprises, workflow validation, and recommended next move.

---

## TL;DR (3 bullets)

- ✅ **8 pages audited** — 256 total surface rows classified; **73 WIRED · 6 PARTIAL · 107 HARDCODED** (Phase 6.1 wired 17 Lease+Tenant surfaces)
- 🥇 **Top 3 actions (in order):** (1) ~~Wire `PropertyValuation` KPIs~~ ✅ Phase 6.0 shipped; (2) ~~Build **Lease + Tenant** (17 surfaces)~~ ✅ Phase 6.1 shipped; (3) ~~Build **Payment + Expense** — 13 surfaces across 2 pages~~ ✅ Phase 6.2 shipped
- ⏱️ **Estimated wiring sprint:** PropertyValuation wiring (~half-day) + 7 entity PRs × ~1 day each ≈ **7–8 days** to clear all HARDCODED surfaces except the deferred external-data entities (MarketSnapshot, PropertyComparable)

---

## Entity Build Order (committed)

| Rank | Entity | Status | Surfaces unlocked | Pages it touches | PR scope | Est. time |
|---|---|---|---|---|---|---|
| 0 | PropertyValuation **wiring** | shipped, fully wired | 7 | portfolio (YoY badge) · overview (valuation KPI) · valuation (5 KPI cards) | 1 PR (wiring only — entity exists) | ~half-day |
| 1 | Lease + Tenant | **shipped, fully wired** | 17 | overview (4 rows) · rental (13 rows) | ✅ Phase 6.1 complete | — |
| 2 | Payment + Expense | **shipped, fully wired** | 13 | overview (3 rows) · rental (10 rows) | ✅ Phase 6.2 complete | — |
| 3 | Document | **shipped, fully wired** | 10 | rental (1 row) · documents (9 rows) | ✅ Phase 6.3 complete | — |
| 4 | LandParcel | **shipped, fully wired** | 11 | location (11 rows) | ✅ Done Phase 6.4 (2026-05-06) | — |
| 5 | CoOwner | **shipped, fully wired** | 10 | ownership (10 rows) | ✅ Phase 6.5 complete | — |
| 6 | OwnershipRecord §21 | **shipped, fully wired** | 6 | ownership (6 rows) | ✅ Phase 6.6 complete (2026-05-06); PF5 rename also closed | — |
| 7 | Folder | **shipped, fully wired** | 4 | documents (4 rows) | ✅ Phase 6.7 complete (2026-05-06) | — |
| 8 | Notification + MaintenanceItem | not built | 4 | overview (1 row) · rental (3 rows) | 2 PRs: entity + wiring | ~1 day |
| — | **Unit** (new entity) | **not built (new — not in catalog)** | **33** | rental-dashboard (33 heatmap tiles) | **Blocked on Q4.T** — multi-unit vs single-unit Property decision; if Q4.T resolves to "build Unit entity", **jumps to rank 1 of unbuilt entities** (33 surfaces > PropertyComparable 9); if Q4.T = single-unit-per-Property, no entity built | TBD |
| — | PropertyComparable / MarketComparable | not built | 9 | location (7 rows) · valuation (2 rows) | **Blocked on Q4.Q + Q4.R** — external data design decision required | TBD |
| — | MarketSnapshot | not built | 6 | valuation (6 rows) | **Blocked on Q4.Q** — external data source unresolved | TBD |
| — | RentalEvent / ActivityEvent | not built | 1 | overview (1 row) | **Deferred** — resolve Q4.K (derive vs store) first | TBD |

> **Sort rule:** `(pages_touched DESC, surfaces DESC)` — multi-page entities go first because they amortize entity-design cost across more wiring work; ties broken by surface count.
>
> So Document (10 surfaces, 2 pages) outranks LandParcel (11 surfaces, 1 page) — multi-page wins. Among single-page entities, LandParcel (11) outranks CoOwner (10) on surfaces alone. Folder pairs with Document (depends on it); OwnershipRecord §21 is gated on a Priority 0 type rename. PropertyValuation is rank 0 (special) because it's already shipped — pure wiring, no entity work.
>
> Sourced from `pages/INDEX.md`; the build-order column above applies the sort rule to the raw surface counts there.

---

## Surprises & Cross-page Learnings

1. **Location page was the biggest contra-plan surprise.** Pre-audit prediction: "most-WIRED-friendly page, address fields already on the entity." Actual result: 4 WIRED out of 33 surfaces — the **lowest WIRED ratio (12%) of any property tab**. The page body is almost entirely new-entity KPI cards (LandParcel, PropertyComparable) and a non-functional map placeholder. `property.lat` and `property.lng` are present on the entity but never consumed on the page.

2. **LandParcel entered the backlog as rank 3** (11 surfaces, all new, all location-only) — an entity that didn't exist in the catalog before Phase 4g. Despite the high surface count, it drops to rank 5 in the build order because it unlocks only one page; Lease+Tenant and Payment+Expense each unlock 2 pages and create foundational rental-ledger infrastructure.

3. **PropertyComparable and MarketComparable are the same concept.** The valuation page (Phase 4e) surfaces "comparable sales data" as `MarketComparable` (2 surfaces). The location page (Phase 4g) surfaces "nearby comparable sales" as `PropertyComparable` (7 surfaces). Combined count: 9 surfaces, 2 pages. These should not be built as separate entities — a naming and schema decision (Q4.R) is required first.

4. **Safety tab has no missing entities.** All 9 HARDCODED surfaces on `/property/[id]/safety` exist because the KPI derivation layer hasn't been wired — the data arrays are already received as props. No schema PRs needed; just a derivation PR wiring `inspections`, `certifications`, `risks`, and `emergencyContacts` arrays into the KPI card row. Uniquely actionable without any entity sprint.

5. **PropertyValuation is the highest-leverage immediate win.** Status: "shipped, partial wiring." Three seed records exist for PROP-0001. The valuation page KPI cards simply haven't been connected to the `valuations` prop already passed by `queries.ts`. A single wiring PR unlocks 7 surfaces across 3 pages with zero schema work — the best ROI in the entire sprint.

6. **Document cross-page impact was underestimated in the single-page view.** Before Phase 4f (documents), Document appeared only on the rental tab (1 surface). After Phase 4f, the documents tab adds 9 more surfaces — totaling 10, enough to justify ranking it ahead of CoOwner (also 10 surfaces but single-page).

---

## Workflow Validation (Gap 4 Sanity Check)

- ✅ **Back-links present in both spot-checked audits.** `portfolio--monthly-income.md` TL;DR contains `📄 Page audit: see pages/portfolio/audit.md` ✓. `portfolio--rental-status.md` TL;DR contains `📄 Page audit: see pages/portfolio/audit.md` ✓.
- ✅ **PFn citation mechanism working.** `pages/portfolio/audit.md` PF1 explicitly states "per-datapoint audits should cite instead of restating." `pages/property-id-overview/audit.md` PF4 cross-links `property-id-overview--rental-status.md` and notes "the value-level finding for this PARTIAL row stays in the per-datapoint audit." The dedup language is consistent and the references are bidirectional.
- ✅ **Back-link sweep completed for portfolio (14 reports).** Portfolio had 14 pre-existing per-datapoint audits; all received back-links during Phase 4a. `property-id-overview--rental-status.md` (the sole overview-route per-datapoint audit) was cross-linked from PF4 in the overview page audit.
- ⚠️ **No per-datapoint audits exist yet for the 6 newer property tabs** (safety, ownership, valuation, rental, location, documents). The back-link mechanism will only be testable once those per-datapoint runs are completed. Back-link insertion is mandatory for each new per-datapoint run against these routes — the PFn cite-don't-restate rule is especially important for routes with 4–6 page-wide findings.

---

## Open Questions Filed During the Sweep (Phases 4a–4g)

| Q # | Filed during | Which audit | Why it matters | Resolve before building |
|---|---|---|---|---|
| **Q3.J** | Phase 4b (safety) | `pages/property-id-safety/audit.md` PF4 | Defines the "Compliant / Non-compliant / At Risk" logic for the Compliance KPI; three possible formulas yield different signals | Resolve before wiring safety KPIs — determines card design |
| **Q4.Q (updated)** | Phase 4g (location) | `pages/property-id-location/audit.md` rows 19–23 | Location page's "PropertyComparable" is the same data concept as valuation's "MarketComparable" — external data source decision affects both pages | Resolve before building PropertyComparable/MarketComparable or MarketSnapshot |
| **Q4.R** | Phase 4g (location) | `pages/property-id-location/audit.md` rows 12–18 | LandParcel schema design (denormalised on Property vs separate table vs sub-document); choice determines whether multi-parcel support is possible without a migration | Resolve before building LandParcel (rank 5 in sprint) |
| **Q5.Q** | Phase 4b (safety) | `pages/property-id-safety/audit.md` PF4 | `SafetyRisk.resolved` field: catalog specifies it, type omits it. "Open Issues" KPI collapses to `risks.length` if unresolved — hardcoded "2" is a silent correctness bug | Resolve before wiring safety KPI derivation |

> **Full open-question inventory:** `ref/05-open-questions.md` contains ~60 questions across Q1–Q9. The four above are the ones added or materially updated during Phases 4a–4g. Q9 names the top 5 cross-cutting blockers to resolve first (drafts location, multi-user scope, KPI definitions, schema tightness, notification triggers).

---

## Routes NOT Audited

**Property tab routes — all 7 audited:**
- `/property/[id]/overview` ✅ · `/property/[id]/safety` ✅ · `/property/[id]/ownership` ✅ · `/property/[id]/valuation` ✅ · `/property/[id]/rental` ✅ · `/property/[id]/location` ✅ · `/property/[id]/documents` ✅

**Non-property routes — not part of this sweep:**
- `/` (home — map + dashboard)
- `/add-property` (wizard, 6 steps)
- `/rental` (pipeline dashboard)
- `/analytics`
- `/directory`
- `/estate-planning`
- `/settings` · `/profile`
- `/login` · `/register` · `/auth/*`

These routes can be added as separate `/audit-page-datapoints` runs. Their absence does not affect the current entity build order — all 12 ranked entities were surfaced from the audited pages. New audits of these routes may shift priorities (especially `/rental` which likely surfaces more Lease/Payment data, and `/estate-planning` which may surface additional Document/Successor entities).

---

## Recommended Next Move

**Start with the PropertyValuation wiring PR.** This is a ~half-day task with the highest immediate ROI: the entity exists, the seed data exists for PROP-0001, and `queries.ts` already passes the `valuations` prop — the KPI cards in `PropertyValuationPage.tsx` just need to read from it instead of hardcoded constants. This unlocks 7 surfaces across 3 pages with no schema design, no new Zod, and no entity catalog work. Run it as a standalone PR with a batched audit of the 5 newly-wired valuation KPI cards plus the overview KPI card plus the portfolio YoY badge.

After PropertyValuation lands, begin the entity sprint with **Lease + Tenant** (2 PRs: entity type + Convex schema first, then wiring the rental and overview tabs). After Lease lands, **Payment + Expense** pairs naturally (the rental tab needs both to show a complete ledger). After those two, the ordering in the entity table above is the committed sequence.

**Do not start PropertyComparable/MarketComparable or MarketSnapshot** until Q4.Q (external data source) and Q4.R (naming/schema boundary) are resolved — those decisions affect entity shape, storage strategy, and whether a scheduler is needed.

---

## What the Sweep Cost

- **Total time:** ~3–4 hours across 2026-05-04 to 2026-05-05
- **Files created:** 8 page audit folders × 2 files each = 16 files; `pages/INDEX.md` (1 file); this summary (1 file) = **18 new files**
- **Files modified:** 14 back-links inserted into existing portfolio per-datapoint audits + 1 back-link cross-linked from `property-id-overview/audit.md` PF4 = **15 modified files**
- **Open questions filed:** 4 new entries / updates in `ref/05-open-questions.md` (Q3.J, Q4.Q updated, Q4.R, Q5.Q)

---

<details>
<summary>📋 Source page audits referenced</summary>

All files used to produce this summary:

**Page audits (audit.md):**
- `.claude/data-audit/pages/portfolio/audit.md`
- `.claude/data-audit/pages/property-id-overview/audit.md`
- `.claude/data-audit/pages/property-id-safety/audit.md`
- `.claude/data-audit/pages/property-id-ownership/audit.md`
- `.claude/data-audit/pages/property-id-valuation/audit.md`
- `.claude/data-audit/pages/property-id-rental/audit.md`
- `.claude/data-audit/pages/property-id-location/audit.md`
- `.claude/data-audit/pages/property-id-documents/audit.md`

**Entity backlogs (plan.md):**
- `.claude/data-audit/pages/portfolio/plan.md`
- `.claude/data-audit/pages/property-id-overview/plan.md`
- `.claude/data-audit/pages/property-id-safety/plan.md`
- `.claude/data-audit/pages/property-id-ownership/plan.md`
- `.claude/data-audit/pages/property-id-valuation/plan.md`
- `.claude/data-audit/pages/property-id-rental/plan.md`
- `.claude/data-audit/pages/property-id-location/plan.md`
- `.claude/data-audit/pages/property-id-documents/plan.md`

**Cross-page roll-up:**
- `.claude/data-audit/pages/INDEX.md`

**Spot-checked per-datapoint audits (back-link verification):**
- `.claude/data-audit/portfolio--monthly-income.md`
- `.claude/data-audit/portfolio--rental-status.md`

**Open questions:**
- `.claude/data-audit/ref/05-open-questions.md`

</details>

---

_# Last updated 2026-05-07 — Phase 8.5 post-wiring close-out (Estate Planning) complete. `/estate-planning` now sits at **18 WIRED · 0 HARDCODED · 2 PARTIAL · 6 CHROME**. PF1–PF5 are resolved: KPI cards, property state panel, successor verified status, successor-property scoping, estate docs, timeline, and Add Beneficiary write flow are wired. PF6 (auth shim / demo-user) remains deferred to backend migration. Q3.R/Q3.F/Q3.G/Q4.C/Q4.P/Q4.V decisions are now reflected in code and plan artifacts. No entity build-order rerank required._

_# Last updated 2026-05-07 — Phase 8.5-audit (Estate Planning) complete. **`EstatePlan` enters the backlog as a new unbuilt entity** (5 HARDCODED surfaces: Plan Completion, Pending Reviews, property status badges, status bar, last-updated). **EstateDocument** blocked on Q4.C (3 surfaces). **Estate activity log** blocked on Q4.P (3 events). **Successor-Property assignment** gap filed as PF5 (Q4.V). Only immediately fixable finding: PF2 — `Successor.verified` field is fetched but the UI ignores it, always showing green "Verified" even for SUCC-0003.verified=false (Chenda Chan). 4 new Q-numbers: Q3.R (estate KPI formulas), Q4.V (Successor-Property assignment), Q4.W (estate actions v1 scope), Q5.W (encryption copy softening). **No entity build-order rerank** — estate-planning surfaces are small (10 HARDCODED, 5 WIRED) and all gated on Q-number resolutions. Phase 8.5-Wiring gated on Q3.R + Q4.V resolutions._

_# Last updated 2026-05-07 — Phase 8.4-audit (Directory) complete. **Professional entity enters the cross-page backlog for the first time** — 60 WIRED direct-read surfaces on /directory (1 page); no new entity needed. Schema gap: `Professional.email` + `Professional.phone` (12 HARDCODED surfaces, Q5.V). Route gap: `/directory/[id]` (6 HARDCODED surfaces, Q1.J). **No entity build-order rerank** — Professional surfaces (60 WIRED, 12 HARDCODED) do not displace existing unbuilt entity priorities (Unit at 33 surfaces, PropertyComparable at 9, MarketSnapshot at 6). 5 Q-filings: Q5.V, Q1.I, Q1.C (updated), Q1.J, Q4.U. Phase 8.4-Wiring pending Q-resolution gate._

_# Last updated 2026-05-07 — Phase 8.2-audit (Rental Dashboard) complete. **Unit enters the entity catalog as a new unbuilt entity** (33 surfaces, 1 page) — gated on Q4.T decision. 8 new Q-numbers filed (Q1.G, Q1.H, Q3.M–Q3.Q, Q4.T). Unit inserted above PropertyComparable in the "blocked" section of the build order table. If Q4.T resolves to "build Unit entity," Unit becomes the single highest-priority unbuilt entity by surface count. Lease+Tenant surface count updated to 36 (+19 from rental-dashboard pipeline + events). Payment+Expense updated to 30 (+5 from rental-dashboard arrears + events). Notification+MaintenanceItem updated to 9 (+5 from rental-dashboard maintenance items + events). 3 new derivation-layer items filed in pages/INDEX.md (PortfolioKPI × 5, PropertyYieldRanking, Recovery/Eviction/TopSpend). Build order for shipped entities unchanged._

_# Last updated 2026-05-06 — Phase 8.1 Analytics audit landed. No entity rank reorder: analytics page consumes only already-wired entities (Property, Payment, Lease, MaintenanceItem, PropertyValuation). Tenant gains +1 surface (analytics lease pipeline) but remains rank 1 (shipped). MarketSnapshot / PropertyComparable gain 0 new surfaces (no comp-data section on analytics yet). Build order table unchanged._

_# Last updated 2026-05-06 (Phase 8.1 Post-Wiring) — `/analytics` now ✅ fully wired. Expense entity moved to rank 1 in cross-page backlog (25 surfaces: 13 pre-existing + 12 new from analytics wiring). Ranking note: Payment+Expense entity (25 surfaces, 3 pages) now outranks Lease+Tenant (17 surfaces, 2 pages) on both dimensions. Build order for entity sprint is historical (all entities already shipped 6.0–6.8) — updated rank is for reference only._
