# code-build-loop — home-map-property-rail

- **Goal:** komoot-style collapsible left property rail on the home map; replace the bottom "Properties" accordion; keep the right detail drawer.
- **Plan decision:** float rail over the full-bleed map (not a Zillow split); reuse existing `selectedPin` + `mapRef.flyTo` (no `MapView` prop change); text-only compact rows; both panels open on lg+.
- **Cycles:** 1 build → 1 review → 1 verify (converged first pass).
- **Review found (2 real bugs, both in the collapse chrome):**
  1. Collapse chevron was an `absolute -right-3` child inside a div with `overflow-hidden` → clipped/invisible. Fix: split outer (translate, no clip) + inner (rounded card, overflow-hidden).
  2. Collapse transform `-translate-x-[calc(100%+1.5rem)]` — CSS calc needs spaces around `+`, and it didn't fully clear the chevron. Fix: fixed `-translate-x-96`.
- **Lessons for next time:**
  - When a floating card needs `overflow-hidden` for rounded corners, any element that must bleed past its edge (chevron/handle) has to live in a non-clipping outer wrapper.
  - Prefer a fixed off-canvas translate over `calc(100% + …)` for collapse — simpler and no calc-spacing footgun.
  - Verifying a Clerk app in keyless dev mode (`dev:e2e`): the "Organizations feature required" modal + "Configure your application" toast intercept clicks — strip Clerk portals (`[class*="cl-"]`, body>div matching the text) before driving the UI.
  - Playwright MCP wanted a `chrome` channel needing sudo; the bundled `chromium` in `~/Library/Caches/ms-playwright` works via a direct `import { chromium } from "playwright"` script run from the project dir.
