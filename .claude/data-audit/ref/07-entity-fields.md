---
title: Entity Field Reference — for new UI design
maintained: yes
last_updated: 2026-05-07
purpose: "Comprehensive field-by-field catalog of every entity in lib/data/types/. Use as input when designing new UI surfaces."
---

# Entity Field Reference

> Field-level reference for all 25 entities in `lib/data/types/`. Each section lists Zod definitions, refinements, CRUD layer paths, seed counts, and which pages already consume the entity.

**Companion files:**
- `ref/09-page-wiring-status.md` — which pages are wired
- `ref/08-backend-migration-readiness.md` — Convex schema mapping
- `ref/00-entity-catalog.md` — proposed Convex schemas (older draft; this file supersedes for current Zod state)

---

## Table of contents

1. Common primitives (`_common.ts`)
2. Sub-enum registry
3. Entity-relationship summary
4. **Entity reference** — 25 entities, alphabetical by domain
5. Anomalies & schema gaps

---

## 1. Common primitives — `lib/data/types/_common.ts`

| Schema | Definition | Used by |
|---|---|---|
| `idSchema` | `z.string().min(1)` | Every entity (`id`); FKs (`leaseId`, `tenantId`, `successorId`) |
| `userIdSchema` | `z.string().min(1)` | Every entity (`userId`) |
| `propertyIdSchema` | `z.string().min(1)` | Every property-scoped entity (`propertyId`) |
| `timestampSchema` | `z.number().int().nonnegative()` | All `createdAt` / `updatedAt` / `date` (where stored as ms epoch) |

> **Note:** All ID schemas are currently `string().min(1)` rather than typed brands. In Convex migration, these will become `v.id("<table>")` references — see `ref/08`.

---

## 2. Sub-enum registry

| Enum | Values | Defined in |
|---|---|---|
| `propertyStatusSchema` | `Rented`, `Vacant`, `For Sale`, `Sold`, `Archived`, `Owner-Occupied` | `property.ts` |
| `propertyTitleSchema` | `Hard title`, `Soft title`, `—` | `property.ts` |
| `propertyTypeChoiceSchema` | `residential`, `commercial`, `multi-unit`, `retail`, `land`, `industrial`, `construction`, `other` | `property.ts` |
| `titleVariantSchema` | `hard`, `soft`, `none` | `property.ts` |
| `LeaseStage` | `Approaching`, `Offered`, `Signed`, `Declined` | `lease.ts` |
| `PaymentKind` | `Rent`, `Fee`, `Deposit`, `Refund` | `payment.ts` |
| `PaymentStatus` | `Paid`, `Pending`, `Failed`, `Overdue` | `payment.ts` |
| `TenantStatus` | `Paid`, `Overdue`, `Pending` | `tenant.ts` |
| `ExpenseCategory` | `Maintenance`, `Utilities`, `Insurance`, `Tax`, `Management`, `Other` | `expense.ts` |
| `DocumentKind` | `photo`, `document` | `document.ts` |
| `MaintenanceSeverity` | `Emergency`, `Urgent`, `Standard` | `maintenance-item.ts` |
| `MaintenanceStatus` | `Open`, `InProgress`, `Resolved` | `maintenance-item.ts` |
| `TerrainType` | `Flat`, `Rolling`, `Hilly`, `Mountainous`, `Mixed` | `land-parcel.ts` |
| `CoOwnerRole` | `Primary`, `Minor` | `co-owner.ts` |
| `TaxEntity` | `Individual`, `S-Corp`, `C-Corp`, `LLC`, `Partnership`, `Trust`, `Other` | `co-owner.ts` |
| `HoldingType` | `Tenancy in Common`, `Joint Tenancy`, `Sole Ownership`, `Trust`, `LLC`, `Other` | `ownership-record.ts` |
| `DistributionMethod` | `Pro-Rata by Share`, `Equal Split`, `Custom` | `ownership-record.ts` |
| `Successor.role` | `primary`, `contingent` | `successor.ts` |
| `estateActivityKindSchema` | `successor.created`, `successor.updated`, `successor.deleted`, `successor.assigned`, `document.added`, `document.removed`, `estate.reviewed` | `estate-activity-event.ts` |
| `Notification.category` | `MAINTENANCE`, `LEASING`, `COMPLIANCE`, `PAYMENT`, `APPLICATIONS` | `notification.ts` |

---

## 3. Entity relationship summary

```
                     ┌──── userId ────────────────────────────┐
                     │                                         │
                  Property ◄─ propertyId ─┐                    │
                     │                     ├─ Tenant           │
                     │                     ├─ Lease  ─ tenantId─┘
                     │                     ├─ Payment ─ leaseId/tenantId
                     │                     ├─ Expense
                     │                     ├─ Document ─ folderId ─ Folder ─ parentFolderId (self)
                     │                     ├─ Inspection
                     │                     ├─ PropertyValuation
                     │                     ├─ Certification
                     │                     ├─ MaintenanceItem
                     │                     ├─ SafetyRisk
                     │                     ├─ EmergencyContact
                     │                     ├─ LandParcel        (1→1 typically)
                     │                     ├─ CoOwner           (1→N)
                     │                     ├─ OwnershipRecord   (1→1, ownership structure)
                     │                     ├─ OwnershipDocument (1→N, deeds)
                     │                     ├─ OwnershipHistory  (1→N, timeline)
                     │                     └─ SuccessorPropertyAssignment ─ successorId ─ Successor
                     │
                     └─ Notification (optional propertyId)
                     └─ EstateActivityEvent (optional propertyId)
                     └─ NotificationPreference (userId-scoped, no propertyId)
                     └─ UserProfile (userId-scoped, 1→1)
                     └─ Professional (userId-scoped, no propertyId)
```

**Cross-reference table** — which entities reference which:

| Entity | Depends on (FK) | Referenced by |
|---|---|---|
| Property | userId | Almost everything (see diagram) |
| Tenant | userId, propertyId | Lease (tenantId), Payment (tenantId) |
| Lease | userId, propertyId, tenantId? | Payment (leaseId) |
| Payment | userId, propertyId, leaseId?, tenantId? | — |
| Expense | userId, propertyId | — |
| Document | userId, propertyId, folderId? | — |
| Folder | userId, propertyId, parentFolderId? (self) | Document, Folder (recursive) |
| Inspection | userId, propertyId | — |
| PropertyValuation | userId, propertyId | — |
| Certification | userId, propertyId | — |
| MaintenanceItem | userId, propertyId | — |
| SafetyRisk | userId, propertyId | — |
| EmergencyContact | userId, propertyId | — |
| LandParcel | userId, propertyId | — |
| CoOwner | userId, propertyId | — |
| OwnershipRecord | userId, propertyId | — |
| OwnershipDocument | userId, propertyId | — |
| OwnershipHistory | userId, propertyId | — |
| Successor | userId | SuccessorPropertyAssignment (successorId) |
| SuccessorPropertyAssignment | userId, successorId, propertyId | — |
| EstateActivityEvent | userId, propertyId? | — |
| Professional | userId | — |
| UserProfile | userId | — |
| Notification | userId, propertyId? | — |
| NotificationPreference | userId | — |

---

## 4. Entity reference

> Format per entity: file path · CRUD layer · seed count · pages that consume it · field table · notes.

> Pages-that-consume column is determined by `import` statements in `app/(shell)/<route>/queries.ts` (verified 2026-05-07).

---

### 🏠 Property — core domain entity

- **File:** `lib/data/types/property.ts`
- **CRUD layer:** `lib/data/db/properties.ts`
- **Seed count:** 16 records (PROP-0001 → PROP-0016)
- **Pages consuming:** `/portfolio`, `/property/[id]/*` (all 7 tabs via `PropertyLayout`), `/analytics`, `/rental`, `/estate-planning`
- **Schema:** Composed of 4 sub-schemas (`PropertyCoreSchema`, `PropertyLocationSchema`, `PropertyFinanceSchema`, `PropertyMediaSchema`) merged into `PropertySchema`. Plus a list-projection `PropertyListItemSchema` for the portfolio table.

#### Core fields (PropertyCoreSchema)
| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | PK |
| `userId` | `userIdSchema` | ✅ | FK |
| `name` | `string().min(1)` | ✅ | Display name |
| `code` | `string().min(1)` | ✅ | Short code (e.g. PROP-0001) |
| `type` | `propertyTypeChoiceSchema` | ✅ | 8-value enum |
| `status` | `propertyStatusSchema` | ✅ | 6-value enum (incl. `Owner-Occupied` added Phase 8.1) |
| `health` | `number().int().min(0).max(100)` | ✅ | 0–100 health score |
| `lat` | `number().min(-90).max(90)` | ✅ | Decimal degrees |
| `lng` | `number().min(-180).max(180)` | ✅ | Decimal degrees |
| `createdAt` | `timestampSchema` | ✅ | ms |
| `updatedAt` | `timestampSchema` | ✅ | ms |
| `isArchived` | `boolean()` | optional | Soft-delete flag |

#### Location fields (PropertyLocationSchema)
| Field | Zod type | Required | Notes |
|---|---|---|---|
| `addressLine` | `string()` | optional | |
| `addressLine2` | `string()` | optional | |
| `city` | `string()` | optional | |
| `zip` | `string()` | optional | |
| `country` | `string()` | optional | |
| `province` | `string().min(1)` | ✅ | Required (used as primary geographic grouping) |

#### Finance fields (PropertyFinanceSchema)
| Field | Zod type | Required | Notes |
|---|---|---|---|
| `purchasePrice` | `string()` | optional | **Anomaly:** stored as string, not number |
| `purchaseDate` | `number().int().nonnegative()` | optional | ms |
| `currentMarketValue` | `number().nonnegative()` | optional | |
| `outstandingMortgage` | `number().nonnegative()` | optional | |
| `monthlyPayment` | `number().nonnegative()` | optional | P/I |
| `interestRate` | `number().nonnegative()` | optional | |
| `annualPropertyTax` | `number().nonnegative()` | optional | Used in NOI fallback |
| `taxAssessmentValue` | `number().nonnegative()` | optional | |
| `annualInsurance` | `number().nonnegative()` | optional | Used in NOI fallback |
| `ownershipStatus` | `string()` | optional | Free-form |
| `buyNumeric` | `number().nonnegative()` | ✅ | **Required** — duplicate of `purchasePrice` (Q5.P) |

#### Media/spec fields (PropertyMediaSchema)
| Field | Zod type | Required | Notes |
|---|---|---|---|
| `photoStorageIds` | `array(string())` | optional | Storage refs |
| `documentStorageIds` | `array(string())` | optional | Storage refs |
| `totalArea` | `string()` | ✅ | **Anomaly:** string not number |
| `yearBuilt` | `string()` | optional | **Anomaly:** string not number |
| `bedrooms` | `string()` | optional | **Anomaly:** string not number |
| `bathrooms` | `string()` | optional | **Anomaly:** string not number |
| `parkingSpaces` | `string()` | optional | |
| `storageUnit` | `string()` | optional | |
| `title` | `propertyTitleSchema` | ✅ | 3-value enum |

**Notes:**
- `PropertyListItemSchema` is the narrowed projection sent to client (portfolio table) — picks only the safe-to-expose fields.
- Q5.B tracks the string-vs-number anomalies.
- Q5.P tracks the `purchasePrice` / `buyNumeric` duplication.
- `health` is the most common KPI input; appears on every property tab header.

---

### 👤 Tenant

- **File:** `lib/data/types/tenant.ts`
- **CRUD layer:** `lib/data/db/tenants.ts`
- **Seed count:** 3 records (TEN-0001 → TEN-0003)
- **Pages consuming:** `/property/[id]/overview` (Tenant Profile), `/property/[id]/rental`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `name` | `string().min(1)` | ✅ | |
| `unit` | `string().min(1)` | ✅ | Unit identifier within property |
| `rent` | `number().nonnegative()` | ✅ | Note: Lease.monthlyRent is the canonical rent figure; Tenant.rent may drift |
| `status` | `enum(Paid, Overdue, Pending)` | ✅ | |
| `email` | `string()` | optional | **Not validated as email format** |
| `phone` | `string()` | optional | |

---

### 📄 Lease

- **File:** `lib/data/types/lease.ts`
- **CRUD layer:** `lib/data/db/leases.ts`
- **Seed count:** 5 records (LEASE-0001 → LEASE-0005)
- **Pages consuming:** `/portfolio`, `/property/[id]/overview`, `/property/[id]/rental`, `/property/[id]/ownership` (rent income derivation), `/analytics`, `/rental`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `tenantId` | `idSchema` | optional | FK → Tenant |
| `unit` | `string().min(1)` | ✅ | |
| `stage` | `enum(Approaching, Offered, Signed, Declined)` | ✅ | Lifecycle |
| `startDate` | `timestampSchema` | ✅ | ms |
| `endDate` | `timestampSchema` | ✅ | ms |
| `monthlyRent` | `number().nonnegative()` | ✅ | Canonical rent figure |
| `termMonths` | `number().int().positive()` | ✅ | |
| `renewalStatus` | `string()` | optional | Free-form |

**Notes:**
- Schema gaps tracked: `Lease.deposit` (F2 in property-id-rental--lease-summary-fields), `Lease.autoPay` (F3).

---

### 💵 Payment

- **File:** `lib/data/types/payment.ts`
- **CRUD layer:** `lib/data/db/payments.ts`
- **Seed count:** 10 records
- **Pages consuming:** `/portfolio`, `/property/[id]/overview`, `/property/[id]/rental`, `/analytics`, `/rental`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `leaseId` | `idSchema` | optional | FK → Lease |
| `tenantId` | `idSchema` | optional | FK → Tenant |
| `date` | `timestampSchema` | ✅ | ms — Q3.E open: due date or invoice date? |
| `kind` | `enum(Rent, Fee, Deposit, Refund)` | ✅ | |
| `amount` | `number().nonnegative()` | ✅ | |
| `method` | `string().min(1)` | ✅ | Free-form (e.g. "ACH", "Card") |
| `status` | `enum(Paid, Pending, Failed, Overdue)` | ✅ | |

---

### 🧾 Expense

- **File:** `lib/data/types/expense.ts`
- **CRUD layer:** `lib/data/db/expenses.ts`
- **Seed count:** 22 records (EXP-0001 → EXP-0022)
- **Pages consuming:** `/property/[id]/overview`, `/property/[id]/rental`, `/analytics`, `/rental`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `date` | `timestampSchema` | ✅ | ms |
| `category` | `enum(Maintenance, Utilities, Insurance, Tax, Management, Other)` | ✅ | 6 closed values |
| `amount` | `number().nonnegative()` | ✅ | |
| `note` | `string()` | optional | |

---

### 📁 Document

- **File:** `lib/data/types/document.ts`
- **CRUD layer:** `lib/data/db/documents.ts`
- **Seed count:** 10 records
- **Pages consuming:** `/property/[id]/rental` (3-item card), `/property/[id]/documents`, `/estate-planning` (filtered by `category === "Estate"`)

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `folderId` | `string()` | optional | FK → Folder |
| `name` | `string().min(1)` | ✅ | |
| `kind` | `enum(photo, document)` | ✅ | |
| `mimeType` | `string()` | optional | |
| `extension` | `string()` | optional | e.g. "pdf", "png" |
| `sizeBytes` | `number().int().nonnegative()` | optional | |
| `storageId` | `string().min(1)` | ✅ | Currently a path; will become Convex `_storage` ref (Q5.C) |
| `thumbStorageId` | `string()` | optional | |
| `category` | `string()` | optional | **Open string** — Q5.R; estate-planning relies on lowercase "estate" |
| `uploadedBy` | `string()` | optional | |
| `uploadedAt` | `timestampSchema` | ✅ | ms |

---

### 🗂️ Folder

- **File:** `lib/data/types/folder.ts`
- **CRUD layer:** `lib/data/db/folders.ts`
- **Seed count:** 10 records
- **Pages consuming:** `/property/[id]/rental` (folder context for documents card), `/property/[id]/documents`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `parentFolderId` | `string().min(1)` | optional | Self-FK; nesting via `buildFolderTree` |
| `name` | `string().min(1)` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | ms |

---

### 🔍 Inspection

- **File:** `lib/data/types/inspection.ts`
- **CRUD layer:** `lib/data/db/inspections.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/property/[id]/safety` *(deferred)*

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `date` | `string().min(1)` | ✅ | **Anomaly:** stored as string (e.g. `"Mar 14, 2026"`); Schema gap B |
| `type` | `string().min(1)` | ✅ | Free-form |
| `inspector` | `string().min(1)` | ✅ | |
| `status` | `string().min(1)` | ✅ | **Open string**; Schema gap C — should be `Passed/Failed/Pending` |
| `issues` | `number().int().nonnegative()` | ✅ | Issue count |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 📈 PropertyValuation

- **File:** `lib/data/types/property-valuation.ts`
- **CRUD layer:** `lib/data/db/property-valuations.ts`
- **Seed count:** 3 records (Jan/Feb/Mar 2026 for PROP-0001)
- **Pages consuming:** `/portfolio` (YoY badge), `/property/[id]/overview`, `/property/[id]/valuation`, `/analytics`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `month` | `string().regex(/^[A-Z][a-z]{2} \d{4}$/)` | ✅ | Format: `"Jan 2026"` |
| `price` | `number().positive()` | ✅ | **Note:** positive (not nonnegative) |
| `recordedAt` | `timestampSchema` | ✅ | ms |

---

### ✅ Certification

- **File:** `lib/data/types/certification.ts`
- **CRUD layer:** `lib/data/db/certifications.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/property/[id]/safety` *(deferred)*

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `name` | `string().min(1)` | ✅ | |
| `status` | `string().min(1)` | ✅ | **Open string**; Schema gap C — should be `Valid/Expiring/Expired` |
| `issued` | `string().min(1)` | ✅ | **Anomaly:** date-as-string |
| `expires` | `string().min(1)` | ✅ | **Anomaly:** date-as-string |
| `inspector` | `string().min(1)` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 🔧 MaintenanceItem

- **File:** `lib/data/types/maintenance-item.ts`
- **CRUD layer:** `lib/data/db/maintenance-items.ts`
- **Seed count:** 3 records (MAINT-0001 → MAINT-0003)
- **Pages consuming:** `/property/[id]/overview` (alerts strip), `/property/[id]/rental`, `/analytics`, `/rental`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `severity` | `enum(Emergency, Urgent, Standard)` | ✅ | |
| `title` | `string().min(1)` | ✅ | |
| `status` | `enum(Open, InProgress, Resolved)` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | ms |
| `cost` | `number().nonnegative()` | optional | **Added Phase 6.8b** — used by `computeMaintenanceTotal` |

---

### ⚠️ SafetyRisk

- **File:** `lib/data/types/safety-risk.ts`
- **CRUD layer:** `lib/data/db/safety-risks.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/property/[id]/safety` *(deferred)*

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `severityLabel` | `string().min(1)` | ✅ | **Open string**; Schema gap C — should be `High/Medium/Low` |
| `title` | `string().min(1)` | ✅ | |
| `desc` | `string().min(1)` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

**Notes:** Q5.Q resolved — no `resolved` field. KPI card uses `risks.length` directly.

---

### 🆘 EmergencyContact

- **File:** `lib/data/types/emergency-contact.ts`
- **CRUD layer:** `lib/data/db/emergency-contacts.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/property/[id]/safety` *(deferred)*

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `name` | `string().min(1)` | ✅ | |
| `phone` | `string().min(1)` | ✅ | |
| `sub` | `string()` | optional | Subtitle/role label |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 🌍 LandParcel

- **File:** `lib/data/types/land-parcel.ts`
- **CRUD layer:** `lib/data/db/land-parcels.ts`
- **Seed count:** 3 records (LP-0001 → LP-0003)
- **Pages consuming:** `/property/[id]/location`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | 1→1 with Property typically |
| `sizeM2` | `number().nonnegative()` | ✅ | Square meters |
| `widthM` | `number().nonnegative()` | optional | |
| `lengthM` | `number().nonnegative()` | optional | |
| `zoningCode` | `string()` | optional | e.g. "A-2" |
| `zoningClass` | `string()` | optional | |
| `developmentPotential` | `array(string())` | optional | Bullet list |
| `elevationM` | `number()` | optional | Can be negative |
| `slopeAngleDeg` | `number()` | optional | |
| `terrainType` | `TerrainTypeSchema` | optional | 5-value enum |

---

### 👥 CoOwner

- **File:** `lib/data/types/co-owner.ts`
- **CRUD layer:** `lib/data/db/co-owners.ts`
- **Seed count:** 6 records (CO-0001 → CO-0006)
- **Pages consuming:** `/property/[id]/ownership`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | 1→N with Property |
| `name` | `string().min(1)` | ✅ | |
| `role` | `enum(Primary, Minor)` | ✅ | |
| `sharePercent` | `number().min(0).max(100)` | ✅ | Q3.G: sum-to-100 validated server-side |
| `email` | `string()` | optional | |
| `phone` | `string()` | optional | |
| `address` | `string()` | optional | |
| `ssnMasked` | `string().regex(/^••••-••-\d{4}$/)` | optional | **PII; masked-at-rest** — see Q5.S |
| `taxEntity` | `TaxEntitySchema` | optional | 7-value enum |
| `tax1099Status` | `string()` | optional | Free-form |

---

### 🏛️ OwnershipRecord (ownership structure)

- **File:** `lib/data/types/ownership-record.ts`
- **CRUD layer:** `lib/data/db/ownership-records.ts`
- **Seed count:** 3 records (OREC-0001 → OREC-0003)
- **Pages consuming:** `/property/[id]/ownership`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `holdingType` | `HoldingTypeSchema` | ✅ | 6-value enum |
| `loanType` | `string()` | optional | "Fixed" / "ARM" |
| `loanAmount` | `number().nonnegative()` | optional | |
| `loanTermYears` | `number().int().positive()` | optional | |
| `interestRate` | `number().nonnegative()` | optional | |
| `originationDate` | `timestampSchema` | optional | ms |
| `maturityDate` | `timestampSchema` | optional | ms |
| `nextPaymentDue` | `timestampSchema` | optional | ms |
| `lenderName` | `string()` | optional | |
| `downPayment` | `number().nonnegative()` | optional | |
| `closingCosts` | `number().nonnegative()` | optional | |
| `distributionMethod` | `DistributionMethodSchema` | optional | 3-value enum |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 📜 OwnershipDocument (deeds/title docs)

- **File:** `lib/data/types/ownership-document.ts`
- **CRUD layer:** `lib/data/db/ownership-documents.ts`
- **Seed count:** 3 records (ODOC-0001 → ODOC-0003)
- **Pages consuming:** `/property/[id]/ownership`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `name` | `string().min(1)` | ✅ | |
| `type` | `string().min(1)` | ✅ | **Open string** — could be enum |
| `date` | `string().min(1)` | ✅ | **Anomaly:** date-as-string |
| `owner` | `string().min(1)` | ✅ | Owner display name |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

**Schema gap:** Row 31 of `/property/[id]/ownership` shows hardcoded "Current" status badge — `status` field absent.

---

### 📅 OwnershipHistory (timeline)

- **File:** `lib/data/types/ownership-history.ts`
- **CRUD layer:** `lib/data/db/ownership-history.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/property/[id]/ownership`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `propertyIdSchema` | ✅ | |
| `date` | `string().min(1)` | ✅ | **Anomaly:** date-as-string |
| `text` | `string().min(1)` | ✅ | |
| `color` | `string().min(1)` | ✅ | UI color hint (anomaly: presentational data on entity) |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 🧬 Successor

- **File:** `lib/data/types/successor.ts`
- **CRUD layer:** `lib/data/db/successors.ts`
- **Seed count:** 3 records (SUCC-0001 → SUCC-0003)
- **Pages consuming:** `/estate-planning`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | No `propertyId` — assigned via join table |
| `name` | `string().min(1)` | ✅ | |
| `initials` | `string().min(1)` | ✅ | |
| `relation` | `string().min(1)` | ✅ | Free-form (e.g. "Son", "Daughter") |
| `role` | `enum(primary, contingent)` | ✅ | **lowercase** (different from CoOwnerRole) |
| `share` | `number().nonnegative()` | ✅ | Percent (0–100) |
| `verified` | `boolean()` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 🔗 SuccessorPropertyAssignment (join table)

- **File:** `lib/data/types/successor-property-assignment.ts`
- **CRUD layer:** `lib/data/db/successor-property-assignments.ts`
- **Seed count:** 5 records
- **Pages consuming:** `/estate-planning`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `successorId` | `idSchema` | ✅ | FK → Successor |
| `propertyId` | `propertyIdSchema` | ✅ | FK → Property |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

**Notes:** Q4.V resolution — join table over `Successor.propertyIds`.

---

### 📝 EstateActivityEvent

- **File:** `lib/data/types/estate-activity-event.ts`
- **CRUD layer:** `lib/data/db/estate-activity-events.ts`
- **Seed count:** 3 records
- **Pages consuming:** `/estate-planning`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `kind` | `estateActivityKindSchema` | ✅ | 7-value enum |
| `title` | `string().min(1)` | ✅ | |
| `description` | `string().min(1)` | ✅ | |
| `propertyId` | `propertyIdSchema` | optional | Some events portfolio-wide |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 👨‍💼 Professional

- **File:** `lib/data/types/professional.ts`
- **CRUD layer:** `lib/data/db/professionals.ts`
- **Seed count:** 9 records (PROF-0001 → PROF-0009)
- **Pages consuming:** `/directory`, `/directory/[id]`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | No `propertyId` — directory-scoped |
| `name` | `string().min(1)` | ✅ | |
| `company` | `string().min(1)` | ✅ | |
| `category` | `string().min(1)` | ✅ | **Open string** — UI uses 8 categories: Agent/Lawyer/Notary/Electrician/Plumber/Inspector/Maintenance/Accountant |
| `rating` | `number().min(0).max(5)` | ✅ | |
| `reviewCount` | `number().int().nonnegative()` | ✅ | |
| `linkedProperties` | `number().int().nonnegative()` | ✅ | **Scalar** — PF6 deferred (could become FK array) |
| `available` | `boolean()` | ✅ | |
| `initials` | `string().min(1)` | ✅ | |
| `avatarBg` | `string().min(1)` | ✅ | UI hint (anomaly: presentational on entity) |
| `email` | `string().email()` | optional | **Email-validated** (rare in this codebase) |
| `phone` | `string()` | optional | |
| `verified` | `boolean()` | default `false` | |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

### 👤 UserProfile

- **File:** `lib/data/types/user-profile.ts`
- **CRUD layer:** `lib/data/db/user-profiles.ts`
- **Seed count:** 1 record (`demo-user`)
- **Pages consuming:** `/profile`, `/settings`, app shell layout (avatar/header)

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | Equals `userId` for demo |
| `userId` | `userIdSchema` | ✅ | |
| `firstName` | `string()` | ✅ | (no `min(1)` — empty allowed) |
| `lastName` | `string()` | ✅ | (no `min(1)`) |
| `jobTitle` | `string()` | optional | |
| `employeeId` | `string()` | optional | |
| `email` | `string()` | optional | **Not email-validated** |
| `phone` | `string()` | optional | |
| `officeLocation` | `string()` | optional | |
| `language` | `string()` | optional | |
| `timezone` | `string()` | optional | |
| `currency` | `string()` | optional | |
| `role` | `string()` | optional | **Open string** — Q4.X |
| `dashboardView` | `string()` | optional | Q5.X |
| `memberSince` | `timestampSchema` | optional | ms |
| `lastLogin` | `timestampSchema` | optional | ms |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

**Note:** `saveProfileInfo` action uses a narrower `SaveProfileInfoSchema` (10 user-editable fields) — the system fields (`id`, `userId`, `createdAt`, etc.) are not exposed to the form.

---

### 🔔 Notification

- **File:** `lib/data/types/notification.ts`
- **CRUD layer:** `lib/data/db/notifications.ts`
- **Seed count:** 5 records
- **Pages consuming:** `/property/[id]/overview` (alerts strip), app shell layout (bell panel)

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `propertyId` | `string()` | optional | **Anomaly:** uses generic `z.string()` not `propertyIdSchema`. Added Phase 8.8 for direct match (Q5.T). |
| `category` | `enum(MAINTENANCE, LEASING, COMPLIANCE, PAYMENT, APPLICATIONS)` | ✅ | UPPERCASE (different from other enums) |
| `title` | `string().min(1)` | ✅ | |
| `description` | `string().min(1)` | ✅ | |
| `createdAt` | `timestampSchema` | ✅ | ms |
| `read` | `boolean()` | ✅ | |
| `linkTo` | `string()` | optional | Used as fallback for property scoping when `propertyId` absent |

---

### ⚙️ NotificationPreference

- **File:** `lib/data/types/notification-preference.ts`
- **CRUD layer:** `lib/data/db/notification-preferences.ts`
- **Seed count:** 3 records (NPREF-0001/0002/0003 — was 4; NPREF-0004 deleted)
- **Pages consuming:** `/settings`

| Field | Zod type | Required | Notes |
|---|---|---|---|
| `id` | `idSchema` | ✅ | |
| `userId` | `userIdSchema` | ✅ | |
| `eventType` | `string().min(1)` | ✅ | Matches `NOTIFICATION_ROWS[].key` in settings/queries.ts |
| `email` | `boolean()` | ✅ | Channel toggle |
| `slack` | `boolean()` | ✅ | Channel toggle |
| `sms` | `boolean()` | ✅ | Channel toggle |
| `createdAt` | `timestampSchema` | ✅ | |
| `updatedAt` | `timestampSchema` | ✅ | |

---

## 5. Anomalies & schema gaps (consolidated)

These are inconsistencies you'll want to address (or at least note) in any new UI design or backend migration:

| # | Anomaly | Affected entities | Open Q | Severity |
|---|---|---|---|---|
| A1 | **Date-as-string** rather than timestamp | `Inspection.date`, `Certification.issued`/`expires`, `OwnershipDocument.date`, `OwnershipHistory.date` | Schema gap B (Safety plan) | High — breaks countdown derivations |
| A2 | **Numeric-as-string** | `Property.purchasePrice`, `totalArea`, `yearBuilt`, `bedrooms`, `bathrooms`, `parkingSpaces`, `storageUnit` | Q5.B | Medium — wizard-form artifact |
| A3 | **Open-string status** that should be enums | `Inspection.status`, `Certification.status`, `SafetyRisk.severityLabel`, `OwnershipDocument.type`, `Document.category`, `Professional.category`, `UserProfile.role` | Schema gap C, Q4.X, Q5.R | Medium — prevents exhaustive UI styling |
| A4 | **`Property.purchasePrice` vs `buyNumeric`** duplication | Property | Q5.P | Medium — `purchasePrice` is string-typed, `buyNumeric` is number-typed and required |
| A5 | **Casing inconsistency** in enums | `Notification.category` UPPERCASE, `Successor.role` lowercase, `CoOwnerRole` Capitalized | — | Low — cosmetic |
| A6 | **Notification.propertyId** uses `z.string().optional()` not `propertyIdSchema` | Notification | Q5.T (closed but cosmetic gap remains) | Low |
| A7 | **Presentational fields on entities** | `OwnershipHistory.color`, `Professional.avatarBg` | — | Low — should be derived from another field |
| A8 | **`Property.totalArea` is required string but `width/length` on LandParcel are optional numbers** — same domain modeled twice | Property + LandParcel | — | Medium — consider deprecating `totalArea` once LandParcel is fully populated |
| A9 | **No email validation on Tenant.email or UserProfile.email** (only `Professional.email` uses `.email()`) | Tenant, UserProfile | — | Low |
| A10 | **`OwnershipDocument.status` field missing** — UI hardcodes "Current" | OwnershipDocument | — | Medium — 1 surface still HARDCODED |
| A11 | **`Lease.deposit` and `Lease.autoPay` missing** — UI shows "—" placeholders | Lease | F2/F3 in property-id-rental--lease-summary-fields | Medium |
| A12 | **`SafetyRisk.resolved` field absent** — KPI collapses to `risks.length` (Q5.Q resolved as intentional) | SafetyRisk | Q5.Q (resolved) | resolved |

---

## Quick reference — entity sizes at a glance

| Entity | Required fields | Optional fields | Total fields |
|---|---|---|---|
| Property | 13 (4 Core + 1 Loc + 1 Fin + 2 Media) | 25 | 38 |
| OwnershipRecord | 5 | 12 | 17 |
| UserProfile | 4 | 14 | 18 |
| Document | 6 | 8 | 14 |
| Notification | 6 | 3 | 9 |
| LandParcel | 4 | 8 | 12 |
| CoOwner | 5 | 6 | 11 |
| Professional | 12 (incl. default `verified`) | 2 | 14 |
| Lease | 9 | 2 | 11 |
| Payment | 8 | 2 | 10 |
| MaintenanceItem | 7 | 1 | 8 |
| (others) | varies | varies | 5–10 |

Use this as a quick gauge of which entities are large surfaces (Property at 38 fields is the most complex; most others are <12).
