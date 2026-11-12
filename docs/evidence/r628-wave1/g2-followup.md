# R628 G2 follow-up: pre-existing initialization race

The candidate-only classification in the initial report is withdrawn. G2 also fails on untouched base `b54589e6f1f273eca5151e3f5bbf4ee524617556` under Turbopack. Its earlier single passing baseline run was insufficient to distinguish a regression from an intermittent race.

No product code or test assertions were changed during this investigation. The four wave-1 fixes remain intact. The test timeout, selectors, server, and database behavior were not weakened.

## Controlled runs

Both runs used the same Node process family, Next 15.5.15, React/React DOM 19.2.6, react-hook-form 7.55.0, Zod 4.4.3, Playwright 1.61.0, equal `.env.local` values, `DEMO_MODE=true`, `DEMO_ALLOW_WRITES=true`, `CLERK_SECRET_KEY=demo-no-clerk`, disabled external rate limiting, and `next dev --turbopack`. Candidate port was 3068; base was 3069. The servers ran sequentially with `reuseExistingServer:false`; neither port had a listener between runs. These runs do not depend on a port collision.

- Unchanged candidate, single traced G2: **1 passed (18.2s)** — `g2-diagnostic-candidate.log`.
- Unchanged candidate, five repeated traced G2 cases: **1 failed, 4 passed (57.8s)** — `g2-candidate-repeat.log`.
- Untouched base, ten repeated traced G2 cases: **1 failed, 9 passed (57.9s)** — `g2-base-repeat.log`. Repeat 7 reproduces the wizard reset during the advance-to-co-owners step.

Commands, from the respective candidate/base worktree:

```sh
DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts e2e/owners.spec.ts --grep 'G2:' --repeat-each=5
# Base: same command, --repeat-each=10; port 3069 in its local config.
```

Diagnostic config extends `playwright-config.txt` with `use.trace:"on"` and `webServer.stdout:"pipe"`. Those settings record the original test; they do not change its timeout or assertions. `g2-comparison-metadata.json` records matching source-file hashes and comparison metadata.

## Observed cause

`FeatureUnlockWizard.tsx:67-90` starts an initial load and unconditionally applies every result with `form.reset`, `setPhase("data")`, and `setStepIndex(0)`. Its open effect calls that loader. The development runs issue two identical `getOwnershipWizardInitialAction` calls for the same property. Both succeed with HTTP 200, `ok:true`, a null ownership record, and the seeded co-owner. `OwnershipUnlock.tsx:453-485` maps that null record to undefined structure values.

The second successful response can overwrite a choice made after the first response. The captured failures show this happening in both source revisions:

| Trace | Second initial load completes (ms) | Concurrent interaction | Observed result |
| --- | --- | --- | --- |
| Candidate | 15681.529 | Pro-Rata click starts at 15679.697 | The label detaches; click retries until the 30s test deadline. |
| Base | 44554.287 | Continue to Co-owners runs from 44493.256 to 44555.638 | The wizard returns to Ownership structure; the Co-owners heading never appears. |

Times use each Playwright trace's own monotonic clock. Request completion is request start plus duration. `g2-causality-traces.json` retains the scoped action timings, statuses and synthetic property-id request bodies. Raw trace archives are deliberately not committed; they can contain unrelated framework credentials. `g2-base-race.png` shows the failed base run back on Ownership structure, while the initial candidate failure is retained as `ownership-timeout.png`.

This classifies G2 as an existing asynchronous-initialization race exercised by the DEMO development environment. It is not a newly blocked demo context, an S3 ownership guard failure, or evidence that the four fixes changed ownership permissions. It is an actual pre-existing wizard race, not a claim that the test should be ignored or the whole gate is green.

## Relationship to the four fixes

- **B2.1:** storage ownership checks run on persisted storage-reference mutations. The failed interaction occurs before any save, upload, or cover mutation.
- **B3.2:** narrowing affects the generic `updateProperty` mutation used when saving a mortgage. G2 has not reached save at the failure point.
- **B3.7:** both initial load requests authenticate successfully and return the expected org's synthetic property/co-owner data. The demo context is not refused.
- **B4.1:** invitation acceptance is not called in this flow.

The ownership wizard component, its pillar config, its initial-load server action, and the G2 test have identical hashes in candidate and base. The pre-existing unconditional reset is in those unchanged sources. Fixing that separate race would require cancellation/versioning of initial loads; that UI change is outside the four selected fixes and was not added silently to this round.

## Verification after classification

- Full unit rerun: **1,028 passed, 110 files** — `vitest-followup.log`.
- Requested one full DEMO rerun: **29 passed, 4 failed, 36 skipped, 8 did not run** (77 collected, 4.4 minutes). **G2 passed**, with all four fixes unchanged. Log: `playwright-demo-followup.log`; counts and failures: `playwright-summary-followup.json`.
- The four remaining failures are C0/D1 (obsolete retired-wizard flows) and E1/B8-B10 (photo upload and live S3 HeadObject verification, reproduced on the untouched base in `playwright-baseline.log`). All gate failures are classified; the full DEMO gate remains red.
- Only documentation and evidence change in this amendment; source, tests and config are identical to the original `3daae8f` candidate. No push.
