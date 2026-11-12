# R628 wave 3 — upload integrity batch

Branch: `test/r628-webapp-bugs-wave1`. Parent / intact wave 2: `16951948d92631e95ed6d05ad875827320796870`. Wave 1 remains `58b7286ac8a8068bbd9aef85098347d389b144c1`. This round is a third commit; earlier evidence is unchanged.

Selected four live, REAL upload candidates with ready scout tests: **B2.2, B2.3, B2.5 and B2.9**. No substitutions were needed. B2.5 implements the shared B3.4 insert root once, not as a separate fifth item. Already-fixed B2.1 is not counted again. The retired upload preflight and draft-transaction candidates remain outside this bounded live-upload batch.

Line: feature / bug. Multiple surfaces: yes (storage/completion, property children, upload action, document AI). Data shape: unchanged. Contract edge: idempotent completion returns 200. Permission edge: property ownership on child inserts. Proof: failing unit/DB regressions, positive controls, full gates.

| Item | Red evidence | Root fix | Green evidence |
| --- | --- | --- | --- |
| B2.2 | `red-unit.log`: missing object returned 201; client MIME/size were forwarded. | S3 `statObject` uses HeadObject, returns null only for 404, propagates other errors. Completion rejects absent/invalid metadata and revalidates actual S3 MIME/size using the existing complete-body schema. | Completion suite 18 passed; storage stat suite 5 passed. Includes invalid metadata, S3 permission/server errors and transport errors. |
| B2.3 | `red-unit.log`: second completion returned 201 and created another row; key reuse on another property was accepted. | Org-scoped storage lookup is in `lib/services/documents.ts`; the completion handler returns the existing public DTO with 200 for the same property and rejects cross-property reuse. | Completion suite 18 passed; DB positive control proves own-org lookup finds the document and another org cannot find it. |
| B2.5 / shared B3.4 insert root | `red-db.log`: ORG-B successfully created a document on ORG-A's property (1 failed, 13 passed). `red-unit.log`: the one-shot action presigned/uploaded despite no owned property. | `scopedInsert` checks any property reference against the FINAL destination org after overrides. The one-shot upload action checks its property before issuing a ticket or posting bytes. | DB suite 15 passed, including own-property creation; document action suite 7 passed. |
| B2.9 fetch branch | `red-unit.log`: a 404 response reached summary/translation generation or document scan. | Check response.ok once in the shared fetch path before any of the three model branches. | Summarize route suite 7 passed, including all three failed-fetch modes, no model/scan call, and correct summary-only failed status. |

The red unit run has **8 failed, 20 passed** across three files: four completion cases, one action case and three AI modes fail for the intended behavior. The final focused run has **37 passed** across four files (`green-unit.log`, `focused-counts.json`). Additional schema-boundary and storage-error controls are included in that final run.

## Reproduction commands

From the wave-3 worktree, using existing installed development dependencies:

```sh
npx vitest run lib/api/v1/documents.write.route.test.ts 'app/api/documents/[id]/summarize/route.test.ts' app/actions/documents.test.ts
npx vitest run --config vitest.config.db.ts tests/authz/org-scoping-idor.db.test.ts
npx vitest run lib/api/v1/documents.write.route.test.ts 'app/api/documents/[id]/summarize/route.test.ts' app/actions/documents.test.ts lib/services/storage-stat.test.ts --reporter=verbose
npx vitest run
npm run typecheck
npm run api:generate-ts
npm run api:check-ts
DEMO_MODE=true PLAYWRIGHT_AUTH= PLAYWRIGHT_HTML_OPEN=never CLERK_SECRET_KEY=demo-no-clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npx playwright test --config playwright.r628.local.config.ts
```

To reconstruct the temporary local config, copy `../r628-wave1/playwright-config.txt` to `playwright.r628.local.config.ts` at the worktree root. It starts this candidate's own demo server on port 3068 with reuse disabled. Live DB tests use the confirmed dev branch and a disposable second org; no seed reset, migration, or real Clerk org creation is performed. Throwaway documents/properties and the second mirror org are cleaned up.

## Full gates

- **Vitest: 1,053 passed, 111 files** (`vitest-full.log`).
- **DB: 15 passed** (`green-db.log`).
- **Focused: 37 passed** (`green-unit.log`).
- **Typecheck: passed** (`typecheck.log`).
- **Generated API types: match the spec** (`api-types.log`).
- Graph refreshed (`graphify.log`).
- Full DEMO: **30 passed, 4 failed, 36 skipped, 8 did not run** (78 collected, 4.5 minutes; `playwright-demo.log`, `playwright-summary.json`). G2 and deterministic G2b both pass; the wave-2 fix is retained.

## Shared-root blast radius

`scopedInsert` is used by 27 service modules: documents, folders, leases, payments, expenses, ownership documents/records/history, co-owners, land parcels, valuations, tenants, inspections, safety risks, emergency contacts, certifications, maintenance, estate assignments/activity, successors, professionals, notifications/preferences, AI sessions/messages, activity, and property drafts. The added lookup runs only when a propertyId string is present; unrelated entity inserts retain their behavior. Destination-org overrides are applied before checking, so a manager's authorized target-org insert validates against the portfolio org rather than their active home org. Both a real cross-org denial and own-org success are exercised against the DB.

`statObject` is used only by the v1 completion handler in this round. Direct presign, file resolution, legacy `_storage/` handling, photo/gallery sharing and deletion are unchanged. One-shot `uploadDocument` now refuses a missing/foreign property before any storage work; its real service insert is also defended by the shared root.

The fetch response check is before the summary, translation and suggest branches. Only a failed summary flips ai_status to failed; failed translation/suggestion keep their existing independent state behavior.

## API and iOS consumers

`docs/api-spec/valgate-api-v1.yaml` documents a 200 response carrying the same DocumentListItemDtoV1 for an already completed upload, alongside 201 for creation. It also documents actual S3 metadata validation. Generated TypeScript is refreshed and checked. Request/DTO fields do not change.

Read-only consumer inspection found iOS `Sources/ValgateiOS/Networking/APIRequestFactory.swift` (documentUploadComplete route), `Models/DocumentDto.swift` (DocumentCompleteRequest), and `Networking/APIClient.swift:291` (upload followed by completion). APIClient's shared decoder accepts `200..<300` at line 525, so both completion statuses use the existing decoder. No iOS files are changed.

## Deliberate scout limits

B2.3 implements the specified existing-row lookup for completed serial/lost-response retries. It does **not** add a unique index or claim atomic protection for simultaneous first completions; the scout defers that until photo-key sharing is settled. Existing duplicate rows are not migrated in this round.

B2.9 implements the failed-fetch guard. The generating-state lock remains deferred as the scout specifies: without a start timestamp/timeout policy it could permanently block a retry after a timed-out model call. No state-machine extension was improvised.

## Browser baseline classification

The four known reds were reproduced/classified in wave 1 against the exact base `b54589e6f1f273eca5151e3f5bbf4ee524617556` using `.worktrees/r628-baseline`: C0 and D1 expect the retired wizard, while E1 and B8-B10 reproduce photo upload / S3 HeadObject failures on untouched main. Relevant evidence: `../r628-wave1/playwright-baseline.log`, `../r628-wave1/verification-map.md` and `../r628-wave1/g2-followup.md`. Wave 2 removed the separate initialization race and its ten-run sample is preserved. Actual wave-3 failures will be compared to these identities, and any new failure requires its own baseline check.

No dependencies, schema migrations, deployment, or push are added. Cross-family merge review remains coordinator-owned.

The final wave-3 browser reds are exactly C0, D1, E1 and B8-B10. They match the recorded untouched-main failures in wave-1 baseline evidence. There is no new failure identity requiring an additional baseline run. The retired specs/page have no diff against the base; the photo and S3 errors match the baseline upload / HeadObject failures. Full DEMO remains red; no expected test was skipped or weakened by this round. No substitutions were made.
