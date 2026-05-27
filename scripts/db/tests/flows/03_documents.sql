-- L3: Folder tree + document attach
BEGIN;

INSERT INTO organizations (id, clerk_org_id, name, created_at, updated_at)
VALUES ('org_flow_3', 'org_flow_3', 'Flow 3 Org', 1, 1);
INSERT INTO users (id, clerk_user_id, primary_email, created_at, updated_at)
VALUES ('user_flow_3', 'user_flow_3', 'f3@test.com', 1, 1);
INSERT INTO org_memberships (id, org_id, user_id, role, status, created_at, updated_at)
VALUES ('om_flow_3', 'org_flow_3', 'user_flow_3', 'org:admin', 'active', 1, 1);

INSERT INTO properties (
  id, org_id, created_by_user_id, name, code, type, status, health, lat, lng, province,
  buy_numeric, total_area, title, created_at, updated_at
) VALUES (
  'PROP-FLOW-3', 'org_flow_3', 'user_flow_3', 'Docs Test', 'DOC-01', 'residential', 'Owner-Occupied', 80,
  11.56, 104.93, 'Phnom Penh', 500000, '200', 'Soft title',
  1700000000000, 1700000000000
);

INSERT INTO folders (
  id, org_id, property_id, parent_folder_id, name, created_at
) VALUES
  ('fld-root', 'org_flow_3', 'PROP-FLOW-3', NULL, 'Legal', 1700000000000),
  ('fld-child', 'org_flow_3', 'PROP-FLOW-3', 'fld-root', 'Deeds', 1700000000000);

INSERT INTO documents (
  id, org_id, property_id, folder_id, name, kind,
  storage_id, uploaded_at
) VALUES (
  'doc-1', 'org_flow_3', 'PROP-FLOW-3', 'fld-child', 'title-deed.pdf', 'document',
  's3-key-abc', 1700000000000
);

DO $$
DECLARE
  prop TEXT;
BEGIN
  SELECT f.property_id INTO prop
  FROM documents d
  JOIN folders f ON f.id = d.folder_id
  WHERE d.id = 'doc-1';

  PERFORM test_assert_eq(prop, 'PROP-FLOW-3', 'document folder belongs to same property');
END;
$$;

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'flow 03_documents: OK'; END; $$;
