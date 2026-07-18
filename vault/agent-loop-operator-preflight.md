# Agent-loop operator preflight

One page for the human at the gates. Run top-to-bottom before dispatching any pipeline.
This is the checklist that would have caught the 2026-07-19 shakedown stop before a single
model call — see [[log]].

## Before the tick

- [ ] **Machinery is actually green.** `bash agent-loop/scripts/check-machinery.sh` must end
      `all good`, not `FAILED`. Do not trust a prior "it was green" — re-run it now. A red
      check means the record doorway (which re-runs it) will force every outcome to `fail`, so
      running a pipeline proves nothing.
- [ ] **Working tree is clean where it matters.** `git status --short agent-loop/`. Uncommitted
      edits to a `workflow.js` or `check-machinery.sh` are the usual cause of drift between a
      pipeline and the check that guards it. The brief may say "all committed" — verify.
- [ ] **The inbox matches what you think you're running.** `ls agent-loop/orchestrator/inbox/*.md`.
      Items in `inbox/failed/` or `inbox/done/` are archives, not queued work. An item that
      already has a `dispatch-log.md` line has already run — re-running it is not a first run.
- [ ] **`tsc` is clean on the branch** (`npx tsc --noEmit`) — the doorway re-runs it too.

## Dispatch

- [ ] **Run `node agent-loop/orchestrator/tick.mjs`** and read the AGENT ACTIONS block. Route
      only the items it prints as valid. Invalid items are for correction, never guessed.
- [ ] **Own git worktree per run.** Never the live branch, never two pipelines in one tree.
- [ ] **Development DB only.** Neon dev branch. Never prod. Never `seed:reset`. Never
      `ALLOW_DESTRUCTIVE_DB=1`.

## The two gates (human stays at both — do not slide them inward)

- [ ] **Plan gate.** Read the plan AND the full Eval rubric, including the
      `Prior failures reviewed:` line (rule 10 — a known failure is never silently dropped).
      Give explicit approval before Execute. An unproven pipeline gets the full gate every run.
- [ ] **Result gate.** Read the eval verdict + score before recording.

## Record

- [ ] **Record from inside the pipeline's worktree** — the doorway runs `check-machinery.sh` +
      `tsc` in your current directory: `node agent-loop/orchestrator/dispatch.mjs --record <file> <pass|fail> --summary "<one line>"`.
- [ ] **Trust the doorway's overrule.** It only ever makes a verdict stricter (claimed `pass` →
      `fail` if the fast gates don't hold; never the reverse). If it overrules, the run failed.

## Shakedown rule

- [ ] **A surfaced machinery bug is a full stop, not a warning.** Surface it and wait — do not
      paper over it, do not fix-and-continue, do not substitute a different item to keep moving.
