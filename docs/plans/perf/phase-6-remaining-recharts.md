# Phase 6 — Defer the last static recharts charts

Surfaced during Phase 5's recharts sweep: three routes still statically import recharts through
their own inline charts (distinct from Phase 3's `ValueHistoryChart` and Phase 5's dashboard cards).
These are the last recharts holdouts — and `/property/[id]/rental` here is the heavy outlier flagged
back in Phase 3.

## The fix (same proven pattern, 3 times)

For each chart: extract the recharts JSX (`<ResponsiveContainer>…</…>`) into a `"use client"` child
that owns the recharts import, then `next/dynamic({ ssr: false })` it from the page with a skeleton
matching the chart's fixed height. recharts leaves the page's initial bundle; the chart fades in
behind the skeleton just after load. No backend, no feature change. Identical to Phase 3 / Phase 5.

## Part A — `/property/[id]/rental` (422 kB) — kills the Phase 3 outlier

- File: `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` (`"use client"`)
- recharts import: line 28–29 (`BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer`)
- One chart: `BarChart data={chartData}` at lines **1165–1211** (height 200)
- Steps:
  1. New `app/(shell)/property/[id]/_components/RentalBarChart.tsx` (`"use client"`) — owns the
     recharts import + the `<ResponsiveContainer><BarChart>…` block, takes the already-computed
     `chartData` (and any domain/label props) as props.
  2. In the page, replace the recharts import with a dynamic import of `RentalBarChart`
     (`ssr: false`, skeleton `h-[200px]`).
  3. Swap the inline `<ResponsiveContainer>…</ResponsiveContainer>` for `<RentalBarChart chartData={chartData} />`.
- Est. **~−100 kB** → rental ~320 kB.

## Part B — `/property/[id]/overview` (369 kB)

- File: `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` (`"use client"`)
- recharts import: line 22–23 (`BarChart, Bar, ResponsiveContainer, Tooltip, XAxis`)
- One small chart (sparkline-ish): `BarChart data={chartData}` at lines **707–731** (height 72)
- Steps: same as Part A → new `OverviewBarChart.tsx`, dynamic-import, skeleton `h-[72px]`.
- Est. **~−90 kB** → overview ~280 kB.

## Part C — `/analytics` (345 kB) — three charts, one module

- File: `app/(shell)/analytics/_components/AnalyticsPage.tsx` (`"use client"`)
- recharts import: line 7–8 (`ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, …`)
- **Three** charts:
  - `AreaChart data={revenueData}` — lines **238–269** (height 300)
  - `PieChart data={expenseBreakdown}` — lines **381–399**
  - `BarChart data={maintenanceSpend}` — lines **463–481** (height 128)
- Steps:
  1. New `app/(shell)/analytics/_components/analytics-charts.tsx` (`"use client"`) — one module that
     owns the recharts import and exports three named components:
     `RevenueAreaChart({ revenueData })`, `ExpensePieChart({ expenseBreakdown })`,
     `MaintenanceBarChart({ maintenanceSpend })`.
  2. In the page, `next/dynamic` each of the three from that single module (all three resolve to the
     **same** chunk, so recharts is fetched once when the first chart mounts).
  3. Swap each inline chart block for its component, skeleton height matching (300 / donut / 128).
- Est. **~−100 kB** → analytics ~245 kB.

## Result (executed 2026-07-02) ✅

| Route | Before | After | Δ |
|---|---|---|---|
| `/property/[id]/rental` | 422 kB | **318 kB** | −104 — **outlier killed** |
| `/property/[id]/overview` | 369 kB | **267 kB** | −102 |
| `/analytics` | 345 kB | **230 kB** | −115 |

Estimates were on the money (~−100–115 each). `npm run build` compiled successfully.

Changes made:
- New `RentalBarChart.tsx` (moved the bar chart + its custom tooltip + axis formatter out of the page).
- New `OverviewBarChart.tsx` (the small income/expense sparkline).
- New `analytics-charts.tsx` — one module exporting `RevenueAreaChart` / `ExpensePieChart` /
  `MaintenanceBarChart`; each takes its data + an `animate` bool (the page owns scroll-in visibility).
- Each page swapped its inline recharts JSX for a `next/dynamic({ ssr: false })` of the child, with a
  height-matched skeleton. Removed the now-dead `formatChartAxis`/`FinancialChartTooltip` from the
  rental page (kept the `ChartMonth` type, still used by `FinancialOverviewCard`).

## After Phase 6 — recharts is fully lazy everywhere ✅

Verified: `grep -rln 'from "recharts"'` now returns **only** the 6 lazy chart children —
`ValueHistoryChart` (P3), `FinancialsCardChart` + `OccupancyCardChart` (P5), and `RentalBarChart` +
`OverviewBarChart` + `analytics-charts` (P6). recharts appears in **no** page that ships in an initial
bundle. The whole recharts story is closed.

## Guardrails / verify

- Frontend-only; same low-risk `next/dynamic({ ssr: false })` as Phases 1/3/5.
- Match each skeleton's height to the chart's fixed height to avoid layout shift.
- These charts render on mount, so with `ssr: false` they load right after hydration behind a
  skeleton — a brief, non-blocking fade-in. The analytics revenue chart is fairly prominent, so
  double-check its skeleton looks intentional.
- Verify: open the rental tab, the overview tab, and `/analytics` — every chart renders with real
  data, no console errors, KPIs/tables above them are instant.
- `npm run build` after each part; record actuals in this file.
