-- L3: Clerk-shaped multi-org membership (Bobby / Alice pattern from identity.md)
BEGIN;

INSERT INTO organizations (id, clerk_org_id, slug, name, created_at, updated_at) VALUES
  ('org_a', 'org_a', 'org-a', 'Organization A', 1, 1),
  ('org_b', 'org_b', 'org-b', 'Organization B', 1, 1),
  ('org_c', 'org_c', 'org-c', 'Organization C', 1, 1);

INSERT INTO users (id, clerk_user_id, primary_email, display_name, created_at, updated_at) VALUES
  ('user_owner', 'user_owner', 'owner@test.com', 'Owner', 1, 1),
  ('user_bobby', 'user_bobby', 'bobby@test.com', 'Bobby', 1, 1),
  ('user_alice', 'user_alice', 'alice@test.com', 'Alice', 1, 1);

INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at) VALUES
  ('om_owner_a', 'org_a', 'user_owner', 'org:admin', 'active', 1, 1),
  ('om_bobby_a', 'org_a', 'user_bobby', 'org:asset_manager', 'active', 1, 1),
  ('om_bobby_c', 'org_c', 'user_bobby', 'org:asset_manager', 'active', 1, 1),
  ('om_alice_a', 'org_a', 'user_alice', 'org:lawyer', 'active', 1, 1),
  ('om_alice_b', 'org_b', 'user_alice', 'org:lawyer', 'active', 1, 1),
  ('om_alice_c', 'org_c', 'user_alice', 'org:lawyer', 'active', 1, 1);

DO $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM org_memberships WHERE user_id = 'user_bobby';
  PERFORM test_assert_eq(n, 2, 'Bobby has two org memberships');

  SELECT COUNT(*) INTO n FROM org_memberships WHERE user_id = 'user_alice';
  PERFORM test_assert_eq(n, 3, 'Alice has three org memberships');

  SELECT COUNT(*) INTO n
  FROM org_memberships
  WHERE user_id = 'user_bobby' AND org_id = 'org_b';
  PERFORM test_assert_eq(n, 0, 'Bobby is not a member of org_b');
END;
$$;

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'flow 05_clerk_membership_seed: OK'; END; $$;
