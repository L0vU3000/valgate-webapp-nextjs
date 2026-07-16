---
title: Gotchas — Valgate landmines
type: doc
source: consolidated from agent memory, .context handoffs, docs/migration
tags: [gotchas, ops, backend, database, deploy]
added: 2026-07-15
---

## Summary
The traps that bite. Read before touching the database, deploys, or E2E. Each
line is a mistake someone already made so you don't have to.

## Database & seeding
- **NEVER run `seed:reset`.** It destroys the evolved seed data (the real dev/demo
  source of truth). No undo.
- **`seed:neon` is single-tenant and destructive.** Never run it for a second
  account — it hijacks `ORG-0001`. It's a first-time bootstrap only.
- **`drizzle-kit generate` is broken here** — hand-author migration SQL under
  `lib/db/migrations/` instead of relying on generate.
- **Don't infer a "missing entity" from a missing schema filename.** Valuations
  live in `property.ts` as `property_valuations` — there is no `valuation.ts`. Before
  scaffolding any "new" entity, grep `lib/services/*`, `app/actions/*`, and the
  `lib/data/derivations/*` for the concept, not just for a same-named table. A
  `valuations` entity was nearly scaffolded as a duplicate on this premise.
- **Migration `when` timestamps must be monotonic.** A hand-authored migration
  with a `when` larger than the next one makes drizzle **silently skip** the
  later one. A "Failed query / missing column" is then a *real* skipped
  migration, not a transient error. Verify live schema via the Neon MCP.

## Deploys
- **Deploys do NOT auto-run `db:migrate`.** Prod can fall a migration behind →
  every authenticated page 500s (SSR). After a schema change, run
  `drizzle-kit migrate` against the prod `DATABASE_URL` manually. See
  [[prod-migration-drift]] in the error log.
- **Env vars must be set in Vercel for prod**, or features fail silently:
  `OPENAI_API_KEY` (AI summaries + Khmer scan), MCP flags, etc.

## Auth (Clerk)
- **Clerk uses the Future / signals API here**, not the classic one.
  `signIn.password/finalize`, `signUp.verifications.*` — the classic
  `create` / `attemptFirstFactor` / `setActive` do **not** exist in the
  installed version.
- **Demo mode + `currentUser()` crash**: a code path can crash under demo mode
  that `next build` does **not** catch — only live QA surfaces it. Test the
  real app, not just the build.

## E2E / testing
- **Never use `networkidle`** on the dev server — it never settles; tests hang.
- **Use the Node ≥ 24 runner** for Playwright (Node 22 + PW 1.61 has a loader
  bug). See [[runbook]] for the exact command.

## MCP (production)
- Prod gotchas: set `MCP_ALLOW_ANY_OAUTH_CLIENT=true`, mind `/mcp` vs `/api/mcp`,
  and point the branded consent URL at the right origin.

## Links
- [[error-log]] · [[runbook]] · [[obsidian]]
