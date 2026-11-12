# r628 wave 4 — B1.2, B1.3, B1.7, B2.6

Base: `effffcd` (waves 1-3). Branch `test/r628-webapp-bugs-wave1`. Maker: claude/opus-5-5.

| Bug | Red (before fix) | Root fix | Green |
|---|---|---|---|
| B1.2 | `red-unit.log`: `requireShellCtx is not a function` (2 cases) | `lib/auth/ctx.ts` new `requireShellCtx()`: unauthenticated → `redirect("/login/tasks")`, other errors rethrow. `app/(shell)/layout.tsx` uses it. | `unauthenticated.test.ts`: no-org → redirect; DEMO_MODE-refused rethrows, no redirect |
| B1.3 | `red-unit.log`: `WorkspaceUnavailable` undefined (no screen with a way out) | `LoginTasksPage.tsx`: bare `setActive` → `activateDefaultOrgWithRetry` (3 attempts); unavailable screen extracted as `WorkspaceUnavailable` with a Sign out button (`signOut({ redirectUrl: "/login" })`) | `LoginTasksPage.test.ts` renders the screen with a Sign out `<button>`; existing `activate-default-org.test.ts` covers the retry |
| B1.7 | `red-unit.log`: `upsertMembership` called 0 times with user+org rows present, no membership | `resolveCtx` adds a membership select when both mirrors exist; backfills via `upsertMembership` only when the row is MISSING | backfill case calls once with `{clerkOrgId, clerkUserId, role}`; control: existing `removed` row → no write |
| B2.6 (+B2.15) | `red-unit.log` (documents) and `red-unit-drafts-rerun.log` (drafts): `deleteStorageObject` called 0 times after S3 200 + insert reject | `uploadDocument` and `uploadDraftFileAction` record `storedId` once S3 accepts the bytes; the catch calls `deleteStorageObject(storedId)` (best-effort, never throws) | documents + drafts (insert fails / draft gone) all delete once with the presigned `storageId` |
| B2.6 sibling | `red-unit-sibling-kmz.log`: delete not called after `putKmz` + `createDocument` reject | `lib/services/property-boundary.ts` `attachBoundary`: `createDocument(...).catch` deletes the KMZ, then rethrows | `property-boundary.orphan.test.ts` |

## Gates (serial, nothing else running)

- Focused: `green-unit.log` 24 passed / 6 files.
- Full vitest: `vitest-full.log` **113 files, 1062 passed**.
- Typecheck: `typecheck.log` tsc exit 0. Lint on changed files: `lint.log` exit 0.
- DEMO playwright: `playwright-demo.log`, `playwright-summary.json`. **30 passed, 4 failed, 36 skipped, 8 did not run**. Same as wave 3. All 4 reds keep their known baseline identity: C0, D1 (fails in "Walk the wizard to Step 4", before any upload), E1, B8-B10 (S3 HeadObject). 0 new failures. The temp config was copied from `../r628-wave1/playwright-config.txt` and removed after the run.

## Deviations and decisions

- **B1.3 red test is vitest markup, not the scout's e2e.** The scout's `e2e/auth/smoke.spec.ts` case needs real Clerk (`PLAYWRIGHT_AUTH`) and route-aborting Clerk's `touch`, which the DEMO gate cannot run. The repo has no jsdom, so the effect path (retry → unavailable) is not rendered. The retry is covered by the helper's own test; the page wiring is covered by reading the code only. Add the e2e case when an auth-gate run is scheduled.
- **No "Try again" button.** The retry happens inline (3 attempts). For zero-membership users, retrying cannot help, and Sign out is the real escape. The old "Sign out removed to prevent login loop" no longer applies: after sign-out the user is signed out on `/login`, which middleware does not bounce.
- **B1.7: removed/suspended mirror rows are not resurrected.** Triage (d) said "missing or not active". I narrowed that to missing only: a session token can stay stale for about 60s after a removal webhook, and reactivating from it would restore `/api/v1` + `/mcp` access the webhook just revoked. The inverse drift (web trusting a claim whose mirror says removed) and role drift are left as they were, out of scope.
- **B1.7 v1/mcp sibling not changed.** `lib/api/v1/auth.ts` passes `provisionIfMissing:false` by policy (reads never write). A web visit now heals the mirror. A user who only uses iOS still depends on the webhook.
- **B2.6: `statObject` (wave 3) is not needed.** Cleanup keys off "S3 accepted the POST" (`storedId`), and deleting a key that doesn't exist does nothing.
- **B2.6 siblings not fixed:** `PropertyPhotoManager.tsx` and `CoverPhotoPicker.tsx` (the browser POSTs, so the server never learns of the orphan), and v1 tickets that are never completed. Both need a bucket lifecycle rule, which is not a code change.
