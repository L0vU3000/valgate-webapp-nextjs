---
title: Entity Scaffold Needs an Approved Contract
type: decision
status: accepted
source: agent-loop pipeline design
tags: [agent-loop, backend, drizzle, scope]
added: 2026-07-16
---

## Context

The product's entity and field catalog is still being reviewed after the scope reduction.
An entity-building loop cannot safely choose which concepts belong in the product or which
fields survive that review.

## Decision

`entity-scaffold` accepts one explicitly approved, organization-scoped property child with
a complete field contract. It refuses field-only changes, identity and cross-organization
tables, join tables, self-references, backfills, destructive migrations, UI work, and
speculative entities.

The first real run stops after Plan for owner approval. The pipeline may automate the
mechanical path from Zod through Drizzle, services, actions, seed fixtures, and tests; it
may not decide the domain model.

## Why

This makes the done-check factual: all layers match one contract, the migration is additive,
live CRUD is organization-isolated, and the repository gates stay green. Product necessity
remains an owner decision.

## Revisit when

A second entity shape repeats often enough to justify a separate template, or the entity and
field review establishes a stable domain contract broader than property-child CRUD.

## Links

- [[agent-loop-pipeline-categories]]
- [[open-questions]]
- [[tasks]]
