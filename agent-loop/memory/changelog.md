# Changelog — agent-loop system

> What changed in the loop machinery and when. Newest first. One entry per change.
> Format: `## [YYYY-MM-DD] <what changed>` + a line or two of why.

## [2026-07-15] test-coverage pipeline proven by hand
Completed run `2026-07-15-152837` against `lib/services/portfolio-shared.ts`. Added 12
focused tests; coverage moved 0%→100% across statements, branches, functions, and lines;
Stryker killed all 37 mutants (100%, threshold 80%). Full suite 180/180, tsc 0, eslint
55→55. The run taught the pipeline to pin both `--testRunner vitest` and the target's
dedicated `--testFiles` during mutation eval. Fixed the dashboard's hard-coded lint
summary after this run exposed it, and added a coverage-verdict regression fixture to the
machinery self-check.

## [2026-07-15] Dropped paseo-loop — built-in primitives only
Removed the `paseo-loop` dependency (it needs the external Paseo daemon). Runtime is now
the built-in `Workflow` (separate `execute`/`eval` agents, loop-until pass) + `/loop` for
the trigger. agent-loop is now self-contained — survives uninstalling any other tool. See
[decision](./decisions.md). Updated `skills-library.md`, `pipeline.md`, `agent-loop.md`.

## [2026-07-15] Scaffolded the orchestrator + first pipeline
Built the agreed design: an `orchestrator/` (router + `inbox/`), a `pipelines/`
folder, and the first pipeline **eslint-burndown** (explore → plan → execute →
eval, with eval as a *separate* verifier). Added `skills-library.md` (the toolkit
we assemble from) and this `memory/` mini-vault. Nothing runs unattended yet —
next step is the by-hand run to prove the loop closes.
Decision context: see [`decisions.md`](./decisions.md).

## [2026-07-14] Research + design phase
Built `agent-loop.md` (loop anatomy, 4 loop types, autonomy slider) and the
`resources/` library (8 authors: Willison, Karpathy, Cherny, Anthropic, Horthy,
vendor guides, IndyDevDan, ReAct). Chose the orchestrator-worker architecture.

## [2026-07-15] First by-hand run of eslint-burndown — loop closes
Ran explore→plan→execute→eval by hand (run 2026-07-15-01). Removed 8 unambiguous unused
imports; eval passed: eslint 65→57, tsc 0, vitest 165/165. Proved the loop closes with a
separate, evidence-backed verdict. Deferred (correctly): 17 NOT_IMPLEMENTED_UNTIL_B6
markers, scoped* helpers (possible IDOR symptom), symptom-class params/state, and
behavior-changing rules (exhaustive-deps, no-img-element). No regressions → errors.md stays empty.

## [2026-07-15] Automated eslint-burndown as a Workflow + added a live dashboard
Wrote `pipelines/eslint-burndown/workflow.js` (built-in Workflow: explore then plan→execute
→eval looped, code-driven bounds, eval on a separate model). First automated run passed on
its own (run 2026-07-15-02: eslint 63→55, no regressions). Added `dashboard.md` +
`scripts/update-dashboard.sh` — a generated live view (running/queued/completed) derived from
inbox + run folders, so it can't drift. dashboard.md is gitignored (regenerated view).

## [2026-07-15] Fixed run-folder fragmentation; first errors.md entries
Self-improvement loop caught 2 real issues on the first automated run: stage agents
invented separate run-ids (stray runs/03 fragment) and the dashboard misread it as running.
Threaded a shared runId through workflow.js (explore mints it, all stages use it). Logged
both in errors.md with prevention notes to fold into pipeline #2's authoring.

## [2026-07-15] Scaffolded pipeline #2 (bug-fix) + queued the co-owner bug
Built pipelines/bug-fix (explore=reproduce+failing test, plan, execute=maker,
eval=separate verifier that requires the new test red→green + full suite/tsc/eslint clean).
workflow.js threads a shared runId from the start (errors.md lesson applied). Queued the
first ticket: co-owner data loss in the Ownership wizard (skipped Co-owners step wipes
existing co-owners — data loss, DB-touching, Neon dev branch only). Registered `bug` in the
orchestrator routing table.

## [2026-07-15] bug-fix proven by hand; automation run started (Fable 5 executor session)
Hand run 2026-07-15-140108: reproduced the co-owner data-loss (OwnershipUnlock
`onSubmitData` deletes all co-owners whenever `holdingType === "Sole Ownership"` — the
exact condition that *skips* the Co-owners step). Regression test
`components/feature-unlock/pillars/OwnershipUnlock.test.ts` went red for the right reason
(removeCoOwner called for COOWN-0001/0002) → fix (skip = no reconcile) → green; suite
167/167, tsc 0, eslint 55→55. DB never touched (server actions mocked). Then reverted the
source fix (patch kept at `.context/coowner-fix-hand-run.patch`) and launched
`bug-fix/workflow.js` on the ticket — the automation independently reproduced the bug
(incl. live trigger-state evidence on the Neon dev branch, read-only), wrote its own
failing test (`tests/ownership-wizard-coowner-skip.test.ts`), and planned a stronger fix
(also guards the empty-list reconcile path). Run 2026-07-15-140731 in progress.

## [2026-07-15] Authored the three testing pipelines with researched verification
`test-coverage` (`type: test`), `qa` (`type: qa`), `e2e-regression` (`type: e2e`) — each
with the 4-stage + shared-run-id pattern, a workflow.js, and a researched "Verification
technique" section in pipeline.md (choices + why in decisions.md). Registered all three in
the orchestrator routing table. First by-hand runs still pending (the do-it-by-hand rule).

## [2026-07-15] Machinery self-check added
`scripts/check-machinery.sh`: validates every workflow.js parses (wrapped in an async fn —
the Workflow DSL allows top-level return), meta/stage files present, shared run-id + eval
model override present, runs/ gitignored, and round-trips a fixture run through
update-dashboard.sh. Found two real bugs in itself while being built (macOS mktemp suffix,
ESM vs DSL semantics) — logged in errors.md. All green.
