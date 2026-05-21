# Migration — AI ref

> Distilled from `../ref/08-backend-migration-readiness.md`. Tables + code only. If conflict, `08` wins.

## Open Q-blockers (resolve before schema-freeze)

### KPI definitions

| Q | Question | Schema impact | Bias |
|---|---|---|---|
| Q3.A | totalValue: sum buyNumeric or currentMarketValue? | currentMarketValue required vs optional | Surface BOTH |
| Q3.C | YoY: include properties not existing last year? | computeYoyGrowth denominator + `_creationTime` filter | Closest-prior heuristic shipped |
| Q3.E | Arrears age from Payment.date or invoice date? | needs `dueDate?` field on Payment | Add `dueDate`; default to `date` |
| Q3.I | Attention count signal (replace `health < 30`) | Q5.K drops Property.health | Emergency MaintenanceItem ∪ overdue Rent |

### Schema cleanup

| Q | Question | Convex impact | Bias |
|---|---|---|---|
| Q5.B | Tighten add-property Zod (str→num for area, beds, baths, financials) | ~10 Property field types | Tighten now |
| Q5.R | Document.category → closed enum | `v.union` with 7-8 literals | Title/Sales/Tax/Rental/Photos/Insurance/Estate/Other |
| Q5.P | Drop Property.purchasePrice (str)? | covered by Q5.B; buyNumeric is canonical | Drop purchasePrice |

### Drafts

| Q | Question | Impact |
|---|---|---|
| Q4.A | localStorage vs Convex drafts table? | New `drafts` entity + 2 mutations if Convex |

> Recommend Convex variant.

## Conversion conventions

| Zod | Convex |
|---|---|
| z.string() | v.string() |
| z.string().email() | v.string() (validate at app layer) |
| z.string().regex(...) | v.string() (validate at app layer) |
| z.number() | v.number() |
| z.number().int().nonnegative() | v.number() (validate at action layer) |
| z.boolean() | v.boolean() |
| z.enum([...]) | v.union(v.literal("a"), ...) |
| z.array(z.string()) | v.array(v.string()) |
| idSchema (FK) | v.id("<targetTable>") |
| userIdSchema | v.id("users") |
| propertyIdSchema | v.id("properties") |
| timestampSchema | v.number() (or rely on _creationTime) |
| .optional() | v.optional(...) |

> Convex auto-creates `_id` and `_creationTime`. Most `id` and `createdAt` fields can be dropped.

## Recommended indexes

| Entity | Indexes |
|---|---|
| Property | `by_userId` ["userId"], `by_userId_status` ["userId","status"] |
| Tenant | `by_userId`, `by_propertyId` |
| Lease | `by_userId`, `by_propertyId`, `by_userId_stage` |
| Payment | `by_userId`, `by_propertyId`, `by_leaseId`, `by_userId_status` |
| Expense | `by_userId`, `by_propertyId`, `by_userId_category` |
| Document | `by_userId`, `by_propertyId`, `by_folderId`, `by_userId_category` |
| Folder | `by_userId`, `by_propertyId`, `by_parentFolderId` |
| Inspection / Certification / SafetyRisk / EmergencyContact | `by_propertyId` |
| MaintenanceItem | `by_userId`, `by_propertyId`, `by_userId_status` |
| PropertyValuation | `by_propertyId`, `by_propertyId_recordedAt` |
| LandParcel / OwnershipRecord / OwnershipDocument / OwnershipHistory / CoOwner | `by_propertyId` |
| Successor | `by_userId` |
| SuccessorPropertyAssignment | `by_userId`, `by_successorId`, `by_propertyId` |
| EstateActivityEvent | `by_userId`, `by_propertyId`, `by_userId_createdAt` |
| Professional | `by_userId`, `by_userId_category`, `by_userId_verified` |
| UserProfile | `by_userId` (or `_id = userId`) |
| Notification | `by_userId`, `by_propertyId`, `by_userId_read` |
| NotificationPreference | `by_userId`, `by_userId_eventType` |

## Convex schemas (key entities)

```ts
// Property
properties: defineTable({
  userId: v.id("users"),
  name: v.string(),
  code: v.string(),
  type: v.union(v.literal("residential"), v.literal("commercial"), v.literal("multi-unit"),
                v.literal("retail"), v.literal("land"), v.literal("industrial"),
                v.literal("construction"), v.literal("other")),
  status: v.union(v.literal("Rented"), v.literal("Vacant"), v.literal("For Sale"),
                  v.literal("Sold"), v.literal("Archived"), v.literal("Owner-Occupied")),
  health: v.optional(v.number()), // Q5.K: drop after Q3.I lands
  lat: v.number(), lng: v.number(),
  isArchived: v.optional(v.boolean()),
  // location
  addressLine: v.optional(v.string()), addressLine2: v.optional(v.string()),
  city: v.optional(v.string()), zip: v.optional(v.string()), country: v.optional(v.string()),
  province: v.string(),
  // finance — TIGHTEN per Q5.B
  purchaseDate: v.optional(v.number()),
  buyNumeric: v.number(),
  currentMarketValue: v.optional(v.number()),
  outstandingMortgage: v.optional(v.number()),
  monthlyPayment: v.optional(v.number()),
  interestRate: v.optional(v.number()),
  annualPropertyTax: v.optional(v.number()),
  taxAssessmentValue: v.optional(v.number()),
  annualInsurance: v.optional(v.number()),
  ownershipStatus: v.optional(v.string()),
  // media — TIGHTEN per Q5.B
  photoStorageIds: v.optional(v.array(v.id("_storage"))),
  documentStorageIds: v.optional(v.array(v.id("_storage"))),
  totalAreaM2: v.number(), // RENAME from totalArea string
  yearBuilt: v.optional(v.number()),
  bedrooms: v.optional(v.number()),
  bathrooms: v.optional(v.number()),
  parkingSpaces: v.optional(v.number()),
  storageUnit: v.optional(v.string()),
  title: v.union(v.literal("Hard title"), v.literal("Soft title"), v.literal("—")),
})
.index("by_userId", ["userId"])
.index("by_userId_status", ["userId", "status"])

// Lease
leases: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  tenantId: v.optional(v.id("tenants")),
  unit: v.string(),
  stage: v.union(v.literal("Approaching"), v.literal("Offered"),
                 v.literal("Signed"), v.literal("Declined")),
  startDate: v.number(),
  endDate: v.number(),
  monthlyRent: v.number(),
  termMonths: v.number(),
  renewalStatus: v.optional(v.string()),
  deposit: v.optional(v.number()),  // F2
  autoPay: v.optional(v.boolean()), // F3
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_userId_stage", ["userId", "stage"])

// Payment
payments: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  leaseId: v.optional(v.id("leases")),
  tenantId: v.optional(v.id("tenants")),
  date: v.number(),
  dueDate: v.optional(v.number()), // ADD per Q3.E
  kind: v.union(v.literal("Rent"), v.literal("Fee"),
                v.literal("Deposit"), v.literal("Refund")),
  amount: v.number(),
  method: v.string(),
  status: v.union(v.literal("Paid"), v.literal("Pending"),
                  v.literal("Failed"), v.literal("Overdue")),
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_leaseId", ["leaseId"])
.index("by_userId_status", ["userId", "status"])

// Expense
expenses: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  date: v.number(),
  category: v.union(v.literal("Maintenance"), v.literal("Utilities"),
                    v.literal("Insurance"), v.literal("Tax"),
                    v.literal("Management"), v.literal("Other")),
  amount: v.number(),
  note: v.optional(v.string()),
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_userId_category", ["userId", "category"])

// Document — TIGHTEN per Q5.R, Q5.C
documents: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  folderId: v.optional(v.id("folders")),
  name: v.string(),
  kind: v.union(v.literal("photo"), v.literal("document")),
  mimeType: v.optional(v.string()),
  extension: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
  storageId: v.id("_storage"), // CHANGE from string
  thumbStorageId: v.optional(v.id("_storage")),
  category: v.optional(v.union(
    v.literal("Title"), v.literal("Sales"), v.literal("Tax"),
    v.literal("Rental"), v.literal("Photos"), v.literal("Insurance"),
    v.literal("Estate"), v.literal("Other"))),
  uploadedBy: v.optional(v.id("users")),
  uploadedAt: v.number(),
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_folderId", ["folderId"])
.index("by_userId_category", ["userId", "category"])

// Inspection — TIGHTEN per Schema gaps B + C
inspections: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  date: v.number(), // CHANGE from string
  type: v.string(),
  inspector: v.string(),
  status: v.union(v.literal("Passed"), v.literal("Failed"), v.literal("Pending")),
  issues: v.number(),
})
.index("by_propertyId", ["propertyId"])

// Certification — TIGHTEN per Schema gaps B + C
certifications: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  name: v.string(),
  status: v.union(v.literal("Valid"), v.literal("Expiring"), v.literal("Expired")),
  issued: v.number(), // CHANGE from string
  expires: v.number(),
  inspector: v.string(),
})
.index("by_propertyId", ["propertyId"])

// SafetyRisk — TIGHTEN per Schema gap C; no `resolved` per Q5.Q
safetyRisks: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  severityLabel: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
  title: v.string(),
  desc: v.string(),
})
.index("by_propertyId", ["propertyId"])
```

### Per-entity tweaks (rest)

- **Folder** — straightforward; `parentFolderId: v.optional(v.id("folders"))`
- **MaintenanceItem** — `cost: v.optional(v.number())` (Phase 6.8b)
- **PropertyValuation** — drop `month` regex; derive from `recordedAt`
- **LandParcel** — straightforward Zod→Convex
- **CoOwner** — `ssnMasked: v.optional(v.string())` for v1; Q5.S filed for real encryption
- **OwnershipRecord** — straightforward
- **OwnershipDocument** — convert `date` str→num; `type` should close to enum; **add `status` field (A10)**
- **OwnershipHistory** — drop `color` (presentational); convert `date` str→num
- **Successor** — `role` lowercase enum (compatibility)
- **SuccessorPropertyAssignment** — straightforward
- **EstateActivityEvent** — straightforward
- **EmergencyContact** — straightforward
- **Professional** — `category` should close to 8-value enum
- **UserProfile** — could use Clerk userId as `_id` directly
- **Notification** — `propertyId: v.optional(v.id("properties"))` (Q5.T cosmetic)
- **NotificationPreference** — straightforward

## Derivation registry

> All read-only → recommended Convex `query` functions.

### `lib/data/derivations/portfolio.ts`

| Function | Inputs | Output |
|---|---|---|
| computeStats(properties) | Property[] | { totalProperties, totalValue, rentedCount, vacantCount, attentionCount } |
| computeKpis(properties, payments, leases, allValuations, totalValue) | mixed | PortfolioKpis (incl. computeYoyGrowth) |

### `lib/data/derivations/rental.ts`

| Function | Inputs | Output |
|---|---|---|
| computePipeline(leases) | Lease[] | PipelineStage[4] |
| computeArrears(payments) | Payment[] | ArrearsBucket[3] |
| computeMaintenanceSummary(items) | MaintenanceItem[] | MaintenanceSummaryItem[3] |
| computeMaintenanceTotal(items) | MaintenanceItem[] | string ($X,XXX) — Phase 6.8b |
| computeUpcomingEvents(leases, maintenance, payments) | mixed | UpcomingEvent[≤5] (Q4.K UNION) |
| computeRecoveryRate(payments) | Payment[] | string % (Q3.M) |
| computeEvictionRisk(payments, leases) | mixed | string (Q3.N) |
| computeVacancyCost(properties, leases) | mixed | string $ (Q3.O) |
| computeTopSpendCategory(expenses) | Expense[] | TopSpend\|null (Q3.Q) |
| computeHeatmapData(properties, leases) | mixed | PropertyCluster[] (Q4.T suburb grouping) |
| computeMonthlyGrossIncome(leases) | Lease[] | { amount, trend } |
| computeCollectionRate(payments, leases) | mixed | string % (Q3.P) |
| computeOccupancyRate(properties, leases) | mixed | number 0–100 (Q3.H) |

### `lib/data/derivations/analytics.ts`

| Function | Inputs | Output |
|---|---|---|
| computeRevenueSeries(payments, expenses, window) | mixed | RevenueDataPoint[N months] (Q3.L) |
| computeKpiCards(properties, payments, leases, maintenance, expenses, window) | mixed | KpiCard[5] (Q3.K, Q4.S) |
| computeLeasePipeline(leases) | Lease[] | LeasePipelineItem[N] |
| computeCapitalGrowth(properties, valuations) | mixed | CapitalGrowthItem[N] |
| computeMaintenanceSpend(expenses, window) | mixed | MaintenanceSpendItem[N months] |
| computeExpenseBreakdown(expenses, window) | mixed | { items: [6], total } (Q5.U) |
| periodToWindow(period) | string | DateWindow |

### Derivation home decisions

- **NOT materialized:** Equity, ROI, Cap Rate, LTV (Q4.E — derive on read)
- **TO materialize eventually:** Daily occupancy snapshots (Q4.J — point-in-time for v1)
- **EstateActivityEvent:** stored (Phase 8.5)
- **RentalEvent:** stays derived (Q4.K option 1)

## Migration phases (~8–10 days)

| Phase | Time | Deliverable |
|---|---|---|
| 0 — Decisions | 2h | Resolve 8 Q-blockers above |
| 1 — Convex schema | 1d | `convex/schema.ts` from §schemas + indexes; users table |
| 2 — Seed migration | 1d | `scripts/migrate-seeds.ts` walks `public/data/users/demo-user/`; apply Zod + tightening transforms |
| 3 — Page query migration | 3-4d | Replace each `queries.ts` with Convex `query`. Order: /profile → /settings → /directory → /directory/[id] → /portfolio → /property/[id]/* → /analytics → /rental → /estate-planning |
| 4 — Derivations port | 1-2d | 23 compute* functions wrap as Convex queries |
| 5 — Storage | 1d | Document.storageId path → `_storage` ID; Q5.C |
| 6 — Verify | 1d | Spot-check 10 page renders; cross-card identities; tsc |

## Out-of-scope (post-v1)

- Multi-user (Q4.M) — single-user v1
- PII encryption (Q5.S) — `ssnMasked` is forward-compatible
- PDF parsing (Q4.L) — manual entry
- External AVM (Q4.Q resolved) — internal aggregation
- Daily snapshots / cron (Q4.J) — sparklines deferred
- RHF adoption (Q7) — manual state works
- Full audit log (Q4.P) — Phase 8.5 ships estate-only
- MFA / password change (Q5.G, Q6.A–B) — Clerk handles natively

## Migration-ready checklist

- ✅ All 25 Zod schemas have CRUD layers
- ✅ Auth shim (`getCurrentUserId()`) is the only auth surface — single swap
- ✅ All FS reads are async; fits Convex query style
- ✅ Server actions use Zod → translate to Convex `mutation` validators
- ✅ No client-side direct DB reads
- ✅ `Promise.all` parallel reads — Convex auto-parallelizes within `query`

---

_Last sync: 2026-05-07. Source: `../ref/08-backend-migration-readiness.md`._
