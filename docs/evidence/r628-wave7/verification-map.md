# r628 wave 7: review hardening O8, O9, O10

Base: `aec6db9` (waves 1-6). Branch `test/r628-webapp-bugs-wave1`. Maker: claude/opus-5-5.
Source: the W6 review observations in `docs/evidence/agent-ops/2026-11-11/r628-wave-backlog.md` (coordinator repo).

| Item | Red (before fix) | Root fix | Green |
|---|---|---|---|
| O8 ForOrg row lock before the admin check | `red-unit.log` (`property-drafts.forg-order.test.ts`): the caller owns their own org but has no membership in the target org. Recorded tx reads were `[properties, organizationMemberships]`, so `FOR UPDATE` on the foreign property ran before the rejection. **The lock itself is race-class:** proving that a non-admin blocks another writer needs `pg_locks`/timing on live Neon, so no deterministic DB red was written. The test is structural instead: it checks the order of the tx statements. | `property-drafts.ts` `convertDraftToDocumentsForOrg`: `await assertOrgAdmin(ctx, targetOrgId, tx)` is now the first statement in the tx, on the tx connection (O5 holds). The inner `createDocumentForOrg`/`updatePropertyForOrg` checks stay, so authz stays in every service. | `green-unit.log`: tx reads are `[organizationMemberships]` only, and the call rejects with `MutationDeniedError`. `green-db.log`: B2.8 for-org, O6 for-org and `manager-act-on-behalf` (an admin still converts). |
| O9 duplicate key in one DeleteObjects | `red-unit.log` (`storage-delete.test.ts`): `[p, f, p]` was sent as 3 keys in one batch | `storage.ts` `deleteStorageObjects`: `[...new Set(storageIds)]` before the legacy filter and chunking. This covers every caller, so `properties.ts` is unchanged (dedupe at the sink, not at each source). | `green-unit.log`: 1 send with `[p, f]`. `properties.delete.test.ts` still passes (501 keys, 1 call). |
| O10 parse-after-commit in scopedInsert | `red-unit.log` (`documents.create-validate.test.ts`): `createDocument` and `createDocumentForOrg` with `sizeBytes: -1` (the wave-5 trick) **called insert**, then threw from `rowToDocument` → `DocumentSchema.parse`. On a real DB that row is committed (wave-5 `red-db.log`). | `documents.ts`: new `assertValidNewDocument(input)` runs `NewDocumentSchema.parse` on the input **before** `scopedInsert`, so no id is minted and no row is written. Nulls are dropped first because the read side maps null to absent; documents' required columns have no DB defaults, so a pre-parse accepts exactly what the post-insert parse accepted. Both create paths call it. | `green-unit.log`: both reject with insert never called. A valid input with `mimeType: null` still inserts. `green-db.log`: B2.8 both variants (`sizeBytes:-1` now throws before file 2's insert, and the tx still leaves 0 docs). `app/actions/documents.test.ts`, `documents.write.route.test.ts`, `storage-ownership.test.ts` and `property-boundary.orphan.test.ts` pass. |

## Deviations
- **O10 is fixed in `documents.ts`, not generically in `_crud.ts`.** `scopedInsert`'s `rowTo` needs the full DB row, so a generic dry-run cannot be done before the insert. The schema is only known in the entity service. The other option was to wrap every `scopedInsert` in a tx so that a `rowTo` throw rolls back. That would change every caller's connection and round-trip profile. `_crud.ts` is unchanged.
- **`stageDraftFile` needed no change.** `rowToDraftFile` only casts, with no parse, so nothing can throw after its insert. Its action's post-insert throws are already covered by O2 (`storedId = undefined` after the insert).
- **O9: only `storage.ts` changed.** Deduping inside `deleteStorageObjects` covers `deleteProperty` and any future caller. A second dedupe in `properties.ts` would be redundant.

## Gates (serial)
- Focused unit: `green-unit.log`: **8 files, 47 passed**. These are the 3 red files plus `properties.delete`, `app/actions/documents`, `documents.write.route`, `storage-ownership` and `property-boundary.orphan`.
- Focused DB: `green-db.log`: **4 files, 33 passed**: `property-drafts.db` (B2.8/B3.11), `property-drafts.toctou.db` (O6), `org-scoping-idor`, `manager-act-on-behalf` (dev Neon).
- Full vitest: `vitest-full.log`: **117 files, 1073 passed**. Wave 6 was 115 / 1068. This wave adds 2 files and 5 tests: O10 ×3, O8 ×1, O9 ×1.
- Typecheck: `typecheck.log`, tsc exit 0. Lint on the 6 changed files: `lint.log`, exit 0.
- DEMO playwright: `playwright-demo.log`, `playwright-summary.json`. **31 passed, 4 failed, 36 skipped, 8 did not run** (79 collected, 4.5 m), the same tally as wave 6. All 4 failures match wave 6: the same tests, error messages and stack lines (C0 `add-property.spec.ts:75/78`, D1 Step-4 walk timeout, E1 `photos.spec.ts:60/73`, B8-B10 `assertS3ObjectGone` at `verify.ts:51`). B8-B10 runs the changed `deleteStorageObjects` and fails at the same HeadObject line. **0 new failures.** The temp config `playwright.r628.local.config.ts` was removed after the run.
- graphify: `graphify.log`, exit 0.

## Siblings and deferrals (not fixed)
- O10 sibling: every other `scopedInsert` caller whose `rowTo` parses (tenants, folders, etc.) still parses after the commit. None of them deletes bytes on failure, so a throw there gives a 500 with a committed row, not data loss. Each would get the same pre-parse if needed.
- O8: the single-org `convertDraftToDocuments` has no cross-org lock exposure (it locks its own org's row). It is unchanged.
- O9: there is still no real-S3 proof (the B8-B10 HeadObject baseline red is unchanged).
- Untouched as briefed: the staging-webhook gap, B6.2, read caps, `coverStorageId` in `deleteProperty`, the spinner-hang follow-up.
