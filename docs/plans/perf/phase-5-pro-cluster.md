# Phase 5 — Trim the `/pro/*` cluster

After Phases 1–4 the property side is optimized and the heavy cluster has moved to the manager
(`/pro/*`) routes. Profiling the three heaviest confirmed **one shared root cause**.

## The core finding (one sentence)

`recharts` (~120 kB) is statically imported by two dashboard cards — **`FinancialsCard`** (a line
chart) and **`OccupancyCard`** (a donut) — and those two cards are reused across `/pro/dashboard`,
`/pro/rent`, and `/pro/clients/[clientId]`, so all three routes ship recharts in their initial bundle.
(This is the *same* library we already deferred on the property side in Phase 3 via `ValueHistoryChart`
— but the pro side uses different chart components, so it was never covered.)

## Routes affected

| Route | First Load now | recharts via |
|---|---|---|
| `/pro/dashboard` | 426 kB | `FinancialsCard` + `OccupancyCard` |
| `/pro/clients/[clientId]` | 419 kB | `FinancialsCard` + `OccupancyCard` |
| `/pro/rent` | 406 kB | `FinancialsCard` |

Confirmed import sites:
- `app/(pro)/pro/dashboard/_components/FinancialsCard.tsx:6-12` — `LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis`
- `app/(pro)/pro/dashboard/_components/OccupancyCard.tsx:6` — `PieChart, Pie, Cell, ResponsiveContainer`

Consuming pages (all static imports today):
- `app/(pro)/pro/dashboard/_components/ManagerDashboardPage.tsx` — both cards
- `app/(pro)/pro/rent/_components/RentCollectionsPage.tsx:6` — `FinancialsCard`
- `app/(pro)/pro/clients/[clientId]/_components/ClientPortfolioPage.tsx:7-13` — both cards

## Part A — Defer recharts (the whole win). Recommended: fix it *inside the cards*, once.

Rather than editing all three consuming pages, defer the recharts chart *inside* each card component
— then every consumer benefits from two edits, and the card's header/frame still renders instantly
(only the chart area shows a skeleton while recharts streams in). This mirrors Phase 3's
`ValueHistoryChart` pattern.

For **each** of `FinancialsCard.tsx` and `OccupancyCard.tsx`:

1. Extract just the recharts JSX (the `<ResponsiveContainer>…</…>` block) into a sibling component
   file that owns the recharts imports — e.g. `FinancialsCardChart.tsx` / `OccupancyCardChart.tsx`
   (`"use client"`), taking the already-computed chart data as props.
2. In the card, replace the static recharts import with a dynamic import of that chart child:

```tsx
import dynamic from "next/dynamic";
// recharts (~120 kB) is loaded lazily, client-only. The card frame renders immediately; only the
// chart area waits on the chunk. Every page that uses this card (dashboard, rent, client portfolio)
// stops shipping recharts in its initial bundle.
const FinancialsCardChart = dynamic(
  () => import("./FinancialsCardChart").then((m) => m.FinancialsCardChart),
  { ssr: false, loading: () => <div className="h-[NNpx] w-full animate-pulse rounded-lg bg-slate-100" /> },
);
```

3. Swap the inline chart JSX for `<FinancialsCardChart {...chartProps} />` (match the skeleton height
   to the chart's fixed height so there's no layout shift).

`ssr: false` is correct — these are interactive charts, already `"use client"`, and secondary
(right-column / below the KPI tables). No SEO or first-paint dependency.

### Alternative (simpler, slightly less clean)
If extraction feels heavy, dynamic-import the *whole* `FinancialsCard` / `OccupancyCard` at each of
the three consuming pages instead. Fewer new files, but the whole card (not just the chart) shows a
skeleton, and it's 3 edits instead of 2. Prefer the in-card approach above.

## Part B — Secondary targets (smaller, optional)

Do these only if Part A doesn't hit the target; each is a modest win:

- **`ManageMembersDrawer`** — statically imported via `ClientsTable` on `/pro/dashboard`, but it's a
  drawer that only opens on "Manage members" click. Dynamic-import it in `ClientsTable`. Modest
  (form + state, no big lib).
- **`AlertsStrip`** (`motion`) — static, uses `motion` + `AnimatePresence`. `motion` is *already*
  tree-shaken via `optimizePackageImports` (Phase 4), and this strip is **above the fold** and
  decorative-on-mount, so deferring it risks a visible pop-in for little gain. **Recommend leaving it
  static** unless measurement shows it matters. Listed for completeness, not endorsed.
- Keep `motion-primitives` static — it's a lightweight re-export used by visible tables/KPIs
  (`AssetsTable` EnterTr, `KpiMetricStrip` CountUpText). Not a defer target.

## Result (executed 2026-07-02) ✅

| Route | Before | After | Δ |
|---|---|---|---|
| `/pro/dashboard` | 426 kB | **314 kB** | −112 |
| `/pro/clients/[clientId]` | 419 kB | **307 kB** | −112 |
| `/pro/rent` | 406 kB | **300 kB** | −106 |

Beat the estimate — deferring both recharts consumers netted ~110 kB/route.

Changes made:
- New `app/(pro)/pro/dashboard/_components/FinancialsCardChart.tsx` (owns the recharts line chart).
- New `app/(pro)/pro/dashboard/_components/OccupancyCardChart.tsx` (owns the recharts donut).
- `FinancialsCard.tsx` + `OccupancyCard.tsx` now `next/dynamic({ ssr: false })` their chart child.
  Card frame/KPIs render instantly; only the chart area waits behind a skeleton.
- Part B (ManageMembersDrawer / AlertsStrip) not needed — Part A alone hit strong numbers.

`npm run build` compiled successfully.

## ⚠️ New finding — recharts is ALSO static on 3 more routes (not in any plan)

The recharts import sweep during this phase surfaced three more routes that statically import
recharts and were never covered. **This is what kept `/property/[id]/rental` the heavy outlier**
(422 kB) after Phases 3–4:

| Route | First Load | recharts import site |
|---|---|---|
| `/property/[id]/rental` | 422 kB | `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` |
| `/property/[id]/overview` | 369 kB | `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` |
| `/analytics` | 345 kB | `app/(shell)/analytics/_components/AnalyticsPage.tsx` |

Each has its own inline recharts chart (different from `ValueHistoryChart`, so Phase 3 missed them).
Same fix applies: extract the chart JSX into a `"use client"` child, dynamic-import it. Estimated
**~−90–110 kB each**. Worth a **Phase 6** (or folding into this one) — `rental` especially, since it
finally kills the outlier flagged in Phase 3.

## Guardrails / notes

- Frontend-only, no backend touched. Same low-risk `next/dynamic` technique as Phases 1–4.
- These charts render **on mount** (not behind a click), so with `ssr: false` they load right after
  hydration behind a skeleton — a brief, non-blocking chart fade-in. Match skeleton height to avoid
  layout shift.
- Verify: open `/pro/dashboard`, `/pro/rent`, and a client portfolio — both charts still render with
  real data, KPIs/tables above them are instant, no console errors.
- The 225 kB shared-by-all floor is still untouched here — that's a separate architectural effort
  (Clerk/Radix), not part of Phase 5.
