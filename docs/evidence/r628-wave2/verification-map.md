# R628 wave 2 — wizard initialization and membership deletion

Branch: `test/r628-webapp-bugs-wave1`. Parent / intact wave 1: `58b7286ac8a8068bbd9aef85098347d389b144c1`. This round is a separate second commit; wave-1 source and evidence are not amended.

Line: feature / bug. More than one surface: yes (wizard loader and webhook). Data shape: unchanged. Contract edge: no-op deletion events. Permission change: no broadened access. Proof: deterministic browser regression, real-service webhook unit regression, repeat sampling, and full suites.

| Item | Failing-before evidence | Fix at the root | Passing-after evidence |
| --- | --- | --- | --- |
| Wizard late initial response | `red-wizard.log`: G2b fails to find Co-owners after the held second successful response is released mid-navigation; screenshot `red-wizard.png`. | `FeatureUnlockWizard` shares an in-flight read for a property/config and versions each navigation callback. Cleanup invalidates callbacks; close clears pending state, retry can read again, and superseded success/failure cannot reset current state. | `green-wizard.log`: 1 passed; `g2-repeat10.log`: original G2 10/10 passed. |
| B6.1 | `red-membership.log`: 6 failed, 11 passed. Missing org/user mirror throws unauthenticated; missing event ids throw TypeError. | `removeMembership` uses plain mirror selects and no-ops if either row is absent. Deleted-event route checks ids before calling it, matching the created/updated guard. | `green-membership.log`: 17 passed. Includes the real removal service through POST, missing rows/ids, existing removal and propagation of operational DB failures. |

The old hard-rejecting service mock was not used to simulate a mirror gap. Tests mock the DB selects and keep the real `removeMembership` implementation, so HTTP 200 proves the proposed service behavior as well as the handler. Database errors still propagate for webhook retry.

## Commands and gates

Run from the wave-2 worktree with the existing installed development dependencies.

```sh
npx vitest run app/api/webhooks/clerk/route.test.ts
DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts e2e/owners.spec.ts --grep 'G2b:'
DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts e2e/owners.spec.ts --grep 'G2:' --repeat-each=10
npx vitest run
npm run typecheck
DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts
```

The temporary local config is the same dedicated demo server/port 3068 configuration preserved in `../r628-wave1/playwright-config.txt`. Copy that text to `playwright.r628.local.config.ts` at the worktree root to reproduce. It does not reuse another server. The DB is the previously confirmed dev branch.

- Full Vitest: **1,036 passed, 110 files** (`vitest-full.log`). This includes all wave-1 regressions.
- Typecheck: passed (`typecheck.log`).
- Graph refreshed (`graphify.log`).
- Full DEMO: **30 passed, 4 failed, 36 skipped, 8 did not run** (78 collected, 4.6 minutes; `playwright-demo.log`, `playwright-summary.json`). All four ownership tests pass, including G2 and G2b. Relative to the original wave-1 run, G2 no longer adds a fifth failure and the new deterministic case passes. Relative to the latest wave-1 rerun, the additional passing case raises 29 to 30.

## Race-rate evidence and limits

Before this fix, the unchanged base produced **1 failure / 10 G2 attempts** and the wave-1 candidate produced **1 failure / 5 attempts** (`../r628-wave1/g2-base-repeat.log`, `../r628-wave1/g2-candidate-repeat.log`). After the guard, the candidate produced **0 failures / 10 attempts**. The deterministic G2b case also changes from red to green and checks one initial request, rather than relying on an observed flake rate alone. Ten passing samples do not establish a universal zero failure rate.

The browser test intercepts only the synthetic property's initial-load POST, obtains the real 200 response, and holds any duplicate response until the person has navigated to Loan. On the broken implementation the second delivery resets Structure. With dedupe there is only one read. No timeouts or ordinary G2 assertions are weakened.

## Shared loader blast radius

The changed shared `components/feature-unlock/FeatureUnlockWizard.tsx` is used by these five pillar wrappers/configs:

| Wrapper | Initial-load config | Scope checked |
| --- | --- | --- |
| `pillars/OwnershipUnlock.tsx` | `ownershipWizardConfig` | G2, deterministic G2b and full owner suite. |
| `pillars/FinancialsUnlock.tsx` | `financialsWizardConfig` | Same request/version boundary; ordinary financial fields remain unchanged. |
| `pillars/RentalUnlock.tsx` | `rentalWizardConfig` | Same request/version boundary; no rental schema or save change. |
| `pillars/LocationUnlock.tsx` | `locationWizardConfig` | Same request/version boundary; no coordinates or verification change. |
| `pillars/EstateUnlock.tsx` | `estateWizardConfig` | Also passes a property-selection list; selecting a different property starts a distinct keyed read and invalidates the old callback. |

These share initialization, retry, and close behavior. Only pending reads are shared; completed data is not cached across openings. Navigation versions also prevent stale failures from replacing a newer form with a load-error screen. The existing loader's result type is derived from `WizardConfig.loadInitial`; there are no new dependencies.

`removeMembership` is also called by `lib/services/client-invitations.ts` (manager removal after client promotion) and `lib/services/portfolio-members.ts` (explicit member removal). Both now treat a missing mirror as already absent; live DB errors are not swallowed. Existing-row removal still writes the removed status and timestamps.

## Remaining browser reds

The previous four failures are classified in wave-1 evidence: retired add-property C0, retired intake D1, photo E1 and the B8-B10 S3 HeadObject check. Photo/S3 reproduce on the exact origin/main baseline; the retired route/spec sources are identical to that base. This round will record the full gate's actual result without changing or skipping those cases.

Final browser reds are exactly C0, D1, E1 and B8-B10; no new failures. Their untouched-main classification reuses `../r628-wave1/playwright-baseline.log` (photo/S3), `../r628-wave1/verification-map.md` (retired route/spec identity), and the completed wave-1 follow-up. The full browser gate is red; these cases were not skipped or weakened.
