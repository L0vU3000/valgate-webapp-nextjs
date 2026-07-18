# Errors & Lessons — agent-loop system

> What broke, why, and how we stop it recurring. Newest first.
> Format: `## [YYYY-MM-DD] <symptom>` → **Symptom / Cause / Fix / Prevention**.
>
> This is the highest-value file for self-improvement: a recurring error here should
> become a line in the offending pipeline's prompt (or `CLAUDE.md`) so the fix
> propagates to every future run — not just this one.

<!--
Template:

## [2026-07-15] Pipeline marked "done" but tsc regressed
- **Symptom:** eval passed on eslint count but `tsc` had gone from 0 → 3 errors.
- **Cause:** eval only checked the lint count, not the "did I break anything" gates.
- **Fix:** added `tsc` + `vitest` to the eval stage's pass condition.
- **Prevention:** every code pipeline's eval must assert *no regression* on all
  pre-existing green signals, not just its own target metric.
-->

## [2026-07-19] First supervised e2e-regression run surfaced two machinery gaps + one incomplete diagnosis
- **Context:** first human-at-the-gates end-to-end run (run `2026-07-19-005931`, de-flake feature-unlock
  wizard). Verdict FAIL 76/100 vs 85, 1 critical (skip-drift). The *loop worked* — the independent
  verifier refused to pass a run where the fix was incomplete and a known drift recurred — but three
  distinct things are worth carrying forward.
- **Gap 1 — `if (triage.suiteGreen)` short-circuits a de-flake ticket.** `workflow.js` routes a
  suite that reports green into the verification-only path. For a de-flake ticket the suite is green
  ONLY because the target tests are still `test.skip`-quarantined, so the automated flow would record
  a "pass" **without ever applying the fix or un-skipping**. Run by hand this time so it was caught;
  the automated explore stage must un-skip the ticketed tests before measuring `suiteGreen`, or the
  workflow must treat "green with the ticket's own quarantines intact" as not-done.
- **Gap 2 — `--record` from the worktree does not reach the live branch.** Recording inside the
  pipeline's worktree (per the operator protocol, so the doorway runs tsc/check-machinery in that
  tree) leaves the inbox move + dispatch-log line on a throwaway branch; the **live tree still shows
  the item queued** and the next tick would re-route it. Fix used: re-record in the live tree so the
  bookkeeping is durable. The automated flow needs an explicit worktree→live propagation of the
  record (or record against the live tree while gating in the worktree).
- **Diagnosis miss (product signal, not machinery):** the ticket's "cold-compile race" root cause was
  incomplete. Warming fired in both eval runs, yet G1 hit a hard 30s timeout and G2 hit a **real
  in-app "Couldn't save your changes" validation error** — a likely product bug, not a timing flake.
  Filed as `2026-07-19-coowner-wizard-save-failure.md` (bug). D5 (Rental) drifted skip→pass again
  (the 2026-07-18 precedent); filed as `2026-07-19-deflake-rental-tab-d5.md` (e2e).
- **Prevention:** a "verification-only pass" is never valid while the ticket's own quarantines are
  still in place; record durably against the live branch; and an eval fail with a real in-app error
  spawns a scoped follow-up rather than a blind return-to-plan against a locked rubric it can't satisfy.

## [2026-07-18] e2e-regression Eval failed a "zero-diff verification-only" run on disposition drift
- **Symptom:** run `2026-07-18-194309`'s Plan/Execute claimed nothing needed fixing (Explore's
  single run was `25 passed · 18 skipped · 0 failed`, execute made zero diffs). Eval's own two
  independent fresh runs were both green (`26 passed · 17 skipped`, `unexpected:0, flaky:0`
  both times, byte-identical to each other) but disagreed with Explore's skip count: 18 → 17.
- **Cause:** `e2e/property-tabs.spec.ts` `D5` ("Rental — edit → save") is a *dynamic, in-test*
  `test.skip(true, 'Rental tab has no edit mode or is not yet wired')`, gated on an 8s
  visibility wait for an Edit button — not a static `test.skip('name', fn)` declaration and not
  a genuine cross-spec ordering guard. Explore's disposition table lumped it in with the 13
  "ordering guard" skips (specs needing state left behind by an earlier spec in the same serial
  session) without distinguishing that a *timing-dependent* in-test skip can flip outcome
  run-to-run for reasons unrelated to spec ordering. Explore also mis-labeled two adjacent
  entries (`D3`, `D6`) as ordering guards when they are actually permanent, unconditional
  `test.skip('name', fn)` declarations (`// unbuilt at audit time`) — those didn't drift, but
  the mislabeling shows the disposition table's category boundaries weren't verified against
  the actual spec source.
- **Fix:** none applied — Eval does not fix, it returns to Plan. The locked rubric's C2
  ("skip count drift ... → 0 pts AND critical failure") caught this correctly; score 80/100
  against a 90 threshold, 1 critical failure, `next: return-to-plan`.
- **Prevention:** a "verification-only, zero-diff" Explore/Plan pass is not a rubber stamp —
  Eval must always re-derive the disposition table from its *own* fresh runs (never trust a
  single upstream run's skip classification at face value), and future Explore stages should
  split "skip" into three distinct categories when building a disposition table: (a) static/
  permanent `test.skip('name', fn)`, (b) dynamic in-test `test.skip(cond, reason)` gated on
  runtime UI state (timing-sensitive, prone to silent drift), and (c) genuine cross-spec
  ordering guards (depend on state left by an earlier spec in the same serial session). Only
  category (b) is the drift-prone one this run exposed.

## [2026-07-16] entity-scaffold nearly scaffolded a duplicate of a live entity
- **Symptom:** a `valuations` entity ticket — approved to "fill the Valuation Progress pillar,
  which has no backing table" — reached Explore before it surfaced that the pillar is already
  backed by a live `property_valuations` entity (`lib/db/schema/property.ts`,
  `lib/services/property-valuations.ts`, `app/actions/property-valuations.ts`,
  `PropertyValuationPage.tsx`, and the `progress.ts` "Valuation on file / 6+ months" derivation).
- **Cause:** the entity was chosen by inferring a missing table from the absence of a dedicated
  `valuation.ts` schema file. Valuations live inside `property.ts`, not a same-named file, so the
  filename heuristic was wrong; the premise "no backing table" was false.
- **Fix:** Explore's sibling-pattern + `graphify` scan flagged the existing `property-valuation`
  files. The run was aborted before Plan; the stray `lib/services/valuations.db.test.ts` and the
  invalid ticket were removed. No duplicate schema, migration, or service was created.
- **Prevention:** entity-scaffold's scope gate must confirm the concept does not already exist
  anywhere across `lib/db/schema/*`, `lib/services/*`, `app/actions/*`, and the derivations — not
  merely that a same-named table is absent. Never infer a product gap from a missing filename; only
  an owner-approved, verified-new entity clears the gate. The gate worked here — it refused a
  forced green.

## [2026-07-16] Bug-fix Eval could pass evidence that existed only in prose
- **Symptom:** the runtime harness supplied a 99/100 Eval with a new ESLint warning, or an Eval
  fingerprint different from Plan's lock, and `bug-fix/workflow.js` still returned `fixed: true`.
- **Cause:** the Eval prompt mentioned lint and the locked rubric, but `VERDICT` did not return
  `noNewEslintWarnings` or `rubricSha256`; the deterministic exit predicate therefore had no facts
  to enforce.
- **Fix:** both values are now required structured fields. The exit predicate requires clean lint,
  and an Eval-observed fingerprint or threshold change stops for human approval. Run
  `2026-07-16-144138` reproduced the two failures and independently scored the correction 100/100.
- **Prevention:** every critical check named in an Eval prompt must appear in the structured result,
  participate in the runtime exit decision, and have a deterministic false-success regression case.

## [2026-07-16] entity-scaffold could not re-verify after a clean apply + non-code eval fail
- **Symptom:** run `2026-07-16-111415` applied migration 0025 cleanly in attempt 1 (Phase B marked
  `migration-status: applied`, live test 16/16) but eval failed on the pre-existing `db:check`
  gate. After correcting that gate, re-running Invocation 3 stopped at the migration-checkpoint
  with `prepared=false`: the checkpoint required `execute.md` to say `awaiting-approval`, but it now
  said `applied`. The run was stuck — it could neither re-grade the already-correct artifact nor
  advance.
- **Cause:** the checkpoint precondition assumed the only reason to enter Apply-and-verify is a
  never-yet-applied migration. It did not model "migration already applied at the approved digest,
  eval failed for a reason unrelated to the SQL (a gate bug, a flaky global check)." The workflow's
  intended recovery path (replan → Execute regenerates) assumes the fix is a *code* change; a
  pipeline-definition fix leaves the applied artifact already correct with nothing to regenerate.
- **Fix:** the migration-checkpoint now accepts a matching-digest migration that is *either*
  awaiting-approval *or* already applied (digest must still equal the approved one), and Execute
  Phase B treats an idempotent "already applied" `db:migrate` result as success. A digest mismatch
  still fails closed.
- **Prevention:** a checkpoint that guards "safe to proceed" should key on the invariant that makes
  it safe (the approved artifact is present and unchanged — proven by digest), not on a transient
  status label that a prior successful attempt legitimately advances past.

## [2026-07-16] entity-scaffold eval failed the whole run on a pre-existing `db:check` collision
- **Symptom:** run `2026-07-16-111415` (utility-accounts scaffold), attempt 1, verdict `fail`.
  Every other check was green — contract red→green and unchanged, complete layers with a
  verified IDOR guard (`assertPropertyInOrg`), migration `0025` read in full and confirmed
  additive/idempotent/non-destructive, isolation pass, live-DB CRUD 16/16 with clean teardown,
  suite 195/195, tsc 0, eslint 55→55 (all matching the Explore baseline). The sole failing gate
  was the literal `npm run db:check` command. Result: no functional defect found, but the run
  was bounced back to Plan.
- **Cause (proven):** `db:check` (`drizzle-kit check`) aborts on a pre-existing snapshot-pointer
  collision — `[drizzle/meta/0008_snapshot.json, drizzle/meta/0011_snapshot.json] are pointing
  to a parent snapshot ... which is a collision` — reproduced live here, unchanged. It fails at
  the 0008/0011 pointers *before it ever reads 0025's content*, so it gives no signal, positive
  or negative, about the new migration. This is a known, already-accepted repo condition: the
  headers of already-shipped `0023_clients_contact_fields.sql` and `0024_property_cover_storage_id.sql`
  both say "Hand-authored because drizzle-kit generate is blocked by a pre-existing 0008/0011
  snapshot collision," and `vault/decisions/drizzle-only-hand-authored-migrations.md` records
  hand-authored SQL as a standing decision (drizzle-kit is unreliable here). eval.md's rule that
  a pass requires every structured boolean to be true turned this tool-level, unrelated
  limitation into a full `fail`.
- **Fix:** none applied to product code — the migration is safe on manual inspection; per the
  pipeline contract the verifier correctly refused to relax the gate and returned to Plan. The
  corrective belongs in the pipeline definition, not this run's diff (see Prevention).
- **Prevention:** the entity-scaffold migration gate must not depend on a whole-repo
  `drizzle-kit check`, which is known-broken here and can never pass regardless of the new
  migration's quality. Either (a) drop `db:check` from eval's required-boolean checklist and rely
  on the manual additive/non-destructive inspection that eval already performs (grep for
  `drop|truncate|rename` + full read of the new `.sql`), or (b) fix the underlying 0008/0011
  snapshot collision once so `db:check` becomes a real signal again. Until then, a green
  scaffold should not be bounced to Plan solely on this command.

## [2026-07-16] entity-scaffold workflow.js threw at load: Date.now() banned by the runtime
- **Symptom:** the first real `entity-scaffold` invocation failed instantly with 0 agents run —
  `Error: Date.now() / new Date() are unavailable in workflow scripts (breaks resume)`. The
  pipeline could not start at all.
- **Cause:** `workflow.js` measured a 75-minute wall-clock window with `const STARTED_AT =
  Date.now()` at module load and `Date.now() - STARTED_AT` in `budgetAvailable()`. The built-in
  Workflow runtime forbids `Date.now()`/`new Date()` because a non-deterministic clock breaks
  resume. The machinery self-check `node --check`s the wrapped script, which catches syntax but
  not this runtime API restriction, so the bug survived to first run.
- **Fix:** removed the wall-clock window (unimplementable — the runtime exposes no clock) and kept
  the agent-call cap, which `pipeline.md` already names the enforceable local proxy. Wired the
  declared 60k token ceiling to the runtime's real `budget.spent()` so the previously-unenforced
  ceiling now bites when a token target is set.
- **Prevention:** workflow scripts must not call `Date.now()`/`new Date()`/`Math.random()`; use
  the runtime's `budget` for metering and pass any needed timestamp via `args`. The machinery
  self-check should grep every `workflow.js` for these banned globals, since `node --check` won't.

## [2026-07-16] e2e-regression maker: three fix attempts that first failed
Run `2026-07-16-030754`. Each was caught by the maker's own focused rerun before eval, but
they cost cycles and are worth not repeating:
- **`animation-duration: 0s` made Playwright "not stable" WORSE, not better.** To stabilize a
  fixed overlay for clicking I first zeroed animation *duration*. Tailwind's `animate-ping` is
  `infinite`; duration 0 makes an infinite animation cycle every frame → constant repaint →
  the fixed bulk bar stays perpetually unstable. Fix: `animation: none !important` (full
  removal), never `animation-duration: 0s`, when killing motion for e2e.
- **Asserting on a transient URL flaked (C3).** "Save as Draft" briefly stamps
  `?draftId=DRFT-*` then redirects to `/portfolio`; asserting either exact URL raced the
  redirect. Lesson: assert the durable outcome (the draft resumes on Step 0), tolerate the
  transient URL with an either/or regex. Also `.first()` — server drafts persist across runs,
  so a bare `getByText(name)` hits strict-mode once several accumulate.
- **Guessed the wrong dialog role (F5).** Assumed `alertdialog`; the folder-delete confirm is
  `role="dialog"` titled `Delete "{name}"?`. Lesson: read the live ARIA snapshot (a throwaway
  probe spec) before rewriting a selector — do not port the old spec's assumed roles/labels.
- **Prevention:** a spec pipeline's execute stage should drive the real flow with a temporary
  probe spec (deleted before eval) to capture the current DOM, rather than statically guessing
  selectors from a large component. Probes here nailed F4/F5/D4/C3 ground truth fast.

## [2026-07-16] Dev-only client tooling leaked into DEMO/e2e (Agentation)
- **Symptom:** e2e P4 ("no console errors") failed on two bare `net::ERR_CONNECTION_REFUSED`;
  its host-based filter could not drop them (Chromium logs them without a URL). The refused
  host was `localhost:4747` — the Agentation annotation daemon.
- **Cause:** `AgentationProvider` gated its mount only on `NODE_ENV !== "development"`. DEMO_MODE
  runs under `next dev` (NODE_ENV=development), so it mounted and probed an absent local daemon
  (its overlay also had "Block page interactions" on, interfering with clicks).
- **Fix:** gate the mount on `process.env.DEMO_MODE !== "true"` too (read server-side in the root
  layout). P4 passed; Agentation no longer in the DOM.
- **Prevention:** dev-only client instrumentation must exclude DEMO/e2e explicitly, not rely on
  NODE_ENV alone; broadening the test's console filter to hide the noise would have masked real
  failures and is forbidden by the pipeline.

## [2026-07-16] Registry drift passed the machinery self-check
- **Symptom:** changing the `eslint-burndown` type in `categories.md` from `lint` to
  `lint-drift-proof` still produced `check-machinery: all good`.
- **Cause:** `check-machinery.sh` checked pipeline anatomy, workflow syntax, shared run IDs,
  model separation, ignored run state, and dashboard parsing, but never compared routing metadata.
- **Fix:** added `check-pipeline-registry.mjs` and a temporary-copy red-to-green regression test,
  then wired both into `check-machinery.sh`.
- **Prevention:** pipeline frontmatter is canonical; `categories.md`, `pipelines/README.md`, and
  the orchestrator registry must contain the same category/type/name triples.

## [2026-07-16] Node regression filename entered the Vitest suite
- **Symptom:** the focused Node check passed, but full Vitest failed after collecting
  `check-pipeline-registry.test.mjs` and reporting that it contained no Vitest suite. All 195
  product assertions still passed.
- **Cause:** Vitest's discovery glob includes `*.test.mjs`, regardless of which test runner the
  file imports.
- **Fix:** renamed the focused harness to `check-pipeline-registry.regression.mjs`; the machinery
  self-check still invokes it explicitly with `node --test`.
- **Prevention:** runner-specific machinery checks use a suffix outside the repository's Vitest
  discovery pattern unless they are written as Vitest suites.

## [2026-07-16] Registry checker initially misread orchestrator link labels
- **Symptom:** the first focused test reported all seven orchestrator entries missing and seven
  extra entries named `pipelines/<name>`.
- **Cause:** the orchestrator link label includes a `pipelines/` prefix while the pipeline README
  link label is the bare pipeline name.
- **Fix:** normalize Markdown link labels to their final path segment before comparison.
- **Prevention:** the regression fixture copies and validates all four real source formats before
  injecting drift, so a parser that misunderstands any current table fails before the red case.

## [2026-07-15] QA pipeline targeted stale ports and routes
- **Symptom:** the authored run tried DEMO mode on port 3002 and defaulted to `/home` and
  `/documents`, producing auth-suite confusion and 404s.
- **Cause:** the pipeline copied older route assumptions instead of the current
  `playwright.config.ts` and App Router tree.
- **Fix:** DEMO QA now uses port 3001 and real routes rooted at `/` plus
  `/property/PROP-0001/*`; port 3002 remains exclusive to the real-Clerk auth project.
- **Prevention:** a browser pipeline's server and route defaults must be derived from the
  repository's current runner config before its first drive.

## [2026-07-15] Turbopack rejected worktree dependencies outside its root
- **Symptom:** `npm run dev:e2e` panicked in the clean QA worktree before the app compiled.
- **Cause:** `node_modules` was a symlink to the parent workspace, outside Turbopack's
  allowed filesystem root.
- **Fix:** installed physical dependencies in the disposable worktree with
  `npm ci --ignore-scripts`.
- **Prevention:** isolated Turbopack worktrees install their own dependencies; the QA
  pipeline now says so explicitly.

## [2026-07-15] Clean QA exploration bypassed independent eval
- **Symptom:** `workflow.js` returned success immediately when explore reported zero
  findings, despite the pipeline's maker/verifier guarantee.
- **Cause:** the early return treated “nothing to fix” as “independently verified.”
- **Fix:** clean runs now spawn a fresh-session eval agent and require flow, console,
  network, suite, and TypeScript signals before returning clean.
- **Prevention:** every terminal success path in a workflow must cross an independent
  verifier, including no-op runs.

## [2026-07-15] Dashboard showed an empty summary for test-coverage
- **Symptom:** the completed test-coverage run rendered as `pass ()` on the dashboard.
- **Cause:** `update-dashboard.sh` only looked for an `eslint:` line, but pipeline verdicts
  expose different primary signals (`coverage:`, `suite:`, or `mutation:`).
- **Fix:** choose the first meaningful summary field and omit parentheses when no summary
  exists.
- **Prevention:** the machinery self-check now round-trips a coverage-style verdict and
  asserts both the verdict and summary appear.

## [2026-07-15] Workflow stage agents fragmented run folders
- **Symptom:** after the automated run, a stray `runs/2026-07-15-03/` held only `plan.md`
  (no execute/eval). The dashboard read it as "🔄 Running" forever.
- **Cause:** the stage prompts say "write to `runs/<run-id>/`" but never pin ONE shared
  run-id, so each agent invented its own. Iteration 2's plan agent made a new folder.
- **Fix:** thread a single `runId` through the whole pipeline — `explore` mints it and
  returns it; `plan`/`execute`/`eval` are told to use exactly that folder.
- **Prevention:** any multi-stage pipeline must pass a shared run-id to every stage. Added
  to workflow.js; fold into `/build-loop`'s template when we author pipeline #2.

## [2026-07-15] Dashboard "running" heuristic misread an abandoned run
- **Symptom:** a partial run with no `eval.md` showed as running indefinitely.
- **Cause:** `update-dashboard.sh` treats "no eval.md" as in-progress — true for a live run,
  but also true for a dead fragment.
- **Fix (now):** the shared-run-id fix means one folder per run, so this stops recurring.
- **Prevention (later):** cross-check against the live workflow task list, or have the
  orchestrator delete/mark abandoned run folders when a workflow exits.

## [2026-07-15] Vitest choked on the first-ever .tsx import (JSX left raw)
- **Symptom:** the new regression test failed at import: "Failed to parse source … contains
  invalid JS syntax … make sure to not set jsx to preserve."
- **Cause:** tsconfig has `jsx: preserve` (Next.js compiles JSX itself) and the vitest suite
  had never imported a component module before. Vite 8 transforms via **oxc**, so the
  legacy `esbuild.jsx` option was a silent no-op — the first fix attempt did nothing.
- **Fix:** `vitest.config.ts` → `oxc: { jsx: { runtime: "automatic" } }`.
- **Prevention:** any pipeline test that imports a `.tsx` module needs this in place (it is
  now); when a Vite option seems ignored, check whether Vite 8/rolldown replaced the
  transformer (esbuild → oxc) before doubling down.

## [2026-07-15] check-machinery false alarms: mktemp + ESM vs Workflow DSL
- **Symptom:** the new self-check flagged every workflow.js as a syntax error.
- **Cause (2):** macOS `mktemp` appends its random suffix AFTER the template (so the `.mjs`
  extension was lost), and `node --check` on raw ESM rejects the Workflow DSL's legal
  top-level `return` (the runtime wraps scripts in an async function).
- **Fix:** temp dir + fixed `workflow.mjs` filename; wrap the script body in
  `async function` (mirroring the runtime) before `node --check`.
- **Prevention:** a checker must mirror the runtime's execution model, or it tests the
  wrong thing. Both are baked into `scripts/check-machinery.sh` now.

## [2026-07-15] `feature` eval's whole-suite check failed on stale `.context/` worktrees
- **Symptom:** run `2026-07-15-213903` (Sole-Ownership confirmed cleanup) had green
  acceptance tests, 0 tsc errors, and 55/55 eslint warnings, but `npx vitest run` reported
  `40 failed | 73 passed (113)` — a hard fail on the whole-suite gate.
- **Cause:** two git-ignored scratch worktrees left over from earlier, unrelated pipeline
  runs (`.context/e2e-worktree-20260715/`, `.context/qa-worktree-20260715/`) each contain a
  full copy of `e2e/**`. `vitest.config.ts`'s `exclude: ["e2e/**", ...]` only matches a
  top-level `e2e/` directory, not the nested `.context/*/e2e/**` paths, so Vitest tried to
  execute Playwright `.spec.ts` files and choked on `test.describe()`/`test.use()` outside a
  Playwright runner. All 553 actual test assertions passed; every one of the 40 "failed"
  entries was a file-load failure in a leftover worktree, none in product code.
- **Fix:** the maker applied prevention (b) in iteration 2 of the same run:
  `vitest.config.ts` now excludes `**/.context/**`. Eval#2 re-ran the gates — suite
  25 files / 187 tests green (exit 0), tsc 0, eslint 55/55 — and ruled pass. (Eval#1's
  "553 tests passed" had itself been inflated by the `.context/` copies duplicating the
  unit suite; the true product suite is 187.)
- **Prevention:** either (a) clean up `.context/*-worktree-*` scratch directories once their
  originating pipeline run finishes, or (b) add `**/.context/**` to `vitest.config.ts`'s
  `exclude` list so leftover worktrees can never pollute the default suite run. Any pipeline
  that spawns a disposable worktree under `.context/` should delete it on exit.
