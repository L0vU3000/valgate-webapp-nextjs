-- =====================================================================
-- Valgate — PostgreSQL DDL for ER diagramming (erflow.io / dbdiagram / etc.)
-- Generated 2026-05-08 from lib/data/types/*.ts (Zod schemas, current state).
-- Source of truth: ref/07-entity-fields.md  ·  Migration plan: ref/08
--
-- Conventions
--   id columns: TEXT (current code uses prefixed strings like "PROP-0001").
--               In Convex migration these become UUIDs (v.id("…")).
--   Timestamps: BIGINT (Unix ms epoch) — matches current code.
--   Anomalies: see comments tagged A1 / A2 / A3 etc. — full list in ref/07 §5.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM types (alphabetical)
-- ---------------------------------------------------------------------
CREATE TYPE co_owner_role          AS ENUM ('Primary','Minor');
CREATE TYPE distribution_method    AS ENUM ('Pro-Rata by Share','Equal Split','Custom');
CREATE TYPE document_kind          AS ENUM ('photo','document');
CREATE TYPE estate_activity_kind   AS ENUM (
  'successor.created','successor.updated','successor.deleted','successor.assigned',
  'document.added','document.removed','estate.reviewed'
);
CREATE TYPE expense_category       AS ENUM ('Maintenance','Utilities','Insurance','Tax','Management','Other');
CREATE TYPE holding_type           AS ENUM ('Tenancy in Common','Joint Tenancy','Sole Ownership','Trust','LLC','Other');
CREATE TYPE lease_stage            AS ENUM ('Approaching','Offered','Signed','Declined');
CREATE TYPE maintenance_severity   AS ENUM ('Emergency','Urgent','Standard');
CREATE TYPE maintenance_status     AS ENUM ('Open','InProgress','Resolved');
CREATE TYPE notification_category  AS ENUM ('MAINTENANCE','LEASING','COMPLIANCE','PAYMENT','APPLICATIONS');
CREATE TYPE payment_kind           AS ENUM ('Rent','Fee','Deposit','Refund');
CREATE TYPE payment_status         AS ENUM ('Paid','Pending','Failed','Overdue');
CREATE TYPE property_status        AS ENUM ('Rented','Vacant','For Sale','Sold','Archived','Owner-Occupied');
CREATE TYPE property_title         AS ENUM ('Hard title','Soft title','—');
CREATE TYPE property_type_choice   AS ENUM (
  'residential','commercial','multi-unit','retail','land','industrial','construction','other'
);
CREATE TYPE successor_role         AS ENUM ('primary','contingent');
CREATE TYPE tax_entity             AS ENUM ('Individual','S-Corp','C-Corp','LLC','Partnership','Trust','Other');
CREATE TYPE tenant_status          AS ENUM ('Paid','Overdue','Pending');
CREATE TYPE terrain_type           AS ENUM ('Flat','Rolling','Hilly','Mountainous','Mixed');

-- ---------------------------------------------------------------------
-- users (stub — no Convex table today; userId is the Clerk subject)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id   TEXT PRIMARY KEY              -- e.g. "demo-user"
);

-- ---------------------------------------------------------------------
-- properties — central aggregate
-- ---------------------------------------------------------------------
CREATE TABLE properties (
  id                       TEXT PRIMARY KEY,                                -- "PROP-0001"
  user_id                  TEXT NOT NULL REFERENCES users(id),
  name                     TEXT NOT NULL,
  code                     TEXT NOT NULL,
  type                     property_type_choice NOT NULL,
  status                   property_status NOT NULL,
  health                   INT  NOT NULL CHECK (health BETWEEN 0 AND 100),  -- Q5.K: drop after Q3.I
  lat                      DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90  AND 90),
  lng                      DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  is_archived              BOOLEAN,
  -- location
  address_line             TEXT,
  address_line2            TEXT,
  city                     TEXT,
  zip                      TEXT,
  country                  TEXT,
  province                 TEXT NOT NULL,
  -- finance
  purchase_price           TEXT,                                            -- A2: should be NUMERIC; Q5.P
  purchase_date            BIGINT,                                          -- ms
  current_market_value     NUMERIC CHECK (current_market_value     >= 0),
  outstanding_mortgage     NUMERIC CHECK (outstanding_mortgage     >= 0),
  monthly_payment          NUMERIC CHECK (monthly_payment          >= 0),
  interest_rate            NUMERIC CHECK (interest_rate            >= 0),
  annual_property_tax      NUMERIC CHECK (annual_property_tax      >= 0),
  tax_assessment_value     NUMERIC CHECK (tax_assessment_value     >= 0),
  annual_insurance         NUMERIC CHECK (annual_insurance         >= 0),
  ownership_status         TEXT,
  buy_numeric              NUMERIC NOT NULL CHECK (buy_numeric >= 0),       -- canonical purchase $
  -- media / specs
  photo_storage_ids        TEXT[],
  document_storage_ids     TEXT[],
  total_area               TEXT NOT NULL,                                   -- A2: should be NUMERIC
  year_built               TEXT,                                            -- A2: should be INT
  bedrooms                 TEXT,                                            -- A2: should be INT
  bathrooms                TEXT,                                            -- A2: should be INT
  parking_spaces           TEXT,                                            -- A2
  storage_unit             TEXT,
  title                    property_title NOT NULL,
  created_at               BIGINT NOT NULL,
  updated_at               BIGINT NOT NULL
);
CREATE INDEX idx_properties_user_id        ON properties(user_id);
CREATE INDEX idx_properties_user_id_status ON properties(user_id, status);

-- ---------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------
CREATE TABLE tenants (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL,
  rent         NUMERIC NOT NULL CHECK (rent >= 0),
  status       tenant_status NOT NULL,
  email        TEXT,                                                        -- A9: not validated as email
  phone        TEXT
);
CREATE INDEX idx_tenants_user_id     ON tenants(user_id);
CREATE INDEX idx_tenants_property_id ON tenants(property_id);

-- ---------------------------------------------------------------------
-- leases
-- ---------------------------------------------------------------------
CREATE TABLE leases (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  property_id     TEXT NOT NULL REFERENCES properties(id),
  tenant_id       TEXT REFERENCES tenants(id),
  unit            TEXT NOT NULL,
  stage           lease_stage NOT NULL,
  start_date      BIGINT NOT NULL,                                          -- ms
  end_date        BIGINT NOT NULL,
  monthly_rent    NUMERIC NOT NULL CHECK (monthly_rent >= 0),
  term_months     INT NOT NULL CHECK (term_months > 0),
  renewal_status  TEXT
  -- A11 missing: deposit NUMERIC, auto_pay BOOLEAN
);
CREATE INDEX idx_leases_user_id        ON leases(user_id);
CREATE INDEX idx_leases_property_id    ON leases(property_id);
CREATE INDEX idx_leases_user_id_stage  ON leases(user_id, stage);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  lease_id     TEXT REFERENCES leases(id),
  tenant_id    TEXT REFERENCES tenants(id),
  date         BIGINT NOT NULL,                                             -- Q3.E: due-date vs invoice-date
  kind         payment_kind   NOT NULL,
  amount       NUMERIC NOT NULL CHECK (amount >= 0),
  method       TEXT NOT NULL,
  status       payment_status NOT NULL
);
CREATE INDEX idx_payments_user_id        ON payments(user_id);
CREATE INDEX idx_payments_property_id    ON payments(property_id);
CREATE INDEX idx_payments_lease_id       ON payments(lease_id);
CREATE INDEX idx_payments_user_id_status ON payments(user_id, status);

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
CREATE TABLE expenses (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  date         BIGINT NOT NULL,
  category     expense_category NOT NULL,
  amount       NUMERIC NOT NULL CHECK (amount >= 0),
  note         TEXT
);
CREATE INDEX idx_expenses_user_id          ON expenses(user_id);
CREATE INDEX idx_expenses_property_id      ON expenses(property_id);
CREATE INDEX idx_expenses_user_id_category ON expenses(user_id, category);

-- ---------------------------------------------------------------------
-- folders (self-FK via parent_folder_id)
-- ---------------------------------------------------------------------
CREATE TABLE folders (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  property_id       TEXT NOT NULL REFERENCES properties(id),
  parent_folder_id  TEXT REFERENCES folders(id),
  name              TEXT NOT NULL,
  created_at        BIGINT NOT NULL
);
CREATE INDEX idx_folders_user_id          ON folders(user_id);
CREATE INDEX idx_folders_property_id      ON folders(property_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------
CREATE TABLE documents (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  property_id       TEXT NOT NULL REFERENCES properties(id),
  folder_id         TEXT REFERENCES folders(id),
  name              TEXT NOT NULL,
  kind              document_kind NOT NULL,
  mime_type         TEXT,
  extension         TEXT,
  size_bytes        BIGINT CHECK (size_bytes >= 0),
  storage_id        TEXT NOT NULL,                                          -- Q5.C: → v.id("_storage") on Convex
  thumb_storage_id  TEXT,
  category          TEXT,                                                   -- A3 / Q5.R: should be enum
  uploaded_by       TEXT,
  uploaded_at       BIGINT NOT NULL
);
CREATE INDEX idx_documents_user_id          ON documents(user_id);
CREATE INDEX idx_documents_property_id      ON documents(property_id);
CREATE INDEX idx_documents_folder_id        ON documents(folder_id);
CREATE INDEX idx_documents_user_id_category ON documents(user_id, category);

-- ---------------------------------------------------------------------
-- inspections
-- ---------------------------------------------------------------------
CREATE TABLE inspections (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  date         TEXT NOT NULL,                                               -- A1: should be BIGINT
  type         TEXT NOT NULL,
  inspector    TEXT NOT NULL,
  status       TEXT NOT NULL,                                               -- A3: should be enum (Passed/Failed/Pending)
  issues       INT  NOT NULL CHECK (issues >= 0),
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);
CREATE INDEX idx_inspections_property_id ON inspections(property_id);

-- ---------------------------------------------------------------------
-- certifications
-- ---------------------------------------------------------------------
CREATE TABLE certifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,                                               -- A3: should be enum (Valid/Expiring/Expired)
  issued       TEXT NOT NULL,                                               -- A1: should be BIGINT
  expires      TEXT NOT NULL,                                               -- A1: should be BIGINT
  inspector    TEXT NOT NULL,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);
CREATE INDEX idx_certifications_property_id ON certifications(property_id);

-- ---------------------------------------------------------------------
-- safety_risks
-- ---------------------------------------------------------------------
CREATE TABLE safety_risks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  property_id     TEXT NOT NULL REFERENCES properties(id),
  severity_label  TEXT NOT NULL,                                            -- A3: should be enum (High/Medium/Low)
  title           TEXT NOT NULL,
  "desc"          TEXT NOT NULL,
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NOT NULL
  -- A12 (resolved as intentional): no `resolved` field; KPI = risks.length
);
CREATE INDEX idx_safety_risks_property_id ON safety_risks(property_id);

-- ---------------------------------------------------------------------
-- emergency_contacts
-- ---------------------------------------------------------------------
CREATE TABLE emergency_contacts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  sub          TEXT,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);
CREATE INDEX idx_emergency_contacts_property_id ON emergency_contacts(property_id);

-- ---------------------------------------------------------------------
-- maintenance_items
-- ---------------------------------------------------------------------
CREATE TABLE maintenance_items (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  severity     maintenance_severity NOT NULL,
  title        TEXT NOT NULL,
  status       maintenance_status   NOT NULL,
  created_at   BIGINT NOT NULL,
  cost         NUMERIC CHECK (cost >= 0)                                    -- added Phase 6.8b
);
CREATE INDEX idx_maintenance_items_user_id        ON maintenance_items(user_id);
CREATE INDEX idx_maintenance_items_property_id    ON maintenance_items(property_id);
CREATE INDEX idx_maintenance_items_user_id_status ON maintenance_items(user_id, status);

-- ---------------------------------------------------------------------
-- property_valuations
-- ---------------------------------------------------------------------
CREATE TABLE property_valuations (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  month        TEXT NOT NULL CHECK (month ~ '^[A-Z][a-z]{2} \d{4}$'),       -- "Jan 2026"
  price        NUMERIC NOT NULL CHECK (price > 0),
  recorded_at  BIGINT NOT NULL
);
CREATE INDEX idx_property_valuations_property_id              ON property_valuations(property_id);
CREATE INDEX idx_property_valuations_property_id_recorded_at  ON property_valuations(property_id, recorded_at);

-- ---------------------------------------------------------------------
-- land_parcels (1→1 with property typically)
-- ---------------------------------------------------------------------
CREATE TABLE land_parcels (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES users(id),
  property_id             TEXT NOT NULL REFERENCES properties(id),
  size_m2                 NUMERIC NOT NULL CHECK (size_m2 >= 0),
  width_m                 NUMERIC CHECK (width_m  >= 0),
  length_m                NUMERIC CHECK (length_m >= 0),
  zoning_code             TEXT,
  zoning_class            TEXT,
  development_potential   TEXT[],
  elevation_m             NUMERIC,
  slope_angle_deg         NUMERIC,
  terrain_type            terrain_type
);
CREATE INDEX idx_land_parcels_property_id ON land_parcels(property_id);

-- ---------------------------------------------------------------------
-- co_owners
-- ---------------------------------------------------------------------
CREATE TABLE co_owners (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  property_id     TEXT NOT NULL REFERENCES properties(id),
  name            TEXT NOT NULL,
  role            co_owner_role NOT NULL,
  share_percent   NUMERIC NOT NULL CHECK (share_percent BETWEEN 0 AND 100),
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  ssn_masked      TEXT CHECK (ssn_masked ~ '^••••-••-\d{4}$'),              -- PII; Q5.S — KMS encrypt later
  tax_entity      tax_entity,
  tax_1099_status TEXT
);
CREATE INDEX idx_co_owners_property_id ON co_owners(property_id);

-- ---------------------------------------------------------------------
-- ownership_records (loan + acquisition + holding type)
-- ---------------------------------------------------------------------
CREATE TABLE ownership_records (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  property_id           TEXT NOT NULL REFERENCES properties(id),
  holding_type          holding_type NOT NULL,
  loan_type             TEXT,
  loan_amount           NUMERIC CHECK (loan_amount >= 0),
  loan_term_years       INT     CHECK (loan_term_years > 0),
  interest_rate         NUMERIC CHECK (interest_rate >= 0),
  origination_date      BIGINT,
  maturity_date         BIGINT,
  next_payment_due      BIGINT,
  lender_name           TEXT,
  down_payment          NUMERIC CHECK (down_payment >= 0),
  closing_costs         NUMERIC CHECK (closing_costs >= 0),
  distribution_method   distribution_method,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL
);
CREATE INDEX idx_ownership_records_property_id ON ownership_records(property_id);

-- ---------------------------------------------------------------------
-- ownership_documents (deeds / title docs)
-- ---------------------------------------------------------------------
CREATE TABLE ownership_documents (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  date         TEXT NOT NULL,                                               -- A1: should be BIGINT
  owner        TEXT NOT NULL,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
  -- A10 missing: status TEXT — UI hardcodes "Current"
);
CREATE INDEX idx_ownership_documents_property_id ON ownership_documents(property_id);

-- ---------------------------------------------------------------------
-- ownership_history (timeline)
-- ---------------------------------------------------------------------
CREATE TABLE ownership_history (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT NOT NULL REFERENCES properties(id),
  date         TEXT NOT NULL,                                               -- A1: should be BIGINT
  text         TEXT NOT NULL,
  color        TEXT NOT NULL,                                               -- A7: presentational on entity
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);
CREATE INDEX idx_ownership_history_property_id ON ownership_history(property_id);

-- ---------------------------------------------------------------------
-- successors (no property_id; assigned via join table)
-- ---------------------------------------------------------------------
CREATE TABLE successors (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  initials    TEXT NOT NULL,
  relation    TEXT NOT NULL,
  role        successor_role NOT NULL,                                      -- A5: lowercase (vs CoOwnerRole capital)
  share       NUMERIC NOT NULL CHECK (share >= 0),
  verified    BOOLEAN NOT NULL,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);
CREATE INDEX idx_successors_user_id ON successors(user_id);

-- ---------------------------------------------------------------------
-- successor_property_assignments (join table)
-- ---------------------------------------------------------------------
CREATE TABLE successor_property_assignments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  successor_id  TEXT NOT NULL REFERENCES successors(id),
  property_id   TEXT NOT NULL REFERENCES properties(id),
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL
);
CREATE INDEX idx_spa_user_id       ON successor_property_assignments(user_id);
CREATE INDEX idx_spa_successor_id  ON successor_property_assignments(successor_id);
CREATE INDEX idx_spa_property_id   ON successor_property_assignments(property_id);

-- ---------------------------------------------------------------------
-- estate_activity_events
-- ---------------------------------------------------------------------
CREATE TABLE estate_activity_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  kind         estate_activity_kind NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  property_id  TEXT REFERENCES properties(id),
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);
CREATE INDEX idx_eae_user_id              ON estate_activity_events(user_id);
CREATE INDEX idx_eae_property_id          ON estate_activity_events(property_id);
CREATE INDEX idx_eae_user_id_created_at   ON estate_activity_events(user_id, created_at);

-- ---------------------------------------------------------------------
-- professionals (directory; no property_id)
-- ---------------------------------------------------------------------
CREATE TABLE professionals (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  name                TEXT NOT NULL,
  company             TEXT NOT NULL,
  category            TEXT NOT NULL,                                        -- A3: should be 8-value enum
  rating              NUMERIC NOT NULL CHECK (rating BETWEEN 0 AND 5),
  review_count        INT NOT NULL CHECK (review_count       >= 0),
  linked_properties   INT NOT NULL CHECK (linked_properties  >= 0),         -- PF6: scalar (could become FK array)
  available           BOOLEAN NOT NULL,
  initials            TEXT NOT NULL,
  avatar_bg           TEXT NOT NULL,                                        -- A7: presentational
  email               TEXT,                                                 -- only entity with .email() validator
  phone               TEXT,
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          BIGINT  NOT NULL,
  updated_at          BIGINT  NOT NULL
);
CREATE INDEX idx_professionals_user_id            ON professionals(user_id);
CREATE INDEX idx_professionals_user_id_category   ON professionals(user_id, category);
CREATE INDEX idx_professionals_user_id_verified   ON professionals(user_id, verified);

-- ---------------------------------------------------------------------
-- user_profiles (1→1 with users; id == user_id for demo)
-- ---------------------------------------------------------------------
CREATE TABLE user_profiles (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  first_name        TEXT NOT NULL,                                          -- A9: no min(1)
  last_name         TEXT NOT NULL,
  job_title         TEXT,
  employee_id       TEXT,
  email             TEXT,                                                   -- A9: not validated as email
  phone             TEXT,
  office_location   TEXT,
  language          TEXT,
  timezone          TEXT,
  currency          TEXT,
  role              TEXT,                                                   -- A3 / Q4.X: open string
  dashboard_view    TEXT,                                                   -- Q5.X
  member_since      BIGINT,
  last_login        BIGINT,
  created_at        BIGINT NOT NULL,
  updated_at        BIGINT NOT NULL
);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  property_id  TEXT REFERENCES properties(id),                              -- A6: was generic z.string() — Q5.T closed
  category     notification_category NOT NULL,                              -- UPPERCASE (A5 inconsistency)
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_at   BIGINT NOT NULL,
  read         BOOLEAN NOT NULL,
  link_to      TEXT
);
CREATE INDEX idx_notifications_user_id        ON notifications(user_id);
CREATE INDEX idx_notifications_property_id    ON notifications(property_id);
CREATE INDEX idx_notifications_user_id_read   ON notifications(user_id, read);

-- ---------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------
CREATE TABLE notification_preferences (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  event_type  TEXT NOT NULL,
  email       BOOLEAN NOT NULL,
  slack       BOOLEAN NOT NULL,
  sms         BOOLEAN NOT NULL,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);
CREATE INDEX idx_npref_user_id              ON notification_preferences(user_id);
CREATE INDEX idx_npref_user_id_event_type   ON notification_preferences(user_id, event_type);

-- =====================================================================
-- End of schema. 25 tables + 1 stub `users` table = 26 total.
-- =====================================================================
