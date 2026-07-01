# Phase 3 — Dynamic recharts + trim the property shell

The entire `/property/[id]/*` family sits at 400–530 kB because of **two** things:

1. **`recharts` (~120 kB)** is statically imported by the financials and valuation pages.
2. A **heavy shared shell** — `FeatureUnlockWizard` (537 lines), `PropertyProfileWizard`,
   `ProgressModal`, `NotificationsPanel` — is mounted at the **layout/provider level**, so *every*
   segment (overview, rental, ownership, documents…) downloads all of it, even though these are
   modals that are closed on load.

This is the highest-effort phase because it touches shared layout architecture. Do it after 1 & 2.

## Part A — Dynamic recharts (quick, isolated)

| File | Line | Fix |
|---|---|---|
| `app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx` | 10–12 | Move the chart into a small child component, import it via `next/dynamic({ ssr: false })` |
| `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` | 9–11 | Same |

Pattern:

```tsx
// FinancialsChart.tsx  ("use client") — owns the recharts imports
// PropertyFinancialsPage.tsx:
const FinancialsChart = dynamic(() => import("./FinancialsChart"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />,
});
```

Charts are below the fold and interactive — `ssr: false` is safe and removes recharts from the
initial bundle on both pages.

## Part B — Lazy-mount the shared shell modals

These live in the property layout/provider and load on every segment. They're all closed until the
user opens them, so they should be dynamic.

| Component | Mount site |
|---|---|
| `components/feature-unlock/FeatureUnlockWizard.tsx` (largest, 537 lines) | segment pages / shell |
| `components/property/PropertyProfileWizard.tsx` | `PropertyShellContext.tsx:6–7` |
| `components/portfolio/ProgressModal.tsx` | `PropertyShellContext.tsx:6–7` |
| `components/property/NotificationsPanel.tsx` (352 lines) | `PropertyLayout.tsx:12` |

Pattern — dynamic-import each modal/wizard where it's mounted, so its code only loads when opened:

```tsx
const FeatureUnlockWizard = dynamic(
  () => import("@/components/feature-unlock/FeatureUnlockWizard")
        .then((m) => m.FeatureUnlockWizard),
  { ssr: false },
);
```

If a modal is gated by an `isOpen` boolean, you can even render it as `{isOpen && <Wizard />}` so the
chunk is requested only on first open. Keep the provider/context wiring intact — only the heavy JSX
components become lazy.

⚠️ Test the unlock/progress/notifications flows carefully after this — these are shared across many
pages and the shell context is load-bearing.

## Verify

1. `npm run build` — financials/valuation drop by ~120 kB (recharts); all `/property/[id]/*` segments
   drop by the shared-shell delta.
2. On a property, exercise: open Progress modal, open a Feature Unlock wizard, open Notifications,
   open the Profile wizard, view a chart on financials + valuation. All must still work.

## Expected result

`/property/[id]/*`: **~520 → ~330 kB** across the family. Record actuals here after building.
