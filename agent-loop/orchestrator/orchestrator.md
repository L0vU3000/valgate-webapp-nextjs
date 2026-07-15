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
       a. pick a pipeline   (match item.type → pipelines/<name>/)
       b. mark it in-progress   (move/annotate the item)
       c. dispatch  →  run that pipeline in an isolated worktree
       d. record outcome   →  memory/changelog.md (+ errors.md on failure)
       e. move the item to done/ or failed/
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

Grows as we add pipelines. Today:

| Item `type` | Pipeline | Verification (exit condition) |
|---|---|---|
| `lint` | [`pipelines/eslint-burndown`](../pipelines/eslint-burndown/pipeline.md) | `eslint` warning count strictly ↓, `tsc`+`vitest` still green |
| `bug` | _(pipeline #2 — not built yet)_ | a new regression test passes |
| `perf` | _(pipeline #3 — `/optimisation-loop`)_ | metric hits target |

An advanced version (later) replaces this table with a **factory-router agent** that reads
the codebase and *picks* the pipeline + model tier by price/performance/speed. Start with
the table.

---

## Work items — the inbox contract

Work lands in [`inbox/`](./inbox/) as one Markdown file per item. Minimum shape:

```markdown
---
type: lint            # matches a row in the routing table
priority: normal      # low | normal | high
created: 2026-07-15
---

<one paragraph: what needs doing and what "done" looks like>
```

The orchestrator only needs `type` to route. Everything else is for the pipeline.

---

## Guardrails (non-negotiable)

- **Isolation:** every dispatched pipeline runs in its **own git worktree** — never on the
  live branch, never two pipelines in the same tree.
- **Data safety:** any pipeline that writes data uses a **Neon dev branch**, never prod,
  and **never `seed:reset`**.
- **Bounded:** the router honors each pipeline's max-iterations / max-time. No open-ended runs.
- **Human at the two constraints:** you review the *plan* (start) and the *result* (end).
  Slide those inward only as a pipeline earns trust.

## Not built yet

This file is the **spec**, not a running router. Build order: prove
[`eslint-burndown`](../pipelines/eslint-burndown/pipeline.md) by hand → wire it to `/loop`
→ only then generalize this into a real dispatcher (likely a `Workflow` script).
