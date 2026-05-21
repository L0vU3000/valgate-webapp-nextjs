---
slug: rental-dashboard
route: /rental
revision: 1
date: 2026-05-07
verdict: "⚠️ ~25 WIRED · 1 PARTIAL · ~67 HARDCODED · 6 PFn — KpiCards entirely mocked; HeatmapGrid 33 hardcoded unit tiles (Unit entity decision blocks fix); LeaseTable 3 mocked rows"
---

# Page Audit — /rental (Rental Dashboard)
_Last revised: 2026-05-07 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ⚠️ **~67 HARDCODED surfaces** — worst hardcoded ratio of any audited page: KpiCards is entirely mocked (no props), HeatmapGrid has 33 hardcoded unit tiles, LeaseTable has 3 hardcoded property rows
- ✅ **~25 WIRED surfaces** — the 4 derivation functions (`computePipeline`, `computeArrears`, `computeMaintenanceSummary`, `computeUpcomingEvents`) are correctly written; pipeline/arrears/maintenance/events are genuinely live
- 🔧 **6 page-wide findings (PF1–PF6):** Nav tabs are non-functional CHROME (PF1); KpiCards fully mocked (PF2); HeatmapGrid implies a `Unit` entity that doesn't exist (PF3); LeaseTable property-ranking has no derivation path (PF4); 4 hardcoded scalars with undefined formulas (PF5); heatmap summary line is wired-to-mock (PF6)

**Note on tile count:** The briefing estimated 38 heatmap tiles; the actual `heatmapData` const at `HeatmapGrid.tsx:30–89` contains **33 tiles** (8+6+5+4+10 across 5 properties). Summary adjusted throughout this audit.

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | ~55 rows (bundled clusters) |
| 2 | Page-wide findings | What systemic problems span the whole page? | 6 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number. Filed once at the page level; per-datapoint audits cite instead of restating.
- **PARTIAL** — Connected to a computation but sourced from mock data rather than real DB records.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.

---

## 1. Surface Inventory

> **Plain opener:** This page is the most data-starved cross-portfolio route audited so far. Three major UI components — KpiCards, HeatmapGrid, and LeaseTable — receive zero props and are backed entirely by module-level constant arrays. Four derivation functions that compute the pipeline, arrears, maintenance, and upcoming-events sections are correctly implemented; everything else is fake. WIRED/HARDCODED split is roughly 27%/73% excluding CHROME — worse than any property tab pre-Phase-6 wiring.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | "Valgate" + "/" + "Rental" breadcrumb | CHROME | static labels | `RentalDashboardPage.tsx:55–59` |
| 2 | h1 "Rental Dashboard" | CHROME | static label | `RentalDashboardPage.tsx:60` |
| 3 | Subtitle "Track units, leases, and income…" | CHROME | static label | `RentalDashboardPage.tsx:61` |
| 4 | Nav tab "Portfolio" | CHROME | `navLinks` const — **PF1** (no conditional render) | `RentalDashboardPage.tsx:22, 64–78` |
| 5 | Nav tab "Units" | CHROME | `navLinks` const — **PF1** | `RentalDashboardPage.tsx:22, 64–78` |
| 6 | Nav tab "Leases" | CHROME | `navLinks` const — **PF1** | `RentalDashboardPage.tsx:22, 64–78` |
| 7 | Nav tab "Financials" | CHROME | `navLinks` const — **PF1** | `RentalDashboardPage.tsx:22, 64–78` |
| 8 | "New Lease" quick-action button | CHROME | non-functional affordance | `RentalDashboardPage.tsx:96–105` |
| 9 | "Add Property" quick-action button | CHROME | non-functional affordance | `RentalDashboardPage.tsx:106–109` |
| 10 | "Portfolio Report" quick-action button | CHROME | non-functional affordance | `RentalDashboardPage.tsx:110–113` |
| 11 | "Export" quick-action button | CHROME | non-functional affordance | `RentalDashboardPage.tsx:114–117` |
| 12 | "Bulk Increase" quick-action button | CHROME | non-functional affordance | `RentalDashboardPage.tsx:119–122` |
| 13 | Hero — "Monthly Gross Income" label | CHROME | static label | `KpiCards.tsx:109` |
| 14 | Hero — "$19,600" value | HARDCODED | `sparklineHeights` const + literal — **PF2** | `KpiCards.tsx:115` |
| 15 | Hero — "+4.2%" trend badge | HARDCODED | string literal — **PF2** | `KpiCards.tsx:118` |
| 16 | Hero — 6-bar sparkline | HARDCODED | `sparklineHeights = [40,55,45,70,85,96]` — **PF2** | `KpiCards.tsx:25, 124–140` |
| 17 | KPI — Occupancy "91%" value | HARDCODED | `kpiCards[0].value = "91%"` — **PF2** | `KpiCards.tsx:10` |
| 18 | KPI — Occupancy 91% bar | HARDCODED | `kpiCards[0].bar = 91` — **PF2** | `KpiCards.tsx:10` |
| 19 | KPI — Vacancy Cost "$2,450" value | HARDCODED | `kpiCards[1].value = "$2,450"` — **PF2** | `KpiCards.tsx:11` |
| 20 | KPI — Vacancy Cost "/ Month Realized Loss" sub | HARDCODED | `kpiCards[1].sub` literal — **PF2** | `KpiCards.tsx:11` |
| 21 | KPI — Collection "93%" value | HARDCODED | `kpiCards[2].value = "93%"` — **PF2** | `KpiCards.tsx:12` |
| 22 | KPI — Collection "On-time payment rate" sub | HARDCODED | `kpiCards[2].sub` literal — **PF2** | `KpiCards.tsx:12` |
| 23 | KPI — Maintenance "$4,800" value | HARDCODED | `kpiCards[3].value = "$4,800"` — **PF2** | `KpiCards.tsx:13` |
| 24 | KPI — Maintenance 3 severity dots | HARDCODED | `kpiCards[3].dots` literal — **PF2** | `KpiCards.tsx:16–21` |
| 25 | LeaseTable — Row 1 name "Borey Tonle Bassac" | HARDCODED | `propertyRows[0].name` — **PF4** | `LeaseTable.tsx:9` |
| 26 | LeaseTable — Row 1 location "BKK1, Phnom Penh" | HARDCODED | `propertyRows[0].location` — **PF4** | `LeaseTable.tsx:10` |
| 27 | LeaseTable — Row 1 NOI "$412,000" | HARDCODED | `propertyRows[0].noi` — **PF4** | `LeaseTable.tsx:11` |
| 28 | LeaseTable — Row 1 avg rent "$4,200 avg" | HARDCODED | `propertyRows[0].rent` — **PF4** | `LeaseTable.tsx:12` |
| 29 | LeaseTable — Row 1 market index "Below Market (8%)" | HARDCODED | `propertyRows[0].index` — **PF4** | `LeaseTable.tsx:13` |
| 30 | LeaseTable — Row 2 name "Mekong Residence" | HARDCODED | `propertyRows[1].name` — **PF4** | `LeaseTable.tsx:18` |
| 31 | LeaseTable — Row 2 location "Chroy Changvar, Phnom Penh" | HARDCODED | `propertyRows[1].location` — **PF4** | `LeaseTable.tsx:19` |
| 32 | LeaseTable — Row 2 NOI "$284,500" | HARDCODED | `propertyRows[1].noi` — **PF4** | `LeaseTable.tsx:20` |
| 33 | LeaseTable — Row 2 avg rent "$2,850 avg" | HARDCODED | `propertyRows[1].rent` — **PF4** | `LeaseTable.tsx:21` |
| 34 | LeaseTable — Row 2 market index "Optimal" | HARDCODED | `propertyRows[1].index` — **PF4** | `LeaseTable.tsx:22` |
| 35 | LeaseTable — Row 3 name "Angkor Gateway" | HARDCODED | `propertyRows[2].name` — **PF4** | `LeaseTable.tsx:27` |
| 36 | LeaseTable — Row 3 location "Svay Dangkum, Siem Reap" | HARDCODED | `propertyRows[2].location` — **PF4** | `LeaseTable.tsx:28` |
| 37 | LeaseTable — Row 3 NOI "$195,000" | HARDCODED | `propertyRows[2].noi` — **PF4** | `LeaseTable.tsx:29` |
| 38 | LeaseTable — Row 3 avg rent "$3,400 avg" | HARDCODED | `propertyRows[2].rent` — **PF4** | `LeaseTable.tsx:30` |
| 39 | LeaseTable — Row 3 market index "Market Leader" | HARDCODED | `propertyRows[2].index` — **PF4** | `LeaseTable.tsx:31` |
| 40 | HeatmapGrid — 33 unit tiles (5 properties × N units each, see below) | HARDCODED | `heatmapData` const (all 33 `HeatmapUnit` objects) — **PF3** | `HeatmapGrid.tsx:30–89` |
| 41 | Heatmap summary — "{N} occupied · {N} vacant · {N} expiring soon" | PARTIAL | `heatmapSummary()` computed from `heatmapData` mock — **PF6** | `HeatmapGrid.tsx:97–105, 189–195` |
| 42 | Lease Pipeline — 4 stage headers + count badges (Approaching/Offered/Signed/Declined) | WIRED | `pipelineStages` from `computePipeline(leases)` | `RentalDashboardPage.tsx:144–168; derivations/rental.ts:70–102` |
| 43 | Lease Pipeline — lease cards (up to 2 per stage; unit label + detail string) | WIRED | `stage.cards` from `computePipeline(leases)` — `Lease.unit` + `Lease.startDate`/`endDate` | `RentalDashboardPage.tsx:154–170; derivations/rental.ts:76–94` |
| 44 | Arrears — "0-30d" bucket: bar width + amount | WIRED | `computeArrears(payments)` bucket[0] — filters `Payment.status="Overdue"` by age | `RentalDashboardPage.tsx:187–197; derivations/rental.ts:104–128` |
| 45 | Arrears — "31-60d" bucket: bar width + amount | WIRED | `computeArrears(payments)` bucket[1] | `RentalDashboardPage.tsx:187–197; derivations/rental.ts:104–128` |
| 46 | Arrears — "61-90d" bucket: bar width + amount | WIRED | `computeArrears(payments)` bucket[2] | `RentalDashboardPage.tsx:187–197; derivations/rental.ts:104–128` |
| 47 | Arrears sub-metric — Recovery Rate "98.2%" | HARDCODED | string literal — **PF5** — see Q3.M | `RentalDashboardPage.tsx:203` |
| 48 | Arrears sub-metric — Eviction Risk "4 Units" | HARDCODED | string literal — **PF5** — see Q3.N | `RentalDashboardPage.tsx:207` |
| 49 | Maintenance — Emergency count | WIRED | `computeMaintenanceSummary(maintenance)[0].count` — filters `severity="Emergency" && status≠"Resolved"` | `RentalDashboardPage.tsx:221–229; derivations/rental.ts:130–143` |
| 50 | Maintenance — Urgent count | WIRED | `computeMaintenanceSummary(maintenance)[1].count` | `derivations/rental.ts:130–143` |
| 51 | Maintenance — Standard count | WIRED | `computeMaintenanceSummary(maintenance)[2].count` | `derivations/rental.ts:130–143` |
| 52 | Maintenance Top Spend — "$3,240" + "HVAC / Systems" | HARDCODED | string literals — **PF5** — see Q3.Q | `RentalDashboardPage.tsx:235` |
| 53 | Maintenance Top Spend — "66.6%" bar | HARDCODED | style literal `width: "66.6%"` — **PF5** — see Q3.Q | `RentalDashboardPage.tsx:240` |
| 54 | Upcoming Events — up to 5 event rows (time + title + detail) | WIRED | `computeUpcomingEvents(leases, maintenance, payments)` — 14-day horizon union | `RentalDashboardPage.tsx:252–270; derivations/rental.ts:145–194` |

**Row 40 breakdown (33 tiles):**

| Property | Unit count | Occupied | Vacant | Expiring |
|---|---|---|---|---|
| Borey Tonle Bassac | 8 | 5 | 1 | 2 |
| Mekong Residence | 6 | 4 | 1 | 1 |
| Angkor Gateway | 5 | 4 | 1 | 0 |
| Sisowath Quay Villas | 4 | 2 | 0 | 2 |
| Phsar Thmey Flats | 10 | 9 | 1 | 0 |
| **Total** | **33** | **24** | **4** | **5** |

**Tally:** WIRED **~25** · PARTIAL **1** · HARDCODED **~67** · CHROME **~14**

**Audit-relevant rows (WIRED + PARTIAL + HARDCODED):** ~93. CHROME rows are listed for completeness and intentionally excluded from the Audit Roadmap.

**Note — Nav tabs and quick-action buttons are CHROME by PF1 resolution:** `activeNav` state is maintained in `RentalDashboardPage.tsx:29` but no section of the page renders conditionally on its value. Tabs update state only; no content changes. Quick-action buttons have no `onClick` handlers beyond the implicit `href`-less click. Both clusters are CHROME and not individually audited.

---

## 2. Page-wide findings (6 PFn)

> **Plain opener:** This page has more hardcoded surfaces than any other audited route in Phase 8. Three full UI components are backed by static constant arrays with no props — they would display exactly the same data whether the database has 1 property or 100. Four scalar values have no formula definition at all. The underlying derivation layer for pipeline/arrears/maintenance/events is correctly implemented; the problem is everything that wraps around it.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🟡 PF1 — Nav tabs are CHROME, not content filters
**PF P2 schema smell · confidence: high · `[render]`** — _see Q1.G_

**Where:** `RentalDashboardPage.tsx:22` defines `navLinks = ["Portfolio", "Units", "Leases", "Financials"]`; `RentalDashboardPage.tsx:29` maintains `activeNav` state; `RentalDashboardPage.tsx:64–78` renders tab buttons with `setActiveNav`. Applies to inventory rows **4–7**.

**Problem:** `activeNav` is tracked but never consumed. No section of the page renders conditionally based on `activeNav`'s value — all content (KPI cards, heatmap, pipeline, arrears, maintenance, events) is always visible regardless of which tab is active. Clicking a tab updates visual styling only.

**Why it matters:** Four tab buttons imply distinct views ("Portfolio", "Units", "Leases", "Financials") that do not exist. This is misleading to users — clicking "Units" gives no feedback that it's controlling anything.

**Fix decision required (Q1.G):** Wire each tab to show a different section of the page (e.g. "Units" shows heatmap only, "Leases" shows pipeline + lease table, "Financials" shows arrears + maintenance + KPI cards) — OR — remove the tabs and keep a single unified dashboard view. The second option is simpler and avoids requiring a page redesign.

---

### 🔴 PF2 — KpiCards is entirely hardcoded; component receives no props
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `components/rental/KpiCards.tsx:9–25` defines two module-level constants: `kpiCards` (4 metric objects with literal values) and `sparklineHeights` (6 bar heights). `RentalDashboardPage.tsx:84` renders `<KpiCards />` with no props. Applies to inventory rows **14–24** (11 surfaces).

**Problem:** The `KpiCards` component is structurally isolated from all data. It will display $19,600 / 91% / $2,450 / 93% / $4,800 regardless of the actual portfolio state. There is no mechanism to pass real data into it — not via props, not via context, not via server data. This is distinct from "hardcoded literal" scenarios — here the data interface doesn't exist at all.

**Why it matters:** This is the biggest "interface doesn't exist yet" finding of the page. Five portfolio-KPI derivations don't exist in `lib/data/derivations/rental.ts` or anywhere else: `computeMonthlyGrossIncome`, `computeOccupancyRate`, `computeVacancyCost`, `computeCollectionRate`, `computeMaintenanceTotal`.

**Fix:** (1) File formula definitions for the 5 KPIs via Q-numbers (Q3.M–Q3.P + Q3.O); (2) write 5 derivation functions in `lib/data/derivations/rental.ts`; (3) add results to `RentalDashboardData` type in `queries.ts`; (4) refactor `KpiCards` to accept a data prop; (5) delete the `kpiCards` and `sparklineHeights` constants.

---

### 🔴 PF3 — HeatmapGrid uses hardcoded `heatmapData` (33 unit tiles); implies a `Unit` entity that doesn't exist
**PF P1 robustness · confidence: high · `[schema]`** — _see Q4.T_

**Where:** `components/rental/HeatmapGrid.tsx:30–89` defines `heatmapData: PropertyCluster[]` with 33 `HeatmapUnit` objects across 5 named properties. `RentalDashboardPage.tsx:130` renders `<HeatmapGrid />` with no props. Applies to inventory row **40** (33 surfaces).

**Problem:** The heatmap renders unit-level occupancy data (unit name, tenant name, rent, lease end date, occupancy status) for what appear to be multi-unit properties. Neither the `Lease` entity nor the `Property` entity has a concept of sub-property units in the current schema. The `Lease.unit` field is a string label (e.g. "Unit 4B" from the lease card), but there is no `Unit` entity with `propertyId` FK that would allow rendering "all units across all properties of the portfolio."

**Why it matters:** This is the single most structurally impactful finding of Phase 8. Until the question of whether a `Unit` entity should exist is resolved (Q4.T), the heatmap cannot be wired to real data. The entire 33-surface cluster is blocked. If Q4.T resolves to "build Unit entity," this becomes Phase 6.9 and gates the largest surface cluster of Phase 8. If Q4.T resolves to "one implied unit per Property," then `heatmapData` can be derived from `properties × leases × tenants` with a reshaping.

**Fix:** File Q4.T first. After resolution, either (a) build a `Unit` entity (Phase 6.9) and wire `heatmapData` from `unitsDb.list(userId)` joined with tenants and leases; or (b) derive the heatmap from existing entities where each Property is treated as a single unit (much simpler, but the current 5-property data shows multi-unit buildings which contradicts this).

---

### 🟡 PF4 — LeaseTable uses hardcoded `propertyRows` (3 rows × 5 fields); implies a yield-ranking derivation that doesn't exist
**PF P2 schema smell · confidence: high · `[render]`**

**Where:** `components/rental/LeaseTable.tsx:7–35` defines `propertyRows` with 3 property objects including `noi`, `rent`, `index` fields. `RentalDashboardPage.tsx:129` renders `<LeaseTable />` with no props. Applies to inventory rows **25–39** (15 surfaces).

**Problem:** The "Property Ranking — By Yield" table shows NOI (annual), average monthly rent, and a market position index (Below Market / Optimal / Market Leader) per property. None of these derive from the current entity model:
- NOI requires `Payment` records + `Property.annualPropertyTax + annualInsurance` or `Expense` records — a per-property derivation
- Average rent requires averaging `Lease.monthlyRent` per property
- Market index requires comparing per-property avg rent against a market benchmark — which implies `PropertyComparable` data (Phase 6.9, gated on Q4.Q resolved)

**Fix decision required (see Q3.Q for top-spend; yield-ranking needs its own Q-number):** Define the yield-ranking formula chain (`computePropertyYieldRanking`) once Q4.Q is resolved and `PropertyComparable` is wired. This derivation pairs naturally with Phase 6.9 work.

---

### 🔴 PF5 — Four hardcoded scalar metrics with no formula definition
**PF P1 robustness · confidence: high · `[logic]`** — _see Q3.M, Q3.N, Q3.O, Q3.P, Q3.Q_

**Where:**
- Recovery Rate `"98.2%"` — `RentalDashboardPage.tsx:203` (string literal)
- Eviction Risk `"4 Units"` — `RentalDashboardPage.tsx:207` (string literal)
- Top Spend Category `"$3,240"` / `"HVAC / Systems"` — `RentalDashboardPage.tsx:235` (string literal)
- Top Spend bar `"66.6%"` — `RentalDashboardPage.tsx:240` (style literal)

Also in KpiCards (PF2 parent):
- Vacancy Cost `"$2,450"` — no formula definition (see Q3.O)
- Collection Rate `"93%"` — no formula definition (see Q3.P)

Applies to inventory rows **47–48, 52–53** directly; rows **19–22** via PF2.

**Problem:** These 6 values have no formula specification anywhere — not in `lib/data/derivations/rental.ts` (which has 4 derivations, none covering these), not in `ref/03-data-flow-and-derivations.md`, not in any open Q-number. Unlike HARDCODED values that are "blocked on entity wiring," these are blocked on *formula definition first, then wiring*.

**Why it matters:** Even if all entities were available, a developer could not wire these values without product guidance on what "Recovery Rate" and "Eviction Risk" mean numerically. These are the gateway blockers — they must be resolved before any wiring attempt.

**Fix:** File Q-numbers (Q3.M through Q3.Q, plus Q3.O and Q3.P for the KPI card formulas). Resolve before sub-phase 2 wiring. Each requires a one-line formula definition + a decision on which entity drives it.

---

### 🔵 PF6 — Heatmap summary line is "wired-to-mock"; should be classified PARTIAL not WIRED
**PF P3 nit · confidence: high · `[consistency]`**

**Where:** `HeatmapGrid.tsx:97–105` `heatmapSummary()` function + `HeatmapGrid.tsx:189–195` render. Applies to inventory row **41**.

**Problem:** The summary line "24 occupied · 4 vacant · 5 expiring soon" is computed from the same hardcoded `heatmapData` const as the tiles. It has a correct computation structure (filter by status, count), but the input is mock data. If the tiles are replaced with real `Unit` data, the summary will automatically reflect reality. If they aren't, the summary is just computed-from-mock.

**Classification:** PARTIAL (wired to mock data, not wired to DB). This is structurally different from the tiles (which are HARDCODED with no computation) — the computation is correct, only the input is mock.

**Fix:** No separate fix needed — this resolves automatically when PF3 (heatmap tiles) is fixed. Cite PF6 in the `rental--heatmap-summary-line.md` audit report.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/rental/page.tsx
  - app/(shell)/rental/queries.ts
  - app/(shell)/rental/_components/RentalDashboardPage.tsx
  - components/rental/KpiCards.tsx
  - components/rental/HeatmapGrid.tsx
  - components/rental/LeaseTable.tsx
  - lib/data/derivations/rental.ts
sources:
  - path: app/(shell)/rental/page.tsx
    sha: 2fb10b8404bbbee6c4ad14e972ecdaf1ec0ac8b6
  - path: app/(shell)/rental/queries.ts
    sha: b58cb493a68e864722b444ef0fdb5e843523408c
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: 8d1ee0769e2910ee6927d5e9b8a89b0bf18dbe18
  - path: components/rental/KpiCards.tsx
    sha: 11439a8b2fc0ede98ceb3b0ba64b20c46539e342
  - path: components/rental/HeatmapGrid.tsx
    sha: 31a82550ddbcf943b9dd13013abbcba9337f04f7
  - path: components/rental/LeaseTable.tsx
    sha: d9bb6ce1c6e1d9654a0db8f0126f3aee6b240ecf
  - path: lib/data/derivations/rental.ts
    sha: e659007b45d7b065c1523efd770434609467595e
```

**Briefing delta:** Predicted 38 heatmap tiles; actual count is 33 (8+6+5+4+10). Predicted ~75 surfaces; actual with careful splitting is ~107 classified rows (~93 audit-relevant). HARDCODED count adjusted from ~72 to ~67.

**Derivation verification:** All 4 derivation functions in `lib/data/derivations/rental.ts` were read and verified clean. No correctness bugs found. `computeArrears` correctly ages overdue payments from `Payment.date`. `computeMaintenanceSummary` correctly filters `status !== "Resolved"`. `computeUpcomingEvents` uses a 14-day lookahead horizon. `computePipeline` correctly slices at 2 cards per stage. Minor observation: `computeUpcomingEvents:162` shows `l.tenantId` (an ID string) rather than the tenant name — cosmetically suboptimal but not a correctness bug.

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit. Phase 8.2-audit. Verdict: ⚠️ ~25 WIRED · 1 PARTIAL · ~67 HARDCODED · 6 PFn.
- 54-row inventory (with row 40 expanded as a 33-tile cluster) walked across 7 source files.
- Briefing tile-count correction documented: 33 actual vs 38 predicted.
- 6 PFn: PF1 (nav tabs CHROME), PF2 (KpiCards fully mocked), PF3 (HeatmapGrid 33 tiles — Unit entity question), PF4 (LeaseTable property ranking mocked), PF5 (4 scalars with no formula), PF6 (heatmap summary PARTIAL).
- No pre-existing `rental-dashboard--*.md` per-datapoint audits — Audit Roadmap rows in `plan.md` all set to `_to-do_`.
- 5 entity/derivation backlog rows: Unit (new — 33 surfaces), PortfolioKPI derivations (5 new derivations — 15 surfaces), PropertyYieldRanking derivation (new — 15 surfaces), Tenant cross-ref (+1 heatmap surface), Recovery/Eviction/TopSpend small derivations (4 surfaces).
- 8 Q-numbers filed: Q1.G, Q1.H, Q3.M, Q3.N, Q3.O, Q3.P, Q3.Q, Q4.T.

</details>
