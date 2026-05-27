-- Shared demo org + user for tests (Clerk-shaped ids). Include in transaction before domain inserts.
-- Usage: \i is not used; copy/paste block or call from flows.

-- org
INSERT INTO organizations (id, clerk_org_id, slug, name, created_at, updated_at)
VALUES ('org_demo', 'org_demo', 'demo', 'Demo Organization', 1, 1);

-- user
INSERT INTO users (id, clerk_user_id, primary_email, display_name, created_at, updated_at)
VALUES ('user_demo', 'user_demo', 'demo@valgate.test', 'Demo User', 1, 1);

-- membership
INSERT INTO org_memberships (
  id, org_id, user_id, role, status, created_at, updated_at
) VALUES (
  'om_demo', 'org_demo', 'user_demo', 'org:admin', 'active', 1, 1
);
