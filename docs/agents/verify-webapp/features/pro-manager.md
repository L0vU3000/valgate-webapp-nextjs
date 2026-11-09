# Pro manager (clients / portfolios)

Manager (Pro) surfaces under `/pro/*`: client book (invite, archive,
reactivate), owner-grouped property bands, cockpit dashboard, manager-led
onboarding, view-as-client. Product map of these journeys:
`vault/resources/user-journeys.md` (Manager section).

## Sub-features
- PM-1: onboard a client → appears in active book (pro-clients.spec K1).
- PM-2: archive client → leaves active book, DB activity row (K2).
- PM-3: reactivate client → back in active book (K3).
- PM-4: `/pro/properties`, `/pro/clients/[id]`, view-as-client — map from
  user-journeys.md; specs pending (see Gotchas).

## How to get to it (user POV)
Pro shell → Clients (`/pro/clients`), Properties (`/pro/properties`),
Dashboard.

## Driving it with Playwright
`npx playwright test e2e/pro-clients.spec.ts`

## Gotchas
Creates E2E-named clients in the dev DB; teardown removes them. The wider Pro
surfaces (properties bands, view-as-client) have no dedicated spec yet — if a
round extends this feature, add the spec first, the map entry second.
