-- L3: Successor + property assignment + estate activity event
BEGIN;

INSERT INTO organizations (id, clerk_org_id, name, created_at, updated_at)
VALUES ('org_flow_4', 'org_flow_4', 'Flow 4 Org', 1, 1);
INSERT INTO users (id, clerk_user_id, primary_email, created_at, updated_at)
VALUES ('user_flow_4', 'user_flow_4', 'f4@test.com', 1, 1);
INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at)
VALUES ('om_flow_4', 'org_flow_4', 'user_flow_4', 'org:admin', 'active', 1, 1);

INSERT INTO properties (
  id, org_id, created_by_user_id, name, code, type, status, health, lat, lng, province,
  buy_numeric, total_area, title, created_at, updated_at
) VALUES (
  'PROP-FLOW-4', 'org_flow_4', 'user_flow_4', 'Estate Asset', 'EST-01', 'land', 'Vacant', 60,
  11.56, 104.93, 'Phnom Penh', 400000, '300', 'Hard title',
  1700000000000, 1700000000000
);

INSERT INTO successors (
  id, org_id, name, initials, relation, role, share, verified,
  created_at, updated_at
) VALUES (
  'succ-1', 'org_flow_4', 'Jane Doe', 'JD', 'Child', 'primary', 100, TRUE,
  1700000000000, 1700000000000
);

INSERT INTO successor_property_assignments (
  id, org_id, successor_id, property_id, created_at, updated_at
) VALUES (
  'spa-1', 'org_flow_4', 'succ-1', 'PROP-FLOW-4', 1700000000000, 1700000000000
);

INSERT INTO estate_activity_events (
  id, org_id, kind, title, description, property_id, created_at, updated_at
) VALUES (
  'eae-1', 'org_flow_4', 'successor.assigned', 'Successor linked',
  'Jane Doe assigned to Estate Asset', 'PROP-FLOW-4',
  1700000000000, 1700000000000
);

DO $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM successor_property_assignments
  WHERE successor_id = 'succ-1' AND property_id = 'PROP-FLOW-4';
  PERFORM test_assert_eq(n, 1, 'successor assignment exists');
END;
$$;

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'flow 04_estate_successor: OK'; END; $$;
