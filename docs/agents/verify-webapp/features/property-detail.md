# Property detail

Property detail page loads for a seeded property; Overview edits persist after
reload; no quick-action stub buttons; verification revoke flips status with a
typed dialog.

## Sub-features
- PD-0: detail page loads (seeded property).
- PD-1: Overview edit → save → persists after reload.
- PD-2: quick-action stubs absent.
- PD-7: verification revoke via typed REVOKE dialog, status flips.

## How to get to it (user POV)
Portfolio → property card → detail; or `/property/<code>` for the seeded code.

## Driving it with Playwright
`npx playwright test e2e/property-tabs.spec.ts` (D0–D7).

## Gotchas
Mutates PROP-0001 (shared seed) — serial workers only; the revoke test changes
verification state, so later specs that assume status must run after it.
