---
slug: erd
date: 2026-05-05
scope: 19 Zod-validated entities (all of lib/data/types/ as of 2026-05-05)
source: hand-derived from lib/data/types/*.ts Schema definitions
---

# Entity Relationship Diagram

> Snapshot of every entity in the codebase and their relationships, hand-derived from the Zod schemas at `lib/data/types/`. Last regenerated: 2026-05-05.

```mermaid
erDiagram
  %% ===== Foundation =====
  USER_PROFILES ||--o{ NOTIFICATION_PREFERENCES : "has"
  USER_PROFILES ||--o{ PROPERTIES : "owns"
  USER_PROFILES ||--o{ PROFESSIONALS : "is"
  USER_PROFILES ||--o{ SUCCESSORS : "designates"
  USER_PROFILES ||--o{ NOTIFICATIONS : "receives"

  %% ===== Rental =====
  PROPERTIES ||--o{ LEASES : "has"
  PROPERTIES ||--o{ TENANTS : "has"
  PROPERTIES ||--o{ PAYMENTS : "receives"
  TENANTS ||--o{ LEASES : "subject of"
  LEASES ||--o{ PAYMENTS : "generates"
  TENANTS ||--o{ PAYMENTS : "makes"

  %% ===== Documents =====
  PROPERTIES ||--o{ FOLDERS : "organizes"
  PROPERTIES ||--o{ DOCUMENTS : "stores"
  FOLDERS |o--o{ FOLDERS : "nests"
  FOLDERS ||--o{ DOCUMENTS : "contains"

  %% ===== Safety =====
  PROPERTIES ||--o{ SAFETY_RISKS : "tracks"
  PROPERTIES ||--o{ INSPECTIONS : "schedules"
  PROPERTIES ||--o{ CERTIFICATIONS : "holds"
  PROPERTIES ||--o{ MAINTENANCE_ITEMS : "requires"
  PROPERTIES ||--o{ EMERGENCY_CONTACTS : "lists"

  %% ===== Ownership / Legal =====
  PROPERTIES ||--o{ OWNERSHIP_RECORDS : "recorded in"
  PROPERTIES ||--o{ OWNERSHIP_HISTORY : "logged in"

  %% ===== Valuation =====
  PROPERTIES ||--o{ PROPERTY_VALUATIONS : "valued by"

  %% ===== Entities (3-5 fields: PK + FKs + distinguishing) =====
  USER_PROFILES {
    string id PK
    string user_id "Clerk auth ID"
    string first_name
    string last_name
    string role
  }

  PROPERTIES {
    string id PK
    string user_id FK
    string name
    string status
    number health
  }

  NOTIFICATION_PREFERENCES {
    string id PK
    string user_id FK
    string event_type
    boolean email
    boolean sms
  }

  LEASES {
    string id PK
    string property_id FK
    string tenant_id "FK nullable"
    string stage
    number monthly_rent
  }

  TENANTS {
    string id PK
    string property_id FK
    string name
    string status
    number rent
  }

  PAYMENTS {
    string id PK
    string property_id FK
    string lease_id "FK nullable"
    string tenant_id "FK nullable"
    number amount
    string status
  }

  FOLDERS {
    string id PK
    string property_id FK
    string parent_folder_id "FK nullable self-ref"
    string name
  }

  DOCUMENTS {
    string id PK
    string property_id FK
    string folder_id "FK nullable"
    string kind
    string name
  }

  SAFETY_RISKS {
    string id PK
    string property_id FK
    string severity_label
    string title
  }

  INSPECTIONS {
    string id PK
    string property_id FK
    string type
    string status
    string inspector
  }

  CERTIFICATIONS {
    string id PK
    string property_id FK
    string name
    string status
    string inspector
  }

  MAINTENANCE_ITEMS {
    string id PK
    string property_id FK
    string severity
    string status
  }

  EMERGENCY_CONTACTS {
    string id PK
    string property_id FK
    string name
    string phone
  }

  OWNERSHIP_RECORDS {
    string id PK
    string property_id FK
    string type
    string owner
  }

  OWNERSHIP_HISTORY {
    string id PK
    string property_id FK
    string date
    string text
  }

  SUCCESSORS {
    string id PK
    string user_id FK
    string name
    string relation
    string role
  }

  PROFESSIONALS {
    string id PK
    string user_id FK
    string name
    string category
    number rating
  }

  NOTIFICATIONS {
    string id PK
    string user_id FK
    string category
    string title
  }

  PROPERTY_VALUATIONS {
    string id PK
    string property_id FK
    number price
    string month
  }
```

## Coverage

- **Included:** 19 entities — every file in `lib/data/types/` except `_common.ts`.
- **Excluded from diagram (no schema exists):** 4 entities still in design phase:
  - LandParcel — blocked on Q4.R (denormalized vs separate table)
  - CoOwner — blocked on Q4.N (PII handling)
  - MarketSnapshot — blocked on Q4.Q (external data source)
  - MarketComparable / PropertyComparable — blocked on Q4.Q + Q4.R
  - RentalEvent — referenced in catalog §8; no `lib/data/types/rental-event.ts` yet
  - EstateDocument — referenced in catalog §15; no `lib/data/types/estate-document.ts` yet
  These will be added when each entity's Zod schema lands.
- **Field detail:** the diagram shows 3–5 fields per entity (PK + FKs + 1–2 distinguishing fields). For full field shape including Zod constraints, read the source file directly.

## Deviations from initial plan

The following schema details differ from the plan's draft diagram and were corrected during Step A:

| Entity | Plan assumed | Actual schema |
|---|---|---|
| `Inspection` | `professional_id` FK | `inspector: string` — no FK to PROFESSIONALS |
| `Certification` | `professional_id` FK | `inspector: string` — no FK to PROFESSIONALS |
| `Notification` | `property_id` nullable FK | No `propertyId` field; user-scoped only |
| `Successor` | `property_id` FK | No `propertyId`; user-level estate planning |
| `NotificationPreference` | `email_frequency` field | `eventType`, `email`, `slack`, `sms` (per-event toggles) |
| `Folder` | No self-reference noted | `parentFolderId` optional self-FK for nested folders |
| `OwnershipHistory` | `transferred_at: number` | `date: string` (formatted date string) |
| `EmergencyContact` | `role` field | No `role`; has `sub` (optional subtitle) |

## How this was made

- Hand-derived from `lib/data/types/<entity>.ts` Schema definitions, reading each file directly.
- Cardinality inferred from FK shape: `<entity>Id: idSchema` (optional) → `}o` on the owning side.
- `userId` fields use `userIdSchema` from `_common.ts` — treated as FK to `USER_PROFILES.user_id` (Clerk auth ID), not to `USER_PROFILES.id` (Convex document ID). The diagram elides this distinction for readability.
- Snake_case used in the diagram; actual TypeScript fields are camelCase.
- `PROFESSIONALS` relationships to `INSPECTIONS`/`CERTIFICATIONS` were removed: no FK exists in the schemas. The `inspector` field on both entities is a plain string.

## Regeneration

When entities or relationships change, this file goes stale. Two options:

- **Hand-update** — find the affected entity in the diagram, edit. Bump the date stamp. ~5 min per change.
- **Auto-generate** (not yet built) — `scripts/derive-erd.ts` would walk every Zod schema's `.shape`, derive fields + FKs from atom usage (`propertyIdSchema`, `userIdSchema`, `idSchema`), emit this same Mermaid block. ~30 min one-time build; thereafter the diagram regenerates on every schema change. File as a future workstream.
