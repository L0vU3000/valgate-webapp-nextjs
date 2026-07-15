# Decisions — agent-loop system (ADRs)

> Why the loop is built the way it is. Newest first. One entry per load-bearing choice.
> Format: `## [YYYY-MM-DD] <decision>` → **Context / Choice / Why / Revisit-if**.

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
