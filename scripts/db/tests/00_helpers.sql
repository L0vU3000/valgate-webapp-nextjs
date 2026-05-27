-- Test helpers (session-local). Included first by run-tests.sh
CREATE OR REPLACE FUNCTION test_fail(msg TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'TEST FAILED: %', msg;
END;
$$;

CREATE OR REPLACE FUNCTION test_assert(cond BOOLEAN, msg TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN
    PERFORM test_fail(msg);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_assert_eq(a ANYELEMENT, b ANYELEMENT, msg TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'TEST FAILED: % (got %, expected %)', msg, a, b;
  END IF;
END;
$$;

SELECT test_assert(TRUE, 'helpers loaded');
