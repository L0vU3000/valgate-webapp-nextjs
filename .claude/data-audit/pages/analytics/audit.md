---
slug: analytics
route: /analytics
revision: 2
date: 2026-05-06
verdict: "✅ Phase 8.1 complete — PF1–PF6 + Row 38 resolved; expenses wired via Expense entity; NOI correct; occupancy live; period filter active"
---

# Page Audit — /analytics
_Last revised: 2026-05-06 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ **Phase 8.1 resolved all 7 findings (PF1–PF6 + Row 38)**
- ✅ Expense series wired to `Expense[]` (15 new seed records EXP-0008–EXP-0022; $7,470 total)
- ✅ NOI = Revenue − window expenses; occupancy = live `Rented + Owner-Occupied` count; period filter drives URL + server re-fetch
- ✅ Donut center dynamic; 6 correct expense categories; saved reports empty state
- Remaining CHROME: search input, Compare/Schedule buttons, NET/GROSS toggle, 3 filter dropdowns, timeline scrubber, "MARCH 2024" hardcoded label — all decorative/deferred

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 46 rows + CHROME |
| 2 | Page-wide findings | What systemic problems span the whole page? | 6 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-surface audits cite instead of restating.

---

## Source files

> **Note:** The plan referred to `app/(shell)/analytics/derivations.ts`. That file does not exist. All derivation logic lives in `lib/data/derivations/analytics.ts`. Line numbers in PFn findings reference that file.

| File | Role | SHA |
|---|---|---|
| `app/(shell)/analytics/page.tsx` | Server entry — calls `getAnalyticsPageData()` | `1a88f8fabe1f28a5ec1cf13167c706a79675973e` |
| `app/(shell)/analytics/queries.ts` | Data composition — fetches 5 entity lists, assembles `AnalyticsPageData` | `6ed07350aa5f2782ce75c253f0a8777ed3f17590` |
| `app/(shell)/analytics/_components/AnalyticsPage.tsx` | Rendered surface (509 lines) — all charts, KPIs, cards | `2ba557807b8ee708d34786ba080696d42038f22e` |
| `lib/data/derivations/analytics.ts` | All 6 derivation functions — `computeRevenueSeries`, `computeKpiCards`, `computeLeasePipeline`, `computeCapitalGrowth`, `computeMaintenanceSpend`, `computeExpenseBreakdown` | `e16daef3d99e59ff8568f47673ae223711518a83` |

---

## 1. Surface Inventory

> **Plain opener:** The page shows around 60 distinct things. 13 are connected to real data. 10 are typed-in constants that will never update. 7 are partially wired but have formula or labelling problems. About 20 are static UI controls, and 5 are purely visual decoration. The biggest issues are a derivation bug that permanently zeroes the expense chart series, a KPI card that lies (NOI = Total Revenue instead of Revenue − Expenses), and three scalars that are hardcoded directly into the component and can never change.

### Page header
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | "Valgate / Analytics" breadcrumb | CHROME | static labels | `AnalyticsPage.tsx:87–90` |
| 2 | "Portfolio Analytics" h1 | CHROME | static label | `AnalyticsPage.tsx:91–93` |
| 3 | Search "Search data..." input | CHROME | local UI — no search handler; input value not bound to any state | `AnalyticsPage.tsx:98–101` |
| 4 | "Compare" button | CHROME | stub — no action | `AnalyticsPage.tsx:104–106` |
| 5 | "Schedule Report" button | CHROME | stub — no action | `AnalyticsPage.tsx:107–109` |

### Filters bar
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 6 | Period buttons (MTD/QTD/YTD/12M/Custom) | PARTIAL | sets `activePeriod` local state only — **never passed to derivation layer**; see PF1 | `AnalyticsPage.tsx:60,120–138` |
| 7 | "All Properties" filter dropdown | CHROME | static label; no filter logic | `AnalyticsPage.tsx:141` |
| 8 | "Asset Class" filter dropdown | CHROME | static label; no filter logic | `AnalyticsPage.tsx:142` |
| 9 | "Region" filter dropdown | CHROME | static label; no filter logic | `AnalyticsPage.tsx:143` |
| 10 | NET/GROSS toggle | PARTIAL | sets `grossMode` local state only — **never passed to derivation layer**; see PF1 | `AnalyticsPage.tsx:61,148–161` |
| 11 | BarChart3 / Table2 / LayoutGrid view-mode buttons | CHROME | no-op affordances — no view-mode state | `AnalyticsPage.tsx:163–166` |
| 12 | "Export" button | CHROME | stub — no action | `AnalyticsPage.tsx:168–171` |

### KPI strip (5 cards)
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 13 | Total Revenue value | WIRED | `computeKpiCards(...)` → `payments.filter(Paid+Rent).reduce(sum, p.amount)` | `analytics.ts:72–74` |
| 14 | NOI value | HARDCODED | **PF3** — literally same formula as Total Revenue; `totalRevenue` with no expense deduction | `analytics.ts:102–107` |
| 15 | Occupancy KPI value | WIRED | `active.filter(status==="Rented").length / active.length * 100` | `analytics.ts:77–84` |
| 16 | Rent Collection value | PARTIAL | `leases.filter(stage==="Signed").length / leases.length * 100` — "signed" is a proxy for "collecting", not a payment-verified rate | `analytics.ts:87–89` |
| 17 | Maintenance KPI value | PARTIAL | `maintenance.length` (item count) — label says "Maintenance" implying financial spend, but unit is count not dollars | `analytics.ts:91` |
| 18 | All 5 KPI "change" badges | HARDCODED | literal `"—"` for every card — no historical comparison computed | `analytics.ts:98,105,112,118,125` |

### Revenue chart
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 19 | Revenue area series (9 months) | WIRED | `computeRevenueSeries` → `payments.filter(Paid+Rent+month).reduce(sum, amount)` — correct window derivation | `analytics.ts:55–58` |
| 20 | Expense area series (9 months) | HARDCODED | **PF2** — `.filter(...).length * 0` — always returns 0 for every point | `analytics.ts:59–62` |
| 21 | Chart X-axis month labels | WIRED | `lastNMonthsWindow(9)` → `MONTH_LABELS[d.getMonth()]` | `analytics.ts:54,244–248` |
| 22 | "Revenue vs Expenses (YTD)" chart title | CHROME | static string | `AnalyticsPage.tsx:192` |
| 23 | "Comparative analysis across all assets" subtitle | CHROME | static string | `AnalyticsPage.tsx:194` |
| 24 | Revenue / Expenses legend dots + labels | CHROME | static color + label | `AnalyticsPage.tsx:196–204` |
| 25 | "MARCH 2024 - AUGUST 2024" timeline range text | HARDCODED | **PF4-adjacent** — literal string; has no relation to the actual data window or `activePeriod` | `AnalyticsPage.tsx:251` |
| 26 | Timeline scrubber (track + two handles) | DECORATIVE | non-functional UI decoration; no drag handler | `AnalyticsPage.tsx:243–248` |

### Occupancy sparkline card
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 27 | "91.4%" occupancy value | HARDCODED | **PF4** — literal constant in JSX | `AnalyticsPage.tsx:265` |
| 28 | "Trend: Downward" label | HARDCODED | **PF4** — literal constant in JSX | `AnalyticsPage.tsx:266` |
| 29 | 6-point sparkline data `[94,93.5,93,92.2,91.8,91.4]` | HARDCODED | **PF4** — inline array literal; no historical Property.status snapshots exist | `AnalyticsPage.tsx:270` |

### Lease Expiry Pipeline card
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 30 | Bucket range labels (0–3M, 4–6M, 7–12M) | WIRED | bucket config in `computeLeasePipeline` — labels are derived, not hardcoded string literals | `analytics.ts:134–137` |
| 31 | Units count per bucket | WIRED | `leases.filter(days >= b.min && days <= b.max).length` per bucket | `analytics.ts:141–147` |
| 32 | Bar width (pct) | WIRED | `Math.round((totals[i] / max) * 100)` — proportional to max bucket | `analytics.ts:149–153` |
| 33 | "View All" button | CHROME | stub — no action | `AnalyticsPage.tsx:295` |

### Saved Reports card
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 34 | Report list (always empty) | HARDCODED | **PF6** — `queries.ts:61` returns `savedReports: []`; UI renders no items and has no empty-state copy | `queries.ts:61; AnalyticsPage.tsx:326–343` |

### Expense Breakdown donut
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 35 | Maintenance slice (name + pct) | PARTIAL | `maintenance.length / total * 100` — uses **item count**, not dollar cost | `analytics.ts:230` |
| 36 | "Utilities" slice (name + pct) | HARDCODED | **PF5** — label says "Utilities"; value is `insuranceTotal / total * 100` (annualInsurance, not utilities) | `analytics.ts:231` |
| 37 | Taxes slice (name + pct) | WIRED | `taxesTotal / total * 100` where `taxesTotal = properties.reduce(sum, p.annualPropertyTax)` | `analytics.ts:229` |
| 38 | "$48k" donut center total | HARDCODED | literal string in JSX; has no relation to `total` computed in `computeExpenseBreakdown` | `AnalyticsPage.tsx:383` |
| 39 | Donut chart visualization | PARTIAL | proportions are tied to PARTIAL/HARDCODED data above (rows 35–38) | `AnalyticsPage.tsx:365–379` |

### Capital Growth card
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 40 | Property rank numbers | WIRED | `String(i + 1).padStart(2, "0")` — derived from sort order | `analytics.ts:189` |
| 41 | Property names | WIRED | `p.name` from `Property` | `analytics.ts:179` |
| 42 | Growth percentages | WIRED | `((last - first) / first) * 100` across sorted `PropertyValuation` series | `analytics.ts:178` |
| 43 | Bar widths (relative to peak) | WIRED | `Math.round((growthPct / peak) * 100)` | `analytics.ts:192` |

### Maintenance Spend chart
| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 44 | Monthly spend bar values | PARTIAL | `maintenance.filter(month).length` — **count of items, not dollar amount**; `MaintenanceItem.cost` exists but is never summed | `analytics.ts:200–203` |
| 45 | Month labels (6M window) | WIRED | `lastNMonthsWindow(6)` → `label.toUpperCase()` | `analytics.ts:199–203` |
| 46 | Current-month bar highlight (accent color) | DECORATIVE | `i === maintenanceSpend.length - 1` → last bar gets accent fill | `AnalyticsPage.tsx:455` |

**Tally:** WIRED **13** · PARTIAL **7** · HARDCODED **10** · CHROME ~20 · DECORATIVE ~5

**Audit-relevant rows (WIRED + PARTIAL + HARDCODED):** 30. CHROME and DECORATIVE rows listed for completeness and intentionally excluded from the Audit Roadmap.

---

## 2. Page-wide findings (6 PFn)

> **Plain opener:** Six problems span the whole page rather than any single number. Three are P1 correctness bugs in the derivation layer (the expense chart series is always zero, the NOI formula is wrong, and the "Utilities" pie label is mislabeled insurance data). Two are inert UI affordances (filters change visual state but not the underlying data). One is a hardcoded occupancy card with fabricated trend data.

**Severity:** 🔴 PF P1 correctness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (code-verified) · medium (inferred) · low (subjective)

---

### ~~🔴 PF1 — Filter affordances are inert~~ — ✅ resolved in Revision 2
**PF P2 schema smell · confidence: high · `[render]` `[logic]`**

**Where:** `AnalyticsPage.tsx:60–61` — `activePeriod` and `grossMode` are `useState` values. They are **never passed back** to `getAnalyticsPageData()` or to any derivation function. All chart data is computed once at page load from the full entity history, regardless of which period button is active. The three `<FilterDropdown>` components (rows 7–9) are static label buttons with no state and no filter logic.

**Problem:** The page presents 5 filter affordances as if they control the data view. Clicking "QTD", "YTD", or toggling NET/GROSS produces a visual state change but the charts do not update. A user who switches from MTD to YTD and observes identical chart values will lose trust in the page. The filter bar is effectively CHROME mislabelled as functional UI.

**Why it matters:** Blocks accurate UX perception of whether the page has real filtering capability. Decision required before any period-filter wiring (see Q1.F). **Blocks PF1 fix decision.**

**Fix:** Either (a) remove or grey-out the filter controls with a "coming soon" callout, or (b) wire `activePeriod` + `grossMode` as Server Action params so they gate the derivation window. Option (b) requires `computeRevenueSeries` and `computeKpiCards` to accept a `{start, end}` window parameter derived from the selected period.

**Resolved (Phase 8.1):** `page.tsx` reads async `searchParams.period`; passes to `getAnalyticsPageData(period)`; `periodToWindow()` converts to `DateWindow`; all derivations accept the window. Period buttons call `router.push(?period=X)`. Net/Gross toggle and dropdown filters remain CHROME (deferred).

---

### ~~🔴 PF2 — Expense area series is structurally zero~~ — ✅ resolved in Revision 2
**PF P1 correctness · confidence: high · `[logic]`** — _see Q3.K / Q3.L_

**Where:** `lib/data/derivations/analytics.ts:59–62`

```ts
const expenses = maintenance
  .filter((m) => m.createdAt >= start && m.createdAt < end)
  .length * 0;
```

**Problem:** The expense series is computed as `count * 0`. Every data point's `expenses` value is 0. The revenue chart shows an "Expenses" legend and area series that is permanently flatlined at zero. This is a **silent correctness bug** — the chart renders without error but the "Expenses" series misleads users into thinking expenses are zero.

**Why it matters:** The revenue chart's entire second series (blue area) is structurally broken. Any user comparing Revenue vs Expenses is looking at fabricated data. **P1 — blocks the revenue chart from being trustworthy.** Likely introduced as a placeholder for a dollar-denominated aggregation that was never completed.

**Fix:** Replace `.length * 0` with an actual dollar aggregation. Exact source depends on Q3.L resolution: candidates are (a) `MaintenanceItem.cost` summed per month, (b) pro-rated `annualPropertyTax + annualInsurance` per property per month, or (c) a combination. Until Q3.L is resolved, the expression should at minimum be changed to `0` (explicit zero, not `count * 0`) with a `// TODO(Q3.L): wire real expense source` comment.

**Resolved (Phase 8.1):** `computeRevenueSeries` now filters `Expense[]` by window and sums `amount` per month. 15 new seed records EXP-0008–EXP-0022 cover all 6 expense categories. `computeMaintenanceSpend` also updated to use `Expense[category="Maintenance"]` amounts.

---

### ~~🔴 PF3 — NOI KPI duplicates Total Revenue~~ — ✅ resolved in Revision 2
**PF P1 correctness · confidence: high · `[logic]`** — _see Q3.K_

**Where:** `lib/data/derivations/analytics.ts:93–130` — `computeKpiCards` builds both cards:

```ts
// Total Revenue (row 94–100):
{ label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, ... }

// NOI (row 101–107):
{ label: "NOI", value: `$${totalRevenue.toLocaleString()}`, ... }
```

Both cards show the identical `$${totalRevenue.toLocaleString()}` expression. NOI is defined as Revenue − Operating Expenses, but no expense deduction is applied.

**Problem:** Displaying two KPI cards with identical values under different labels (Total Revenue and NOI) actively misleads users. A property manager looking at this page will assume NOI is an independent, correctly-derived metric.

**Why it matters:** P1 — the most prominent KPI on the strip is wrong. Blocks PF3 fix decision. Resolves with Q3.K (what counts as operating expenses for the NOI formula in this demo context?).

**Fix:** `NOI = totalRevenue − operatingExpenses` where `operatingExpenses` is whatever Q3.K defines. Likely the same answer as Q3.L's expense aggregation source.

**Resolved (Phase 8.1):** `computeKpiCards` now computes `noi = windowRevenue − windowExpenses`. `positive` flag = `noi >= 0`. NOI and Total Revenue now show distinct values.

---

### ~~🔴 PF4 — Occupancy time-series card is fully hardcoded~~ — ✅ resolved in Revision 2
**PF P1 correctness · confidence: high · `[render]`** — _see Q4.S_

**Where:** `AnalyticsPage.tsx:265–270` — three hardcoded values in JSX:
- `"91.4%"` — the headline value
- `"Trend: Downward"` — the directional label
- Inline data array `[{ v: 94 }, { v: 93.5 }, { v: 93 }, { v: 92.2 }, { v: 91.8 }, { v: 91.4 }]` — the sparkline

**Problem:** None of these values derive from any entity. No historical `Property.status` snapshots exist in the data model. The occupancy sparkline is fabricated. The `91.4%` value has no relationship to the `occupancyPct` computed in `computeKpiCards` (row 15 in the inventory), which is the real current-point-in-time occupancy.

**Note:** The "MARCH 2024 - AUGUST 2024" text at `AnalyticsPage.tsx:251` is a related hardcoded string — it implies the timeline scrubber controls a specific window but is static. Filed here as a PF4-adjacent hardcoded constant rather than a separate finding.

**Why it matters:** The portfolio analytics page's signature card (occupancy trend) is fabricated. If the computed `occupancyPct` from `computeKpiCards` is, say, 75%, the page simultaneously shows 75% in the KPI strip and 91.4% in the sparkline card — contradictory values on the same route. **Blocks PF4 fix decision.** Resolves with Q4.S.

**Fix:** (a) Replace `91.4%` with the live `kpiCards[2].value` (Occupancy KPI from the strip). (b) Replace "Trend: Downward" with a derived direction from the sparkline or remove the label. (c) Either fetch/compute a real time-series or remove the sparkline until a snapshot table exists.

**Resolved (Phase 8.1):** `91.4%` replaced with `kpiCards.find(label="Occupancy").value`. Sparkline `AreaChart` and `occGrad` gradient removed. Label changed to "Point-in-time". `"Owner-Occupied"` added to `propertyStatusSchema` and counted in occupancy formula.

---

### ~~🟡 PF5 — "Utilities" slice computed from insurance data~~ — ✅ resolved in Revision 2
**PF P2 schema smell · confidence: high · `[semantic]`** — _see Q5.U_

**Where:** `lib/data/derivations/analytics.ts:231`

```ts
{ name: "Utilities", pct: Math.round((insuranceTotal / total) * 100), color: "#fbbf24" }
```

`insuranceTotal` is computed as `properties.reduce((sum, p) => sum + (p.annualInsurance ?? 0), 0)` (line 215). The slice label says "Utilities" but the value is the sum of property insurance premiums.

**Problem:** A user reading the Expense Breakdown donut sees "Utilities: X%" and assumes it represents utility costs (electricity, water, waste). It actually represents insurance premiums. The mislabelling makes the donut actively misleading as a financial summary.

**Why it matters:** P2 — the donut is misrepresentative but the magnitude error is bounded (insurance is real data; just the label is wrong). Resolves with Q5.U decision: (a) rename "Utilities" to "Insurance" (1-line fix), or (b) add a real utilities cost source and rename accordingly.

**Fix (option a — minimal):** Change `name: "Utilities"` to `name: "Insurance"` in `computeExpenseBreakdown`. The `$48k` hardcoded center total (row 38) also needs wiring from the actual `total` variable in that function.

**Resolved (Phase 8.1):** `computeExpenseBreakdown` fully rewritten — uses `Expense[]` filtered by window, groups by `category`, returns `{ items, total }`. Six correct categories with distinct colors. `$48k` center wired to `expenseBreakdownTotal` passed from queries.

---

### ~~🟡 PF6 — `savedReports: []` always-empty with no empty state~~ — ✅ resolved in Revision 2
**PF P3 nit · confidence: high · `[negative-space]`** — _see Q4.I_

**Where:** `queries.ts:61` — `savedReports: []` (hardcoded empty array). `AnalyticsPage.tsx:326–343` — the saved reports list renders `savedReports.map(...)` which produces zero items. No empty-state copy or placeholder card is shown.

**Problem:** The "Saved Reports" card section renders with a heading and no content — a visually broken empty state. Users see a card header with nothing below it.

**Why it matters:** P3 — cosmetic gap. The Q4.I question ("SavedReports real entity? Out of scope for v1?") needs resolution. Options: (a) remove the card entirely (CHROME), (b) add minimum empty-state copy ("No saved reports yet"), or (c) build the `SavedReport` entity.

**Fix:** Add a simple empty-state `<p>` inside the `savedReports.length === 0` branch, or remove the card. Wiring a real `SavedReport` entity is a separate future scope decision.

**Resolved (Phase 8.1):** `savedReports.length === 0` branch added; renders `<p className="text-xs text-slate-400">No saved reports yet.</p>`.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/analytics/page.tsx
  - app/(shell)/analytics/queries.ts
  - app/(shell)/analytics/_components/AnalyticsPage.tsx
  - lib/data/derivations/analytics.ts
sources:
  - path: app/(shell)/analytics/page.tsx
    sha: 1a5fa2d5ccf8da238ca03013bea48c4fda49c4fd
  - path: app/(shell)/analytics/queries.ts
    sha: 8f8ba87dccfd201a299ffcb80b426307604f2143
  - path: app/(shell)/analytics/_components/AnalyticsPage.tsx
    sha: 7d432debd03cd7cf6fd7320c74d950eda472e93e
  - path: lib/data/derivations/analytics.ts
    sha: 39151627376123c9e16223b86a1ec0b37e982b60
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 2 — 2026-05-06
- Phase 8.1 wiring PR. All 7 findings resolved (PF1–PF6 + Row 38).
- `lib/data/derivations/analytics.ts` fully rewritten: `DateWindow`/`periodToWindow`, `Expense[]`-based computations, correct NOI, live occupancy with `Owner-Occupied` support.
- `queries.ts`: added `expensesDb.list`, `period` param, `expenseBreakdownTotal` output.
- `page.tsx`: async `searchParams`, passes period to data fetch and component.
- `AnalyticsPage.tsx`: period prop, `router.push`, sparkline removed, live occupancy value, dynamic donut center, saved reports empty state.
- 15 new seed records EXP-0008–EXP-0022; grand total $7,470.
- `propertyStatusSchema` extended with `"Owner-Occupied"`; `CommandPalette.tsx` `statusClasses` record completed.
- Source SHAs updated.

### Revision 1 — 2026-05-06
- Initial audit for `/analytics` — first non-property route in Phase 8 sweep.
- 46 numbered rows + CHROME/DECORATIVE sub-elements; total ~60 surface classifications.
- Verdict: 13 WIRED · 7 PARTIAL · 10 HARDCODED · ~20 CHROME · ~5 DECORATIVE.
- 6 PFn filed: PF1 (inert filters), PF2 (expense series `* 0`), PF3 (NOI = Revenue bug), PF4 (occupancy card fully hardcoded), PF5 ("Utilities" mislabelled insurance), PF6 (savedReports always empty).
- Source file correction: plan referenced `app/(shell)/analytics/derivations.ts` — does not exist; all derivations are in `lib/data/derivations/analytics.ts`.
- 5 new Q-numbers filed: Q3.K, Q3.L, Q4.S, Q1.F, Q5.U.

</details>
