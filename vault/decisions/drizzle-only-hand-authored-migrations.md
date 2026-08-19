---
title: Decision — Drizzle-only (dual-write retired) + hand-authored migrations
type: decision
status: accepted
source: agent memory (codebase refactor, 9 commits)
tags: [decision, backend, database, migrations]
added: 2026-07-15
---

## Decision
1. **Retire the filesystem + Drizzle dual-write.** Drizzle (Neon) is the single
   source of truth; the old dual-write to the local FS seed was removed.
2. **Hand-author migration SQL** under `lib/db/migrations/` because
   `drizzle-kit generate` is unreliable in this repo.

## Why
- Dual-writing meant two stores could disagree; collapsing to Drizzle-only
  removes that whole class of bug.
- `drizzle-kit generate` produced broken/empty migrations here, so relying on it
  was riskier than writing the SQL by hand.

## Consequence
- Every schema change is a hand-written migration; keep `when` timestamps
  monotonic or drizzle silently skips later files (see [[gotchas]]).
- The FS seed (`public/data/...`) is now demo/read data, not a write target.

## Links
- [[neon-not-convex]] · [[gotchas]] · [[runbook]]
