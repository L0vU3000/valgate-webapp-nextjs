# Phase 1 — Kill the map bundle

**Biggest single win. Do this first.**

`mapbox-gl` is ~500 kB of JavaScript. It's imported *statically* into components that render on page
load, so it lands in the initial bundle even before the user looks at a map. `/property/[id]/location`
pays for it directly (896 kB First Load), and `/add-property` + `/pro/properties` pay for it because
their location-picker modal imports it eagerly too.

> Note: `next.config.ts` already has `serverExternalPackages: ["mapbox-gl"]`. That only keeps mapbox
> out of the **server** bundle. It does **nothing** for the client bundle — this phase is what fixes
> the client side.

## Files to change

| File | Line | Current | Fix |
|---|---|---|---|
| `components/map/PropertyDetailMap.tsx` | 4–5 | `import mapboxgl from "mapbox-gl"` + CSS | This is the leaf that owns mapbox — keep the import here. Make its **callers** dynamic. |
| `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` | 5, 368 | `import { PropertyDetailMap }` static, used at :368 | Wrap in `next/dynamic({ ssr: false })` |
| `components/map/MapControls.tsx` | 7 | `import mapboxgl from "mapbox-gl"` | Load `MapControls` via `next/dynamic` from PropertyLocationPage (:411) |
| `app/(shell)/add-property/_components/LocationPickerModal.tsx` | 5–6 | static mapbox import | Import the **modal** via `next/dynamic` from its callers (wizard Step 2 / LocationUnlock) |
| `app/(shell)/add-property/_components/PropertyLocationMap.tsx` | 4 | static mapbox import | Same — dynamic-import the component that renders it |

Note: `PropertyMapExpandModal` already uses `next/dynamic` correctly (lines 11–14) — copy that exact
pattern.

## The pattern to apply

Replace a static import like:

```tsx
import { PropertyDetailMap } from "@/components/map/PropertyDetailMap";
```

with a dynamic one:

```tsx
import dynamic from "next/dynamic";

// ssr: false → mapbox only downloads in the browser, when this actually renders.
// The loading skeleton keeps the layout stable while the ~500 kB chunk loads.
const PropertyDetailMap = dynamic(
  () => import("@/components/map/PropertyDetailMap").then((m) => m.PropertyDetailMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    ),
  },
);
```

Do the same for `MapControls`, `LocationPickerModal`, and `PropertyLocationMap` at each of their
call sites. The mapbox `import` line stays inside the leaf component — you're only changing how the
**parent** pulls that leaf in.

## Verify

1. `npm run build` — confirm `/property/[id]/location` drops from **896 kB** toward ~400 kB, and
   `/add-property` + `/pro/properties` each drop by the mapbox delta.
2. Manually open the location page: map still renders, skeleton shows briefly, no console errors.
3. Open the add-property location picker and the pro properties add-flow: pickers still work.

## Result (executed 2026-07-02) ✅

`/property/[id]/location`: **896 → 423 kB First Load** (page JS **496 → 23.2 kB**). −473 kB.

Changes made:
- `components/map/MapControls.tsx:7` → `import type mapboxgl` (was value import; only used as a type).
- `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` → `PropertyDetailMap` via `next/dynamic({ ssr: false })` + skeleton.
- `components/feature-unlock/pillars/LocationUnlock.tsx:17` → `LocationPickerModal` via `next/dynamic({ ssr: false })`. **This was the real leak into the location page** — the unlock wizard is mounted there and statically pulled mapbox.

Notes:
- `/add-property` (456 kB) and `/pro/properties` (465 kB) did **not** drop — their `Step2BasicInfo`
  already dynamic-imported the map, so mapbox was never eager there. Their remaining weight is the
  eager wizard steps (**Phase 2**) and `motion`/`papaparse` (**Phase 2/4**), not mapbox.
- All four mapbox-owning leaf components (`PropertyDetailMap`, `MapView`, `LocationPickerModal`,
  `PropertyLocationMap`) are now reached only through dynamic imports — verified by grep sweep.
- `npm run build` compiled successfully; build compile time unaffected.
