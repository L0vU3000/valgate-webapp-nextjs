---
slug: rental-dashboard
route: /rental
phase: 8.2
date: 2026-05-07
status: "audit complete · no wiring yet · gated on Q4.T (Unit entity) + Q3.M–Q3.Q (formula definitions)"
---

# Action Plan — /rental (Rental Dashboard)
_Derived from [audit.md](./audit.md) · Phase 8.2-audit (2026-05-07)_

## 1. Summary

| Category | Count |
|---|---|
| WIRED surfaces | ~25 |
| PARTIAL surfaces | 1 |
| HARDCODED surfaces | ~67 |
| CHROME / DECORATIVE | ~14 |
| Page-wide findings (PFn) | 6 |
| New Q-numbers filed | 8 |

**Phase character:** Highest HARDCODED ratio of all audited routes (~72% of audit-relevant surfaces). Three entire components — KpiCards, HeatmapGrid, LeaseTable — receive no props and are backed by module-level mock arrays. The 4 derivation functions are clean and correctly implemented; the rest of the page is structurally unconnected to data. The `Unit` entity question (Q4.T) is the most consequential single decision of Phase 8 — its answer reshapes the entity build order more than any other open question since Q4.R (LandParcel).

---

## 2. Blocking Q-numbers (filed by this audit)

All require resolution before sub-phase 2 (Wiring) can begin.

| Q # | Filed | Question | Blocks |
|---|---|---|---|
| **Q4.T** | 2026-05-07 | Multi-unit Property: build a `Unit` entity (Property → Unit FK with Lease.unitId), OR reshape demo so each Property is single-unit? | PF3 fix (33 heatmap tiles). Most consequential decision of Phase 8 — gates Phase 6.9 and determines entire entity build order for the remainder. |
| **Q3.M** | 2026-05-07 | Recovery Rate formula definition. Candidates: `(Rent payments where status="Paid").sum / all Rent payments.sum`, or `1 - (overdue.sum / billed.sum)`, or post-arrears recovery %. | PF5 Recovery Rate fix (`RentalDashboardPage.tsx:203`). |
| **Q3.N** | 2026-05-07 | Eviction Risk formula definition. Candidates: count of Leases with N+ overdue Payment records, or count of leases with last Payment > 60d past due. | PF5 Eviction Risk fix (`RentalDashboardPage.tsx:207`). |
| **Q3.O** | 2026-05-07 | Vacancy Cost formula definition. Candidates: `sum(Lease.monthlyRent for properties where status="Vacant")`, or `count(vacant properties) × avg(monthlyRent)`, or vacancy-days × per-day rate. | PF2 Vacancy Cost KPI card fix. |
| **Q3.P** | 2026-05-07 | Collection Rate formula definition. Candidates: `count(Rent payments this month where status="Paid") / count(expected Rent payments this month)`, or `sum(Paid) / sum(expected)`. | PF2 Collection Rate KPI card fix. |
| **Q3.Q** | 2026-05-07 | Top Spend Category derivation source. Is "HVAC / Systems" a subcategory of `Expense.category="Maintenance"` (implied but not in schema), or does it map to a different Expense category? What entity and grouping drive the $3,240 / 66.6% bar? | PF5 Top Spend fix (`RentalDashboardPage.tsx:235, 240`). |
| **Q1.G** | 2026-05-07 | Nav tabs decision: should "Portfolio / Units / Leases / Financials" filter content (each tab shows a different section), or should the dashboard be a unified single view and the tabs removed? | PF1 fix decision. |
| **Q1.H** | 2026-05-07 | Is `/rental` reachable from the app shell navigation? If not, decide whether to expose it or deprecate the route. | Governs whether Phase 8.2 wiring is worth prioritizing. |

---

## 3. Entity Backlog

> Entities and derivations the page renders or implies but doesn't yet have a wiring path for.

| Entity / Gap | Status | Surfaces unlocked | Pages this affects | Notes |
|---|---|---|---|---|
| **`Unit`** (new entity) | **not built (new — not in catalog)** | 33 (heatmap tiles on this page) | `/rental` only currently, but implied by any multi-unit property view | Schema design: `Property → Unit (1→N)` with `Unit.status`, `Unit.tenantId?`, `Unit.rent`, `Unit.leaseEnd?`. **Gated on Q4.T**. If Q4.T resolves to "single-unit per Property", no entity built — heatmap reshapes from `properties × leases`. If Q4.T resolves to "build Unit entity", files as Phase 6.9 and likely becomes rank 1 in entity backlog (38 surfaces >> PropertyComparable's 9). |
| **Portfolio-KPI derivations** (5 new derivations, no new entity) | **not built** | 15 (Hero $19,600 + +4.2% + sparkline = 3; KPI grid 4×3 = 12) | `/rental` only | Derivations needed: `computeMonthlyGrossIncome(leases, payments)`, `computeOccupancyRate(properties, leases)`, `computeVacancyCost(properties, leases, payments)`, `computeCollectionRate(payments)`, `computeMaintenanceTotal(maintenance)`. All 5 gated on Q3.M–Q3.P + Q3.O formula definitions. Once defined, ~half-day to write + wire into `KpiCards`. |
| **`computePropertyYieldRanking`** (new derivation, no new entity) | **not built** | 15 (LeaseTable 3 rows × 5 fields) | `/rental` only | Combines `Property + PropertyValuation + Lease + Payment` to compute NOI, average rent, market position per property. Market position (Below Market / Optimal / Market Leader) likely requires `PropertyComparable` data from Phase 6.9. Full derivation blocked on Q4.Q (already resolved: internal aggregation) and Phase 6.9 shipping. |
| **Tenant** (name on heatmap tiles) | shipped, fully wired (Phase 6.1) | +33 surfaces if Unit entity resolves and heatmap is wired | `/rental` only (additional surface) | Once `Unit` entity lands, `Unit.tenantId → Tenant.name` join needed for heatmap tooltip. Cheap 30-min extension of Phase 6.9. `tenantsDb.list(userId)` already pattern-established. |
| **`computeRecoveryRate` / `computeEvictionRisk` / `computeTopSpendCategory`** (small derivations) | **not built** | 4 (Recovery Rate + Eviction Risk + Top Spend amount + Top Spend bar) | `/rental` only | Small derivations, formulas TBD via Q3.M, Q3.N, Q3.Q. ~1 hour total once formulas defined. Top Spend Category may require schema extension (Expense sub-category) depending on Q3.Q resolution. |

---

## 4. Audit Roadmap

> Planned per-surface audit files. Applying WIRING-PLAYBOOK Win 1 (bundle direct-read clusters) and Win 2 (cite PFn instead of restating systemic findings).

**Important:** All 8 reports below are PLANNED but not yet written. They are written in sub-phase 3 (Post-Wiring), not during the audit phase. This roadmap serves as the source of truth for which template to use when `/audit-datapoint` runs later.

### Planned reports

| File | Surfaces covered | Template | PFn refs | Blocking Q # |
|---|---|---|---|---|
| `rental--kpi-strip-mocked.md` | Hero KPI ($19,600, +4.2%, sparkline) + 4 KPI cards (Occupancy, Vacancy Cost, Collection, Maintenance) — 11 surfaces, rows 14–24 | lite (bundled) | PF2 | Q3.M–Q3.P, Q3.O |
| `rental--lease-table-mocked.md` | LeaseTable 3 rows × 5 fields — 15 surfaces, rows 25–39 | lite (bundled) | PF4 | Q4.T resolution (market index) |
| `rental--heatmap-unit-tiles-mocked.md` | 33 HeatmapGrid unit tiles — row 40 | lite (bundled) | PF3 | Q4.T — entire cluster blocked on Unit entity decision |
| `rental--lease-pipeline-cards.md` | 4 stage headers + count badges + up to 2 cards per stage (~14 surfaces) — rows 42–43 | lite (bundled) | none systemic | none blocking — WIRED; verify `computePipeline` formula |
| `rental--arrears-buckets.md` | 3 arrears buckets (rows 44–46) + Recovery Rate + Eviction Risk (rows 47–48) — 5 surfaces | **full** — 3 WIRED + 2 HARDCODED sub-metrics | PF5 (Recovery + Eviction) | Q3.M (recovery rate), Q3.N (eviction risk) |
| `rental--maintenance-summary.md` | 3 maintenance severity items (rows 49–51) + Top Spend amount + bar (rows 52–53) — 5 surfaces | **full** — 3 WIRED + 2 HARDCODED | PF5 (Top Spend) | Q3.Q (top spend derivation) |
| `rental--upcoming-events.md` | ≤5 event rows (row 54) | lite | none systemic | none blocking — WIRED; verify `computeUpcomingEvents` horizon |
| `rental--heatmap-summary-line.md` | Heatmap summary line (row 41) — 1 PARTIAL surface | lite (1 surface) | PF6 | Resolves automatically with PF3 fix |

**Total planned report files:** 8 covering ~54 audit-relevant surfaces.
**Not individually audited:** Nav tabs (PF1 CHROME), quick-action buttons (PF1 CHROME) — covered at page level.

---

## 5. Fix Log

> Findings fixed after the audit. Updated in-place; never delete rows.

| Finding | Severity | Status | Fixed in | Notes |
|---|---|---|---|---|
| PF1 — Nav tabs are CHROME | P2 | 🔜 pending Q1.G | — | Decision required: filter vs remove |
| PF2 — KpiCards entirely mocked | P1 | ✅ wired (Gross Income + Occupancy + Vacancy + Collection) | 2026-05-07 | Maintenance $ still hardcoded (no cost field on MaintenanceItem); sparkline hardcoded (Q4.J) |
| PF3 — HeatmapGrid 33 hardcoded tiles | P1 | ✅ wired | 2026-05-07 | Q4.T resolved: properties grouped by suburb, no Unit entity |
| PF4 — LeaseTable property ranking mocked | P2 | 🔜 pending yield-ranking derivation | — | Gated on Phase 6.9 (PropertyComparable) |
| PF5 — 4 hardcoded scalars with no formula | P1 | ✅ partial (Recovery + Eviction + TopSpend wired) | 2026-05-07 | Q3.M→"Billing Recovery", Q3.N→"Eviction Risk", Q3.Q→TopSpend all wired |
| PF6 — Heatmap summary PARTIAL (wired-to-mock) | P3 | ✅ resolved with PF3 | 2026-05-07 | Summary now computed from real heatmapClusters prop |
