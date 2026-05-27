# How to test the database (prototype schema)

This repo tests **`docs/database/prototype/schema.sql`** against a real Postgres instance.  
Tests report **only what ran** — pass, fail, or observed SQL error. No separate “known issues” list.

---

## What gets tested today

| Step | Script | Proves |
|------|--------|--------|
| **1. Apply DDL** | `scripts/db/apply-schema.sh` | `schema.sql` runs on an empty database without error |
| **2. Catalog** | `scripts/db/tests/verify-catalog.sql` | Expected tables and key FKs exist after apply |
| **3. Constraints** | `scripts/db/tests/constraints.sql` | Declared `CHECK`/regex rules reject invalid rows |
| **4. Flows** | `scripts/db/tests/flows/*.sql` | Declared multi-table insert paths succeed (incl. Clerk membership seed) |

Identity model: [`identity.md`](./identity.md)

Add more files under `scripts/db/tests/` when you need new coverage.

---

## Run locally

```bash
# Start Postgres (port 5433)
docker compose -f docker-compose.db-test.yml up -d

# Apply schema + run all tests (Docker/psql, or embedded Postgres fallback)
npm run db:test

# Force embedded Postgres (no Docker)
npm run db:test:node

# Stop and remove data
docker compose -f docker-compose.db-test.yml down -v
```

**Scripts**

| npm script | Does |
|------------|------|
| `npm run db:test` | Docker wait (if available) → apply schema → run tests |
| `npm run db:apply` | Drop `public`, re-apply `schema.sql` only |
| `npm run db:test:sql` | Run tests only (schema must already be applied) |

**Connection** (defaults match `docker-compose.db-test.yml`):

```bash
export DATABASE_URL=postgresql://valgate:valgate@localhost:5433/valgate_test
WAIT_DOCKER=0 npm run db:test   # skip Docker startup if DB already up
```

**Neon:** point `DATABASE_URL` at a disposable branch and run the same commands (`WAIT_DOCKER=0`).

---

## How to read results

- **Exit code 0** — all scripts finished; every `test_assert` passed.
- **Exit code non-zero** — failed at first `ON_ERROR_STOP` error (DDL typo, missing table, failed assertion).
- **`RAISE NOTICE`** — informational (e.g. flow completed); not a failure.
- **`WARNING`** — not used by the default suite; avoid unless you add tests that emit them intentionally.

Fix the schema (or the test, if the expectation was wrong). Re-run `npm run db:test`.

---

## How to add a test

See [`writing-a-test.md`](./writing-a-test.md).

Short version:

1. Add `scripts/db/tests/flows/04_your_flow.sql` (or `constraints`, `rules`).
2. Use `BEGIN` … `ROLLBACK` so runs are repeatable.
3. Call `test_assert` / `test_assert_eq` from `00_helpers.sql`.
4. Register the file in `scripts/db/run-tests.sh`.
5. Run `npm run db:test` and use the **failure message** as the issue description.

---

## Optional tooling (later)

| Tool | Use when |
|------|----------|
| [Atlas](https://atlasgo.io/) | Diff migrations vs `schema.sql` |
| [Squawk](https://github.com/sbdchd/squawk) | Lint migration SQL in CI |
| pgTAP | Rich in-database assertions |

Not required for the current harness.

---

## Files

| Path | Role |
|------|------|
| `docs/database/prototype/schema.sql` | DDL under test |
| `scripts/db/` | Apply + test runners |
| `docker-compose.db-test.yml` | Local Postgres 16 |
| `docs/database/writing-a-test.md` | Conventions for new tests |
