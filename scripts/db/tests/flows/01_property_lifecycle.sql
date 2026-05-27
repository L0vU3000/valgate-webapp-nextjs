-- L3: Property + land + co-owner + valuation happy path
BEGIN;

INSERT INTO organizations (id, clerk_org_id, name, created_at, updated_at)
VALUES ('org_flow_1', 'org_flow_1', 'Flow 1 Org', 1, 1);
INSERT INTO users (id, clerk_user_id, primary_email, created_at, updated_at)
VALUES ('user_flow_1', 'user_flow_1', 'f1@test.com', 1, 1);
INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at)
VALUES ('om_flow_1', 'org_flow_1', 'user_flow_1', 'org:admin', 'active', 1, 1);

INSERT INTO properties (
  id, org_id, created_by_user_id, name, code, type, status, health, lat, lng, province,
  buy_numeric, total_area, title, created_at, updated_at
) VALUES (
  'PROP-FLOW-1', 'org_flow_1', 'user_flow_1', 'River Plot', 'PP-001', 'land', 'Vacant', 72,
  11.5564, 104.9282, 'Phnom Penh', 1278000, '850', 'Hard title',
  1700000000000, 1700000000000
);

INSERT INTO land_parcels (
  id, org_id, property_id, size_m2, terrain_type
) VALUES (
  'lp-1', 'org_flow_1', 'PROP-FLOW-1', 850, 'Flat'
);

INSERT INTO co_owners (
  id, org_id, property_id, name, role, share_percent
) VALUES
  ('co-1', 'org_flow_1', 'PROP-FLOW-1', 'Alice', 'Primary', 60),
  ('co-2', 'org_flow_1', 'PROP-FLOW-1', 'Bob', 'Minor', 40);

INSERT INTO property_valuations (
  id, org_id, property_id, month, price, recorded_at
) VALUES (
  'val-1', 'org_flow_1', 'PROP-FLOW-1', 'May 2026', 1300000, 1700000000000
);

DO $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM properties WHERE id = 'PROP-FLOW-1';
  PERFORM test_assert_eq(n, 1, 'property row exists');

  SELECT COUNT(*) INTO n FROM co_owners WHERE property_id = 'PROP-FLOW-1';
  PERFORM test_assert_eq(n, 2, 'co_owners inserted');

  SELECT SUM(share_percent) INTO n FROM co_owners WHERE property_id = 'PROP-FLOW-1';
  PERFORM test_assert_eq(n::INT, 100, 'shares sum to 100 in happy path');
END;
$$;

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'flow 01_property_lifecycle: OK'; END; $$;
