# Error Log

Incidents and their fixes — one ledger for both. Newest at the bottom. Each
entry: **symptom → root cause → fix → prevention**. This is the "we've seen this
before" memory; recurring traps get promoted to [[gotchas]].

Entry format:
`## [YYYY-MM-DD] <short title>`

---

## [2026-07-14] Prod migration-drift outage — every authed page 500'd
- **Symptom:** every authenticated page returned 500 (SSR) in production.
- **Root cause:** deploys don't auto-run `db:migrate`; prod fell one migration
  behind (`0024 cover_storage_id`), so queries hit a missing column.
- **Fix:** ran `drizzle-kit migrate` against the prod `DATABASE_URL`.
- **Prevention:** [[gotchas]] — always run migrations against prod after a schema
  change; you can repro prod SSR 500s locally.

## [2026-07-xx] Migration 0020 silently skipped
- **Symptom:** "Failed query" — a column that should exist was missing on dev.
- **Root cause:** hand-authored migration `0019` had a `when` timestamp larger
  than `0020`'s, so drizzle silently skipped `0020`.
- **Fix:** corrected the `when` ordering; verified live schema via the Neon MCP.
- **Prevention:** [[gotchas]] — keep migration `when` timestamps monotonic.

## [2026-07-15] OpenWiki manual run failed — 401 from OpenRouter
- **Symptom:** `openwiki code --update` exited with
  `401 {"error":{"message":"User not found"}}` from openrouter.ai; no pages regenerated.
- **Root cause:** `OPENROUTER_API_KEY` is not set in the local shell, so OpenWiki
  sent an invalid/empty bearer token.
- **Fix:** OpenWiki is meant to run in **CI** (`.github/workflows/openwiki-update.yml`,
  daily 08:00 UTC) where the key is a GitHub secret. For a local run,
  `export OPENROUTER_API_KEY=<valid key from openrouter.ai>` first.
- **Prevention:** documented in `CLAUDE.md` (OpenWiki freshness = CI + optional
  local run needing the key). The old key returns "User not found" — it's
  revoked/wrong account, so rotate if running locally.

## [2026-07-15] Co-owner data loss on Ownership wizard save (COOWN-0001/0002 wiped)
- **Symptom:** saving the Ownership wizard while the Co-owners step showed "Skipped"
  deleted every existing co-owner; Property Progress dropped 98%→93%.
- **Root cause:** `OwnershipUnlock.tsx` `onSubmitData` re-derived destructive intent from
  form state: `holdingType === "Sole Ownership"` triggered a delete-all reconcile — but
  that is the *same condition* that hides the Co-owners step, so the user never saw the
  list being wiped. Secondary path: the non-sole reconcile treats an empty co-owner list
  as "delete all" instead of "no change".
- **Fix:** skipped step = no reconcile (no create/update/delete); empty-list guard on the
  removal loop. Guarded by two regression tests
  (`components/feature-unlock/pillars/OwnershipUnlock.test.ts`,
  `tests/ownership-wizard-coowner-skip.test.ts`) — first fixed by hand, then re-fixed
  end-to-end by the agent-loop bug-fix pipeline as its proving run.
- **Prevention:** [[gotchas]] — never derive deletion intent from a form section the user
  did not visit; wizard saves must distinguish "user emptied the list" from "step skipped".

<!-- Add new incidents below. Also append a line to log.md. -->

## [2026-07-15] Mapbox WebGL failure crashed the portfolio dashboard
- **Symptom:** in a browser without WebGL, `/` was replaced by the Next.js error overlay
  with `Failed to initialize WebGL`; the property-detail map had the same risk.
- **Root cause:** both map components constructed `mapboxgl.Map` without checking browser
  support or handling a graphics-context constructor failure.
- **Fix:** both components now use a tested guarded constructor and render an accessible
  “Map preview unavailable” status while letting the surrounding page finish loading.
- **Prevention:** `components/map/map-support.test.ts` covers unsupported WebGL,
  constructor failure, and the success path.

## [2026-07-15] Add Property import choices emitted duplicate React keys
- **Symptom:** opening Get Started emitted four duplicate-key console errors for
  `/add-property/import`.
- **Root cause:** three different choices share one destination, and that destination was
  also used as their sibling identity.
- **Fix:** the buttons use their unique labels as keys; their routes are unchanged.
- **Prevention:** list keys must identify the rendered entity, not a field that is allowed
  to repeat such as a shared destination.

## [2026-07-16] Bug-fix Eval ignored structured lint and rubric identity
- **Symptom:** a 99/100 Eval with a new ESLint warning, or with a changed rubric fingerprint,
  could still make the bug-fix workflow return success.
- **Root cause:** lint and rubric identity appeared in agent instructions but not in the structured
  verdict or deterministic exit predicate.
- **Fix:** the workflow now requires and enforces both values; fingerprint drift stops for human
  approval. Run `2026-07-16-144138` scored 100/100 under independent Eval.
- **Prevention:** critical agent evidence must cross the structured boundary and be exercised by a
  false-success regression case.

## [2026-07-16] Save as Draft could revert its own navigation (add-property)
- **Symptom:** clicking "Save as Draft" mid-wizard sometimes stayed on the wizard instead of
  landing on /portfolio; the e2e C3 spec failed deterministically (URL pinned at
  `/add-property?step=1`). Under real use the draft could also silently fail to save.
- **Root cause:** `handleSaveAsDraft` called `router.push("/portfolio")` before the debounced
  draft-create had resolved. When the create finished, `activeId` swapped to a `DRFT-` id and the
  draftId-stamp effect ran `router.replace("/add-property?…")` (hardcoded to the wizard route),
  reverting the navigation; the un-awaited debounced write could also drop on unmount.
- **Fix:** added an awaitable `saveNow()` to `useDrafts` (resolves the temp id to its server
  `DRFT-` id and awaits the write); `handleSaveAsDraft` now awaits it before navigating, so the
  draft is persisted and the URL is already stamped (the effect no longer fires post-nav). Added a
  `window.location.pathname !== "/add-property"` guard to the stamp effect as a backstop. Surfaced
  and fixed by e2e-regression run `2026-07-16-173324`; full suite green ×2.
- **Prevention:** a "save then leave" action must await the persist before navigating; a URL-sync
  effect that writes an absolute route must guard on the current pathname so a late async update
  can't yank the user back after they navigated away.
