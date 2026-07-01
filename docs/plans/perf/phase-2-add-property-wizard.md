# Phase 2 — Code-split the add-property wizard

The add-property flow is a 6-step wizard, but **all 6 steps are imported eagerly** at module load.
So visiting the route parses Step 2's mapbox picker, Step 4's photo tooling, Step 5/6's `motion`
animations — even though the user only sees Step 0 first. Same bug exists twice: once in the shell
wizard and once in the Pro modal version.

Depends loosely on Phase 1 (mapbox) but can proceed independently.

## Files to change

| File | Problem |
|---|---|
| `app/(shell)/add-property/_components/AddPropertyFlow.tsx` | Steps 0–6 all imported statically (Step0 local; Steps 1–5 from `@/app/_shared/add-property/` :14–20; Step6 local). None lazy. |
| `app/(pro)/pro/_components/AddPropertyFlowPro.tsx` | Same issue — Steps 1–5 imported directly :10–14. Duplicate eager load. |

Heavy libs pulled in by eager steps:
- **Step 2** → `mapbox-gl` (via `LocationPickerModal`, `PropertyLocationMap`) — ~500 kB
- **Step 4** → `motion`, `sonner` (image-compression + heic2any are *already* lazy via `await import()` — good, leave them)
- **Step 5 / Step 6** → `motion` (~40 kB)
- **Step 3** → `date-fns` (calendar)

## The pattern to apply

In each wizard, convert eager step imports to dynamic ones so each step becomes its own chunk that
only loads when the user reaches it:

```tsx
import dynamic from "next/dynamic";

// Each step is a separate chunk. Only the current step's JS downloads.
// ssr: false is fine — the wizard is entirely client-side and interactive.
const Step2Location = dynamic(
  () => import("@/app/_shared/add-property/Step2Location"),
  { ssr: false, loading: () => <StepSkeleton /> },
);
// ...repeat for the heavy steps (2, 3, 4, 5, 6). Step 0 can stay static since it renders first.
```

Keep the current step-switching logic (state/index) exactly as-is — you're only changing how each
step *component* is imported, not the flow control. Add one small shared `<StepSkeleton />` for the
`loading` fallback so there's no flash between steps.

### Also: apply Phase 1's mapbox fix here

If Phase 1 already made `LocationPickerModal` / `PropertyLocationMap` dynamic, Step 2 gets lighter for
free. If doing Phase 2 first, at minimum lazy-load Step 2 so mapbox doesn't parse upfront.

## Verify

1. `npm run build` — `/add-property` should drop from **456 kB** toward ~250 kB; `/pro/properties`
   drops by its share of the wizard weight.
2. Click through all 6 steps in both the shell wizard and the Pro modal — each step renders, no
   missing-component errors, photo upload + location picker + review still work end to end.

## Result (executed 2026-07-02) ✅

| Route | Before | After | Δ |
|---|---|---|---|
| `/add-property` | 456 kB (page 77.6) | **320 kB** (page 28.5) | **−136 kB** |
| `/pro/properties` | 465 kB (page 75.4) | **332 kB** (page 11.4) | **−133 kB** |

Changes made:
- New shared `app/_shared/add-property/StepSkeleton.tsx` — loading fallback for lazy steps.
- `AddPropertyFlow.tsx` (shell wizard) → Steps **2–6** via `next/dynamic({ ssr: false })`. Step 0
  (entry) and Step 1 (type picker) stay static since they render first.
- `AddPropertyFlowPro.tsx` (pro modal) → Steps **2–5** via `next/dynamic`. Step 1 static.
- `PropertiesRegisterPage.tsx` → the three toolbar modals (`AddPropertyFlowPro`, `CsvImportModal`
  w/ papaparse, `BulkAssignModal`) now `next/dynamic({ ssr: false })`. They're closed on load, so
  their code (incl. the whole wizard again + papaparse) is now a post-hydration chunk, not First Load.

Notes:
- `/pro/properties` beat its estimate because deferring the whole modal also removed the second copy
  of the wizard steps + papaparse, not just splitting steps in place.
- Remaining ~320 kB on both is the shared 225 kB baseline + `motion` + page chrome → **Phase 4**.
- `npm run build` compiled successfully; no type errors.
