-- L3: Tenant → lease → payment chain
BEGIN;

INSERT INTO organizations (id, clerk_org_id, name, created_at, updated_at)
VALUES ('org_flow_2', 'org_flow_2', 'Flow 2 Org', 1, 1);
INSERT INTO users (id, clerk_user_id, primary_email, created_at, updated_at)
VALUES ('user_flow_2', 'user_flow_2', 'f2@test.com', 1, 1);
INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at)
VALUES ('om_flow_2', 'org_flow_2', 'user_flow_2', 'org:admin', 'active', 1, 1);

INSERT INTO properties (
  id, org_id, created_by_user_id, name, code, type, status, health, lat, lng, province,
  buy_numeric, total_area, title, created_at, updated_at
) VALUES (
  'PROP-FLOW-2', 'org_flow_2', 'user_flow_2', 'Unit Block', 'BKK-02', 'multi-unit', 'Rented', 90,
  11.55, 104.92, 'Phnom Penh', 890000, '450', 'Hard title',
  1700000000000, 1700000000000
);

INSERT INTO tenants (
  id, org_id, property_id, name, unit, rent, status
) VALUES (
  'ten-1', 'org_flow_2', 'PROP-FLOW-2', 'Chan D.', '3B', 1200, 'Paid'
);

INSERT INTO leases (
  id, org_id, property_id, tenant_id, unit, stage,
  start_date, end_date, monthly_rent, term_months
) VALUES (
  'lease-1', 'org_flow_2', 'PROP-FLOW-2', 'ten-1', '3B', 'Signed',
  1700000000000, 1735689600000, 1200, 12
);

INSERT INTO payments (
  id, org_id, property_id, lease_id, tenant_id, date,
  kind, amount, method, status
) VALUES (
  'pay-1', 'org_flow_2', 'PROP-FLOW-2', 'lease-1', 'ten-1', 1700000000000,
  'Rent', 1200, 'Bank transfer', 'Paid'
);

DO $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM payments p
  JOIN leases l ON l.id = p.lease_id
  WHERE p.id = 'pay-1' AND p.property_id = l.property_id;
  PERFORM test_assert_eq(n, 1, 'payment property matches lease property');
END;
$$;

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'flow 02_lease_payment: OK'; END; $$;
