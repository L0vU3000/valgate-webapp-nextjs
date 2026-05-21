# 00 — Entity Catalog

> Every domain entity surfaced by the frontend, with full field set (union across all UI surfaces), provenance, relationships, ownership, lifecycle, and indexes implied by access patterns. Convex-style v.* types annotate the **proposed backend schema**. Current code uses **Zod** (validated at FS read boundary in `lib/data/types/`). Both are valid — Convex annotations are the backend target; Zod is what runs today. Aspirational entries (§8, §12, §15) are flagged with a 🔜 **Not built** banner.
>
> Refreshed 2026-05-06 to sync with current Zod schemas in `lib/data/types/`. Per-section drift survey performed; additions, renames, and type changes annotated inline.

Conventions:
- **owned-by-user**: every entity has `userId: v.string()` (Clerk user id) + `.index("by_user", ["userId"])` per `docs/mock-to-backend-pattern.md:198–207`.
- **timestamps**: `createdAt: v.number()` / `updatedAt: v.number()` Unix ms (per pattern doc).
- **provenance** = where the field is first introduced in the UI today.
- **`_id` vs `id`**: catalog uses `_id` (Convex table key) as the backend-target notation. Current FS layer uses `id: string` (string with prefix like `PROP-`, `LP-`, `CO-`). The Convex migration will resolve these to `v.id("table")` types.

---

## 1. Property (`properties`, plural `properties`)

The central aggregate. Fields union across `lib/data/types/property.ts`, `add-property/_components/schemas.ts`, every `/property/[id]/*` route.

Sub-schemas in Zod: `PropertyCoreSchema` + `PropertyLocationSchema` + `PropertyFinanceSchema` + `PropertyMediaSchema` merged into `PropertySchema`. Catalog lists them flat since they merge into one entity.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `_id` | `v.id("properties")` | no | Convex-managed (`id: string` in FS layer) |
| `userId` | `v.string()` | no | needed for ownership |
| `name` | `v.string()` | no | mock-data.ts; Step2BasicInfo `propertyName` |
| `code` | `v.string()` | no | mock-data.ts (e.g. "PP00016 PH") |
| `type` | `v.union(v.literal("residential"), v.literal("commercial"), v.literal("multi-unit"), v.literal("retail"), v.literal("land"), v.literal("industrial"), v.literal("construction"), v.literal("other"))` | no | `propertyTypeChoiceSchema`; Step1 wizard (was "Land"/"House"/"Building" in old mocks — updated Phase 6.0) |
| `status` | `v.union(v.literal("Rented"), v.literal("Vacant"), v.literal("For Sale"), v.literal("Sold"), v.literal("Archived"), v.literal("Owner-Occupied"))` | no | `propertyStatusSchema`; mock-data.ts (expanded from 2→5 values during Phase 6.x; **"Owner-Occupied" added Phase 8.1 Q-resolution 2026-05-06** — needed for analytics occupancy formula: properties with this status count as occupied alongside properties with an active Lease) |
| `health` | `v.number()` | no | mock-data.ts (0–100) — ⚠️ **Q5.K resolved 2026-05-06: scheduled for removal.** `Property.health` will be dropped in a follow-up cleanup phase. Replacement attention-signal will derive from open Emergency MaintenanceItems + overdue Payment. |
| `lat` | `v.number()` | no | mock-data.ts |
| `lng` | `v.number()` | no | mock-data.ts |
| `isArchived` | `v.optional(v.boolean())` | yes | added Phase 6.x (PropertyCoreSchema soft-delete flag) |
| `province` | `v.string()` | no | mock-data.ts; PropertyLocationSchema |
| `addressLine` | `v.optional(v.string())` | yes | step2Schema |
| `addressLine2` | `v.optional(v.string())` | yes | step2Schema |
| `city` | `v.optional(v.string())` | yes | step2Schema |
| `zip` | `v.optional(v.string())` | yes | step2Schema |
| `country` | `v.optional(v.string())` | yes | step2Schema |
| `purchasePrice` | `v.optional(v.string())` | yes | step3Schema (tighten to `v.number()` in backend) |
| `purchaseDate` | `v.optional(v.number())` | yes | step3Schema (Unix ms) |
| `currentMarketValue` | `v.optional(v.number())` | yes | step3Schema |
| `outstandingMortgage` | `v.optional(v.number())` | yes | step3Schema |
| `monthlyPayment` | `v.optional(v.number())` | yes | step3Schema |
| `interestRate` | `v.optional(v.number())` | yes | step3Schema |
| `annualPropertyTax` | `v.optional(v.number())` | yes | step3Schema |
| `taxAssessmentValue` | `v.optional(v.number())` | yes | step3Schema |
| `annualInsurance` | `v.optional(v.number())` | yes | step3Schema |
| `ownershipStatus` | `v.optional(v.string())` | yes | step3Schema |
| `buyNumeric` | `v.number()` | no | PropertyFinanceSchema (raw price; **canonical**) |
| `photoStorageIds` | `v.optional(v.array(v.id("_storage")))` | yes | Step4PhotosDocs; optional in current Zod (Phase 6.x) — required in Convex backend target |
| `documentStorageIds` | `v.optional(v.array(v.id("_storage")))` | yes | Step4PhotosDocs; optional in current Zod — required in Convex backend target |
| `totalArea` | `v.string()` | no | PropertyMediaSchema (required; was optional in earlier catalog version) |
| `yearBuilt` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()` in backend — Q5.B) |
| `bedrooms` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `bathrooms` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `parkingSpaces` | `v.optional(v.string())` | yes | step2Schema (tighten to `v.number()`) |
| `storageUnit` | `v.optional(v.string())` | yes | step2Schema (Q5.B) |
| `title` | `v.union(v.literal("Hard title"), v.literal("Soft title"), v.literal("—"))` | no | `propertyTitleSchema`; mock-data.ts |
| `createdAt` | `v.number()` | no | implied by `kpis.newThisMonth` (queries.ts:20) |
| `updatedAt` | `v.number()` | no | inferred |

**Proposed (not yet in code) — Convex-only annotations:**
- `statusVariant: v.union(v.literal("rented"), v.literal("vacant"))` — likely redundant with `status` (Q5.A); not in current Zod PropertySchema
- `titleVariant: v.union(v.literal("hard"), v.literal("soft"), v.literal("none"))` — schema export exists (`titleVariantSchema`) but not a stored field (Q5.A)
- `size: v.string()` — old string size field (e.g. "850"); superseded by `totalArea`; not in Zod; keep only in legacy mock context
- `buy: v.string()` — formatted price string; exists only in `PropertyListItemSchema` (narrow projection), **not** in core `PropertySchema`; derived at query time from `buyNumeric`
- `stateProv: v.optional(v.string())` — renamed/removed; `province` covers Cambodia context; not in current Zod

**Relationships**: 1→N to `documents`, `tenants`, `leases`, `payments`, `valuations`, `inspections`, `safetyRisks`, `ownershipHistory`, `successors`, `expenses`. Optional 1→N to `co-owners`. Optional 1→1 to `ownershipRecords`, `landParcels`.
**Ownership**: `userId === ctx.identity.subject` for all reads/writes.
**Lifecycle**: `Draft` (in localStorage) → submit → `Active`. (No archived/sold state enforced in UI yet — Q4.D.)
**Indexes**: `by_user`, `by_user_and_status`, `by_user_and_province`, `by_user_and_health_lt`.

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
| `parentFolderId` | `v.optional(v.id("folders"))` | nested tree (self-FK) |
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
**Indexes**: `by_property`, `by_user_and_stage`, `by_user_and_endDate`.

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

**Indexes**: `by_property_and_date`, `by_user_and_status`, `by_user_and_overdueAge`.

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

> 🔜 **Not built.** No `lib/data/types/rental-event.ts` exists today. Documented here as design intent only; will be built when Phase 6.x deferred lands (PropertyComparable / MarketSnapshot / RentalEvent — gated on Q4.Q). "Upcoming events" on the rental page is currently a derived view over `Leases`, `MaintenanceItems`, `Payments`, `Inspections` at query time, not a stored entity. See `ref/03-data-flow-and-derivations.md`.

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

---

## 9. Notification (`notifications`)

Defined in `lib/data/types/notification.ts`; reference shape in `docs/mock-to-backend-pattern.md:198–207`.

> **Q4.F resolved Phase 6.8 (2026-05-06):** HYBRID per source. Lease-expiring alerts derived at query time from `Lease.endDate`. Manual/cross-cutting alerts stored as Notification rows. Auto-creation deferred to backend phase. **~~Schema gap (Q5.T)~~: ~~no `propertyId` field~~** → **Q5.T resolved Phase 8.8 (2026-05-07):** `propertyId: z.string().optional()` added; `notificationMatchesProperty()` prefers it, falls back to `linkTo` parse.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("notifications")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.optional(v.string())` | Phase 8.8 — property-scoping; optional (portfolio-level notifications have none) |
| `category` | `v.union(v.literal("MAINTENANCE"), v.literal("LEASING"), v.literal("COMPLIANCE"), v.literal("PAYMENT"), v.literal("APPLICATIONS"))` | notifications.ts |
| `title` | `v.string()` | notifications.ts |
| `description` | `v.string()` | notifications.ts |
| `createdAt` | `v.number()` | notifications.ts (Unix ms) |
| `read` | `v.boolean()` | notifications.ts |
| `linkTo` | `v.optional(v.string())` | notifications.ts |

**Indexes**: `by_user`, `by_user_and_read`, `by_user_and_createdAt`.

---

## 10. UserProfile (`userProfiles`)

Surfaces in `/profile` and `/settings`. Auth identity is Clerk; `userProfiles` extends Clerk with app-specific fields.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `_id` | `v.id("userProfiles")` | no | Convex (`id: string` in FS) |
| `userId` | `v.string()` | no | Clerk subject; **unique** index |
| `firstName` | `v.string()` | no | ProfilePage:81–83 |
| `lastName` | `v.string()` | no | ProfilePage |
| `jobTitle` | `v.optional(v.string())` | yes | ProfilePage |
| `employeeId` | `v.optional(v.string())` | yes | ProfilePage |
| `email` | `v.optional(v.string())` | yes | ProfilePage (optional in current Zod; tighten to required in backend) |
| `phone` | `v.optional(v.string())` | yes | ProfilePage |
| `officeLocation` | `v.optional(v.string())` | yes | ProfilePage (renamed from `office` → `officeLocation` in Zod) |
| `language` | `v.optional(v.string())` | yes | settings queries.ts (open string in Zod; backend target: `v.union(v.literal("en-US"), v.literal("km"), v.literal("zh"))`) |
| `timezone` | `v.optional(v.string())` | yes | settings queries.ts |
| `currency` | `v.optional(v.string())` | yes | profile queries.ts |
| `role` | `v.optional(v.string())` | yes | ProfilePage:32 (open string in Zod; backend target: `v.union(v.literal("Administrator"), v.literal("Manager"), v.literal("Viewer"))`) |
| `memberSince` | `v.optional(v.number())` | yes | ProfilePage:39 |
| `lastLogin` | `v.optional(v.number())` | yes | ProfilePage:43 (renamed from `lastLoginAt` → `lastLogin` in Zod) |
| `createdAt` | `v.number()` | no | added Phase 6.x |
| `updatedAt` | `v.number()` | no | added Phase 6.x |

**Proposed (not yet in Zod) — Convex-only / future:**
- `fullName: v.string()` — ProfilePage:29; could derive from first+last (Q5.F); not a stored Zod field
- `initials: v.string()` — ProfilePage:26; derive from name (Q5.F); not a stored Zod field
- `dashboardView: v.union(v.literal("portfolio-overview"), v.literal("analytics"), v.literal("map"))` — settings queries.ts; not in Zod
- `mfa: v.object({ authenticatorEnabled: v.boolean(), smsEnabled: v.boolean() })` — SettingsPage MFA cards; not in Zod

**Index**: `by_user` (unique).

---

## 11. NotificationPreference (`notificationPreferences`)

Settings page matrix: event types × 3 channels. **Schema redesigned in Phase 6.x:** instead of one row per (eventType, channel, enabled), Zod now stores one row per eventType with three boolean columns (`email`, `slack`, `sms`).

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("notificationPreferences")` | Convex |
| `userId` | `v.string()` | ownership |
| `eventType` | `v.string()` | SettingsPage event rows (open string in Zod; backend target enum: `valuationUpdates`, `teamComments`, `marketInsights`) |
| `email` | `v.boolean()` | SettingsPage email channel toggle |
| `slack` | `v.boolean()` | SettingsPage Slack channel toggle |
| `sms` | `v.boolean()` | SettingsPage SMS channel toggle |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Note**: earlier catalog version had `channel: v.union(...)` + `enabled: v.boolean()` (row-per-channel model). Current Zod uses column-per-channel model. The two are semantically equivalent; Convex backend may revert to row-per-channel for flexibility.

**Index**: `by_user`, `by_user_and_eventType`.

---

## 12. Draft (`drafts`)

> 🔜 **Not built.** No `lib/data/types/draft.ts` exists today. The add-property wizard uses `localStorage:valgate:add-property:drafts:v1` for autosave — client-only, no server entity. The proposed entity below is for **server-side draft persistence** (future phase). Whether to keep client-only or migrate is open (Q4.A).

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
| `userId` | `v.string()` | ownership (per-user directory) |
| `name` | `v.string()` | directory queries.ts |
| `company` | `v.string()` | directory |
| `category` | `v.string()` | one of 9 categories — directory queries.ts:107 |
| `rating` | `v.number()` | directory |
| `reviewCount` | `v.number()` | directory |
| `linkedProperties` | `v.number()` | directory (count of linked properties; **current Zod is a count `z.number().int()`**; backend target may be `v.array(v.id("properties"))` for full linking — Q4.A) |
| `available` | `v.boolean()` | directory |
| `initials` | `v.string()` | derive (Q5.F) |
| `avatarBg` | `v.string()` | UI; consider client-side derive |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Proposed (not yet in Zod):**
- `email: v.optional(v.string())` — implied by Email button (Q4.A)
- `phone: v.optional(v.string())` — implied by Phone button (Q4.A)

**Indexes**: `by_user_and_category`, `by_user_and_name`.

---

## 14. Successor (`successors`)

`/estate-planning` beneficiaries table.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("successors")` | Convex |
| `userId` | `v.string()` | ownership |
| `name` | `v.string()` | estate queries.ts:122–147 |
| `initials` | `v.string()` | derive |
| `relation` | `v.string()` | estate queries (e.g. "Daughter") |
| `role` | `v.union(v.literal("primary"), v.literal("contingent"))` | estate queries (**lowercase** in Zod — was "Primary"/"Contingent" in earlier catalog; updated Phase 6.x) |
| `share` | `v.number()` | share percent 0–100 (**renamed** from `sharePercent` → `share` in Zod; stored as numeric e.g. 75 for 75%) |
| `verified` | `v.boolean()` | estate queries |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Proposed (not yet in Zod):**
- `linkedPropertyIds: v.array(v.id("properties"))` — implied per-property assignment; not in Zod

**Indexes**: `by_user`, `by_user_and_role`.

---

## 15. EstateDocument (`estateDocuments`)

> 🔜 **Not built.** No `lib/data/types/estate-document.ts` exists today. Documented here as design intent only. The current Successor + estate-planning surfaces don't attach documents; this entity would land if/when a dedicated estate-planning document page is built. May fold into `Document` table with `category="estate"` — Q4.C.

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
| `month` | `v.string()` | valueHistory (format: "MMM YYYY", e.g. "Jan 2026") |
| `price` | `v.number()` | valueHistory |
| `recordedAt` | `v.number()` | inferred |

Plus child collection `comparables` (sub-table) and `investmentMetrics` (could live as denormalized fields on `Property` — Q4.E).

**Indexes**: `by_property_and_month`, `by_user_and_property`.

---

## 17. Inspection (`inspections`) and 18. Certification (`certifications`)

`/property/[id]/safety` surfaces.

**Inspection fields** (`lib/data/types/inspection.ts`):

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("inspections")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | safety page |
| `date` | `v.string()` | display date string (not Unix ms in current Zod) |
| `type` | `v.string()` | inspection type label |
| `inspector` | `v.string()` | inspector name |
| `status` | `v.string()` | open string in Zod (backend target: `v.union(v.literal("Pass"), v.literal("Fail"), v.literal("Pending"))`) |
| `issues` | `v.number()` | issue count (**renamed** from `issuesCount` → `issues` in Zod) |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Proposed (not yet in Zod):**
- `notes: v.optional(v.string())` — not in current Zod

**Certification fields** (`lib/data/types/certification.ts`):

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("certifications")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | safety page |
| `name` | `v.string()` | certification name |
| `status` | `v.string()` | open string in Zod (backend target: `v.union(v.literal("Active"), v.literal("Expiring"), v.literal("Expired"))`) |
| `issued` | `v.string()` | display date string (**renamed** from `issuedAt: v.number()` → `issued: v.string()` in Zod) |
| `expires` | `v.string()` | display date string (**renamed** from `expiresAt: v.number()` → `expires: v.string()` in Zod) |
| `inspector` | `v.string()` | inspector name |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Indexes**: `by_property_and_date` / `by_property_and_expiresAt`.

---

## 19. SafetyRisk (`safetyRisks`)

`/property/[id]/safety` `risks[]`.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("safetyRisks")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | safety page |
| `severityLabel` | `v.string()` | open string in Zod (**renamed** from `severity`; backend target: `v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))`) |
| `title` | `v.string()` | risk title |
| `desc` | `v.string()` | risk description (**renamed** from `description` → `desc` in Zod) |
| `createdAt` | `v.number()` | required |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Proposed (not yet in Zod):**
- `resolved: v.boolean()` — not in current Zod; useful for marking risks resolved without deletion

**Index**: `by_property_and_severity`.

---

## 20. EmergencyContact (`emergencyContacts`)

`/property/[id]/safety` contacts list.

| Field | Type | Provenance |
|---|---|---|
| `_id` | `v.id("emergencyContacts")` | Convex |
| `userId` | `v.string()` | ownership |
| `propertyId` | `v.id("properties")` | safety page |
| `name` | `v.string()` | contact name |
| `phone` | `v.string()` | contact phone |
| `sub` | `v.optional(v.string())` | subtitle/category hint (**renamed** from `category` → `sub` in Zod; e.g. "Police", "Fire") |
| `createdAt` | `v.number()` | added Phase 6.x |
| `updatedAt` | `v.number()` | added Phase 6.x |

**Proposed (not yet in Zod):**
- `note: v.optional(v.string())` — not in current Zod

**Index**: `by_property`.

---

## 21. OwnershipRecord (`ownershipRecords`) — ownership structure record — and 21a. OwnershipDocument (`ownershipDocuments`) — deed/document record — and 22. OwnershipHistoryItem (`ownershipHistory`)

`/property/[id]/ownership`. Three distinct concepts on this page: the **ownership structure record** (§21, one per property, holding type + loan terms + acquisition costs + distribution method), the **deed/document record** (§21a, documents like title deeds and transfer records), and **history events** (acquisition, transfer, refinance).

**OwnershipRecord fields** (§21 — ownership structure, `OREC-` prefix, shipped Phase 6.6):

| Field | Type | Notes |
|---|---|---|
| `_id` | `v.id("ownershipRecords")` | |
| `userId` | `v.string()` | |
| `propertyId` | `v.id("properties")` | |
| `holdingType` | `v.union(v.literal("Tenancy in Common"), v.literal("Joint Tenancy"), v.literal("Sole Ownership"), v.literal("Trust"), v.literal("LLC"), v.literal("Other"))` | required |
| `loanType` | `v.optional(v.string())` | e.g. "Fixed", "ARM" |
| `loanAmount` | `v.optional(v.number())` | |
| `loanTermYears` | `v.optional(v.number())` | |
| `interestRate` | `v.optional(v.number())` | transactional source; overlaps Property.interestRate |
| `originationDate` | `v.optional(v.number())` | Unix ms |
| `maturityDate` | `v.optional(v.number())` | Unix ms |
| `nextPaymentDue` | `v.optional(v.number())` | Unix ms |
| `lenderName` | `v.optional(v.string())` | |
| `downPayment` | `v.optional(v.number())` | |
| `closingCosts` | `v.optional(v.number())` | |
| `distributionMethod` | `v.optional(v.union(v.literal("Pro-Rata by Share"), v.literal("Equal Split"), v.literal("Custom")))` | |
| `createdAt` / `updatedAt` | `v.number()` | Unix ms |

**NOT stored on §21**: `currentEstimatedValue`, `remainingMortgage`, `equityPercent` — all three derive from `Property.currentMarketValue` and `Property.outstandingMortgage` at query time. `coOwnerIds` dropped — CoOwner is its own entity (§24) with a `propertyId` FK.

**OwnershipDocument fields** (§21a — deed/document records, formerly called OwnershipRecord, renamed Phase 6.6, `ODOC-` prefix):

| Field | Type | Notes |
|---|---|---|
| `_id` | `v.id("ownershipDocuments")` | |
| `userId` | `v.string()` | |
| `propertyId` | `v.id("properties")` | |
| `name` | `v.string()` | e.g. "Hard Title — Original Deed" |
| `type` | `v.string()` | e.g. "Hard Title", "Soft Title" |
| `date` | `v.string()` | display date string |
| `owner` | `v.string()` | e.g. "Chan Family Trust" |
| `createdAt` / `updatedAt` | `v.number()` | Unix ms |

**OwnershipHistoryItem fields** (`lib/data/types/ownership-history.ts`):

| Field | Type | Notes |
|---|---|---|
| `_id` | `v.id("ownershipHistory")` | |
| `userId` | `v.string()` | |
| `propertyId` | `v.id("properties")` | |
| `date` | `v.string()` | display date string (**renamed** from `at: v.number()` → `date: v.string()` in Zod) |
| `text` | `v.string()` | timeline event description |
| `color` | `v.string()` | timeline dot color (**added in Zod**, not in earlier catalog version) |
| `createdAt` / `updatedAt` | `v.number()` | Unix ms |

**Proposed (not yet in Zod):**
- `kind: v.union(v.literal("Acquired"), v.literal("Transferred"), v.literal("Refinanced"))` — not in current Zod; useful for filtering/icon selection

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

- `lib/mock-data.ts` Property has 16 fields; all appear above in `Property` table.
- `app/(shell)/add-property/_components/schemas.ts` step1+step2+step3+step4 has 30 fields; all appear above (most in `Property`, photos/documents in `Document`).
- `lib/data/types/notification.ts` Notification has 7 fields; all appear in `Notification` above.
- Inline mock fields in each route's `queries.ts` (rental, settings, profile, analytics, directory, estate-planning) are reconciled into the entities/aggregates above.

No orphans. Duplicates flagged: `Property.status` vs `statusVariant` (Q5.A — `statusVariant` not in Zod), `Property.title` vs `titleVariant` (Q5.A — `titleVariant` not a stored field).

---

## 23. LandParcel (`land-parcels`)

> **Q4.R resolved Phase 6.4 (2026-05-06):** Option 2 — separate entity, 1→1 with Property for v1, 1→N-ready by removing per-property uniqueness assumption when multi-parcel support lands.

Physical plot attributes for a property. Separate entity (not embedded) per Q4.R resolution: keeps domain weight off the already-large `Property` schema and allows 1→N multi-parcel support without migration.

**Relationship:** 1→1 with Property for v1 (one parcel per property); schema is 1→N-ready — remove per-propertyId uniqueness assumption when multi-parcel support lands.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `id` | `string` (prefix `LP`) | no | `_fs` layer |
| `userId` | `string` | no | ownership |
| `propertyId` | `string` | no | FK to `properties` |
| `sizeM2` | `number` (nonnegative) | no | `/property/[id]/location` FullView KPI row 12 |
| `widthM` | `number` (nonnegative) | yes | location rows 13, 26 |
| `lengthM` | `number` (nonnegative) | yes | location rows 13, 26 |
| `zoningCode` | `string` | yes | location rows 15, 25 (e.g. "A-2") |
| `zoningClass` | `string` | yes | location rows 14, 24, 25, 30 (e.g. "Agricultural Zone") |
| `developmentPotential` | `string[]` | yes | location rows 16, 25 (use-type bullets) |
| `elevationM` | `number` | yes | location rows 17, 24, 30 (metres above sea level) |
| `slopeAngleDeg` | `number` | yes | location rows 18, 26 (degrees) |
| `terrainType` | `"Flat" \| "Rolling" \| "Hilly" \| "Mountainous" \| "Mixed"` | yes | location rows 18, 26 (closed enum) |

**Design notes:**
- `sizeM2` is the authoritative typed number for the location page. `Property.totalArea` (string) coexists as a coarse-grained field for portfolio/list views.
- `zoningCode` / `zoningClass` are open strings — no country-specific taxonomy committed yet.
- `terrainType` is a closed 5-value enum — terrain classification is stable and culture-independent.
- `developmentPotential` is `string[]` matching the "use-type bullets" surface on the UI.

**Indexes**: `by_user`, `by_user_and_property`.

---

## 24. CoOwner (`co-owners`)

> **Q4.N resolved Phase 6.5 (2026-05-06):** RBAC deferred to backend phase; FS demo is single-user. **PII storage:** SSN stored already-masked at rest (`••••-••-XXXX`); full SSN never enters the system. Real encryption is Q5.S → backend phase.

Co-ownership records for a property. New entity created in Phase 6.5. Stores individual owner identity, contact, share structure, and tax information. Structurally independent of `OwnershipRecord` (§21) — no FK between them.

**Relationship:** N→1 with Property (many co-owners per property). For v1, PROP-0001 has 2 owners; PROP-0006 has 3. Schema supports any N.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `id` | `string` (prefix `CO`) | no | `_fs` layer |
| `userId` | `string` | no | ownership |
| `propertyId` | `string` | no | FK to `properties` |
| `name` | `string` (min 1) | no | `/property/[id]/ownership` rows 19–25 (owner name) |
| `role` | `"Primary" \| "Minor"` | no | rows 20, 23 (owner badge label) |
| `sharePercent` | `number` (0–100) | no | rows 18–19 (donut + legend), 20, 23, 28–29 (split amounts) |
| `email` | `string` | yes | rows 21, 24 (contact PII) |
| `phone` | `string` | yes | rows 21, 24 (contact PII) |
| `address` | `string` | yes | rows 21, 24 (contact PII) |
| `ssnMasked` | `string` (`••••-••-XXXX`) | yes | rows 22, 25 — **PII: stored already-masked at rest; only last 4 digits are plaintext. Full SSN never stored. Real encryption deferred to backend phase (Q5.S).** |
| `taxEntity` | `"Individual" \| "S-Corp" \| "C-Corp" \| "LLC" \| "Partnership" \| "Trust" \| "Other"` | yes | rows 22, 25 (closed 7-value enum) |
| `tax1099Status` | `string` | yes | rows 22, 25 (free-text; formats vary) |

**Derived fields (not stored):**
- `equityValue`: `sharePercent × property.currentMarketValue / 100` — computed inline.
- Income split: `sharePercent × monthlyRentIncome / 100` — derived from signed Lease records at query time.

**PII annotation:**
- `ssnMasked` is the **only PII field stored**. Format is `••••-••-XXXX`.
- `email`, `phone`, `address` are contact PII — optional; rendered with "—" fallback.
- `taxEntity` and `tax1099Status` are **not PII** — public business classifications.
- When Clerk + Convex auth lands: add a narrowed `CoOwnerListItem` shape (excluding `ssnMasked`/`taxEntity`) for non-Admin reads. See Q4.N (resolved) and Q5.S (open).

**Design notes:**
- `sharePercent` values should sum to 100 per property. Seed data is hand-validated.
- For 3+ owners, `PropertyOwnershipPage` caps display at 2 with a "+N more co-owners" indicator.

**Indexes**: `by_user`, `by_user_and_property`.

---

## 25. Expense (`expenses`)

Property-attached operational expenses (maintenance bills, utilities, taxes, etc.). Built in Phase 6.2 alongside Payment for the rental page Net Income derivation.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `_id` | `v.id("expenses")` | no | Convex (`id: string` in FS layer) |
| `userId` | `v.string()` | no | ownership |
| `propertyId` | `v.id("properties")` | no | Phase 6.2 wiring |
| `date` | `v.number()` | no | when the expense was incurred (Unix ms) |
| `category` | `v.union(v.literal("Maintenance"), v.literal("Utilities"), v.literal("Insurance"), v.literal("Tax"), v.literal("Management"), v.literal("Other"))` | no | Phase 6.2 design |
| `amount` | `v.number()` | no | non-negative |
| `note` | `v.optional(v.string())` | yes | free-text receipt detail |

**Relationships**: 1→1 to Property via `propertyId`.
**Ownership**: `userId === ctx.identity.subject`.
**Indexes**: `by_user_and_property`, `by_user_and_date` (for YTD windows).
**Notes**: Phase 6.2 wired Expense to overview row 11 (Expenses KPI) and rental rows 16–17 (Expenses subtotal + Net Income subtotal). Pairs with Payment for cross-card identity (NOI = Gross − Expenses; Net Income = Total Rent − Expenses).

---

## Last refreshed

2026-05-06 — synced §1–§24 with current Zod schemas (`lib/data/types/*.ts`); added §25 Expense (Phase 6.2 entity); marked §8 RentalEvent, §12 Draft, §15 EstateDocument as 🔜 Not built; annotated Q4.N (CoOwner PII), Q4.R (LandParcel decision), Q4.F (Notification HYBRID), Q5.K (Property.health deprecation) resolutions in affected sections. Full per-section drift survey performed — key changes: §1 type enum updated, isArchived added, status expanded; §10 UserProfile field renames + loosened types; §11 NotificationPreference schema redesign; §13 Professional linkedPropertyIds→count; §14 Successor role lowercase + sharePercent→share; §17/18 field renames; §19/20 field renames; §22 OwnershipHistory at→date + color added.
