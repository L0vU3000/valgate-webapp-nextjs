---
category: testing
type: e2e
priority: normal
created: 2026-07-16
---

# De-flake documents F4 — bulk-action bar never satisfies Playwright stability

Quarantined by e2e-regression run `2026-07-16-030754` (`test.skip` with a reason pointing here;
spec retained, nothing weakened). "Done" = F4 runs green in two consecutive full active suites.

## Quarantined test
- `e2e/documents.spec.ts` — **F4** (bulk delete → typed DELETE → removed)

## Evidence / root cause
- After select-all, the floating bulk-action bar mounts correctly (`1 selected` / `Deselect
  all` / `Delete` all present — verified by probe), and the Delete button resolves visible +
  enabled.
- Clicking it hangs 30s: Playwright reports `element is not stable` (57× retries). The bar is
  `fixed bottom-6 left-1/2 -translate-x-1/2`; its bounding box settles within ~200ms in a slow
  sample yet Playwright's per-frame stability check never passes.
- Disabling all CSS animation/transition in the fixture (`animation: none !important`) did NOT
  fix it — so the residual motion is JS-driven relayout, not CSS. The suite already filters
  "ResizeObserver loop" console noise (see cross-cutting P4's allowlist), which points at a
  continuous re-layout source (candidate: the floating agent chat, `components/layout/
  ai-overlay/FloatingAgentChat.tsx`, or another ResizeObserver consumer) thrashing layout
  under the fixed bar.

## Proposed fix (not done here)
1. Find and stop the continuous relayout / ResizeObserver loop that keeps the fixed bulk bar
   sub-frame-unstable (React DevTools "why did this render", or a rAF box-jitter probe on the
   bar). Fixing it is a real UI-stability win, not just a test fix.
2. Once the bar holds still, F4 clicks land normally — un-skip and confirm two green runs.

## Do NOT
- Do not paper over it with `{ force: true }`, `dispatchEvent`, or a widened timeout — that
  hides a real UI instability and the e2e-regression eval flags masked clicks.
- Do not gate off the floating chat in DEMO just to pass the test — it is a real product
  surface, not dev-only tooling; removing it would change what F4 covers.
