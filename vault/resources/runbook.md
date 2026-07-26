---
title: Runbook — Valgate commands
type: doc
source: CLAUDE.md, package.json scripts, agent memory
tags: [ops, runbook, commands]
added: 2026-07-15
---

## Summary
The exact commands for the things you do rarely enough to forget. Pair with
[[gotchas]] — the traps around these are documented there.

## Database (Neon + Drizzle)
- Check connection: `npm run db:ping`
- Create a migration: `npm run db:generate` — ⚠️ generate is flaky; often
  hand-author SQL in `lib/db/migrations/` (see [[gotchas]]).
- Apply migrations (dev): `npm run db:migrate`
- Apply migrations (prod): `drizzle-kit migrate` with prod `DATABASE_URL`.
  **Deploys do NOT run this automatically.**
- Seed (first-time only): `npm run seed:neon` — ⚠️ single-tenant/destructive,
  never for a 2nd account. **Never `seed:reset`.**

## Bring-up order (fresh DB)
`db:ping` → `db:migrate` → `seed:neon`

## Tests
- Unit / authz: `npm run test` (Vitest, `tests/authz/`)
- E2E: `npm run dev:e2e` (server) + a **Node ≥ 24** runner; `workers:1`.
  Never use `networkidle` on the dev server. See [[gotchas]].
- Real-Clerk E2E: the `auth` Playwright project on port 3002 (`test:e2e:auth`).

## Knowledge layers
- Refresh graph: `graphify update .` (free)
- Refresh wiki: `openwiki code --update` (tokens, when docs drift)

## Links
- [[gotchas]] · [[error-log]] · [[obsidian]]
