# Decisions — agent-loop system (ADRs)

> Why the loop is built the way it is. Newest first. One entry per load-bearing choice.
> Format: `## [YYYY-MM-DD] <decision>` → **Context / Choice / Why / Revisit-if**.

## [2026-07-16] entity-scaffold grades the migration's db:check relative to baseline, not absolutely
- **Context:** the first real entity-scaffold run (`utility_accounts`, run `2026-07-16-111415`) was
  fully green — contract red→green, complete layers with a verified IDOR guard, additive migration,
  isolation pass, live CRUD 16/16, suite 195/195, tsc 0, eslint 55→55 — yet eval ruled `fail`. The
  only failing gate was `npm run db:check`, which aborts on a pre-existing 0008/0011 snapshot-pointer
  collision eight migrations upstream of the new one. It never reads the new migration, so its output
  is byte-identical with or without the scaffold: no correct entity work can make it pass.
- **Choice:** grade the migration-safety gate the same relative way ESLint is already graded —
  against the Explore baseline. The migration passes iff (a) manual additive/non-destructive
  inspection passes and (b) `db:check` introduces no *new* collision versus the recorded baseline.
  Encoded in `explore.md` (capture the db:check baseline), `eval.md` check 4 + the `dbCheckPasses`
  boolean, and `pipeline.md` exit condition 4. Repairing the historical 0008/0011 chain is a separate,
  dedicated task — it would rewrite every shipped migration's metadata, the exact unrelated drift
  eval otherwise forbids.
- **Why:** an absolute whole-repo `drizzle-kit check` is a broken gate here (accepted standing
  condition: `vault/decisions/drizzle-only-hand-authored-migrations.md`; 0023/0024 are hand-authored
  for the same reason). Grading it relatively keeps it a real signal — a migration that adds a *new*
  collision still fails — without bouncing a clean scaffold on a tool limitation that predates it.
- **Revisit if:** the 0008/0011 snapshot collision is repaired repo-wide (then restore the absolute
  `db:check` pass), or drizzle-kit's migration flow is adopted (then the snapshot chain must be
  machine-maintained again).

## [2026-07-16] The dispatcher routes and records; the runtime executes
- **Context:** the orchestrator spec wanted a router that reads the inbox, selects a pipeline,
  runs it in a worktree, records the outcome, and refreshes the board. But a pipeline is a
  `workflow.js` executed by the built-in Workflow runtime (a harness capability), and the
  system stays on built-in primitives only — a plain node process cannot launch a Workflow.
- **Choice:** split the loop by what each half is good at. `dispatch.mjs` (deterministic,
  zero-token code) owns the parts that must never spend a model call: read `inbox/*.md`,
  validate category+type against the canonical `pipeline.md` frontmatter registry, order by
  priority, and — via `--record` — move finished items and log outcomes. The Workflow runtime
  owns execution; it runs the emitted `workflow.js` and reports back through `--record`.
- **Why:** it matches the spec's own principle ("the orchestrator routes; it does not do the
  work itself") and IndyDevDan's "code is the unsung hero" — routing/validation/bookkeeping is
  fast, deterministic, and free, so it should be code, not an agent. Reusing
  `validatePipelineRegistry` means the router and the docs registries can never describe
  different systems. Refusing to route on a broken registry fails safe.
- **Revisit if:** a scheduled trigger wires `dispatch.mjs` → Workflow runtime → `--record` into
  one tick (the closing of the loop), or the static table is replaced by the codebase-aware
  factory-router agent. Both are additive on top of this split.

## [2026-07-16] e2e stabilization = disable motion in the fixture, quarantine what stays flaky
- **Context:** the e2e-regression proof (run `2026-07-16-030754`) hit clicks that hung on
  "element is not stable": an infinite `animate-ping` plus mount animations kept fixed overlays
  in perpetual sub-frame motion. Separately, the FeatureUnlockWizard cold lazy-compile beat a
  tight 5s step wait, and the documents bulk-action bar never settled at all (JS relayout).
- **Choice:** add one motion-kill init script to the shared `e2e/fixtures.ts`
  (`animation: none !important; transition: none !important`) — this is environment
  stabilization, not an assertion change, and removes a whole class of stability flakes. For
  instability that motion-disable does NOT fix (wizard cold-compile timing; the bulk-bar
  relayout loop), **quarantine with a reason string + a real de-flake ticket and keep the spec**
  — never `{ force: true }`, `dispatchEvent`, a widened timeout, or an added retry, all of which
  mask a real UI instability and are rejected by the eval's anti-gaming diff.
- **Why:** the blocking suite must mean "the app works". Killing decorative motion is safe and
  removes false failures; masking a genuine relayout/timeout with a forced click would let the
  suite lie. A ticketed quarantine keeps the coverage debt visible and the fix reproducible.
- **Revisit if:** a spec legitimately needs to assert an animated/transitioning state (then
  scope the motion-kill instead of applying it globally), or the relayout/cold-compile root
  causes are fixed and the quarantined specs can be un-skipped.

## [2026-07-16] Pipeline frontmatter is canonical registry metadata
- **Context:** category, routing type, and pipeline name were repeated in pipeline frontmatter,
  `categories.md`, `pipelines/README.md`, and the orchestrator registry with no consistency
  check. A controlled `lint` → `lint-drift-proof` edit still passed `check-machinery.sh`.
- **Choice:** treat each `pipeline.md` frontmatter block as the canonical metadata. A deterministic
  checker compares all three documented registries with every definition, rejects missing,
  duplicate, extra, or mismatched entries, and runs inside the machinery self-check.
- **Why:** the runtime routing key and human-facing documentation now fail together instead of
  silently describing different systems. A temporary-copy regression fixture proves both the
  rejected drifted state and the accepted matching state without changing live files.
- **Revisit if:** registry tables become generated artifacts; keep the frontmatter validation and
  replace projection comparison with generation plus a clean-diff assertion.

## [2026-07-16] Entity scaffolding cannot choose the product model
- **Context:** the scope reduction left the current entity and field catalog under review.
  Automating "add whatever entity seems useful" would turn a coding pipeline into an
  unsupervised product-model designer and could preserve concepts the owner intends to remove.
- **Choice:** `entity-scaffold` accepts only one explicitly approved, ordinary organization-
  scoped property child with a complete field contract. It refuses field-only changes,
  identity/cross-org tables, join tables, self-references, backfills, UI work, and speculative
  entities. Training mode stops after Plan for human approval before the first real build.
- **Why:** this boundary keeps verification objective: contract completeness, additive migration,
  organization isolation, live CRUD, and global gates. Product necessity remains a human decision.
- **Revisit if:** a second entity shape repeats often enough to earn its own proven template, or
  the entity/field review establishes a stable broader domain contract.

## [2026-07-15] Categories organize peer pipelines without nesting them
- **Context:** the system is expected to grow beyond its initial testing and maintenance
  workflows into planning, product-building, review, and delivery pipelines. A flat type
  list does not express the policy differences between those kinds of work.
- **Choice:** every pipeline declares one of six categories: `planning`, `building`,
  `review`, `testing`, `maintenance`, or `delivery`. Categories are metadata; pipeline
  folders stay flat at `pipelines/<name>/`, and every pipeline keeps the shared
  `explore → plan → execute → eval` anatomy.
- **Why:** the orchestrator can apply category-level routing and human gates without
  turning categories into parent workflows or breaking scripts that scan `pipelines/*/`.
  Tests needed to ship a product change stay in that building pipeline's eval; standalone
  testing pipelines remain available for dedicated verification work.
- **Revisit if:** the flat folder layout becomes a navigation bottleneck large enough to
  justify updating every dashboard, ignore, checker, registry, and workflow path together.

## [2026-07-15] QA reuses the repository's e2e browser contract
- **Context:** generic browser sessions loaded Clerk's development overlays even though
  server-side DEMO mode correctly bypasses auth. The existing Playwright fixture already
  defines the project-approved browser setup.
- **Choice:** QA explore and eval reproduce `e2e/fixtures.ts` exactly: block only
  `**clerk.accounts.dev/**`, set `window.__E2E__ = true`, and inject its overlay CSS. The
  blocked Clerk request is listed as test-rig noise; product errors remain failures.
- **Why:** one browser contract prevents false failures without creating a broad allowlist
  that could hide application regressions. Clean exploration runs still receive a separate
  verifier pass.
- **Revisit if:** DEMO mode stops mounting Clerk's client SDK; remove the exception from
  the shared fixture and QA together.

## [2026-07-15] Mutation eval uses the target's dedicated test file
- **Context:** the first `test-coverage` hand run proved StrykerJS 9.6.1 works with
  Vitest 4.1.10, but the original eval command specified only the product module.
- **Choice:** every mutation check explicitly sets the target with `--mutate`, its focused
  test with `--testFiles`, and the runner with `--testRunner vitest`. Per-test coverage,
  bounded concurrency, and temp cleanup are also explicit.
- **Why:** a target test should kill the target's mutants on its own. Pulling in the whole
  suite can hide a weak focused test and makes the run slower and less reproducible.
- **Revisit if:** a module legitimately needs an integration test spanning several files;
  list those exact test files rather than falling back to the entire suite.

## [2026-07-15] eslint-burndown is pipeline #1 (training wheels)
- **Context:** repo is healthy — `tsc` 0 errors, `vitest` 165/165 green, `eslint` 63
  warnings. Only lint has a real backlog.
- **Choice:** first pipeline drains eslint warnings, not a feature or the authz suite.
- **Why:** pipeline #1's real product is a *working, trusted loop* — not the fixes. Lint
  gives an airtight monotonic check (warning count ↓), zero DB risk, and a mistake costs
  nothing. A green suite (authz) is a good check but an empty backlog.
- **Revisit if:** lint hits 0 → promote to pipeline #2 (bug-fix, e.g. co-owner data-loss).

## [2026-07-15] Stay independent of external tools — drop `paseo-loop`
- **Context:** `paseo-loop` gave the strongest maker≠verifier separation, but it wraps the
  third-party **Paseo daemon** (`~/.local/bin/paseo`, installed separately). If Paseo is ever
  uninstalled, any pipeline depending on it breaks.
- **Choice:** agent-loop uses **built-in primitives only** — `Workflow` (execute→eval,
  loop-until pass, separate `agent()` per stage) as the runtime, `/loop`+`/schedule` as the
  trigger. No `paseo-loop`, no external daemon.
- **Why:** the system must survive the removal of any other tool. Independence > the marginal
  cross-provider benefit paseo offered.
- **How we keep the separation natively:** `execute` and `eval` are separate agent spawns
  (own context; verifier sees only the diff + check output). Optional extra separation: run
  eval on a different model via `agent(..., {model})`.
- **Revisit if:** a built-in engine offers stronger separation, or we decide a documented
  optional paseo dependency is worth it.

## [2026-07-15] Rank loop tools by maker≠verifier, not features
- **Context:** we own `/build-loop`, `/code-build-loop`, `/optimisation-loop`, `/loop`,
  `/schedule` (plus the built-in `Workflow` / `Task` primitives).
- **Choice:** author with `/build-loop`; `/optimisation-loop` for metric pipelines;
  `/code-build-loop` only with a bolted-on separate verifier; runtime = built-in `Workflow`.
- **Why:** the one principle all experts share is that the maker must not grade itself.
- **Revisit if:** a new engine offers stronger verification separation.

## [2026-07-15] Build one pipeline first, orchestrator second
- **Choice:** prove a single pipeline closes its loop by hand before building the
  always-on router over many pipelines.
- **Why:** the orchestrator is trivial once a pipeline works, and worthless before. Don't
  build the self-driving car on day one (autonomy slider).

## [2026-07-15] "Keep running" = scheduled heartbeat, not infinite loop
- **Choice:** orchestrator wakes on a cadence (`/loop` / `/schedule`), checks the inbox,
  dispatches, sleeps — it does not spin a raw `while(true)`.
- **Why:** ~100x cheaper and safer; matches Anthropic's time-based/proactive loop types.

## [2026-07-15] Verification techniques per testing pipeline (researched before authoring)
- **Context:** the owner's rule — before writing any pipeline's eval, research the testing
  technique that matches what the pipeline produces; the verification is load-bearing.
- **Choices (full reasoning + sources in each pipeline.md "Verification technique"):**
  - **bug-fix** → regression testing, TDD red→green: the failing test *is* the spec, and
    eval re-runs it unmodified plus the global gates.
  - **test-coverage** → coverage measurement (`@vitest/coverage-v8`; AST-remapped since
    Vitest 3.2, Istanbul-accurate at 2–5× speed) **+ mutation testing** (StrykerJS
    `vitest-runner`, scoped `--mutate` per module). Mutation chosen because coverage proves
    lines ran, not that tests catch bugs. Stryker over agent-applied mutants because the
    tool mutating keeps the **eval agent read-only** — an agent injecting mutants would
    edit code and grade its own edits.
  - **qa** → browser-driven interaction testing with **structural (ARIA-level) assertions +
    console/network capture**, verified in a **fresh browser session**. Pixel visual
    regression deliberately excluded: 2026 consensus is pixel baselines flake across
    OS/GPU/font stacks unless env-pinned; we run on a dev machine.
  - **e2e-regression** → **rerun-to-classify triage** (deterministic failure = regression,
    varying = flake), **quarantine-not-delete** policy (blocking suite stays trustworthy),
    trace evidence, exit = two consecutive full green runs.
- **Revisit if:** Stryker fights vitest 4/Vite 8 in the hand run (fallback: scratch-worktree
  mutations run by a *tool script*, still not the eval agent); a pinned CI image appears
  (pixel checks become viable); the e2e suite grows past ~15 min (two full green runs get
  too expensive — sample instead).
