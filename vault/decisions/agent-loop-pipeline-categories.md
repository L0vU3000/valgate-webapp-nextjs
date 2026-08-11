---
title: Decision — Agent-loop pipelines use shared categories
type: decision
status: accepted
source: agent-loop/categories.md
tags: [decision, agent-loop, orchestration, pipelines, categories]
added: 2026-07-15
---

## Decision

Agent-loop organizes peer pipelines into six top-level categories: `planning`, `building`,
`review`, `testing`, `maintenance`, and `delivery`.

Categories are routing and policy metadata. They do not add another directory level and do
not create parent pipelines. Every pipeline remains at `agent-loop/pipelines/<name>/` and
owns the same `explore → plan → execute → eval` lifecycle, exit condition, workflow runtime,
and run state.

## Why

The system will contain many pipelines. A flat type list does not explain whether a pipeline
plans work, changes the product, reviews a change, exercises verification, performs upkeep,
or affects delivery. Categories make that intent visible to the orchestrator and let each
group carry an appropriate human-approval and safety policy.

Keeping categories as metadata preserves the existing dashboard, ignore rules, and machinery
checks, which scan `pipelines/*/`. It also keeps categories separate from orchestration: the
category narrows and governs the work; the pipeline performs it.

## Consequence

- Every `pipeline.md` declares `name`, `category`, and routing `type` in frontmatter.
- New inbox items declare `category` and `type`; the orchestrator validates the pair.
- Testing required to ship a product change stays inside the selected building pipeline's
  independent `eval` stage.
- Standalone testing pipelines run for dedicated test-health, QA, regression, or release
  work instead of being appended automatically to every build.
- An eval failure returns to `plan`, then `execute`, so the next attempt uses the verifier's
  evidence.

## Revisit if

The flat pipeline layout becomes a real navigation or tooling bottleneck. Moving categories
into physical subdirectories requires coordinated changes to the dashboard, ignore rules,
machinery checks, workflow paths, and registry.

## Links

- [[agent-loop-system]] · [[qa-pipeline-reuses-e2e-fixture]]
- Authoritative contract: `agent-loop/categories.md`
