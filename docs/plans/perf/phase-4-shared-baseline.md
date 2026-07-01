# Phase 4 — Trim the shared baseline (−225 kB floor)

Every route pays a 225 kB shared baseline. Some is unavoidable (Clerk auth, Radix, React). But a few
libraries leak into the *global* bundle because they're imported by shared layout components even
though only a couple of routes use them. Smaller wins than Phases 1–3, but they apply to **every**
page at once.

## 4.1 — `optimizePackageImports` in next.config.ts (lowest effort)

`next.config.ts` currently has **no** package-import optimization. Add one line so Next tree-shakes
icon/animation barrels down to only what's used:

```ts
const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    // Tree-shake barrel packages so only the icons/exports actually used are bundled.
    optimizePackageImports: ["lucide-react", "motion"],
  },
  // ...rest unchanged
};
```

Est. −5–8 kB. Zero risk. Build and confirm.

## 4.2 — Lazy-load `motion` out of the shared bundle (−8–12 kB)

`motion` (~40 kB) is only used in the **AI overlay** and **Pro dashboard**, but it's reachable from
shared layout components so it lands in the global chunk.

| File / area | Fix |
|---|---|
| `components/layout/ai-overlay/*` (AIChatPane etc.) | Dynamic-import the overlay: `const AIChatPane = dynamic(() => import("./AIChatPane"), { ssr: false })` |
| `components/layout/ai-overlay/PDFViewer.tsx` (react-pdf) | Dynamic — only renders inside the overlay modal |
| `app/(pro)/pro/dashboard/_components/AlertsStrip.tsx` | Dynamic-import (motion-driven) |

The AI overlay is opened on demand, so nothing it imports needs to be in first load.

## 4.3 — Consolidate `<Toaster />` (−2–3 kB)

`sonner`'s `<Toaster>` is mounted in three layouts:
- `components/layout/ShellLayout.tsx:5`
- `app/(auth)/layout.tsx:1`
- `app/(pro)/pro/_components/ManagerProShell.tsx`

Move to a **single** Toaster in the root layout (`app/layout.tsx`) with route-aware positioning, or at
least remove the duplicate instances. One mount, one cost.

## 4.4 — CSS review (speculative, −5–10 kB)

`styles/theme.css` is 1,383 lines / 44 kB shipped to every route (`styles/index.css:3`). It's a full
design-system token set, so most is legitimate. Optional: audit for unused color vars / animation
keyframes. Low priority — only chase this if 4.1–4.3 don't hit the target.

## 4.5 — Confirm Agentation isn't in prod (verify only)

`app/_components/agentation-provider.tsx:6` already gates on `NODE_ENV !== "development"`, and
`agentation` is in devDependencies. Just confirm `npm run build` (prod) doesn't bundle it. No code
change expected.

## Verify

1. `npm run build` — shared baseline drops from **225 kB** toward ~190 kB.
2. Smoke test: toasts still fire on login and in-app; AI overlay opens and animates; Pro dashboard
   alerts render; icons all present.

## Result (executed 2026-07-02) ✅

The "shared by all" baseline stayed **225 kB** — that intersection is Clerk + Radix + React + the
51 kB CSS, and none of the deferred code was ever in it (login/auth routes don't use the app shells,
so `motion`/`react-pdf` were in per-route bundles, not the all-routes intersection). Trimming the
225 kB floor further needs architectural changes (Clerk/Radix) — out of scope.

But the real win landed on the actual app routes. Deferring `AIOverlay` from **both** shells cut a
consistent ~**−79 kB** off nearly every owner-side route, and finally addressed the `rental` outlier:

| Route | Before Phase 4 | After Phase 4 | Δ |
|---|---|---|---|
| `/property/[id]/rental` | 501 kB | **422 kB** | −79 |
| `/property/[id]/overview` | 439 kB | **369 kB** | −70 |
| `/property/[id]/financials` | 395 kB | **317 kB** | −78 |
| `/property/[id]/valuation` | 320 kB | **241 kB** | −79 |
| `/property/[id]/documents` | 337 kB | **258 kB** | −79 |
| `/property/[id]/safety` | 315 kB | **236 kB** | −79 |
| `/portfolio` | 338 kB | **262 kB** | −76 |
| `/pro/dashboard` | 439 kB | **426 kB** | −13 |

Changes made:
- **4.1** — `next.config.ts`: added `optimizePackageImports: ["lucide-react", "motion"]`.
- **4.2** — `AIOverlay` now `next/dynamic({ ssr: false })` in `ShellLayout.tsx` (owner) and
  `ManagerProShell.tsx` (pro). This is what moved motion + react-pdf + the chat panes out of First
  Load on every shell-wrapped route.

Deliberately skipped:
- **4.3 (consolidate Toaster)** — no bundle benefit. `sonner` is imported into the bundle once
  regardless of how many `<Toaster>` elements render; consolidating saves ~0 kB and only adds
  route-position complexity. Not worth it.
- **4.4 (CSS split)** — speculative; the 51 kB is a legitimate full design-system token set. Left as-is.
- **4.5 (Agentation)** — already `NODE_ENV`-gated + a devDependency; not deep-verified beyond that.

`npm run build` compiled successfully.
