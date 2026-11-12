# r628 wave 5: B2.11, B2.8, B2.10, B3.11, B3.4 test

Base: `e5acf9e` (waves 1-4). Branch `test/r628-webapp-bugs-wave1`. Maker: claude/opus-5-5.

| Bug | Red (before fix) | Root fix | Green |
|---|---|---|---|
| B2.11 (P2) | `red-e2e-f6.log`: after Cancel on the queued row, `f6-second.pdf` count was 1 after reload (it uploaded anyway) | `PropertyDocumentsPage.tsx`: Cancel deletes the item's `uploadFilesRef` entry, and the batch loop skips ids with no entry, so there is no upload and no summarize/suggest POSTs. Cancel is shown for `queued` only, because an in-flight server action cannot be aborted. | `green-e2e-documents.log`: F1-F6 6 passed |
| B2.8 (P2, dormant) | `red-db.log`: both variants left 2 `documents` rows after the conversion rejected (file 2 `sizeBytes:-1`: the row inserts, then `DocumentSchema.parse` throws) | `convertDraftToDocuments` and `...ForOrg`: the photo merge, every document insert and `deleteDraftRowsOnly` run in one `db.transaction`. Added an optional `exec: DbExec` (db or tx) to `scopedInsert`, `scopedUpdate`, `createDocument(ForOrg)`, `updateProperty(ForOrg)` and `deleteDraftRowsOnly`. The default is `db`, so other callers are unchanged. | `green-db.log`: 0 docs, merged photo key not on the property, draft keeps its 2 files for retry |
| B2.10 (P3) | `red-unit-b210.log`: `deleteStorageObject` called 500 times for 501 docs | `deleteProperty` drops `listDocuments` (`.limit(500)`) for an unbounded org+property select of `storageId, thumbStorageId` | `properties.delete.test.ts` 501 calls |
| B3.11 (P2 latent) | `red-db.log`: `createPropertyDraft(ctxA, …, foreignOrg)` resolved `DRFT-0083` in a real org A doesn't belong to | `createPropertyDraft`: `if (targetOrgId && targetOrgId !== ctx.orgId) await assertOrgAdmin(ctx, targetOrgId)` | `green-db.log`: rejects with no row written; control: `targetOrgId === ctx.orgId` still creates |
| B3.4 test (owed from wave 3) | n/a: a regression guard; the fix landed in wave 3 (`scopedInsert` property check) | none | `org-scoping-idor.db.test.ts` "ORG-B cannot create a lease on an ORG-A property": rejects `forbidden`, and no `leases` row exists for (propId, ORG-B) |

## Siblings covered
- B2.11: `:832-839` loop (skip), `:747` silent `setItem` (unreachable now: a cancelled id never starts), `:789-797` paid calls (never fire for a cancelled id).
- B2.8: the cross-org variant (tested), and the photo-key merge at `:282/:329`, now inside the tx. `add-property/actions.ts:77` "files are safe" is now true (the draft survives intact), so it was not changed.
- B2.10: v1 DELETE, MCP `delete_property`, the shell action and the change-request dispatcher all call `deleteProperty`, so they are covered.
- B3.11: `listPropertyDrafts` / `updatePropertyDraft` stay `userId`-scoped and can only reach the caller's own rows. Now that no foreign-org row can be created, there is nothing for them to reach. `createDocumentForOrg` already calls `assertOrgAdmin` (checked).

## Gates (serial, nothing else running)
- DB: `green-db.log` **2 files, 26 passed** (drafts + IDOR, dev Neon).
- Full vitest: `vitest-full.log` **114 files, 1063 passed** (wave 4: 113 / 1062, plus 1 new file).
- Typecheck: `typecheck.log` tsc exit 0. Lint on the changed files: `lint.log` exit 0.
- DEMO playwright: `playwright-demo.log`, `playwright-summary.json`. **31 passed, 4 failed, 36 skipped, 8 did not run**: wave 4 plus F6. All 4 reds keep their baseline identity. B8-B10 (property delete, the path I changed) fails at the same `verify.ts:51` HeadObject line as wave 4. E1 is PropertyPhotoManager, which was not touched. 0 new failures.
- graphify: `graphify.log` exit 0.

## Deviations and deferrals
- **B2.11 red is Playwright (the scout's spec), run in the DEMO gate.** The first upload is held by intercepting the server-action POST. The test waits for the batch-end `router.refresh()` RSC request before reloading, so on baseline the second upload has finished.
- **B2.8: `nextId` and `assertOrgAdmin` stay on the global `db`.** A rolled-back tx burns ids (harmless), and they only read or touch `id_counters`, so no lock contention with the tx.
- **Deferred:** the org-wide 500 read caps (`queries.ts:77`, `progress-context.ts:49`, `portfolio-snapshot.ts:85`, `ai-context.ts:229`, `mcp-server/context.ts:251`). They are display/read caps, not leaks. `deleteProperty` still doesn't read `coverStorageId` (left as is, not verified). `getPropertyDraft` / `stageDraftFile` cannot reach a draft created under a legit `targetOrgId` (scout's separate bug, not fixed).
