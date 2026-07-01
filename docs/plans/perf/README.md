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

Do them in order — Phase 1 is the single biggest, lowest-risk win. Re-run `npm run build` after each
phase and record the new First Load numbers in that phase's file to confirm the win before moving on.

## Guardrails

- `next/dynamic({ ssr: false })` means the component renders **client-only**. For maps/charts/wizards
  that's correct (they're interactive and were already `"use client"`). Add a lightweight skeleton via
  the `loading` option so there's no layout shift.
- Don't `ssr: false` anything that must appear in initial HTML for SEO or first paint. None of the
  targets here qualify — they're all behind interaction or below the fold.
- These are **frontend-only** changes (no DB, no API, no auth). Low backend risk.
