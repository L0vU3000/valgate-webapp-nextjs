# Changelog — agent-loop system

> What changed in the loop machinery and when. Newest first. One entry per change.
> Format: `## [YYYY-MM-DD] <what changed>` + a line or two of why.

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
