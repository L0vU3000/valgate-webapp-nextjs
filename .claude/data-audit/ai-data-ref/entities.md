# Entities — AI ref

> Distilled from `../ref/07-entity-fields.md`. Tables only. If conflict, `07` wins.

## Common primitives — `lib/data/types/_common.ts`

| Schema | Definition |
|---|---|
| `idSchema` | `z.string().min(1)` |
| `userIdSchema` | `z.string().min(1)` |
| `propertyIdSchema` | `z.string().min(1)` |
| `timestampSchema` | `z.number().int().nonnegative()` |

## Sub-enum registry

| Enum | Values | File |
|---|---|---|
| `propertyStatusSchema` | `Rented`, `Vacant`, `For Sale`, `Sold`, `Archived`, `Owner-Occupied` | property |
| `propertyTitleSchema` | `Hard title`, `Soft title`, `—` | property |
| `propertyTypeChoiceSchema` | `residential`, `commercial`, `multi-unit`, `retail`, `land`, `industrial`, `construction`, `other` | property |
| `LeaseStage` | `Approaching`, `Offered`, `Signed`, `Declined` | lease |
| `PaymentKind` | `Rent`, `Fee`, `Deposit`, `Refund` | payment |
| `PaymentStatus` | `Paid`, `Pending`, `Failed`, `Overdue` | payment |
| `TenantStatus` | `Paid`, `Overdue`, `Pending` | tenant |
| `ExpenseCategory` | `Maintenance`, `Utilities`, `Insurance`, `Tax`, `Management`, `Other` | expense |
| `DocumentKind` | `photo`, `document` | document |
| `MaintenanceSeverity` | `Emergency`, `Urgent`, `Standard` | maintenance-item |
| `MaintenanceStatus` | `Open`, `InProgress`, `Resolved` | maintenance-item |
| `TerrainType` | `Flat`, `Rolling`, `Hilly`, `Mountainous`, `Mixed` | land-parcel |
| `CoOwnerRole` | `Primary`, `Minor` | co-owner |
| `TaxEntity` | `Individual`, `S-Corp`, `C-Corp`, `LLC`, `Partnership`, `Trust`, `Other` | co-owner |
| `HoldingType` | `Tenancy in Common`, `Joint Tenancy`, `Sole Ownership`, `Trust`, `LLC`, `Other` | ownership-record |
| `DistributionMethod` | `Pro-Rata by Share`, `Equal Split`, `Custom` | ownership-record |
| `Successor.role` | `primary`, `contingent` (lowercase) | successor |
| `estateActivityKindSchema` | `successor.created/updated/deleted/assigned`, `document.added/removed`, `estate.reviewed` | estate-activity-event |
| `Notification.category` | `MAINTENANCE`, `LEASING`, `COMPLIANCE`, `PAYMENT`, `APPLICATIONS` (UPPERCASE) | notification |

## Entity → pages-consuming map

| Entity | Consumed by routes |
|---|---|
| Property | /portfolio, /property/[id]/* (all 7), /analytics, /rental, /estate-planning |
| Tenant | /property/[id]/overview, /property/[id]/rental |
| Lease | /portfolio, /property/[id]/overview, /property/[id]/rental, /property/[id]/ownership, /analytics, /rental |
| Payment | /portfolio, /property/[id]/overview, /property/[id]/rental, /analytics, /rental |
| Expense | /property/[id]/overview, /property/[id]/rental, /analytics, /rental |
| Document | /property/[id]/rental, /property/[id]/documents, /estate-planning |
| Folder | /property/[id]/rental, /property/[id]/documents |
| Inspection | /property/[id]/safety (deferred) |
| PropertyValuation | /portfolio, /property/[id]/overview, /property/[id]/valuation, /analytics |
| Certification | /property/[id]/safety (deferred) |
| MaintenanceItem | /property/[id]/overview, /property/[id]/rental, /analytics, /rental |
| SafetyRisk | /property/[id]/safety (deferred) |
| EmergencyContact | /property/[id]/safety (deferred) |
| LandParcel | /property/[id]/location |
| CoOwner | /property/[id]/ownership |
| OwnershipRecord | /property/[id]/ownership |
| OwnershipDocument | /property/[id]/ownership |
| OwnershipHistory | /property/[id]/ownership |
| Successor | /estate-planning |
| SuccessorPropertyAssignment | /estate-planning |
| EstateActivityEvent | /estate-planning |
| Professional | /directory, /directory/[id] |
| UserProfile | /profile, /settings, app shell |
| Notification | /property/[id]/overview, app shell |
| NotificationPreference | /settings |

## Per-entity field tables

> Format: field · type · required · note. `idSchema`, `userIdSchema`, `propertyIdSchema`, `timestampSchema` per `_common.ts`.

### Property — `lib/data/types/property.ts` · 16 seeds · CRUD: `db/properties.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id | idSchema | ✅ | |
| userId | userIdSchema | ✅ | |
| name | string().min(1) | ✅ | |
| code | string().min(1) | ✅ | |
| type | propertyTypeChoiceSchema | ✅ | 8-enum |
| status | propertyStatusSchema | ✅ | 6-enum |
| health | number().int().min(0).max(100) | ✅ | Q5.K resolved: drop |
| lat | number().min(-90).max(90) | ✅ | |
| lng | number().min(-180).max(180) | ✅ | |
| createdAt | timestampSchema | ✅ | |
| updatedAt | timestampSchema | ✅ | |
| isArchived | boolean() | — | |
| addressLine | string() | — | |
| addressLine2 | string() | — | |
| city | string() | — | |
| zip | string() | — | |
| country | string() | — | |
| province | string().min(1) | ✅ | |
| purchasePrice | string() | — | A2: should be number; Q5.P |
| purchaseDate | number().int().nonnegative() | — | ms |
| currentMarketValue | number().nonnegative() | — | |
| outstandingMortgage | number().nonnegative() | — | |
| monthlyPayment | number().nonnegative() | — | |
| interestRate | number().nonnegative() | — | |
| annualPropertyTax | number().nonnegative() | — | |
| taxAssessmentValue | number().nonnegative() | — | |
| annualInsurance | number().nonnegative() | — | |
| ownershipStatus | string() | — | |
| buyNumeric | number().nonnegative() | ✅ | canonical purchase $ |
| photoStorageIds | array(string()) | — | |
| documentStorageIds | array(string()) | — | |
| totalArea | string() | ✅ | A2: should be number |
| yearBuilt | string() | — | A2: should be number |
| bedrooms | string() | — | A2: should be number |
| bathrooms | string() | — | A2: should be number |
| parkingSpaces | string() | — | |
| storageUnit | string() | — | |
| title | propertyTitleSchema | ✅ | 3-enum |

`PropertyListItemSchema` is a narrowed projection (id, name, code, type, province, status, health, totalArea, title, buy:string).

### Tenant — `tenant.ts` · 3 seeds · CRUD: `db/tenants.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| name | string().min(1) | ✅ |
| unit | string().min(1) | ✅ |
| rent | number().nonnegative() | ✅ |
| status | enum(Paid,Overdue,Pending) | ✅ |
| email | string() | — |
| phone | string() | — |

### Lease — `lease.ts` · 5 seeds · CRUD: `db/leases.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| tenantId | idSchema | — |
| unit | string().min(1) | ✅ |
| stage | LeaseStage | ✅ |
| startDate, endDate | timestampSchema | ✅ |
| monthlyRent | number().nonnegative() | ✅ |
| termMonths | number().int().positive() | ✅ |
| renewalStatus | string() | — |
| **deposit** | — | — | A11 missing |
| **autoPay** | — | — | A11 missing |

### Payment — `payment.ts` · 10 seeds · CRUD: `db/payments.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| leaseId | idSchema | — |
| tenantId | idSchema | — |
| date | timestampSchema | ✅ |
| kind | PaymentKind | ✅ |
| amount | number().nonnegative() | ✅ |
| method | string().min(1) | ✅ |
| status | PaymentStatus | ✅ |

### Expense — `expense.ts` · 22 seeds · CRUD: `db/expenses.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| date | timestampSchema | ✅ |
| category | ExpenseCategory | ✅ |
| amount | number().nonnegative() | ✅ |
| note | string() | — |

### Document — `document.ts` · 10 seeds · CRUD: `db/documents.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| folderId | string() | — |
| name | string().min(1) | ✅ |
| kind | DocumentKind | ✅ |
| mimeType, extension | string() | — |
| sizeBytes | number().int().nonnegative() | — |
| storageId | string().min(1) | ✅ | path; Q5.C → `_storage` |
| thumbStorageId | string() | — |
| category | string() | — | Q5.R: open string |
| uploadedBy | string() | — |
| uploadedAt | timestampSchema | ✅ |

### Folder — `folder.ts` · 10 seeds · CRUD: `db/folders.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| parentFolderId | string().min(1) | — | self-FK |
| name | string().min(1) | ✅ |
| createdAt | timestampSchema | ✅ |

### Inspection — `inspection.ts` · 3 seeds · CRUD: `db/inspections.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| date | string().min(1) | ✅ | A1: should be timestamp |
| type | string().min(1) | ✅ | |
| inspector | string().min(1) | ✅ | |
| status | string().min(1) | ✅ | A3: should be `Passed/Failed/Pending` |
| issues | number().int().nonnegative() | ✅ | |
| createdAt, updatedAt | timestampSchema | ✅ | |

### PropertyValuation — `property-valuation.ts` · 3 seeds · CRUD: `db/property-valuations.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| month | string().regex(`^[A-Z][a-z]{2} \d{4}$`) | ✅ | "Jan 2026" |
| price | number().positive() | ✅ |
| recordedAt | timestampSchema | ✅ |

### Certification — `certification.ts` · 3 seeds · CRUD: `db/certifications.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| name | string().min(1) | ✅ | |
| status | string().min(1) | ✅ | A3: should be `Valid/Expiring/Expired` |
| issued, expires | string().min(1) | ✅ | A1: should be timestamp |
| inspector | string().min(1) | ✅ | |
| createdAt, updatedAt | timestampSchema | ✅ | |

### MaintenanceItem — `maintenance-item.ts` · 3 seeds · CRUD: `db/maintenance-items.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| severity | MaintenanceSeverity | ✅ |
| title | string().min(1) | ✅ |
| status | MaintenanceStatus | ✅ |
| createdAt | timestampSchema | ✅ |
| cost | number().nonnegative() | — | added Phase 6.8b |

### SafetyRisk — `safety-risk.ts` · 3 seeds · CRUD: `db/safety-risks.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| severityLabel | string().min(1) | ✅ | A3: should be `High/Medium/Low` |
| title, desc | string().min(1) | ✅ | |
| createdAt, updatedAt | timestampSchema | ✅ | |

### EmergencyContact — `emergency-contact.ts` · 3 seeds · CRUD: `db/emergency-contacts.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| name, phone | string().min(1) | ✅ |
| sub | string() | — |
| createdAt, updatedAt | timestampSchema | ✅ |

### LandParcel — `land-parcel.ts` · 3 seeds · CRUD: `db/land-parcels.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| sizeM2 | number().nonnegative() | ✅ |
| widthM, lengthM | number().nonnegative() | — |
| zoningCode, zoningClass | string() | — |
| developmentPotential | array(string()) | — |
| elevationM, slopeAngleDeg | number() | — |
| terrainType | TerrainType | — |

### CoOwner — `co-owner.ts` · 6 seeds · CRUD: `db/co-owners.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| name | string().min(1) | ✅ | |
| role | CoOwnerRole | ✅ | |
| sharePercent | number().min(0).max(100) | ✅ | Q3.G validates sum |
| email, phone, address | string() | — | |
| ssnMasked | string().regex(/^••••-••-\d{4}$/) | — | PII; Q5.S |
| taxEntity | TaxEntity | — | |
| tax1099Status | string() | — | |

### OwnershipRecord — `ownership-record.ts` · 3 seeds · CRUD: `db/ownership-records.ts`

| Field | Type | Req |
|---|---|---|
| id, userId, propertyId | std | ✅ |
| holdingType | HoldingType | ✅ |
| loanType | string() | — |
| loanAmount | number().nonnegative() | — |
| loanTermYears | number().int().positive() | — |
| interestRate | number().nonnegative() | — |
| originationDate, maturityDate, nextPaymentDue | timestampSchema | — |
| lenderName | string() | — |
| downPayment, closingCosts | number().nonnegative() | — |
| distributionMethod | DistributionMethod | — |
| createdAt, updatedAt | timestampSchema | ✅ |

### OwnershipDocument — `ownership-document.ts` · 3 seeds · CRUD: `db/ownership-documents.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| name, type, owner | string().min(1) | ✅ | type: open string |
| date | string().min(1) | ✅ | A1: should be timestamp |
| createdAt, updatedAt | timestampSchema | ✅ | |
| **status** | — | — | A10 missing — UI hardcodes "Current" |

### OwnershipHistory — `ownership-history.ts` · 3 seeds · CRUD: `db/ownership-history.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId, propertyId | std | ✅ | |
| date | string().min(1) | ✅ | A1: should be timestamp |
| text | string().min(1) | ✅ | |
| color | string().min(1) | ✅ | A7: presentational on entity |
| createdAt, updatedAt | timestampSchema | ✅ | |

### Successor — `successor.ts` · 3 seeds · CRUD: `db/successors.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId | std | ✅ | no propertyId — assigned via join |
| name, initials, relation | string().min(1) | ✅ | |
| role | enum(primary,contingent) | ✅ | A5: lowercase (vs CoOwnerRole capital) |
| share | number().nonnegative() | ✅ | percent |
| verified | boolean() | ✅ | |
| createdAt, updatedAt | timestampSchema | ✅ | |

### SuccessorPropertyAssignment — `successor-property-assignment.ts` · 5 seeds · CRUD: `db/successor-property-assignments.ts`

| Field | Type | Req |
|---|---|---|
| id, userId | std | ✅ |
| successorId | idSchema | ✅ |
| propertyId | propertyIdSchema | ✅ |
| createdAt, updatedAt | timestampSchema | ✅ |

### EstateActivityEvent — `estate-activity-event.ts` · 3 seeds · CRUD: `db/estate-activity-events.ts`

| Field | Type | Req |
|---|---|---|
| id, userId | std | ✅ |
| kind | estateActivityKindSchema | ✅ |
| title, description | string().min(1) | ✅ |
| propertyId | propertyIdSchema | — |
| createdAt, updatedAt | timestampSchema | ✅ |

### Professional — `professional.ts` · 9 seeds · CRUD: `db/professionals.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId | std | ✅ | no propertyId |
| name, company | string().min(1) | ✅ | |
| category | string().min(1) | ✅ | A3: should be 8-enum |
| rating | number().min(0).max(5) | ✅ | |
| reviewCount, linkedProperties | number().int().nonnegative() | ✅ | linkedProperties is scalar (PF6) |
| available | boolean() | ✅ | |
| initials, avatarBg | string().min(1) | ✅ | A7: presentational |
| email | string().email() | — | only entity with .email() validator |
| phone | string() | — | |
| verified | boolean().default(false) | ✅ | |
| createdAt, updatedAt | timestampSchema | ✅ | |

### UserProfile — `user-profile.ts` · 1 seed · CRUD: `db/user-profiles.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId | std | ✅ | id===userId for demo |
| firstName, lastName | string() | ✅ | no .min(1) |
| jobTitle, employeeId | string() | — | |
| email, phone | string() | — | A9: not email-validated |
| officeLocation | string() | — | |
| language, timezone, currency | string() | — | |
| role | string() | — | Q4.X: open string |
| dashboardView | string() | — | Q5.X |
| memberSince, lastLogin | timestampSchema | — | |
| createdAt, updatedAt | timestampSchema | ✅ | |

`saveProfileInfo` action uses narrower `SaveProfileInfoSchema` (10 user-editable fields).

### Notification — `notification.ts` · 5 seeds · CRUD: `db/notifications.ts`

| Field | Type | Req | Note |
|---|---|---|---|
| id, userId | std | ✅ | |
| propertyId | string() | — | A6: generic string not propertyIdSchema |
| category | enum(MAINTENANCE,LEASING,COMPLIANCE,PAYMENT,APPLICATIONS) | ✅ | UPPERCASE |
| title, description | string().min(1) | ✅ | |
| createdAt | timestampSchema | ✅ | |
| read | boolean() | ✅ | |
| linkTo | string() | — | fallback for property scoping |

### NotificationPreference — `notification-preference.ts` · 3 seeds · CRUD: `db/notification-preferences.ts`

| Field | Type | Req |
|---|---|---|
| id, userId | std | ✅ |
| eventType | string().min(1) | ✅ |
| email, slack, sms | boolean() | ✅ |
| createdAt, updatedAt | timestampSchema | ✅ |

## Anomalies (consolidated)

| # | Anomaly | Affects | Q | Severity |
|---|---|---|---|---|
| A1 | Date-as-string not timestamp | Inspection.date · Certification.issued/expires · OwnershipDocument.date · OwnershipHistory.date | Schema gap B | High |
| A2 | Numeric-as-string | Property.purchasePrice/totalArea/yearBuilt/bedrooms/bathrooms/parkingSpaces/storageUnit | Q5.B | Medium |
| A3 | Open-string status that should be enums | Inspection.status · Certification.status · SafetyRisk.severityLabel · OwnershipDocument.type · Document.category · Professional.category · UserProfile.role | Schema gap C, Q4.X, Q5.R | Medium |
| A4 | Property.purchasePrice (str) vs buyNumeric (num) duplication | Property | Q5.P | Medium |
| A5 | Casing inconsistency in enums | Notification.category UPPER · Successor.role lower · CoOwnerRole Capitalized | — | Low |
| A6 | Notification.propertyId uses z.string() not propertyIdSchema | Notification | Q5.T (closed cosmetic) | Low |
| A7 | Presentational fields on entities | OwnershipHistory.color · Professional.avatarBg | — | Low |
| A8 | Property.totalArea required string vs LandParcel.sizeM2 typed number | Property + LandParcel | — | Medium |
| A9 | No email validation on Tenant.email or UserProfile.email | Tenant, UserProfile | — | Low |
| A10 | OwnershipDocument.status missing — UI hardcodes "Current" | OwnershipDocument | — | Medium |
| A11 | Lease.deposit + Lease.autoPay missing — UI shows "—" | Lease | F2/F3 | Medium |
| A12 | SafetyRisk.resolved absent — KPI = risks.length | SafetyRisk | Q5.Q (resolved as intentional) | resolved |

## Entity sizes

| Entity | Required | Optional | Total |
|---|---|---|---|
| Property | 13 | 25 | 38 |
| OwnershipRecord | 5 | 12 | 17 |
| UserProfile | 4 | 14 | 18 |
| Document | 6 | 8 | 14 |
| Notification | 6 | 3 | 9 |
| LandParcel | 4 | 8 | 12 |
| CoOwner | 5 | 6 | 11 |
| Professional | 12 | 2 | 14 |
| Lease | 9 | 2 | 11 |
| Payment | 8 | 2 | 10 |
| MaintenanceItem | 7 | 1 | 8 |
| (others) | varies | varies | 5–10 |

---

_Last sync: 2026-05-07. Source: `../ref/07-entity-fields.md`._
