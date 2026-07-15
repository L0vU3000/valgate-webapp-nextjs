# Orchestrator — the router

> The always-checking layer over *many* pipelines. Its **only** job: read the inbox,
> pick the right pipeline for each work item, dispatch it, record the outcome, sleep.
> It does **not** do the work itself — it routes. (Anthropic's *orchestrator-worker*;
> IndyDevDan's *factory router agent*.)

This is the one piece the [skills library](../skills-library.md) doesn't give us for
free — everything below the router already exists. Build it **after** one pipeline works.

---

## The heartbeat (the loop)

```
every N minutes  (trigger: /loop or /schedule — NOT a raw while-true)
  1. read inbox/  →  any new *.md work items?
  2. for each new item:
       a. validate category + type against the pipeline registry
       b. pick a pipeline   (match item.type → pipelines/<name>/ inside that category)
       c. mark it in-progress   (move/annotate the item)
       d. dispatch  →  run that pipeline in an isolated worktree
       e. record outcome   →  memory/changelog.md (+ errors.md on failure)
       f. move the item to done/ or failed/
  3. refresh the board  →  run scripts/update-dashboard.sh
  4. sleep until next tick
```

The **dashboard** (`../dashboard.md`) is the at-a-glance view of what's running / queued /
completed. It is **generated** by [`scripts/update-dashboard.sh`](../scripts/update-dashboard.sh)
from real state (inbox files + run folders) — never hand-edited, so it can't drift. Keep it
fresh three ways: the orchestrator regenerates it each tick (step 3); or `/loop 2m bash
agent-loop/scripts/update-dashboard.sh` while a workflow runs; or run it by hand anytime.

Keep the router's own context **lean** — it reads a one-line summary per item and a
pipeline registry, nothing more. It must never accumulate the full history of every run
(that's the "dumb zone" — Horthy). Each pipeline run owns its own fresh context.

---

## Routing table (pipeline registry)

Categories define the broad work policy; `type` selects the exact peer pipeline. See
[`categories.md`](../categories.md) for the category contract. The registry grows as we add
pipelines. Today:

| Category | Item `type` | Pipeline | Verification (exit condition) |
|---|---|---|---|
| `maintenance` | `lint` | [`pipelines/eslint-burndown`](../pipelines/eslint-burndown/pipeline.md) | `eslint` warning count strictly ↓, `tsc`+`vitest` still green |
| `building` | `bug` | [`pipelines/bug-fix`](../pipelines/bug-fix/pipeline.md) | new regression test red→green, full suite + `tsc` + `eslint` clean |
| `building` | `feature` | [`pipelines/feature`](../pipelines/feature/pipeline.md) | acceptance tests red→green, full suite + `tsc` + `eslint` clean |
| `building` | `entity` | [`pipelines/entity-scaffold`](../pipelines/entity-scaffold/pipeline.md) | approved contract red→green, additive migration, tenant-safe live CRUD test, global gates clean |
| `testing` | `test` | [`pipelines/test-coverage`](../pipelines/test-coverage/pipeline.md) | new tests pass, module coverage strictly ↑, Stryker mutation score ≥ threshold, gates clean |
| `testing` | `qa` | [`pipelines/qa`](../pipelines/qa/pipeline.md) | all in-scope flows re-driven green in a fresh browser session, 0 console errors, gates clean |
| `testing` | `e2e` | [`pipelines/e2e-regression`](../pipelines/e2e-regression/pipeline.md) | e2e suite green ×2 consecutive, every failure fixed or quarantined+ticketed, gates clean |
| `maintenance` | `pipeline-improve` | [`pipelines/pipeline-improve`](../pipelines/pipeline-improve/pipeline.md) | one focused machinery regression red→green, machinery + full repository gates clean |
| `maintenance` | `perf` | _(future — `/optimisation-loop`)_ | metric hits target |

An advanced version (later) replaces this table with a **factory-router agent** that reads
the codebase and *picks* the pipeline + model tier by price/performance/speed. Start with
the table.

---

## Work items — the inbox contract

Work lands in [`inbox/`](./inbox/) as one Markdown file per item. Minimum shape:

```markdown
---
category: maintenance # broad work policy; must match the registered pipeline
type: lint            # matches a row in the routing table
priority: normal      # low | normal | high
created: 2026-07-15
---

<one paragraph: what needs doing and what "done" looks like>
```

The orchestrator uses `category` to apply the broad routing and safety policy, then `type`
to select the exact pipeline. A category/type mismatch is invalid and must be returned for
correction rather than guessed. A future factory-router may accept an unspecified type and
select among pipelines within the supplied category; the current router requires both.

---

## Guardrails (non-negotiable)

- **Isolation:** every dispatched pipeline runs in its **own git worktree** — never on the
  live branch, never two pipelines in the same tree.
- **Data safety:** any pipeline that writes data uses a **Neon dev branch**, never prod,
  and **never `seed:reset`**.
- **Bounded:** the router honors each pipeline's max-iterations / max-time. No open-ended runs.
- **Human at the two constraints:** you review the *plan* (start) and the *result* (end).
  Slide those inward only as a pipeline earns trust.

## The dispatcher (built)

The routing + bookkeeping half of the heartbeat is now executable:
[`dispatch.mjs`](./dispatch.mjs). It is deterministic, zero-token code — the part of the loop
that should never spend a model call.

```
node agent-loop/orchestrator/dispatch.mjs            # print the dispatch plan (dry run)
node agent-loop/orchestrator/dispatch.mjs --json     # same plan, machine-readable
node agent-loop/orchestrator/dispatch.mjs --record <file> <pass|fail> [--summary "..."]
```

What it does each tick:

1. Loads the routing table from the **canonical source** — `pipeline.md` frontmatter, via the
   same `validatePipelineRegistry` the machinery self-check uses (no second table to drift). If
   the registry is broken it **refuses to route** and exits non-zero.
2. Reads `inbox/*.md` (top-level only; `done/` and `failed/` are archives).
3. Validates each item: frontmatter present, and the `type` selects a pipeline whose
   `category` matches the item's. A category/type mismatch, an unknown type, or missing
   frontmatter is returned as **invalid — for correction, never guessed**.
4. Emits the dispatch plan in priority order (`high` → `normal` → `low`): item → pipeline →
   `workflow.js`.
5. `--record` moves a finished item into `done/` or `failed/` and appends the outcome to
   `dispatch-log.md` (the bookkeeping half of steps e–f above).

### The one boundary: it routes, it does not execute

A pipeline is a `workflow.js` run by the built-in **Workflow runtime** (the harness), which a
plain node process cannot invoke — and the system stays on
[built-in primitives only](../memory/decisions.md) (no external daemon). So the dispatcher
emits *which* workflow to run for *which* item; the runtime runs it and reports back via
`--record`. This is precisely "the orchestrator routes; it does not do the work itself."

### Still ahead

- A scheduled trigger (`/loop` / `/schedule`) that calls `dispatch.mjs`, hands each routable
  item's `workflow.js` to the Workflow runtime in an isolated worktree, then `--record`s the
  outcome and refreshes the dashboard — closing the loop without a raw `while(true)`.
- The advanced **factory-router agent** that replaces the static table with codebase-aware
  pipeline + model-tier selection. Start with the table (done); earn the agent later.
