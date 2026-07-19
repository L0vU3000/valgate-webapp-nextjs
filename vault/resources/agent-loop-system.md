---
title: Agent-loop system (orchestrator + pipelines)
type: doc
source: agent-loop/ (in-repo)
tags: [agentic-engineering, loops, orchestration, automation]
added: 2026-07-15
---

## Summary

`agent-loop/` is Valgate's home for **agentic engineering** — moving from hand-prompting
one task at a time to **loops and AI Developer Workflows** that find work, do it, verify it,
and record what happened. It's a self-contained system with its own docs, a skills catalog,
an orchestrator/router, pipelines, and a self-improvement memory. This note is the vault's
pointer into it; the living detail lives in the folder.

## Key points

- **The loop anatomy** (what all the experts converge on): goal · **verification (maker ≠
  verifier)** · guardrails · memory · trigger · tools. The one principle above all: the agent
  doing the work must not be the agent that grades it.
- **Architecture** = orchestrator-worker. A thin **router** reads an `inbox/` and dispatches
  work to **pipelines**; each pipeline runs `explore → plan → execute → eval`, looping on the
  `eval-fails → plan` edge. Pipelines are peers grouped into `planning`, `building`, `review`,
  `testing`, `maintenance`, and `delivery`; see [[agent-loop-pipeline-categories]].
- **We assemble from built-ins, don't hand-roll** — `skills-library.md` maps primitives to
  roles: `Workflow` (runtime: separate `execute`/`eval` agents, loop-until pass),
  `/build-loop` (author pipelines), `/optimisation-loop` (metric pipelines), `/loop`+`/schedule`
  (triggers). **No external tools** — deliberately independent of the Paseo daemon so agent-loop
  survives uninstalling anything else.
- **Testing belongs at two levels.** Building pipelines own the tests required by their exit
  condition. Standalone testing pipelines handle dedicated coverage, browser QA, regression,
  and release work.
- **It's an evolving system.** `agent-loop/memory/` (changelog · decisions · errors) is the
  substrate for a meta-loop that always looks for ways to optimize itself.

## How it applies here

- Entry point: `agent-loop/agent-loop.md`. Category contract: `agent-loop/categories.md`.
  Sources: `agent-loop/resources/README.md`.
- Current state: multiple pipeline definitions are proven; the executable orchestrator is
  still the next system layer after the paused e2e-regression proof is completed.
- Safety that ties to this repo: pipelines run in **git worktrees**; any data-writing
  pipeline uses a **Neon dev branch**, never prod, **never `seed:reset`** (see [[neon-not-convex]]).

## Links

- [[karpathy-llm-wiki-pattern]] — the LLM-maintained-knowledge pattern this mirrors
- [[agent-loop-pipeline-categories]] — the category and routing decision
- [[runbook]] — the verification commands pipelines lean on (`vitest`, `tsc`, `eslint`)
- [[neon-not-convex]] — why data-writing pipelines must use the Neon dev branch
