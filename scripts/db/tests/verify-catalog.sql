-- L1: Expected catalog objects exist after schema apply
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'organizations', 'users', 'org_memberships',
    'properties', 'tenants', 'leases', 'payments', 'expenses',
    'folders', 'documents', 'inspections', 'certifications', 'safety_risks',
    'emergency_contacts', 'maintenance_items', 'property_valuations',
    'land_parcels', 'co_owners', 'ownership_records', 'ownership_documents',
    'ownership_history', 'successors', 'successor_property_assignments',
    'estate_activity_events', 'professionals', 'user_profiles',
    'notifications', 'notification_preferences'
  ];
  t TEXT;
  cnt INT;
BEGIN
  FOREACH t IN ARRAY expected_tables LOOP
    SELECT COUNT(*) INTO cnt
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t;
    PERFORM test_assert(cnt = 1, 'missing table: ' || t);
  END LOOP;

  SELECT COUNT(*) INTO cnt FROM pg_type WHERE typname = 'property_status';
  PERFORM test_assert(cnt = 1, 'missing enum property_status');

  SELECT COUNT(*) INTO cnt
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND table_name = 'properties'
    AND constraint_type = 'FOREIGN KEY';
  PERFORM test_assert(cnt >= 1, 'properties should have FK to organizations');

  RAISE NOTICE 'catalog: % tables + enums OK', array_length(expected_tables, 1);
END;
$$;
