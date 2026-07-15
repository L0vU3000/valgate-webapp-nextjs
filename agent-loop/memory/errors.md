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
