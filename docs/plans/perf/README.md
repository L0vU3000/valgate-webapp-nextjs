# Performance Optimization — Bundle Size

Goal: make the app load faster by cutting JavaScript sent to the browser (First Load JS). The
audit below is from `npm run build` output plus a code investigation of the worst routes.

## Which skill drives this work

Use **`/impeccable optimize`** — it "diagnoses and fixes UI performance across loading speed,
rendering, animations, images, and bundle size." Run it per phase to apply the fixes.

Optionally run **`/impeccable audit`** once up front for a scored P0–P3 baseline report to track
against. Skip `animate` / `delight` / `overdrive` — they *add* weight.

## The core problem (one sentence)

Heavy client libraries — **mapbox-gl (~500 kB)**, **recharts (~120 kB)**, **motion (~40 kB)** — are
imported *statically* inside `"use client"` components that live in shared layouts and eagerly-loaded
wizards, so every visitor downloads them even when the feature isn't on screen. The fix is almost
entirely **`next/dynamic({ ssr: false })`** — defer these libraries until the component actually renders.

## Route ranking (worst First Load JS → best)

| Rank | Route | First Load | Root cause | Phase |
|---|---|---|---|---|
| 🔴 1 | `/property/[id]/location` | **896 kB** | `mapbox-gl` static import (PropertyDetailMap, MapControls, LocationPickerModal) | **1** |
| 🔴 2 | `/property/[id]/financials` | 528 kB | `recharts` static + heavy shared property shell | **3** |
| 🔴 3 | `/property/[id]/rental` | 526 kB | heavy shared property shell (wizards/modals at layout) | **3** |
| 🔴 4 | `/property/[id]/overview` | 525 kB | heavy shared property shell | **3** |
| 🔴 5 | `/property/[id]/valuation` | 516 kB | `recharts` static + shared shell | **3** |
| 🟠 6 | `/pro/properties` | 463 kB | eager `mapbox-gl` + `motion` + `papaparse` | **1 + 2** |
| 🟠 7 | `/add-property` | 456 kB | all 6 wizard steps loaded eagerly (pulls mapbox + motion upfront) | **2** |
| 🟠 8 | `/pro/dashboard` | 439 kB | `motion` + shell | **4** |
| 🟠 9 | `/pro/clients/[clientId]` | 433 kB | shell | **3 (spillover)** |
| 🟠 10 | `/property/[id]/ownership` | 429 kB | shared property shell | **3** |
| 🟡 — | **Shared baseline (every route)** | **225 kB** | Clerk + lucide-react + sonner + motion + Radix + 51 kB CSS | **4** |

## Phases (ordered by impact ÷ effort)

| Phase | Title | Fixes | Est. win | Effort |
|---|---|---|---|---|
| **1** | [Kill the map bundle](./phase-1-map-bundle.md) | `/location`, and mapbox on `/add-property` + `/pro/properties` | `/location` **896 → ~400 kB** | Low |
| **2** | [Code-split the add-property wizard](./phase-2-add-property-wizard.md) | `/add-property`, `/pro/properties` | ~456 → ~250 kB | Medium |
| **3** | [Dynamic recharts + trim the property shell](./phase-3-property-shell-recharts.md) | all `/property/[id]/*` | ~520 → ~330 kB each | Medium–High |
| **4** | [Trim the shared baseline](./phase-4-shared-baseline.md) | every route (−225 kB floor) | −25–40 kB everywhere | Low–Medium |
| **5** | [Trim the `/pro/*` cluster](./phase-5-pro-cluster.md) | `/pro/dashboard`, `/pro/rent`, `/pro/clients/[clientId]` | ~−60–80 kB each | Low–Medium |
| **6** | [Defer the last static recharts charts](./phase-6-remaining-recharts.md) | `/property/[id]/rental`, `/property/[id]/overview`, `/analytics` | ~−90–110 kB each | Low |

Do them in order — Phase 1 is the single biggest, lowest-risk win. Re-run `npm run build` after each
phase and record the new First Load numbers in that phase's file to confirm the win before moving on.

## Final results — all 4 phases executed (2026-07-02) ✅

First Load JS, original build → after Phase 4. Every phase verified with `npm run build`.

| Route | Original | Final | Δ | % |
|---|---|---|---|---|
| `/property/[id]/location` | 896 kB | **318 kB** | −578 | −65% |
| `/property/[id]/valuation` | 516 kB | **241 kB** | −275 | −53% |
| `/property/[id]/financials` | 528 kB | **317 kB** | −211 | −40% |
| `/add-property` | 456 kB | **246 kB** | −210 | −46% |
| `/property/[id]/documents` | 426 kB | **258 kB** | −168 | −39% |
| `/property/[id]/safety` | 404 kB | **236 kB** | −168 | −42% |
| `/property/[id]/overview` | 525 kB | **369 kB** | −156 | −30% |
| `/pro/properties` | 463 kB | **319 kB** | −144 | −31% |
| `/property/[id]/rental` | 526 kB | **422 kB** | −104 | −20% |
| `/property/[id]/ownership` | 429 kB | **335 kB** | −94 | −22% |
| `/estate-planning` | 420 kB | **337 kB** | −83 | −20% |
| `/` (home) | 339 kB | **260 kB** | −79 | −23% |
| `/portfolio` | 338 kB | **262 kB** | −76 | −22% |
| `/analytics` | 420 kB | **345 kB** | −75 | −18% |
| `/directory` | 397 kB | **323 kB** | −74 | −19% |

Shared-by-all baseline unchanged at 225 kB (Clerk + Radix + React + CSS — architectural, out of scope).
The technique throughout was one thing: `next/dynamic({ ssr: false })` for interactive code that's
behind an interaction or below the fold (maps, charts, wizards, modals, the AI overlay), plus one
`import type` fix and one config line. No features removed, no backend touched.

## Guardrails

- `next/dynamic({ ssr: false })` means the component renders **client-only**. For maps/charts/wizards
  that's correct (they're interactive and were already `"use client"`). Add a lightweight skeleton via
  the `loading` option so there's no layout shift.
- Don't `ssr: false` anything that must appear in initial HTML for SEO or first paint. None of the
  targets here qualify — they're all behind interaction or below the fold.
- These are **frontend-only** changes (no DB, no API, no auth). Low backend risk.
