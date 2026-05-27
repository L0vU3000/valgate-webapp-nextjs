# Writing a database test

Tests live in `scripts/db/tests/`. They must be **executable** and **falsifiable** — no speculative issue lists.

---

## Helpers

Loaded first by `run-tests.sh`:

```sql
SELECT test_assert(condition, 'message');
SELECT test_assert_eq(actual, expected, 'message');
```

Failure stops the suite (`ON_ERROR_STOP=1`).

---

## Constraint test (single table / CHECK)

Prove the database rejects invalid data **when the schema declares a constraint**:

```sql
BEGIN;

INSERT INTO users (id) VALUES ('u-1');

DO $$
BEGIN
  INSERT INTO properties (..., health, ...) VALUES (..., 101, ...);
  PERFORM test_fail('expected CHECK on health to fail');
EXCEPTION
  WHEN check_violation THEN NULL;
END;
$$;

ROLLBACK;
```

`EXCEPTION` handlers must be inside `DO $$ … $$` (PL/pgSQL), not plain SQL `BEGIN`.

If the insert **succeeds**, the test fails — that is a **test-proven** issue: the declared rule is not enforced.

---

## Flow test (happy path)

Prove a multi-step path **works** with current DDL:

```sql
BEGIN;

INSERT INTO users (id) VALUES ('u-flow');
-- … inserts across tables …

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM payments WHERE lease_id = 'lease-1';
  PERFORM test_assert_eq(n, 1, 'payment row exists after flow');
END;
$$;

ROLLBACK;
```

If any step errors, Postgres reports the exact failure (FK, NOT NULL, enum, etc.) — that is your issue.

---

## Rule test (optional, product-defined)

Use only when **you have written down a rule** the product must enforce.  
File naming: `scripts/db/tests/rules/<short-name>.sql`

Template:

```sql
-- RULE: <one sentence, decided by team>
-- ACTION: <what SQL does>
-- EXPECT: <reject | accept>

BEGIN;

-- setup …

BEGIN
  -- ACTION
  INSERT INTO …;
  PERFORM test_fail('EXPECTED reject but INSERT succeeded');
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OBSERVED: rejected by CHECK';
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'OBSERVED: rejected by FK';
END;

ROLLBACK;
```

Register in `run-tests.sh` only after the rule is agreed.

---

## Register and run

1. Add the `.sql` file.
2. Append to `scripts/db/run-tests.sh`:

```bash
run_sql "${TESTS_DIR}/flows/04_my_flow.sql"
```

3. Run:

```bash
npm run db:test
```

Document failures from terminal output — not from guesswork.
