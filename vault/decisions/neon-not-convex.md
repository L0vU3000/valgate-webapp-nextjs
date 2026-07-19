---
title: Decision — Neon + Drizzle, not Convex
type: decision
status: accepted
source: CLAUDE.md, agent memory, archive/convex
tags: [decision, backend, database]
added: 2026-07-15
---

## Decision
The live backend is **Neon (serverless Postgres) + Drizzle ORM**, accessed only
through `lib/services/*` (one module per entity) called from Server Actions.

## Why
- Relational data (orgs, users, properties, leases, documents) fits Postgres.
- Drizzle gives typed SQL without a heavy ORM; services keep queries in one place.
- Neon branches map cleanly to dev/prod environments.

## Consequence
- **`archive/convex/` is dead, parallel code.** The app does not call it. Do not
  add new backend code there or follow Convex patterns.
- All DB access flows: Component → Server Action → `lib/services/*` (Drizzle).
  Never query the DB from a component or route handler.

## Links
- [[gotchas]] (migration + seeding traps) · [[glossary]]
