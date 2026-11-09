# Dashboard

Portfolio-level pages render from live seed data and stay error-free: analytics,
estate-planning, and settings routes.

## Sub-features
- DB-3: analytics page loads without error.
- DB-4: estate-planning page loads without error.
- DB-5: settings page loads without error.

## How to get to it (user POV)
Shell dashboard menu → analytics / estate-planning / settings.

## Driving it with Playwright
`npx playwright test e2e/dashboard.spec.ts` (I3–I5).

## Gotchas
These are navigation-smoke tests; numbers shown must trace to seed data —
when extending, assert on live values, not static strings.
