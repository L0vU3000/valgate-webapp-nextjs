# R628 wave 1 verification map

**G2 follow-up:** the initial candidate-only classification below is superseded by [the repeated-run and trace investigation](g2-followup.md). Untouched base also reproduces the same initialization race; no product code changed in the follow-up. The requested full DEMO rerun has **29 passed, 4 failed, 36 skipped, 8 did not run**, with **G2 passing**. Vitest remains **1,028 passed**. The four remaining failures are the previously classified retired-wizard and photo/S3 cases.

Base: `b54589e6f1f273eca5151e3f5bbf4ee524617556` (`origin/main`, fetched from the webapp GitHub remote).
Branch: `test/r628-webapp-bugs-wave1`.
Line: feature / bug. Multiple surfaces: yes. Data shape: unchanged. Contract edge: demo auth policy. Permissions: storage/verification guards. Proof: executable regression tests and full DEMO run.

| Candidate | Invariant | Executable proof | Red evidence | Green evidence |
| --- | --- | --- | --- | --- |
| B2.1 | A persisted storage reference belongs to the destination org, or uses the supported `_storage/` legacy namespace. | `tests/authz/org-scoping-idor.db.test.ts`; `lib/services/storage-ownership.test.ts` | `red-db.log`: foreign key was bound; 1 failed, 12 passed. | `green-db.log`: 13 passed. Unit guard cases: 10 passed. |
| B3.2 | The generic client property patch cannot write verification metadata, storage references, or client assignment. | `lib/services/verification-state-machine.test.ts` | `red-property-schema.log`: parsed object retained `rentalVerified`; 1 failed, 20 passed. | `green-unit.log`: 25 schema/state-machine cases passed. |
| B3.7 | API demo auth applies the web refusal policy while preserving development demo use and the explicit staging exception. | `lib/api/v1/auth.test.ts` | `red-unit.log`: production and real-key cases returned `ok:true`; 2 failed, 12 passed in this file. | `green-unit.log`: 14 auth cases passed, including `NODE_ENV=test`, `DEMO_MODE=true` development, production refusal, real-key refusal, staging exception. |
| B4.1 | Before client promotion and its mirror write succeed, acceptance remains pending and failure propagates for webhook retry. | `lib/services/client-invitations.test.ts` | `red-unit.log`: 4 failed; soft failures resolved and accepted was recorded too early. | `green-unit.log`: 7 passed, including missing membership/org/manager, promotion/mirror failure, success ordering, and accepted redelivery. |

## Commands

Run from the R628 worktree with dependencies installed via `npm install --include=dev`.

- Red B2.1 / green DB: `npx vitest run --config vitest.config.db.ts tests/authz/org-scoping-idor.db.test.ts`
- Red B3.2: `npx vitest run lib/services/verification-state-machine.test.ts`
- Red B3.7 / B4.1: `npx vitest run lib/api/v1/auth.test.ts lib/services/verification-state-machine.test.ts lib/services/client-invitations.test.ts`
- Final focused green: `npx vitest run lib/services/verification-state-machine.test.ts lib/api/v1/auth.test.ts lib/services/client-invitations.test.ts lib/services/storage-ownership.test.ts --reporter=verbose` — 56 passed.
- Full unit gate: `npx vitest run` — 1,028 tests passed, 110 files.
- Type gate: `npm run typecheck` — passed.
- Full DEMO browser gate: **28 passed, 5 failed, 36 skipped, 8 did not run** (77 collected, 5.2 minutes). This gate is red. Command: `DEMO_MODE=true PLAYWRIGHT_AUTH= CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts`.

The existing checkout was dirty on `design/product-landing`; this work uses `.worktrees/r628-webapp-bugs-wave1` inside the webapp repo. Port 3001 was already occupied, so the temporary local Playwright configuration extends the committed configuration, changes its base URL/server to port 3068, and explicitly supplies demo auth and disables external rate limiting. All 77 DEMO tests are collected; auth/preview projects remain excluded by the existing config. The exact temporary configuration is preserved in `playwright-config.txt`. No dependencies were added and the lockfile did not change.

## Scope and prescribed-spec limits

B6.1 was optional and is skipped. Its proposed route regression hard-mocks `removeMembership` to reject `Error("unauthenticated")`, while its proposed root fix makes the real service no-op for missing mirror rows. That service-only fix cannot satisfy the hard-rejecting route mock. Per the brief, no alternative catch-all webhook behavior was improvised.

B3.2 first required exposing the requested new schema name. `red-unit.log` includes that initial missing-export failure; `red-property-schema.log` is the behavioral red proof after exposing the unchanged existing schema under the new name and before narrowing it.

All five generic property-patch clients were checked. AI document suggestions come from the fixed ordinary-field allowlist in `lib/services/property-suggestions.ts`; the other callers patch finance, address/location, mortgage, or property use. None require verification metadata through this generic action.

## Recurrence / structure pass

Recent main history includes earlier document scoping fixes (`027d96e`). This round fixes the repeated reference-binding class with a shared ownership predicate/assertion at service write boundaries, including destination-org variants and cover writes, with behavior gates. Duplicated demo policy is consolidated into `lib/auth/demo-ctx.ts` and exercised through the actual API resolver. These are executable constraints, with red evidence above; no new reminder-only agent rule was added.

Cross-family review and any push/PR are owned by the coordinator. This maker round does not push.

## DEMO gate failures

- `e2e/add-property.spec.ts:72` (C0): expects a Get Started button on the retired wizard; route redirects to portfolio. The redirect smoke test passes.
- `e2e/intake.spec.ts:43` (D1): times out trying to walk that same retired wizard to Step 4.
- `e2e/owners.spec.ts:92` (G2): times out advancing the ownership wizard to co-owners.
- `e2e/photos.spec.ts:37` (E1): no cover/property photo image appears after upload.
- `e2e/portfolio.spec.ts:141` (B8-B10): the live S3 HeadObject deletion assertion returns UnknownError after the UI delete and DB cascade checks pass.

The complete log is `playwright-demo.log`; compact machine-readable counts/failures are in `playwright-summary.json`. The full run generated screenshots and accessibility snapshots in gitignored `test-results/`; focused reruns replace that directory. Its complete textual evidence is retained here. These failures were not hidden by changing or skipping existing tests.

## Baseline comparison

After the full candidate run completed, a detached worktree at the exact base SHA ran the three non-obvious failures: `DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts e2e/photos.spec.ts e2e/owners.spec.ts e2e/portfolio.spec.ts --grep 'E1:|G2:|B8-B10:'`. Result: **2 failed, 1 passed** in 49.4 seconds. The photo upload failure and S3 HeadObject UnknownError reproduce on unchanged main. The co-owner case passes on main. A focused candidate rerun fails again at the same advance-to-co-owners step; `playwright-owner-rerun.log` records it.

Baseline used port 3069 and `next dev` (webpack), reusing installed dependencies by symlink. Candidate used port 3068 and the committed Turbopack dev command. Source for the retired add-property route and both obsolete wizard tests is identical to the base (`git diff origin/main -- e2e/add-property.spec.ts e2e/intake.spec.ts 'app/(shell)/add-property/page.tsx'` was empty).

A second baseline G2 check used **the same Turbopack runtime** after replacing the dependency symlink with local copies: **1 passed (20.3s)**, recorded in `playwright-baseline-turbo-owner.log`. The initial symlink-based Turbopack attempt could not start (Turbopack refuses a dependency symlink outside its root); the final log is the successful runtime-matched rerun. That initial comparison left G2 unresolved. The subsequent repeated-run investigation in `g2-followup.md` reproduces the initialization race on untouched base and supersedes that classification. The full gate is still not green. No unrelated UI fix was improvised. The candidate's final timeout screenshot is retained as `ownership-timeout.png`.

To reconstruct the temporary candidate config from this evidence, copy `playwright-config.txt` to `playwright.r628.local.config.ts` at the worktree root, then use the DEMO command above. The temporary root config is removed after verification.
