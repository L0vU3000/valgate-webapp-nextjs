-- L2: CHECK / enum constraints reject invalid data
BEGIN;

INSERT INTO organizations (id, clerk_org_id, name, created_at, updated_at)
VALUES ('org_c', 'org_c', 'Constraint Org', 1, 1);
INSERT INTO users (id, clerk_user_id, primary_email, created_at, updated_at)
VALUES ('user_c', 'user_c', 'c@test.com', 1, 1);
INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at)
VALUES ('om_c', 'org_c', 'user_c', 'org:admin', 'active', 1, 1);

DO $$
BEGIN
  INSERT INTO properties (
    id, org_id, name, code, type, status, health, lat, lng, province,
    buy_numeric, total_area, title, created_at, updated_at
  ) VALUES (
    'p-bad-health', 'org_c', 'X', 'C1', 'land', 'Vacant', 101,
    11.5, 104.9, 'Phnom Penh', 1, '100', 'Hard title', 1, 1
  );
  PERFORM test_fail('health > 100 should be rejected');
EXCEPTION
  WHEN check_violation THEN NULL;
END;
$$;

DO $$
BEGIN
  INSERT INTO properties (
    id, org_id, name, code, type, status, health, lat, lng, province,
    buy_numeric, total_area, title, created_at, updated_at
  ) VALUES (
    'p-bad-lat', 'org_c', 'X', 'C2', 'land', 'Vacant', 50,
    95, 104.9, 'Phnom Penh', 1, '100', 'Hard title', 1, 1
  );
  PERFORM test_fail('lat > 90 should be rejected');
EXCEPTION
  WHEN check_violation THEN NULL;
END;
$$;

INSERT INTO properties (
  id, org_id, created_by_user_id, name, code, type, status, health, lat, lng, province,
  buy_numeric, total_area, title, created_at, updated_at
) VALUES (
  'p-ok', 'org_c', 'user_c', 'OK', 'C3', 'land', 'Vacant', 50,
  11.5, 104.9, 'Phnom Penh', 100000, '500', 'Hard title', 1, 1
);

DO $$
BEGIN
  INSERT INTO property_valuations (
    id, org_id, property_id, month, price, recorded_at
  ) VALUES (
    'pv-bad', 'org_c', 'p-ok', '2026-01', 100, 1
  );
  PERFORM test_fail('month regex should reject YYYY-MM');
EXCEPTION
  WHEN check_violation THEN NULL;
END;
$$;

INSERT INTO property_valuations (
  id, org_id, property_id, month, price, recorded_at
) VALUES (
  'pv-ok', 'org_c', 'p-ok', 'Jan 2026', 100000, 1700000000000
);

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'constraints: CHECK / regex OK'; END; $$;
