---
slug: analytics
route: /analytics
phase: 8.1
date: 2026-05-06
status: "shipped, fully wired (PF6 partial, Q4.I deferred)"
---

# Action Plan — /analytics
_Derived from [audit.md](./audit.md) · Phase 8.1 (2026-05-06)_

## 1. Summary

| Category | Count |
|---|---|
| WIRED surfaces | 24 |
| PARTIAL surfaces | 3 |
| HARDCODED surfaces | 2 |
| CHROME / DECORATIVE | ~25 |
| Page-wide findings (PFn) | 6 |
| New Q-numbers filed | 5 |

_Post-wiring (Phase 8.1): +11 WIRED (rows 14, 20, 27, 28, 34, 36, 38, 6, 35, 39, 44). Row 29 sparkline removed. PARTIAL remaining: rows 10 (NET/GROSS toggle), 16 (rent collection proxy), 17 (maintenance count). HARDCODED remaining: rows 18 (change badges "—"), 25 ("MARCH 2024" timeline text)._

**Phase character:** This is the heaviest cross-portfolio derivation page. Most findings are in `lib/data/derivations/analytics.ts` — three P1 correctness bugs, not missing entities. The entity model (Property, Payment, Lease, MaintenanceItem, PropertyValuation) is already fully wired from Phases 6.0–6.8; the work here is *fixing derivation logic* once Q3.K / Q3.L resolve.

---

## 2. Blocking Q-numbers (filed by this audit)

All resolved 2026-05-06.

| Q # | Filed | Resolved | Decision |
|---|---|---|---|
| **Q1.F** | 2026-05-06 | ✅ 2026-05-06 | Wire the period filter. `activePeriod` passed to `getAnalyticsPageData()`; affects all time-windowed derivations page-wide. |
| **Q3.K** | 2026-05-06 | ✅ 2026-05-06 | Both combined: NOI expenses = MaintenanceItem.cost for period + (annualPropertyTax + annualInsurance) / 12 × months. |
| **Q3.L** | 2026-05-06 | ✅ 2026-05-06 | Same as Q3.K per-month: each bar = maintenance cost that month + fixed costs / 12. Replaces `* 0` line. |
| **Q4.S** | 2026-05-06 | ✅ 2026-05-06 | Point-in-time only. Occupancy % = active-Lease + Owner-Occupied properties ÷ total. Drop sparkline. New status enum value "Owner-Occupied" added. |
| **Q4.I** | 2026-05-06 | ✅ 2026-05-06 | Empty state. Keep the card; replace hardcoded rows with "No saved reports yet". Entity deferred. |
| **Q5.U** | 2026-05-06 | ✅ 2026-05-06 | Add real utilities source via existing Expense entity (§25, category="Utilities"). Rename insurance slice. Wire donut center to computed total. All slices period-filtered. |

---

## 3. Entity Backlog

> Entities the page renders or implies but doesn't yet have a wiring path for. All primary entities are already fetched; gaps are derivation-layer or schema-label issues.

| Entity / Gap | Status | Surfaces unlocked | Pages this affects | Notes |
|---|---|---|---|---|
| **Tenant** (name on lease-pipeline rows) | shipped, fully wired (Phase 6.1) | 0 new — lease pipeline rows show range/count but no tenant name; adding `tenantName` to `LeasePipelineItem` is a cheap 30-min extension | this page only | Cross-ref Phase 6.1; `leasesDb.list` already fetched; add `tenantsDb.list` join |
| **MarketSnapshot / PropertyComparable** | not built | 0 surfaces currently (page has no comparative-data section) | this page + valuation + location | The subtitle "Comparative analysis across all assets" implies future market context; ties to Phase 6.9 (Q4.Q resolved: internal aggregation) |
| **Loan / Mortgage** (`Property.monthlyPayment`, `outstandingMortgage`, `interestRate`) | not surfaced | 0 — fields exist on Property schema but not rendered on this page | n/a for this page | Deferred — no UI demand on analytics page v1; would belong on a future finance page |
| **SavedReport** | not built | 1 (the always-empty Saved Reports card) | this page only | Q4.I resolved: empty-state only. Entity deferred. |
| **Expense (Utilities category)** | already built (§25, Phase 6.2) | 1 (Utilities donut slice) | this page only | No new entity needed. Wire `computeExpenseBreakdown` to `sum(Expense.amount where category="Utilities" and inPeriod)`. Add seed Expense records with `category="Utilities"` for demo properties. |

---

## 4. Audit Roadmap

> Planned per-surface audit files. Applying WIRING-PLAYBOOK Win 1 (bundle direct-read clusters).

### Planned reports

| File | Surfaces covered | Template | PFn refs | Blocking Q # |
|---|---|---|---|---|
| `analytics--kpi-strip-direct-reads.md` | Total Revenue value (13), Occupancy KPI value (15), Rent Collection value (16), Maintenance KPI value (17), KPI change badges (18) — 5 surfaces | lite (bundled) | PF1 (period filter), PF3 (NOI duplicate) | Q3.K, Q3.L |
| `analytics--noi-kpi.md` | NOI value (14) — 1 surface | **full** — correctness bug, PF3 finding | PF3 | Q3.K |
| `analytics--revenue-chart.md` | Revenue area series (19), Expense area series (20), chart X-axis labels (21) — 3 surfaces | **full** — P1 bug (expenses=0), PF2 finding | PF2 | Q3.K, Q3.L |
| `analytics--occupancy-card.md` | "91.4%" value (27), "Trend: Downward" label (28), sparkline data (29) — 3 surfaces | **full** — all 3 are HARDCODED; PF4 finding | PF4 | Q4.S |
| `analytics--lease-pipeline-direct-reads.md` | Range labels (30), units count (31), bar width (32) — 3 surfaces | lite (bundled) | none systemic | none blocking |
| `analytics--capital-growth-direct-reads.md` | Rank numbers (40), property names (41), growth pct (42), bar widths (43) — 4 surfaces | lite (bundled) | none systemic | none blocking |
| `analytics--expense-breakdown.md` | Maintenance slice (35), "Utilities" slice (36), Taxes slice (37), donut center "$48k" (38) — 4 surfaces | **full** — PF5 mislabel + PF2 center hardcode | PF5 | Q5.U |
| `analytics--maintenance-spend.md` | Monthly spend bars (44), month labels (45) — 2 surfaces | lite (bundled) | PF2-adjacent (count vs dollars) | Q3.K (same cost-basis question) |

**Total planned report files:** 8 (2 full + 4 lite-bundled + 2 full-but-tight) covering **25 of 30 audit-relevant surfaces**.
Not individually audited: rows 6, 10 (inert filters — covered by PF1), row 34 (savedReports — covered by PF6), row 39 (donut visualization — covered by expense-breakdown report).

---

## 5. Fix Log

> Findings fixed after the audit. Updated in-place; never delete rows.

| Finding | Severity | Status | Fixed in | Notes |
|---|---|---|---|---|
| PF2 — Expense series `* 0` | P1 | ✅ resolved | Phase 8.1 | `computeRevenueSeries` now sums `Expense.amount` per month window. 15 new seed records EXP-0008–EXP-0022 provide coverage. |
| PF3 — NOI duplicates Total Revenue | P1 | ✅ resolved | Phase 8.1 | `computeKpiCards` now computes `noi = totalRevenue − windowExpenses`. KPI positive flag driven by `noi >= 0`. |
| PF4 — Occupancy card hardcoded | P1 | ✅ resolved | Phase 8.1 | Value wired to `kpiCards.find(label="Occupancy").value`. Sparkline removed. "Trend: Downward" → "Point-in-time". `"Owner-Occupied"` added to `propertyStatusSchema`. |
| PF5 — "Utilities" = insurance | P2 | ✅ resolved | Phase 8.1 | `computeExpenseBreakdown` now uses `Expense[]` with 6 real categories (Maintenance, Utilities, Insurance, Tax, Management, Other). Old property-field proxy removed. |
| PF1 — Inert filters | P2 | ✅ resolved | Phase 8.1 | `page.tsx` reads `searchParams.period`, passes to `getAnalyticsPageData(period)`. Period buttons call `router.push(?period=X)`. All derivations accept `DateWindow`. |
| PF6 — savedReports always empty | P3 | ✅ resolved | Phase 8.1 | Empty state added: "No saved reports yet." shown when `savedReports.length === 0`. |
| Row 38 — "$48k" hardcoded center | P2 | ✅ resolved | Phase 8.1 | Donut center wired to `expenseBreakdownTotal` from `computeExpenseBreakdown`. Formats as `$Xk` or `$X`. |
