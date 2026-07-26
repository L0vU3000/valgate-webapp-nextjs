# Decisions — agent-loop system (ADRs)

> Why the loop is built the way it is. Newest first. One entry per load-bearing choice.
> Format: `## [YYYY-MM-DD] <decision>` → **Context / Choice / Why / Revisit-if**.

## [2026-07-17] Delivery pipelines are thin, risk-separated wrappers around installed capabilities
- **Context:** the delivery category needed `landing`, `deploy`, `canary`, and `release`. The
  installed `ship`, `setup-deploy`, `land-and-deploy`, `canary`, and `document-release` skills
  already own change preparation, platform detection, merge/deploy mechanics, post-deploy
  observation, rollback handling, and release-note checks. Reimplementing those commands inside four
  pipelines would create a second delivery system and let one broad approval authorize unrelated
  risk levels.
- **Choice:** each delivery pipeline coordinates one boundary and delegates domain work to the
  installed capability: landing stops after authoritative merged-state verification; deploy starts
  from an already-landed commit and one named environment; canary is read-only by default and needs a
  separate rollback approval; release attests notes + delivery evidence and needs a post-deploy owner
  sign-off on the exact record digest. Every wrapper is locked in training mode, binds approval to an
  immutable action identity, and returns failed Eval evidence to Plan. No wrapper publishes an
  external release until a proven publication capability is added.
- **Why:** the installed skills remain the single place that knows provider, merge queue, browser,
  and documentation mechanics. Splitting approvals by action limits what a mistaken or stale approval
  can change. The independent Eval checks authoritative remote/provider evidence instead of trusting
  a successful command exit.
- **Revisit if:** an installed capability adds stable first-class subcommands that replace the scoped
  skill portions, a provider needs a delivery action none of the installed skills can express, or a
  proven external release-publication capability is installed with its own approval and verification.

## [2026-07-16] Review pipelines report verified findings, and verify by adversarial re-verification
- **Context:** the `review` category (`code-review`, `design-review`, `security-review`,
  `architecture-review`) inspects an existing change or surface. Its risk is not a weak fix — it makes
  no fix — but a **false positive**: a confident finding that is not real wastes owner attention and
  erodes trust in the loop.
- **Choice:** review pipelines are read-only and produce findings only (a fix routes to a separate
  `approved: false` building ticket). The independent verifier **adversarially re-verifies every
  reported finding** — independently reproduces it (re-traces the cited code, re-drives the live
  surface, re-confirms the exploit path or dependency edge) — and **drops any finding it cannot
  substantiate**. The critical criteria are: every surviving finding reproduced with cited evidence,
  zero unverified findings, justified severity, and declared scope covered.
- **Why:** for a findings-producer the honest failure mode is a hallucinated issue, so the gate must
  attack the findings, not just count them. Dropping unverified findings makes the maker≠verifier
  split do the work it is best at — a skeptic re-deriving evidence — and keeps the owner's queue
  free of noise. Fixing stays out of scope so a review never silently changes the product.
- **Revisit if:** a review type needs to act on its findings within the same run (it should route to
  a building pipeline instead), or reproduction is impossible for a class of finding (then that class
  needs a different, still-objective verification, not an ungrounded assertion).

## [2026-07-16] Planning pipelines are read-only doc-producers verified by grounding, not tests
- **Context:** the `planning` category (`spec`, `research`, `technical-plan`) breaks the
  building-pipeline mould — its product is a document, not code, so there is no test/tsc/DB gate on
  the output, and "good idea / good plan" is a matter of taste the loop must not pretend to grade.
- **Choice:** planning pipelines are **read-only** on the product — their only writes are the
  document plus a drafted `approved: false` ticket under `runs/`. Their Eval grades only *objective*
  properties: completeness of a fixed section contract; **grounding** (every cited file/service/
  route/table resolves against real code via `graphify`/reads — an unresolved or invented reference
  is a critical failure); testability of each acceptance criterion or claim; boundedness; and honesty
  (unmade owner decisions surfaced, not invented). The owner approves the *content* after the
  pipeline guarantees it is complete, grounded, and honest.
- **Why:** grounding is the objective spine that makes verifying a document as airtight as it can be,
  and it directly encodes the `valuations` near-miss — a spec that claims a gap must prove it. This
  keeps maker≠verifier, the 100-point scoring, and the rubric-fingerprint lock intact while admitting
  the human gate is load-bearing for the judgment code cannot do. Read-only also makes these the
  safest pipelines: no worktree, no database branch.
- **Revisit if:** a planning pipeline needs to write beyond `runs/` (it should not), or a new
  checkable, objective property of plan quality emerges that the rubric should add as a criterion.

## [2026-07-16] eslint-burndown calibration: all-critical rubric, C1 banded for safe partial progress
- **Context:** the second scored-rollout proof (run `2026-07-16-164426`, an 8-warning mechanical
  batch). A lint batch has one product (fewer warnings) and one hard constraint (no behavior change),
  so a generic weight spread does not fit — the interesting failure is a reduction achieved by
  breaking something, not a low aggregate score.
- **Choice:** make all five criteria critical (strictly-lower count, tsc 0, vitest green, scope/
  anti-gaming, no-suppression), keep the default 85 threshold, and give C1 (the reduction) an
  objective band so a strictly-lower-but-incomplete batch scores honest partial credit and routes
  `return-to-plan` for the next batch rather than passing on a full clear it did not achieve.
- **Why:** the critical gates, not the weight math, are what protect against a gamed reduction. A
  deterministic negative case proved it: removing a *used* binding does not lower the warning count
  (C1 grants nothing) and fails tsc (C2 critical) — a behavior-changing reduction is rewarded on no
  axis and punished on two. Banding C1 keeps multi-batch burndown honest without softening any gate.
- **Revisit if:** a batch mixes mechanical and judgement fixes such that a non-critical, genuinely
  partial-credit criterion is warranted (then the all-critical shape is too blunt).

## [2026-07-16] Keep 85 as the default threshold after the first scored bug-fix
- **Context:** the first task-specific proof, bug-fix run `2026-07-16-144138`, used a locked
  85/100 threshold and nine critical criteria. Deterministic cases showed that 84/100 returns to
  Plan and 99/100 still fails when one critical criterion fails; the independent pass earned
  100/100 with zero critical failures.
- **Choice:** retain 85 as the recommended default. Give the task's user impact and root-cause
  correction the two largest weights, then keep red→green, suite, TypeScript, and lint as critical
  regardless of their smaller weights.
- **Why:** 85 leaves room for predefined partial credit on non-critical work while critical gates
  prevent averages from hiding a broken protection. This run was intentionally all-critical, so
  its clean pass calibrates correctness of the decision rule, not the usefulness of partial credit.
- **Revisit if:** several real tasks cluster at 80–84 despite acceptable outcomes, or repeated
  85+ passes still need human rejection. Do not tune from synthetic scores alone.

## [2026-07-16] Plan owns a locked, task-specific 100-point Eval rubric
- **Context:** fixed boolean checklists protected regressions but could not express that a feature,
  database entity, QA pass, and coverage task have different high-value outcomes. The owner chose
  task-specific scoring determined during Plan.
- **Choice:** every Plan writes a 100-point rubric with objective evidence, critical criteria, and a
  threshold from 80–100 (default 85). Eval passes only at or above the threshold with zero critical
  failures and a valid, unchanged rubric. Existing safety/regression gates remain critical. The
  exact rubric section is SHA-256 fingerprinted and locked across automated retries.
- **Why:** Plan is early enough to define success without knowing which criteria will be convenient
  to pass. Critical gates prevent weighted averages from hiding security, data, or regression
  failures. The fingerprint prevents moving the goalposts after a low score.
- **Revisit if:** real runs show the 80–100 threshold range is poorly calibrated, or the Workflow
  runtime gains a deterministic rubric parser that can validate weights without an agent.

## [2026-07-16] Explicit per-stage models: Sonnet reads/plans, Opus makes, no Fable
- **Context:** the first metrics harvest showed the drain — stages with no `model:` inherit the
  session default, so `explore`/`plan` ran on Opus 1M (entity-scaffold: 313k + 280k tokens) and one
  bug-fix run inherited `claude-fable-5` for its whole maker path. Unpinned = expensive and
  non-deterministic (whatever the session happens to be).
- **Choice:** pin an explicit Anthropic model on every stage of the 7 automatable pipelines:
  `explore`/`plan`/`eval` → `sonnet`, `execute` → `opus`. Two models only; maker (Opus) ≠ verifier
  (Sonnet) preserved. Bare aliases are used deliberately — they resolve to standard 200k context
  (`claude-sonnet-5`, `claude-opus-4-8`), which is cheaper and leaner than the `[1m]` variants for
  stage work that reads scoped graphify subgraphs, not whole repos. entity-scaffold is intentionally
  left for a later pass — it was under active parallel edit this turn.
- **Why:** explicit models kill Fable inheritance by construction and move the two biggest drains
  (`explore`, `plan`) off Opus onto Sonnet — the largest token lever in the system — while keeping
  the maker on Opus where build quality matters. The new ledger will show the before/after.
- **Revisit if:** a run needs the 1M window (pin the full `claude-*-[1m]` id — but verify the runtime
  accepts that string on `agent({model})`; the bare alias proved to strip `[1m]`), or the ledger
  shows a stage under/over-modelled (Sonnet execute failing to converge → Opus; Opus explore wasteful
  → already Sonnet).

## [2026-07-16] Tuning telemetry is harvested, not instrumented
- **Context:** to tune loops for cost/speed we need per-stage time + tokens, but Workflow scripts
  can't touch the filesystem or read a clock (`Date.now()` is banned — it breaks resume), so
  in-script capture is impossible. Investigation found the runtime already writes one JSON per run
  at `~/.claude/projects/<project>/<session>/workflows/wf_*.json` with run-level cost
  (`durationMs`, `totalTokens`, `totalToolCalls`) and a `workflowProgress[]` array carrying
  `{ label, model, tokens, durationMs, toolCalls, attempt, queued/startedAt }` per stage.
- **Choice:** don't instrument the 8 workflows at all. `orchestrator/metrics.mjs` reads those JSONs
  (filtered to this repo by `scriptPath`), normalizes each finished run to one line in
  `memory/run-metrics.jsonl`, and is invoked automatically from `dispatch.mjs --record` so the
  ledger fills as real work runs. It keeps facts (cost + the run's `result` object); ratios are
  derived by `--summary`. The golden rule is encoded by keeping the `result`/quality signal beside
  every cost number: never cut cost without the paired quality baseline to hold constant.
- **Why:** zero-token, zero-maintenance, and richer than hand-instrumentation could be (input+output
  tokens, queue-wait, per-tool counts). First harvest of 8 existing runs immediately showed the
  drain: entity-scaffold `explore` 313k and `plan` 280k tokens on Opus — the exact stages that
  don't need it.
- **Revisit if:** the runtime changes the wf JSON shape (update `toRow`), or the ledger grows large
  enough to want rotation / a real store instead of append-only JSONL.

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
