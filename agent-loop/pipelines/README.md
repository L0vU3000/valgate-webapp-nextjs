# Pipelines

> Each pipeline is one **AI Developer Workflow (ADW)**: a folder that takes a work item and
> runs it through four stages — **explore → plan → execute → eval** — looping on the
> `eval-fails → execute` edge until the exit condition is met.

The [orchestrator](../orchestrator/orchestrator.md) routes work here. The
[skills library](../skills-library.md) provides the engines that run each stage.

## The four stages (separate agents — do NOT collapse into one skill)

| Stage | Role | Context | Reads / Writes |
|---|---|---|---|
| `explore.md` | scout — understand the work, categorize it | read-only | writes findings to `runs/<id>/` |
| `plan.md` | decide the approach + batch the work | read-only | writes a plan to `runs/<id>/` |
| `execute.md` | **MAKER** — make the change | read-write, in a worktree | edits code |
| `eval.md` | **VERIFIER** — decide pass/fail | read-only | pass → done; fail → back to `execute` |

**The maker≠verifier rule is load-bearing.** `execute` and `eval` must be *different*
agents. The verifier checks facts, cites evidence (the command + its output), and **never
suggests fixes** — it only rules pass/fail. That's the whole reason a loop can run
unattended without lying to itself.

## Definition vs. run-state

- The stage files (`*.md`) are the **definition** — the prompts, committed to git.
- `runs/` holds the **transient state of one execution** — findings, plans, logs. It is
  **gitignored** (`agent-loop/pipelines/*/runs/`). Never mix the two.

## Anatomy checklist (every pipeline must have)

- [ ] a **goal** with a machine-checkable **exit condition** (in `pipeline.md`)
- [ ] an `eval` stage that is a **separate verifier** citing evidence
- [ ] **guardrails**: worktree isolation; Neon dev branch (never prod / `seed:reset`)
- [ ] **bounds**: max-iterations / max-time
- [ ] **memory**: failures logged to [`../memory/errors.md`](../memory/errors.md)

## Pipelines

| Pipeline | Type | Status |
|---|---|---|
| [`eslint-burndown`](./eslint-burndown/pipeline.md) | `lint` | scaffolded — awaiting by-hand run |
