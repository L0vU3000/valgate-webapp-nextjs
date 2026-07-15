# Errors & Lessons — agent-loop system

> What broke, why, and how we stop it recurring. Newest first.
> Format: `## [YYYY-MM-DD] <symptom>` → **Symptom / Cause / Fix / Prevention**.
>
> This is the highest-value file for self-improvement: a recurring error here should
> become a line in the offending pipeline's prompt (or `CLAUDE.md`) so the fix
> propagates to every future run — not just this one.

_No incidents yet. The first entries will come from the eslint-burndown by-hand run._

<!--
Template:

## [2026-07-15] Pipeline marked "done" but tsc regressed
- **Symptom:** eval passed on eslint count but `tsc` had gone from 0 → 3 errors.
- **Cause:** eval only checked the lint count, not the "did I break anything" gates.
- **Fix:** added `tsc` + `vitest` to the eval stage's pass condition.
- **Prevention:** every code pipeline's eval must assert *no regression* on all
  pre-existing green signals, not just its own target metric.
-->

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
