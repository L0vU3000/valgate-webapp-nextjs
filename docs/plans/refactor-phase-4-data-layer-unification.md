# Refactor Phase 4 — Data Layer Unification

**Goal:** one source of truth (Neon/Drizzle) — retire the filesystem fallback and the clients dual-write, fix the service import cycle, and de-boilerplate the cache wrappers.
**Risk:** HIGH. This touches persistence. Do it last, on a branch, with the backfill verified first.
**Effort:** Medium (1–2 days) — most of the work is verification, not code.

## Backend context (beginner-level)
The app currently has two places data can live: the real database (Neon Postgres, accessed through Drizzle) and JSON files on disk (`public/data/users/...`, written via `lib/data/db/_fs.ts`). "Dual-write" means every clients change is saved to both, which was the safe way to migrate — but two sources of truth eventually disagree, and on Vercel the file side writes to `/tmp`, which is wiped on every deploy. This phase makes the database the only writer, keeping the seed files as read-only demo data.

## Pre-flight (do first, abort phase if it fails)
1. Verify the clients backfill is complete: every FS client has a Drizzle row, field-by-field diff clean. Write a one-off `scripts/verify-clients-parity.ts` that prints mismatches; must print zero.
2. Check the seed-props gap from memory: seed properties still have `client_id = NULL` (Pro cockpit shows no real data). Decide whether to backfill those links in this phase — **recommendation: yes, do it here**, it is the same kind of work and unblocks the Pro cockpit.

## Targets

### 1. Retire the clients dual-write
- In `lib/services/*` (clients + `client-onboarding` split files from Phase 2): delete the FS write branch; Drizzle becomes the only writer.
- Reads: Drizzle only. The page-load backfill hook can be deleted once parity is verified.
- Keep `public/data/users/demo-user/` as read-only seed input for `seed:neon`. **Never `seed:reset`.**

### 2. Shrink `lib/data/db/_fs.ts` to read-only seed access
- Delete `writableRoot()` / the `/tmp/valgate-data` write path (writes to `/tmp` on Vercel were never durable anyway).
- Keep a minimal read-only `seedRoot()` reader for whatever still legitimately reads seed JSON (check callers: `auth-shim.ts` `getFsUserId()`, `dbdiagram/queries.ts`, backfill scripts).
- Backfill scripts in `scripts/` that exist only to migrate FS → DB: run them a final time if needed, then move to `scripts/completed/` with a README line, or delete.

### 3. Fix the import cycle
`lib/services/_change-request-dispatcher.ts ⇄ lib/services/change-requests.ts` — extract the shared types/helpers into `lib/services/change-request-types.ts` so the dependency points one way. Cycles make builds fragile and hide which module owns what.

### 4. Generic cached-read wrapper
`lib/data/cached-reads.ts` has 20+ near-identical `cachedListX()` functions. Replace with one explicit factory:
```ts
// long and readable on purpose — one place that explains the caching pattern
function createCachedList<T>(tag: string, loader: (orgId: string) => Promise<T[]>) { ... }
```
Keep the existing exported names (`cachedListLeases = createCachedList('leases', listLeases)`) so no call site changes. Cache tags must remain byte-identical — `revalidateFeTag()` (109 graph edges) depends on them.

## Guardrails
- One target per commit; deploy-preview and click through the Pro cockpit + owner flows after targets 1–2.
- `tests/authz/` and the e2e suite are the safety net — run after every target, not just at the end.
- If parity verification fails in pre-flight, stop and report; do not "fix forward".

## Done when
- Zero write paths to the filesystem outside `scripts/` seeding.
- Parity script prints zero mismatches; Pro cockpit shows real client data.
- Import cycle gone (`graphify update .` then check GRAPH_REPORT Import Cycles section is empty).
- tsc, lint, `npm run test`, full e2e green. `/cso` pass on the diff (ownership checks moved around).

## Execution prompt (paste into Sonnet)
> Execute docs/plans/refactor-phase-4-data-layer-unification.md on a branch. Run the pre-flight parity script FIRST and abort with a report if it finds mismatches. Then targets 1–4 in order, one commit each, running tests/authz + e2e after each. Never run seed:reset. Finish with /cso on the diff and `graphify update .`.

## Pre-flight execution record (2026-07-02)
`scripts/verify-clients-parity.ts` written and run (read-only). **Parity FAILED — phase halted per guardrail.**

Real-user (USR-0079) blockers:
1. `CLI-0006` "test sucess" — FS-only, no DB row. DECISION: import or delete?
2. `CLI-0010` — status drift: db=`inactive`, fs=`active`. DECISION: which wins?
3. `clientSince` FS-only data on CLI-0010/0011; no DB column for phone/preferredContact/clientSince/managementFeePct. Mechanical: add columns + backfill before retiring FS writes (seed clients also carry these fields, so seed:neon wants the columns too).

Not blockers: demo-user FS records are the seed corpus (expected FS-only); DB-only `CLI-0005` "ABC" is fine (DB is the target). Note: FS ids are per-user-dir scoped while DB ids are global — demo-user's CLI-0005/0006 collide with real ids; retirement removes this ambiguity entirely.

## Targets 3 & 4 execution record (2026-07-02)
- Target 3 DONE: `ChangeRequest` type moved to new `lib/services/change-request-types.ts`; dispatcher now imports the type from there (not from change-requests.ts); the dynamic `await import()` workaround in `approveChangeRequest` replaced with a normal static import (verified no entity service imports change-requests back). Cycle gone.
- Target 4 SKIPPED deliberately: wrappers are already one-line bodies; per-entity comments carry unique bust-call locations. A factory saves ~60 signature lines but violates the "long, explicit, commented backend code" style rule. Re-open only if wrapper count doubles.
- Targets 1 & 2 remain HALTED on the pre-flight decisions above.
