# Data Model

The database schema is **property-centric**: nearly every domain table has a foreign key to `properties`, which is in turn scoped to an `organization`. The schema is defined in Drizzle ORM across 15 modules, backed by Neon serverless Postgres.

## Schema Organization

**Source:** `/lib/db/schema/index.ts`

A single barrel file re-exports 15 modules, each owning a coherent domain area:

| Module | Domain | Key Tables |
|---|---|---|
| `identity.ts` | Auth & orgs | `organizations`, `users`, `organization_memberships` |
| `clients.ts` | Manager cockpit | `clients` |
| `access.ts` | Cross-org access | `access_requests`, `change_requests`, `client_handoffs` |
| `counters.ts` | ID generation | `id_counters` |
| `property.ts` | Core property | `properties`, `land_parcels`, `property_valuations` |
| `property-drafts.ts` | Wizard state | `property_drafts`, `property_draft_files` |
| `rental.ts` | Leasing | `tenants`, `leases`, `payments`, `expenses` |
| `documents.ts` | File management | `folders`, `documents` |
| `safety.ts` | Compliance | `inspections`, `certifications`, `safety_risks`, `emergency_contacts`, `maintenance_items` |
| `ownership.ts` | Title & loans | `co_owners`, `ownership_records`, `ownership_documents`, `ownership_history` |
| `estate.ts` | Succession | `successors`, `successor_property_assignments`, `estate_activity_events` |
| `people.ts` | Directory | `professionals`, `user_profiles` |
| `notifications.ts` | Alerts | `notifications`, `notification_preferences` |
| `verification.ts` | Pillar verification | `pillar_verifications`, `verification_evidence`, `verification_events` |
| `ai.ts` | AI chat | `ai_sessions`, `ai_messages` |
| `activities.ts` | Audit log | `activities` |

## Entity Relationships

```
organizations ──< properties ──< tenants, leases, payments, expenses
                          ├──< documents, folders
                          ├──< inspections, certifications, safety_risks,
                          │   emergency_contacts, maintenance_items
                          ├──< co_owners, ownership_records,
                          │   ownership_documents, ownership_history
                          ├──< successors ←── successor_property_assignments
                          ├──< land_parcels, property_valuations
                          ├──< pillar_verifications ──< verification_evidence,
                          │                            verification_events
                          └──< activities, estate_activity_events, notifications
```

**Key relationship rules:**
- **`properties` → child tables**: `onDelete: "cascade"` — deleting a property removes all children.
- **`properties` → audit/notification tables** (`activities`, `estate_activity_events`, `notifications`): `onDelete: "set null"` — audit rows survive property deletion.
- **`folders`**: Self-referential (`parent_folder_id → folders.id`) for nested directory structure.
- **`documents` → `folders`**: `onDelete: "cascade"`.
- **`verification_evidence`**: Join table linking `pillar_verifications` ↔ `documents`.
- **`successor_property_assignments`**: Join table linking `successors` ↔ `properties`.

## Multi-Tenancy Model

**Pattern: Organization-scoped (single `orgId` column per table)**

Every domain table carries a non-nullable `orgId` column FK-referencing `organizations.id`. This is the primary tenant boundary — queries filter `WHERE org_id = ?` first.

### Tenancy Layers

1. **`organizations`** — mirrors Clerk organizations. `clerkOrgId` is the external link. Clerk is source of truth; Postgres mirrors for FK integrity and joins. Carries `invite_code` for manager discovery.
2. **`organization_memberships`** — determines a user's role within an org (`owner`/`admin`/`member`/`viewer`) and membership status (`active`/`invited`/`suspended`/`removed`). This is the access truth — no separate permissions engine.
3. **`users`** — mirrors Clerk users. `isManager` flag enables Pro cockpit access.
4. **Cross-org access**: `access_requests` and `change_requests` are explicitly cross-org — a manager (user in org A) targets an owner org (org B). On approval, a real `organization_memberships` row is created.
5. **`userId`** on every table — acts as a created-by / ownership field alongside `orgId`.

## ID Strategy

**Source:** `/lib/db/schema/counters.ts`

- **`id_counters`** table: Atomic counter. `nextId(collection)` bumps the counter for prefixed, human-readable IDs (`PROP-0001`, `TEN-0001`, `CLI-0001`, etc.). Used for most tables.
- **`activities`** exception: Uses `crypto.randomUUID()` via `$defaultFn` to avoid the global counter lock on the high-volume audit table.

## Key Entities

| Entity | PK Pattern | Description |
|---|---|---|
| **`organizations`** | `ORG-0001` | Clerk org mirror; source of truth is Clerk |
| **`users`** | `USR-0001` | Clerk user mirror; `isManager` flag routes to Pro cockpit |
| **`organization_memberships`** | `MEM-0001` | User↔org join with role and status lifecycle |
| **`properties`** | `PROP-0001` | Central aggregate — location, finance, specs, media, verification projections |
| **`clients`** | `CLI-0001` | Manager-owned client engagement |
| **`pillar_verifications`** | `VRF-0001` | Per-property, per-pillar verification status |
| **`client_handoffs`** | `CHO-0001` | Manager→client onboarding lifecycle |
| **`access_requests`** | `ARQ-0001` | Cross-org: manager requests access to an owner org |
| **`change_requests`** | `CRQ-0001` | Cross-org: manager proposes entity patch; owner approves |
| **`property_drafts`** | `DRF-0001` | Wizard state (server-side, replaces localStorage) |

## Properties Table

**Source:** `/lib/db/schema/property.ts`

The `properties` table is the central aggregate root. It stores denormalized projections from every pillar:

- **Location**: `lat`, `lng`, `addressLine`, `city`, `province`, `zip`, `country`, `locationVerified`, `locationEvidenceDocIds`
- **Finance**: `purchasePrice` (display string), `buyNumeric` (canonical numeric), `currentMarketValue`, `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `taxAssessmentValue`, `annualInsurance`, `financialsVerified`, `financialsEvidenceDocIds`
- **Media**: `photoStorageIds`, `documentStorageIds`, `coverStorageId` (designated cover photo, decoupled from array ordering)
- **Specs**: `totalArea`, `yearBuilt`, `bedrooms`, `bathrooms`, `parkingSpaces` — kept as `text` to match the Zod contract
- **Rental/Estate projections**: `rentalVerified`, `estateVerified` with timestamps and evidence doc IDs
- **Pro overlay**: `clientId` (nullable, no FK — clients table deferred)

## Verification Pillars

**Source:** `/lib/db/schema/verification.ts`

The verification system tracks per-property, per-pillar verification status with evidence and audit trail:

**8 pillars:** `location`, `financials`, `rental`, `ownership`, `valuation`, `safety`, `estate`, `documents`

- **`pillar_verifications`**: Unique per `(propertyId, pillar)`. Status lifecycle: `submitted` → `approved`/`rejected`/`revoked`/`expired`.
- **`verification_evidence`**: Join table linking pillar verifications to `documents`.
- **`verification_events`**: Append-only per-verification audit trail.

## Data Model Patterns

| Pattern | Implementation |
|---|---|
| **Money columns** | `numeric(14, 2)` throughout (rent, payments, expenses, valuations, loan amounts) |
| **Timestamps** | `timestamptz` with `{ withTimezone: true }`; `createdAt`/`updatedAt` via `.defaultNow()` |
| **Enums** | Heavy `pgEnum` usage for closed-set values (status, type, role, category, severity) |
| **Flexible fields** | `jsonb` for semi-structured data: `proposedPatch` (change requests), `form` (drafts), `metadata` (orgs) |
| **Array columns** | `text[]` for document ID lists (`evidenceDocIds`, `photoStorageIds`, `documentStorageIds`) |
| **Audit trail** | Three patterns: `activities` (general, UUID-keyed), `estate_activity_events` (enum-keyed, domain-specific), `verification_events` (per-verification) |
| **Soft references** | Some FKs intentionally not enforced: `properties.clientId`, `ownership_documents.ownershipRecordId`, `inspections.inspectorId` |
| **Draft persistence** | `property_drafts` stores wizard state server-side; `property_draft_files` stores staged S3 keys reused as `documents.storage_id` on submit |

### Column Classifier

**Source:** `/lib/db/column-classifier.ts`

Central type-conversion utility:
- `classifyColumn(columnType)` → `"timestamp"` | `"numeric"` | `"plain"`
- `convertRowToDomain()` — DB row → domain object: `Date→epoch ms`, `numeric string→Number`, `null→undefined`
- `convertRowToDb()` — Reverse: `epoch ms→Date`, `Number→string`

### Zod Contract Adherence

Schema comments reference "Zod contract (C4)" as the source of truth. The vendored Zod types in `/lib/data/types/` define the domain shape; the Drizzle schema mirrors them. Spec strings (area, year, bedrooms) are `text` to match; money uses `numeric(14,2)` (D6); dates use `timestamptz` (D7).

## Database Client

**Source:** `/lib/db/client.ts`

Single `db` export: `drizzle(pool, { schema })` backed by `@neondatabase/serverless` Pool with `ws` WebSocket constructor. Marked `"server-only"`. Transactions are required for multi-statement operations (D1).

## Migrations

Migration files live in `/drizzle/` (numbered SQL files). Use:
- `npm run db:generate` — Generate migrations from schema changes
- `npm run db:migrate` — Apply migrations
- `npm run db:check` — Verify schema/migration sync
