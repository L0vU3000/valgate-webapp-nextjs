# Drizzle Kit — Valgate guide

> Role: turns our Drizzle schema into versioned SQL **migrations** and applies them to Neon.
> Version pinned: `drizzle-kit` ^0.28 · Last verified: 2026-06-11 against orm.drizzle.team/docs.
> Decisions: D1 (Pool driver), D2 (flat-first from `schema.sql`), D8 (`id_counters`). Rollback: master-plan §12 (Neon branch-per-phase).
> Build phases: B0 (config), B1 (migration 0001 — all 26 tables + 19 enums).
> Official docs: https://orm.drizzle.team/docs/kit-overview
> Schema *definition* lives in [`drizzle.md`](./drizzle.md) — this doc is only about migrations.

---

## §0 — Cheat-sheet

```bash
# the daily loop
npx drizzle-kit generate     # diff schema/ → write a numbered SQL migration + snapshot
#   → open drizzle/NNNN_*.sql and READ it before applying  (§5)
npx drizzle-kit migrate      # apply pending migrations, log them in __drizzle_migrations
npx drizzle-kit check        # verify migration history is consistent (no collisions)

# dev-only shortcut (NEVER on the production branch — §5)
npx drizzle-kit push         # apply schema diff straight to the DB, no SQL file

npx drizzle-kit studio       # browse the DB in a local GUI
```

The five facts that matter most: **(1)** `generate` writes a file, `push` does not — we **commit migrations** (§5). **(2)** Every migration is first applied to a **fresh Neon branch**, never straight to production (§4, §12). **(3)** Never hand-edit a migration once it's applied (§5). **(4)** `check` guards migration-history consistency, **not** live-DB drift (§5). **(5)** Migration **0001** ports the whole `schema.sql` — 26 tables + 19 enums + `id_counters` ([B1](../01-master-implementation-plan.md)).

## §1 — Why it's in our stack

Drizzle ORM (D1) ships the schema *and* the migration tool from one source of truth: you edit `lib/db/schema/`, and Drizzle Kit diffs it into SQL. We use it because B1 needs a **reviewable, versioned, replayable** schema history — `schema.sql` is one-way-ish, and Neon's branch-per-phase rollback (§12) only works if each phase is one deterministic migration we can apply to a throwaway branch first. We rejected `push`-only (no file to review or revert — see D1's rejection of "codegen magic" reasoning) and hand-written SQL (drifts from the typed schema). Kit was never a separate decision: choosing Drizzle (D1) chose it.

## §2 — Setup in our stack

Already installed with the ORM (see [`drizzle.md`](./drizzle.md) §2): `npm i -D drizzle-kit`.

**`drizzle.config.ts`** (project root) — the single config Kit reads. Points at our split schema folder and the Neon `DATABASE_URL`:

```ts
import { defineConfig } from "drizzle-kit";
import { env } from "@/lib/env";            // validated DATABASE_URL — see env-nextjs.md

export default defineConfig({
  schema: "./lib/db/schema",                // the folder, not a single file — one file per domain (drizzle.md §2)
  out: "./drizzle",                         // migrations + snapshots land here, committed to git
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },// the Neon branch URL for THIS environment
  casing: "snake_case",                     // we write camelCase in TS, Postgres gets snake_case
  strict: true,                             // always ask before running destructive SQL
  verbose: true,                            // print the SQL it's about to run
});
```

`package.json` scripts (so nobody types the long form):

```jsonc
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:migrate":  "drizzle-kit migrate",
  "db:check":    "drizzle-kit check",
  "db:push":     "drizzle-kit push",       // dev branches only
  "db:studio":   "drizzle-kit studio"
}
```

> `DATABASE_URL` is **per-environment**: your `.env.local` points at your personal Neon dev branch, CI/prod point at theirs. The config never hard-codes a URL. Read it through `@t3-oss/env-nextjs` ([`env-nextjs.md`](./env-nextjs.md)), never `process.env`.

## §3 — Mental model (minimal)

Four ideas; follow §7 for the rest.

1. **Schema is the source; migrations are the diff.** You never write SQL by hand. You edit `lib/db/schema/`, run `generate`, and Kit emits the SQL that turns the *last snapshot* into the *current schema*.
2. **The `drizzle/` folder is an append-only ledger.** Each `generate` adds a numbered `NNNN_name.sql` + a `meta/NNNN_snapshot.json`, tracked in `meta/_journal.json`. All of it is committed. The snapshot is how the *next* `generate` knows what changed.
3. **`generate` ≠ `apply`.** `generate` only writes files (no DB connection needed). `migrate` connects and runs the unapplied ones, recording each in the `__drizzle_migrations` table so it never double-applies.
4. **`push` is the no-file shortcut.** It diffs schema→DB and applies it live, skipping the file. Great for iterating on a dev branch; forbidden anywhere we need a reviewable history (§5).

## §4 — How we use it in Valgate

### The workflow (generate → review → migrate)

This is the loop for **every** schema change after B1:

```bash
# 1. edit lib/db/schema/<domain>.ts  (add a column, a table, an enum value)
npm run db:generate                 # writes drizzle/0002_<name>.sql + its snapshot
#    ── OPEN drizzle/0002_<name>.sql and read every statement (§5) ──
npm run db:migrate                  # applies it to the Neon branch in DATABASE_URL
npm run db:check                    # history still consistent
git add drizzle/                    # the SQL + snapshot are part of the PR
```

`generate` runs offline — it only needs the schema files. `migrate` is the only step that touches the database, and it targets **whatever branch `DATABASE_URL` points at** — which is the whole rollback story:

### Branch-per-phase (the rollback contract — §12)

> Every migration is applied to a **fresh Neon branch first**. The production branch gets it **only after the phase's accept-gate passes**. A bad migration = delete the branch; nothing real was touched.

```bash
# point DATABASE_URL at a throwaway branch off production, then:
npm run db:migrate          # prove it applies cleanly on a fresh branch
# run the phase's accept-gate (B1: table count = 27, all FKs/indexes present)
# ── only once green ── repoint DATABASE_URL at the production branch and migrate there
```

This is why we use `generate`+`migrate` (replayable files) and not `push` for anything that reaches production: the *same* committed SQL runs on the throwaway branch and on production, so "it worked on the test branch" actually means something.

### Migration 0001 — the B1 port

B1 is one migration that ports the entire `reference/schema/schema.sql` into Drizzle and emits the DDL: **26 tables + 19 enums + the `id_counters` table** (D8), with the D5–D8 + D14 tightenings applied in the schema definitions ([`drizzle.md`](./drizzle.md) §4). You don't write its SQL — you write the `pgTable`/`pgEnum` definitions across the eight domain files, then:

```bash
npm run db:generate            # → drizzle/0001_init.sql  (all 27 tables, 19 enum types, every FK + index)
# read it: every CREATE TYPE, every CREATE TABLE, every CREATE INDEX from §7 of the plan
npm run db:migrate             # apply to a FRESH Neon branch (§12)
npm run db:check               # no collisions
```

**B1 accept-gate** (from the plan): migration applies cleanly on a fresh branch; `drizzle-kit check` reports no drift in history; table count = **27** (26 + `id_counters`); every FK and index from plan §7 is present (verify with an `information_schema` query script). Run `/careful` before writing it — schema is one-way-ish — and `/review` after.

### `push` for dev iteration only

When you're still shaping a table and don't want a migration per keystroke, `push` on **your own dev branch** is fine:

```bash
npm run db:push        # diff schema → your dev branch, no file
```

Once the shape settles, throw away the pushed branch, `generate` the real migration from the final schema, and commit *that*. Nothing that `push` did is ever the thing production runs.

## §5 — Gotchas & version traps

- **🔴 `generate` vs `push` — the one to internalise.** `generate` writes a committed SQL file; `push` mutates the DB with no file. We **commit migrations** so the production branch runs reviewed, replayable SQL (§4/§12). `push` is dev-branch scratch only. Mixing them — `push`-ing a change then later `generate`-ing — makes the next diff lie, because the snapshot and the live DB disagree.
- **🔴 Never hand-edit an applied migration.** Once a `NNNN_*.sql` has run (locally or anywhere), it's immutable history. Editing it desyncs it from its `meta/NNNN_snapshot.json`, and `migrate` won't re-run it (it's logged in `__drizzle_migrations`). To change something: edit the *schema* and `generate` a **new** migration.
- **`check` is history-consistency, not live drift.** `drizzle-kit check` walks the generated migrations and flags collisions (e.g. two branches that both created `0002`) — it does **not** compare against the actual database. "No drift" in our accept-gates means *migration history is consistent*; to confirm the DB matches, apply on a fresh branch and run the `information_schema` count check.
- **Idempotency comes from the fresh branch, not the SQL.** Re-running `migrate` on the *same* branch is a no-op (already logged). "Applies cleanly twice" (B1 gate) means apply to two *different* fresh branches — that's what proves determinism. Don't expect a single migration's raw SQL to be re-runnable.
- **`DATABASE_URL` is the safety pin.** `migrate`/`push` hit exactly the branch in `DATABASE_URL`. Before any apply, confirm which branch you're pointed at — pushing to the wrong branch is the classic foot-gun. `strict: true` makes Kit prompt before destructive SQL.
- **Enums need care on change.** Adding an *enum value* generates an `ALTER TYPE ... ADD VALUE`; *removing/reordering* one is a manual, multi-step migration in Postgres. Our 19 enums (D2) are stable from `schema.sql`; treat enum edits as deliberate.
- **`casing: "snake_case"`** means you write `orgId` in TS and Postgres gets `org_id` automatically — don't also pass an explicit column name unless it differs, or you'll fight the config.

## §6 — Reusable patterns

**Add a column** (the everyday change):
1. Add the field to the `pgTable` in `lib/db/schema/<domain>.ts` ([`drizzle.md`](./drizzle.md) §4 — TEXT id, tightened type, nullable→`stripNulls` per [C6](./_conventions.md#c6)).
2. `npm run db:generate` → **read** the emitted `ALTER TABLE` in `drizzle/NNNN_*.sql`.
3. `npm run db:migrate` on a fresh branch → run the entity's goal-test ([C9](./_conventions.md#c9)).
4. `git add drizzle/` — the SQL + snapshot ship in the PR.

**The B1 migration-0001** (the big one, once):
```bash
# after all 8 domain files define their tables/enums + id_counters (drizzle.md §4)
npm run db:generate            # → drizzle/0001_init.sql
#   sanity: grep the file — 27 CREATE TABLE, 19 CREATE TYPE, every CREATE INDEX from plan §7
npm run db:migrate             # FRESH Neon branch first (§12)
npm run db:check               # history clean
node scripts/verify-schema.ts  # information_schema: table count = 27, all FKs/indexes present (B1 gate)
```

**Promote a verified migration to production** (every phase boundary — §12):
```bash
# accept-gate green on the throwaway branch ↓
DATABASE_URL=$PROD_BRANCH_URL npm run db:migrate   # same committed SQL, now on production
```

**A new entity's migration** is just "add a column" scaled up — see the full add-entity recipe in [`drizzle.md`](./drizzle.md) §6 (its step 2 is this doc's `generate → review → migrate`).

## §7 — Going deeper

- Kit overview & all commands — https://orm.drizzle.team/docs/kit-overview
- `generate` (files, snapshots, `--name`/`--custom`) — https://orm.drizzle.team/docs/drizzle-kit-generate
- `migrate` (`__drizzle_migrations`, apply order) — https://orm.drizzle.team/docs/drizzle-kit-migrate
- `push` (dev flow, `--force`/`--strict`) — https://orm.drizzle.team/docs/drizzle-kit-push
- `check` (history consistency) — https://orm.drizzle.team/docs/drizzle-kit-check
- Migrations for teams (branch collisions, what `check` catches) — https://orm.drizzle.team/docs/kit-migrations-for-teams
- `drizzle.config.ts` full reference — https://orm.drizzle.team/docs/drizzle-config-file
- Programmatic `migrate()` (if we run migrations from code instead of CLI) — https://orm.drizzle.team/docs/migrations
- Neon branching for rollback — master-plan §12; the driver itself in [`neon.md`](./neon.md); schema definition in [`drizzle.md`](./drizzle.md).
