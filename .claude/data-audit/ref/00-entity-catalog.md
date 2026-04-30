# 00 — Entity Catalog

> Every domain entity surfaced by the frontend, with full field set (union across all UI surfaces), provenance, relationships, ownership, lifecycle, and indexes implied by access patterns. Convex-style v.* types annotate the proposed schema.

Conventions:
- **owned-by-user**: every entity has `userId: v.string()` (Clerk user id) + `.index("by_user", ["userId"])` per `docs/mock-to-backend-pattern.md:198–207`.
- **timestamps**: `createdAt: v.number()` / `updatedAt: v.number()` Unix ms (per pattern doc).
- **provenance** = where the field is first introduced in the UI today.

---

## 1. Property (`properties`, plural `properties`)

The central aggregate. Fields union across `lib/mock-data.ts`, `add-property/_components/schemas.ts`, every `/property/[id]/*` route.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `_id` | `v.id("properties")` | no | Convex-managed |
| `userId` | `v.string()` | no | needed for ownership; **absent in mocks** |
| `name` | `v.string()` | no | mock-data.ts; Step2BasicInfo `propertyName` |
| `code` | `v.string()` | no | mock-data.ts (e.g. "PP00016 PH") |
| `type` | `v.union(v.literal("Land"), v.literal("House"), v.literal("Building"))` | no | mock-data.ts |
| `propertyType` | `v.union(v.literal("residential"), v.literal("commercial"), v.literal("multi-unit"), v.literal("retail"), v.literal("land"), v.literal("industrial"), v.literal("construction"), v.literal("other"))` | yes | schemas.ts step1Schema |
| `province` | `v.string()` | no | mock-data.ts |
| `status` | `v.union(v.literal("Rented"), v.literal("Vacant"))` | no | mock-data.ts |
| `statusVariant` | `v.union(v.literal("rented"), v.literal("vacant"))` | no | mock-data.ts (likely redundant w/ `status` — Q5.A) |
| `size` | `v.string()` | no | mock-data.ts (sq m string like "850") |
| `buy` | `v.string()` | no | mock-data.ts (formatted "$1,278,000") — derive at render |
| `buyNumeric` | `v.number()` | no | mock-data.ts (raw price; **canonical**) |
| `title` | `v.union(v.literal("Hard title"), v.literal("Soft title"), v.literal("—"))` | no | mock-data.ts |
| `titleVariant` | `v.union(v.literal("hard"), v.literal("soft"), v.literal("none"))` | no | mock-data.ts (redundant w/ `title` — Q5.A) |
| `health` | `v.number()` | no | mock-data.ts (0–100) |
| `lat` | `v.number()` | no | mock-data.ts |
| `lng` | `v.number()` | no | mock-data.ts |
| `addressLine` | `v.optional(v.string())` | yes | step2Schema |
| `addressLine2` | `v.optional(v.string())` | yes | step2Schema |
| `city` | `v.optional(v.string())` | yes | step2Schema |
| `stateProv` | `v.optional(v.string())` | yes | step2Schema (renamed from `state` to avoid collision) |
| `zip` | `v.optional(v.string())` | yes | step2Schema |
| `country` | `v.optional(v.string())` | yes | step2Schema |
| `yearBuilt` | `v.optional(v.string())` | yes | step2Schema (Q5.B: tighten to `v.number()`) |
| `totalArea` | `v.optional(v.string())` | yes | step2Schema (Q5.B: tighten to `v.number()`) |
| `bedrooms` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `bathrooms` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `parkingSpaces` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `storageUnit` | `v.optional(v.string())` | yes | step2Schema (Q5.B) |
| `purchasePrice` | `v.optional(v.string())` | yes | step3Schema (tighten to `v.number()`) |
| `purchaseDate` | `v.optional(v.number())` | yes | step3Schema (tighten to Unix ms) |
| `currentMarketValue` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `ownershipStatus` | `v.optional(v.string())` | yes | step3Schema |
| `outstandingMortgage` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `monthlyPayment` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `interestRate` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `annualPropertyTax` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `taxAssessmentValue` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `annualInsurance` | `v.optional(v.number())` | yes | step3Schema (tighten) |
| `photoStorageIds` | `v.array(v.id("_storage"))` | no | Step4PhotosDocs (today filename strings only) — Q5.C |
| `documentStorageIds` | `v.array(v.id("_storage"))` | no | Step4PhotosDocs — Q5.C |
| `createdAt` | `v.number()` | no | implied by `kpis.newThisMonth` (queries.ts:20) |
| `updatedAt` | `v.number()` | no | inferred |

**Relationships**: 1→N to `documents`, `tenants`, `leases`, `payments`, `valuations`, `inspections`, `safetyRisks`, `ownershipHistory`, `successors`. Optional 1→N to `co-owners`.
**Ownership**: `userId === ctx.identity.subject` for all reads/writes.
**Lifecycle**: `Draft` (in localStorage) → submit → `Active`. (No archived/sold state in UI yet — Q4.D.)
**Indexes**: `by_user`, `by_user_and_status` (filter Vacant/Rented), `by_user_and_province` (province filter), `by_user_and_health_lt` (`attentionCount` query).

---

## 2. Document (`documents`)

Property-attached files (deeds, contracts, receipts, photos, etc.).

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("documents")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | Step4PhotosDocs; PropertyDocumentsPage `files[].folder` |
| `folderId` | `v.optional(v.id("folders"))` | PropertyDocumentsPage `folder` field |
| `name` | `v.string()` | Step4PhotosDocs filename; PropertyDocumentsPage `name` |
| `kind` | `v.union(v.literal("photo"), v.literal("document"))` | Step4PhotosDocs split |
| `mimeType` | `v.optional(v.string())` | inferred from `accept` on inputs |
| `extension` | `v.optional(v.string())` | from `getDocMeta` (Step4PhotosDocs:10–16) |
| `sizeBytes` | `v.optional(v.number())` | PropertyDocumentsPage `size` (today display string) |
| `storageId` | `v.id("_storage")` | required for actual file body |
| `thumbStorageId` | `v.optional(v.id("_storage"))` | PropertyDocumentsPage `thumb` |
| `category` | `v.optional(v.string())` | OwnershipPage `docs[].type` (e.g. "Deed", "Contract") |
| `uploadedBy` | `v.optional(v.string())` | OwnershipPage `docs[].owner` |
| `uploadedAt` | `v.number()` | PropertyDocumentsPage `date` |

**Relationships**: belongs to `Property`; optionally belongs to `Folder`.
**Ownership**: `userId === identity.subject` AND `Document.propertyId.userId === identity.subject`.
**Lifecycle**: `Uploading` → `Active` → `Deleted` (soft? — Q5.E).
**Indexes**: `by_property`, `by_property_and_folder`, `by_property_and_uploadedAt`.

---

## 3. Folder (`folders`)

Hierarchical document folders surfaced in the documents tab tree (`locationTree[]`).

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("folders")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | folders are property-scoped |
| `parentFolderId` | `v.optional(v.id("folders"))` | nested tree |
| `name` | `v.string()` | "Contract", "Receipts", "Tax", … (Step4 + DocumentsPage) |
| `createdAt` | `v.number()` | implied |

**Relationships**: self-referential (parent → children); 1→N to `documents`.
**Ownership**: through `Property`.
**Indexes**: `by_property`, `by_property_and_parent`.

---

## 4. Tenant (`tenants`)

Surfaces in PropertyOverviewPage HARDCODED `tenants[]` and per-property `/property/[id]/rental`.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("tenants")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | overview tenants list |
| `name` | `v.string()` | PropertyOverviewPage:19–21 |
| `unit` | `v.string()` | overview; PropertyRentalPage:95 |
| `rent` | `v.number()` | overview |
| `status` | `v.union(v.literal("Paid"), v.literal("Overdue"), v.literal("Pending"))` | overview |
| `email` | `v.optional(v.string())` | (not yet in UI; needed for messaging — Q4.A) |
| `phone` | `v.optional(v.string())` | (not yet in UI — Q4.A) |

**Relationships**: belongs to `Property`; 1→N to `Lease`, `Payment`.
**Indexes**: `by_property`, `by_user`.

---

## 5. Lease (`leases`)

Surfaces in `/rental` pipeline + PropertyRentalPage (lease summary, "12-month").

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("leases")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | rental dashboard |
| `tenantId` | `v.optional(v.id("tenants"))` | rental dashboard |
| `unit` | `v.string()` | pipeline cards |
| `stage` | `v.union(v.literal("Approaching"), v.literal("Offered"), v.literal("Signed"), v.literal("Declined"))` | rental queries.ts pipelineStages |
| `startDate` | `v.number()` | PropertyRentalPage lease summary |
| `endDate` | `v.number()` | rental dashboard upcomingEvents (`Lease expiring`) |
| `monthlyRent` | `v.number()` | PropertyRentalPage:103 |
| `termMonths` | `v.number()` | PropertyRentalPage "12-month" badge |
| `renewalStatus` | `v.optional(v.string())` | "Send Renewal Offer" CTA |

**Relationships**: belongs to `Property`; references `Tenant`.
**Lifecycle**: `Approaching → Offered → Signed → Active → Expiring → Renewed | Ended`.
**Indexes**: `by_property`, `by_user_and_stage`, `by_user_and_endDate` (for upcoming-events sort).

---

## 6. Payment (`payments`)

Surfaces in PropertyRentalPage `payments[]` (HARDCODED) and `/rental` arrears buckets.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("payments")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | rental tab |
| `leaseId` | `v.optional(v.id("leases"))` | (Q4.B) |
| `tenantId` | `v.optional(v.id("tenants"))` | (Q4.B) |
| `date` | `v.number()` | PropertyRentalPage:28–40 |
| `kind` | `v.union(v.literal("Rent"), v.literal("Fee"), v.literal("Deposit"), v.literal("Refund"))` | rental tab `type` field |
| `amount` | `v.number()` | rental tab |
| `method` | `v.string()` | rental tab |
| `status` | `v.union(v.literal("Paid"), v.literal("Pending"), v.literal("Failed"), v.literal("Overdue"))` | rental tab; arrears buckets imply overdue ageing |

**Indexes**: `by_property_and_date`, `by_user_and_status`, `by_user_and_overdueAge` (for arrears bucketing).

---

## 7. MaintenanceItem (`maintenanceItems`)

Surfaces in `/rental` (HARDCODED counts by severity).

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("maintenanceItems")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | rental dashboard |
| `severity` | `v.union(v.literal("Emergency"), v.literal("Urgent"), v.literal("Standard"))` | rental queries.ts |
| `title` | `v.string()` | inferred |
| `status` | `v.union(v.literal("Open"), v.literal("InProgress"), v.literal("Resolved"))` | inferred |
| `createdAt` | `v.number()` | required |

**Indexes**: `by_user_and_severity`, `by_property_and_status`.

---

## 8. RentalEvent (`rentalEvents`)

Surfaces in `/rental` upcomingEvents (`time`, `title`, `detail`).

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("rentalEvents")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.optional(v.id("properties"))` | rental queries |
| `kind` | `v.union(v.literal("LeaseRenewal"), v.literal("Maintenance"), v.literal("Payment"), v.literal("Inspection"))` | inferred from upcomingEvents copy |
| `at` | `v.number()` | `time` field |
| `title` | `v.string()` | rental queries |
| `detail` | `v.string()` | rental queries |
| `statusDot` | `v.optional(v.string())` | UI hint |

**Note**: this table likely doesn't physically exist; "upcoming events" is a derived view over `Leases`, `MaintenanceItems`, `Payments`, `Inspections`. Decide in `04` (b). See `03` derivations.

---

## 9. Notification (`notifications`)

Defined in `lib/data/notifications.ts`; reference shape in `docs/mock-to-backend-pattern.md:198–207`.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("notifications")` | Convex |
| `userId` | `v.string()` | ownership |
| `category` | `v.union(v.literal("MAINTENANCE"), v.literal("LEASING"), v.literal("COMPLIANCE"), v.literal("PAYMENT"), v.literal("APPLICATIONS"))` | notifications.ts |
| `title` | `v.string()` | notifications.ts |
| `description` | `v.string()` | notifications.ts |
| `createdAt` | `v.number()` | notifications.ts (Unix ms) |
| `read` | `v.boolean()` | notifications.ts |
| `linkTo` | `v.optional(v.string())` | notifications.ts |

**Indexes**: `by_user`, `by_user_and_read` (unread filter), `by_user_and_createdAt` (recent feed).

---

## 10. UserProfile (`userProfiles`)

Surfaces in `/profile` and `/settings`. Auth identity is Clerk; `userProfiles` extends Clerk with app-specific fields.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("userProfiles")` | Convex |
| `userId` | `v.string()` | Clerk subject; **unique** index |
| `firstName` | `v.string()` | ProfilePage:81–83 |
| `lastName` | `v.string()` | ProfilePage |
| `fullName` | `v.string()` | ProfilePage:29 (could derive from first+last — Q5.F) |
| `initials` | `v.string()` | ProfilePage:26 (derive from name — Q5.F) |
| `jobTitle` | `v.optional(v.string())` | ProfilePage |
| `employeeId` | `v.optional(v.string())` | ProfilePage |
| `role` | `v.union(v.literal("Administrator"), v.literal("Manager"), v.literal("Viewer"))` | ProfilePage:32 |
| `email` | `v.string()` | ProfilePage |
| `phone` | `v.optional(v.string())` | ProfilePage |
| `office` | `v.optional(v.string())` | ProfilePage |
| `language` | `v.union(v.literal("en-US"), v.literal("km"), v.literal("zh"))` | settings queries.ts |
| `timezone` | `v.string()` | settings queries.ts |
| `currency` | `v.string()` | profile queries.ts |
| `dashboardView` | `v.union(v.literal("portfolio-overview"), v.literal("analytics"), v.literal("map"))` | settings queries.ts |
| `memberSince` | `v.number()` | ProfilePage:39 |
| `lastLoginAt` | `v.number()` | ProfilePage:43 |
| `mfa` | `v.object({ authenticatorEnabled: v.boolean(), smsEnabled: v.boolean() })` | SettingsPage MFA cards |

**Index**: `by_user` (unique).

---

## 11. NotificationPreference (`notificationPreferences`)

Settings page matrix: 3 event types × 3 channels.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("notificationPreferences")` | Convex |
| `userId` | `v.string()` | ownership |
| `eventType` | `v.union(v.literal("valuationUpdates"), v.literal("teamComments"), v.literal("marketInsights"))` | SettingsPage:21–23 |
| `channel` | `v.union(v.literal("email"), v.literal("slack"), v.literal("sms"))` | SettingsPage |
| `enabled` | `v.boolean()` | SettingsPage |

**Index**: `by_user`, `by_user_and_eventType`.

---

## 12. Draft (`drafts`)

The add-property wizard's autosave. Today: `localStorage:valgate:add-property:drafts:v1`. Whether to keep client-only or migrate to Convex is **Q4.A**.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("drafts")` | Convex (if migrated) |
| `userId` | `v.string()` | ownership |
| `kind` | `v.literal("add-property")` | extensible to other wizards |
| `title` | `v.string()` | useDrafts `DraftRecord.title` |
| `step` | `v.number()` | useDrafts |
| `form` | `v.any()` | mirrors `FormData` interface (47 fields) |
| `updatedAt` | `v.number()` | useDrafts (Unix ms) |

**Index**: `by_user_and_kind_and_updatedAt`.

---

## 13. Professional (`professionals`)

`/directory` cards.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("professionals")` | Convex |
| `userId` | `v.string()` | ownership (per-user directory? — Q4.A) |
| `name` | `v.string()` | directory queries.ts |
| `company` | `v.string()` | directory |
| `category` | `v.string()` | one of 9 categories — directory queries.ts:107 |
| `rating` | `v.number()` | directory |
| `reviewCount` | `v.number()` | directory |
| `linkedPropertyIds` | `v.array(v.id("properties"))` | directory `linkedProperties` |
| `available` | `v.boolean()` | directory |
| `initials` | `v.string()` | derive (Q5.F) |
| `avatarBg` | `v.string()` | UI; consider client-side derive |
| `email` | `v.optional(v.string())` | implied by Email button (Q4.A) |
| `phone` | `v.optional(v.string())` | implied by Phone button (Q4.A) |

**Indexes**: `by_user_and_category`, `by_user_and_name` (search prefix).

---

## 14. Successor (`successors`)

`/estate-planning` beneficiaries table.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("successors")` | Convex |
| `userId` | `v.string()` | ownership |
| `name` | `v.string()` | estate queries.ts:122–147 |
| `relation` | `v.string()` | estate queries (e.g. "Daughter") |
| `role` | `v.union(v.literal("Primary"), v.literal("Contingent"))` | estate queries |
| `sharePercent` | `v.number()` | "75%" stored as 75 |
| `verified` | `v.boolean()` | estate queries |
| `initials` | `v.string()` | derive |
| `linkedPropertyIds` | `v.array(v.id("properties"))` | implied per-property assignment |

**Indexes**: `by_user`, `by_user_and_role`.

---

## 15. EstateDocument (`estateDocuments`)

Surfaces in `/estate-planning` documents grid (Will & Testament, etc.). May fold into `Document` table with `category="estate"` — Q4.C.

| Field | Type | Provenance |
|---|---|---|
| (see `Document`) | — | estate queries.ts:148–158 |

---

## 16. PropertyValuation (`propertyValuations`)

`/property/[id]/valuation` data: 12-month value history + comparables + investment metrics.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("propertyValuations")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | valuation tab |
| `month` | `v.string()` | valueHistory |
| `price` | `v.number()` | valueHistory |
| `recordedAt` | `v.number()` | inferred |

Plus child collection `comparables` (sub-table) and `investmentMetrics` (could live as denormalized fields on `Property` — Q4.E).

**Indexes**: `by_property_and_month`, `by_user_and_property`.

---

## 17. Inspection (`inspections`) and 18. Certification (`certifications`)

`/property/[id]/safety` surfaces. Inspections (date, type, inspector, status, issues) and Certifications (name, status, issued, expires, inspector).

**Inspection fields**: `_id`, `userId`, `propertyId`, `date`, `type`, `inspector`, `status` (Pass/Fail/Pending), `issuesCount`, `notes?`.
**Certification fields**: `_id`, `userId`, `propertyId`, `name`, `status` (Active/Expiring/Expired), `issuedAt`, `expiresAt`, `inspector`.

**Indexes**: `by_property_and_date` / `by_property_and_expiresAt` (for "18 days" countdown — though derived).

---

## 19. SafetyRisk (`safetyRisks`)

`/property/[id]/safety` `risks[]`.

`_id`, `userId`, `propertyId`, `severity` (High/Medium/Low), `title`, `description`, `createdAt`, `resolved` (`v.boolean()`).

**Index**: `by_property_and_severity`.

---

## 20. EmergencyContact (`emergencyContacts`)

`/property/[id]/safety` contacts list.

`_id`, `userId`, `propertyId`, `name`, `phone`, `category` (e.g. "Police"/"Fire"), `note?`.

**Index**: `by_property`.

---

## 21. OwnershipRecord (`ownershipRecords`) and 22. OwnershipHistoryItem (`ownershipHistory`)

`/property/[id]/ownership`. Records (co-owners, holding type, mortgage details) and history events (acquisition, transfer, refinance).

**OwnershipRecord fields**: `_id`, `userId`, `propertyId`, `holdingType` (e.g. "Tenancy in Common"), `currentEstimatedValue: v.number()`, `remainingMortgage: v.number()`, `equityPercent: v.number()` (derived — Q4.E), `coOwnerIds: v.array(v.id("userProfiles"))?`.
**OwnershipHistoryItem fields**: `_id`, `userId`, `propertyId`, `at: v.number()`, `text: v.string()`, `kind` ("Acquired"/"Transferred"/"Refinanced").

**Indexes**: `by_property`, `by_property_and_at`.

---

## Aggregate "view types" (NOT tables — derived)

These are **shape contracts** between `queries.ts` and components. They are not stored; they are computed by Convex queries.

- **PortfolioStats** = `{ totalProperties, totalValue, rentedCount, vacantCount, avgHealth, attentionCount }` — derived from `Property[]`. See `03` derivations.
- **PortfolioKpis** = `{ totalValueFormatted, monthlyIncome, yoyGrowth, newThisMonth }` — partly derived, partly **needs definition** (Q3.A–D).
- **PortfolioPageData** = `{ properties, stats, kpis }` — composite return shape of `getPortfolioPageData`.
- **HomePageData** — same composite shape.
- **RentalDashboardData** = `{ pipelineStages, upcomingEvents, maintenanceItems, arrearsBuckets }` — derived over `Leases`, `RentalEvents`, `MaintenanceItems`, `Payments`.
- **AnalyticsPageData** — derived (revenue series, KPIs, capital growth, maintenance spend, expense breakdown, saved reports). See `03` derivations.
- **EstatePlanningPageData** = `{ stats, properties, successors, documents, timeline }`.
- **DirectoryPageData** = `{ professionals, categories, total }`.
- **SettingsPageData** = `{ notifications, preferences }`.
- **ProfilePageData** = `UserProfile` shape.

---

## Things that are NOT entities (UI-only)

These appeared in mocks but should **stay client-side** — never enter Convex:

- `lib/property-helpers.ts` — `TYPE_ICON`, `TYPE_COLOR`, `typeBadgeClasses`, `statusBadgeClasses`, `titleBadgeClasses`, `healthDotColor`, `healthClass`, `healthBgClass` (CSS class derivations from data).
- `lib/format.ts` — `formatCurrency`, `formatCurrencyFull`, `formatRelativeTime` (display formatters).
- All "view-mode", "active tab", "filter", "search query", "selectMode" state — pure UI.
- The 800ms simulated delay on login/register submit.
- All animation state (`mounted`, `staggerStyle`, count-up hooks).

---

## Field provenance summary (sanity check vs. mocks)

- `lib/mock-data.ts` Property has 16 fields; **all** appear above in `Property` table.
- `app/(shell)/add-property/_components/schemas.ts` step1+step2+step3+step4 has 30 fields; all appear above (most in `Property`, photos/documents in `Document`).
- `lib/data/notifications.ts` Notification has 7 fields; all appear in `Notification` above.
- Inline mock fields in each route's `queries.ts` (rental, settings, profile, analytics, directory, estate-planning) are reconciled into the entities/aggregates above.

No orphans. Duplicates flagged: `Property.status` vs `statusVariant` (Q5.A), `Property.title` vs `titleVariant` (Q5.A).
