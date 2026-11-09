# Valgate webapp verification map

Maintained source for verifying user-facing behavior of the webapp. Read this
index before driving, then use the matching feature file as the recipe.
Harness: the repo Playwright suite (`npx playwright test`, DEMO project).

## Baseline preconditions
- Server on 3001 (`npm run dev:e2e` or the standing dev server; never start two).
- Dev DB seeded (PROP-0001 present) — global Playwright setup asserts this.
- DEMO project only for offline runs; auth suite via `test:e2e:auth` needs
  `node scripts/provision-clerk-test-users.mjs`.
- Serial workers: one run at a time; never parallelize spec files.

## Driving conventions
- Start every recipe from seeded baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors.
- Treat every command as literal; keep quoted names and flags unchanged.
- Specs create data under "E2E …" names; global teardown removes them.

## Proof and skip reporting
- Capture the user action and resulting state, not only the final screen.
- Mutation proof includes a read-back of stored state.
- Visual proof: screenshots accompany every round's claim.
- Report an unreachable path with the attempted command and unmet precondition
  in the feature's Gotchas — do not report a skip as verified through another path.

## Feature entry contract
Each feature file: H1 title + one paragraph of user-visible behavior, then
exactly four H2s: `Sub-features`, `How to get to it (user POV)`, `Driving it
with Playwright`, `Gotchas`. Implementation details stay out of the map.

## Features (seeded top 5 — extend as features ship)
- [Quick Add property](./quick-add.md) — address search, card-before-pin, building-name matching.
- [Home map](./home-map.md) — pins, price labels, clusters, selected state.
- [Property detail](./property-detail.md) — tabs, valuation, documents listing.
- [Documents vault](./documents.md) — scan/intake to stored documents.
- [Dashboard](./dashboard.md) — portfolio stats from live seed data.
