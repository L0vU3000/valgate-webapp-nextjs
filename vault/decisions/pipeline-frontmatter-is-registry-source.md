---
title: Pipeline frontmatter is the registry source
type: decision
status: accepted
tags: [agent-loop, pipelines, routing, verification]
added: 2026-07-16
---

## Context

Pipeline category, type, and name appear in four places: pipeline frontmatter,
`agent-loop/categories.md`, the pipelines README, and the orchestrator registry. The machinery
self-check did not compare them, so a controlled type mismatch still passed.

## Decision

Pipeline frontmatter is canonical. A deterministic checker rejects missing, duplicate, extra,
or mismatched metadata in all three documented registries. Its regression fixture changes one
registry entry in a temporary copy, proves the drift is rejected, restores it, and proves the
matching state is accepted.

`pipeline-improve` owns future evidence-backed changes to this machinery. It selects one issue
per run, stops for Plan approval, uses separate maker and verifier models, and cannot weaken
existing gates or database protections.

## Consequences

- A new or renamed pipeline must update all three registries in the same change.
- Documentation drift now fails `check-machinery.sh`.
- Future generated registries may replace the repeated tables, but frontmatter validation and
  a clean generated-output check must remain.

## Links

- [[agent-loop-pipeline-categories]]
- [[agent-loop-system]]
