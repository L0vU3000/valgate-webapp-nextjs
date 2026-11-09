# Home map

The home map shows pins with price labels on a real map (Mapbox GL /
Google-tile MapLibre), co-located pins cluster, tapping a cluster or pin opens
the correct card, and selection state is visible.

## Sub-features
- MAP-1: home page renders the map with the seeded property pins.
- MAP-2: homepage loads without error and is not a blank screen (visual smoke).

## How to get to it (user POV)
Home (`/`) — the map is the default landing experience.

## Driving it with Playwright
`npx playwright test e2e/homepage.spec.ts` covers load + visibility; add a
screenshot assertion for pin presence when extending this feature.

## Gotchas
Map tiles need Mapbox/Google tiles env; in the DEMO suite the map may render
without tiles — assert on DOM card/pin state, not raster tiles.
