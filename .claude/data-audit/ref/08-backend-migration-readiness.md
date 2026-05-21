---
title: Backend Migration Readiness — Convex schema mapping, derivation registry, open Q-blockers
maintained: yes
last_updated: 2026-05-07
purpose: "Strategy reference for migrating from FS-layer demo to a real backend (Convex preferred). Lists open Q-blockers, Zod→Convex schema mappings, recommended indexes, and derivation registry."
---

# Backend Migration Readiness

> Reference for strategising the move from the file-system demo (`public/data/users/demo-user/<collection>/*/core.json`) to a real backend. Convex is the recommended target (per `CLAUDE.md`).

**Companion files:**
- `ref/09-page-wiring-status.md` — current per-page wiring
- `ref/07-entity-fields.md` — per-entity field tables
- `ref/00-entity-catalog.md` — older Convex schema sketches (this file refreshes with current state)
- `ref/05-open-questions.md` — full Q-number inventory

---

## TL;DR

- **25 Zod entities** are ready to map to Convex tables. All have CRUD layers and seed data.
- **No new entities required for v1 backend migration.** Three deferred concepts remain: `Unit` (resolved as no-build, Q4.T), `MarketSnapshot`/`PropertyComparable` (resolve to internal aggregation, Phase 6.9), and `Draft` (Q4.A pending).
- **8 Q-numbers should be resolved before schema-freeze.** Listed in §1 below.
- **Critical mapping anomalies** (date-as-string, numeric-as-string, open-string status fields) should be cleaned up *during* the migration, not after — once Convex enforces shapes via `v.*`, retrofitting is much harder.
- **Derivation registry** lists 23 `compute*` functions. All are recommended as Convex queries (read-only); none need actions or mutations.
- **Storage** (`Document.storageId`) currently a path string — should become `v.id("_storage")` on migration (Q5.C).

---

## 1. Open Q-blockers — resolve before schema-freeze

These 8 Q-numbers materially affect the Convex schema shape. Resolve them in a single design sit-down before writing the migration script:

### KPI definitions (4 Qs)

| Q | Question | Why it gates schema | Bias |
|---|---|---|---|
| **Q3.A** | `totalValueFormatted`: sum `buyNumeric` (purchase) or `currentMarketValue` (market)? | Determines whether `currentMarketValue` becomes required vs optional; affects every property's seed | Sum `buyNumeric` for cost basis, `currentMarketValue` for market view — surface BOTH |
| **Q3.C** | YoY growth: include properties that didn't exist last year, or exclude? | Affects `computeYoyGrowth` denominator + Convex query shape (need `_creationTime` filter) | Closest-prior heuristic already shipped Phase 6.0 YoY Rev 2; document as canonical |
| **Q3.E** | Arrears ageing: from `Payment.date` (due date) or invoice date? | Determines whether `Payment` needs an extra `dueDate` field | Add `dueDate?: number` field; default to `date` if absent |
| **Q3.I** | Attention count: real signals (open Emergency MaintenanceItems + overdue rent) instead of `health < 30`? | Q5.K already resolved to **drop `Property.health`**. The replacement signal needs a definition before the field can be removed without breaking the portfolio Attention KPI | Derive: count of properties with `MaintenanceItem.severity = "Emergency" AND status != "Resolved"` UNION properties with overdue Rent payments |

### Schema cleanup (3 Qs)

| Q | Question | Migration impact | Bias |
|---|---|---|---|
| **Q5.B** | Tighten add-property Zod (string → number for area, beds, baths, financials) | Affects `v.union` types for ~10 Property fields | Tighten now — `v.number()` on the Convex side will reject strings; cleaner to migrate once than twice |
| **Q5.R** | `Document.category` open string → closed enum | `v.union(v.literal("Title"), v.literal("Sales"), ...)` | Close to: `Title \| Sales \| Tax \| Rental \| Photos \| Insurance \| Estate \| Other`. Backfill seeds. |
| **Q5.B** also covers Property.purchasePrice (string) vs buyNumeric (number) — see Q5.P resolution |

### Drafts persistence (1 Q)

| Q | Question | Migration impact |
|---|---|---|
| **Q4.A** | Drafts: client-only localStorage vs Convex `drafts` table? | If Convex: new `drafts` entity with `userId`, `kind` ("add-property"), `formState` (JSON), `updatedAt`; +2 mutations (`saveDraftAction`, `deleteDraftAction` already stubbed in `actions.ts:16–17`) |

**Recommendation:** ship Convex variant. localStorage is a hack; cross-device sync is worth ~1 day of work.

---

## 2. Zod → Convex schema mapping

Format: per entity, the Zod source plus the recommended Convex `defineTable` shape with indexes.

### Conversion conventions

| Zod | Convex |
|---|---|
| `z.string()` | `v.string()` |
| `z.string().email()` | `v.string()` (no email type — validate at app layer) |
| `z.string().regex(...)` | `v.string()` (validate at app layer) |
| `z.number()` | `v.number()` |
| `z.number().int().nonnegative()` | `v.number()` (Convex does not enforce int/nonneg; validate at action layer) |
| `z.boolean()` | `v.boolean()` |
| `z.enum([...])` | `v.union(v.literal("a"), v.literal("b"), ...)` |
| `z.array(z.string())` | `v.array(v.string())` |
| `idSchema` (FK) | `v.id("<targetTable>")` |
| `userIdSchema` | `v.id("users")` (assuming a `users` table) — or `v.string()` for Clerk-only |
| `propertyIdSchema` | `v.id("properties")` |
| `timestampSchema` | `v.number()` (Convex stores ms epoch; native `_creationTime` covers `createdAt` if you don't need a separate field) |
| `.optional()` | `v.optional(...)` |

**Note:** Convex auto-creates `_id` and `_creationTime` per record. Most `id` and `createdAt` fields can be dropped during migration.

### Recommended indexes per entity

Lookup paths used by `queries.ts` translate to indexes:

| Entity | Index | Rationale |
|---|---|---|
| Property | `by_userId` `["userId"]` | every page filters by userId |
| Tenant | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]` | scoped lookups |
| Lease | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_stage` `["userId","stage"]` | pipeline derivation |
| Payment | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_leaseId` `["leaseId"]` | arrears + payment history |
| Expense | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_category` `["userId","category"]` | breakdown derivation |
| Document | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_folderId` `["folderId"]`, `by_category` `["userId","category"]` | folder tree + estate filter |
| Folder | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_parent` `["parentFolderId"]` | recursive tree |
| Inspection / Certification / SafetyRisk / EmergencyContact | `by_propertyId` `["propertyId"]` | safety page reads all at once |
| MaintenanceItem | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_status` `["userId","status"]` | rental dashboard count + severity rollups |
| PropertyValuation | `by_propertyId` `["propertyId"]`, `by_recordedAt` `["propertyId","recordedAt"]` | sorted history fetches |
| LandParcel / OwnershipRecord / OwnershipDocument / OwnershipHistory / CoOwner | `by_propertyId` `["propertyId"]` | property-page reads |
| Successor | `by_userId` `["userId"]` | estate page |
| SuccessorPropertyAssignment | `by_userId` `["userId"]`, `by_successorId` `["successorId"]`, `by_propertyId` `["propertyId"]` | join-table reads in both directions |
| EstateActivityEvent | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_createdAt` `["userId","createdAt"]` | timeline ordering |
| Professional | `by_userId` `["userId"]`, `by_category` `["userId","category"]`, `by_verified` `["userId","verified"]` | directory filter+sort |
| UserProfile | `by_userId` `["userId"]` (or use `_id = userId`) | one record per user |
| Notification | `by_userId` `["userId"]`, `by_propertyId` `["propertyId"]`, `by_read` `["userId","read"]` | bell badge count |
| NotificationPreference | `by_userId` `["userId"]`, `by_eventType` `["userId","eventType"]` | settings preferences matrix |

### Per-entity Convex schemas (recommended)

**Property** (composed schema in Zod; flat in Convex)
```ts
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
  lat: v.number(),
  lng: v.number(),
  isArchived: v.optional(v.boolean()),
  // Location
  addressLine: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  city: v.optional(v.string()),
  zip: v.optional(v.string()),
  country: v.optional(v.string()),
  province: v.string(),
  // Finance — TIGHTEN per Q5.B (was strings)
  purchaseDate: v.optional(v.number()),
  buyNumeric: v.number(), // canonical purchase price
  currentMarketValue: v.optional(v.number()),
  outstandingMortgage: v.optional(v.number()),
  monthlyPayment: v.optional(v.number()),
  interestRate: v.optional(v.number()),
  annualPropertyTax: v.optional(v.number()),
  taxAssessmentValue: v.optional(v.number()),
  annualInsurance: v.optional(v.number()),
  ownershipStatus: v.optional(v.string()),
  // Media — TIGHTEN per Q5.B (was strings)
  photoStorageIds: v.optional(v.array(v.id("_storage"))),
  documentStorageIds: v.optional(v.array(v.id("_storage"))),
  totalAreaM2: v.number(), // RENAME from totalArea string; backfill from LandParcel.sizeM2 where available
  yearBuilt: v.optional(v.number()),
  bedrooms: v.optional(v.number()),
  bathrooms: v.optional(v.number()),
  parkingSpaces: v.optional(v.number()),
  storageUnit: v.optional(v.string()),
  title: v.union(v.literal("Hard title"), v.literal("Soft title"), v.literal("—")),
})
.index("by_userId", ["userId"])
.index("by_userId_status", ["userId", "status"]) // for filter/count derivations
```

**Lease**
```ts
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
  // Future fields per F2/F3:
  deposit: v.optional(v.number()),
  autoPay: v.optional(v.boolean()),
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_userId_stage", ["userId", "stage"])
```

**Payment**
```ts
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
```

**Expense**
```ts
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
```

**Document** — TIGHTEN per Q5.R (close `category` enum), Q5.C (storage)
```ts
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
  category: v.optional(v.union( // CLOSE enum per Q5.R
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
```

**Folder**
```ts
folders: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  parentFolderId: v.optional(v.id("folders")),
  name: v.string(),
})
.index("by_userId", ["userId"])
.index("by_propertyId", ["propertyId"])
.index("by_parentFolderId", ["parentFolderId"])
```

**Inspection** — TIGHTEN per Schema gaps B + C
```ts
inspections: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  date: v.number(), // CHANGE from string per Schema gap B
  type: v.string(),
  inspector: v.string(),
  status: v.union(v.literal("Passed"), v.literal("Failed"), v.literal("Pending")), // CLOSE per Schema gap C
  issues: v.number(),
})
.index("by_propertyId", ["propertyId"])
```

**Certification** — TIGHTEN per Schema gaps B + C
```ts
certifications: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  name: v.string(),
  status: v.union(v.literal("Valid"), v.literal("Expiring"), v.literal("Expired")), // CLOSE per Schema gap C
  issued: v.number(), // CHANGE from string per Schema gap B
  expires: v.number(),
  inspector: v.string(),
})
.index("by_propertyId", ["propertyId"])
```

**SafetyRisk** — TIGHTEN per Schema gap C; no `resolved` per Q5.Q
```ts
safetyRisks: defineTable({
  userId: v.id("users"),
  propertyId: v.id("properties"),
  severityLabel: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")), // CLOSE
  title: v.string(),
  desc: v.string(),
})
.index("by_propertyId", ["propertyId"])
```

**EmergencyContact, MaintenanceItem, PropertyValuation, LandParcel, CoOwner, OwnershipRecord, OwnershipDocument, OwnershipHistory, Successor, SuccessorPropertyAssignment, EstateActivityEvent, Professional, UserProfile, Notification, NotificationPreference**

These follow the same straightforward Zod→Convex translation. Notable per-entity tweaks:

- **MaintenanceItem** — keep `cost: v.optional(v.number())` (Phase 6.8b just added).
- **PropertyValuation** — drop `month` regex string; derive from `recordedAt` instead (`new Date(recordedAt).toLocaleString("en-US", {month:"short", year:"numeric"})`).
- **CoOwner** — `ssnMasked: v.optional(v.string())` is fine for v1; Q5.S filed for real encryption strategy (`ssnEncrypted: v.bytes()` with KMS-managed key).
- **OwnershipDocument** — convert `date` from string → number; `type` should close to a Document-Type enum.
- **OwnershipHistory** — drop `color` (presentational); convert `date` from string → number.
- **Notification** — change `propertyId` from `z.string().optional()` to `v.optional(v.id("properties"))` (Q5.T cosmetic followup).
- **Professional** — `category` should close to the 8-value enum used in `/directory` (currently open string).
- **UserProfile** — could use Clerk `userId` as `_id` directly (no separate field).
- **Successor.role** — keep lowercase enum (`"primary" | "contingent"`) for compatibility with shipped code.

---

## 3. Derivation registry

23 server-side derivation functions. All read-only — recommended as Convex queries (`query({ args, handler })`).

### `lib/data/derivations/portfolio.ts`

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `computeStats(properties)` | `Property[]` | `{ totalProperties, totalValue, rentedCount, vacantCount, attentionCount, ... }` | Pure aggregate. No FK joins. |
| `computeKpis(properties, payments, leases, allValuations, totalValue)` | mixed | `PortfolioKpis` | Includes `computeYoyGrowth` |
| `computeYoyGrowth` (internal) | `PropertyValuation[]` | `{ kind, value, percentage }` | Closest-prior heuristic; Q3.C |

### `lib/data/derivations/rental.ts`

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `computePipeline(leases)` | `Lease[]` | `PipelineStage[4]` | Stage rollups |
| `computeArrears(payments)` | `Payment[]` | `ArrearsBucket[3]` | 0–30/31–60/61–90 day buckets |
| `computeMaintenanceSummary(items)` | `MaintenanceItem[]` | `MaintenanceSummaryItem[3]` | Severity rollup |
| `computeMaintenanceTotal(items)` | `MaintenanceItem[]` | `string` ($X,XXX) | Phase 6.8b — sums `cost ?? 0` |
| `computeUpcomingEvents(leases, maintenance, payments)` | mixed | `UpcomingEvent[≤5]` | UNION across 3 sources, Q4.K |
| `computeRecoveryRate(payments)` | `Payment[]` | `string %` | Q3.M — paid/billed |
| `computeEvictionRisk(payments, leases)` | mixed | `string` (e.g. "2 Tenants") | Q3.N |
| `computeVacancyCost(properties, leases)` | mixed | `string` ($X) | Q3.O |
| `computeTopSpendCategory(expenses)` | `Expense[]` | `TopSpend \| null` | Q3.Q |
| `computeHeatmapData(properties, leases)` | mixed | `PropertyCluster[]` | Q4.T — suburb grouping |
| `computeMonthlyGrossIncome(leases)` | `Lease[]` | `{amount, trend}` | Sum of active Signed lease rent + MoM trend |
| `computeCollectionRate(payments, leases)` | mixed | `string %` | Q3.P |
| `computeOccupancyRate(properties, leases)` | mixed | `number 0–100` | Q3.H |

### `lib/data/derivations/analytics.ts`

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `computeRevenueSeries(payments, expenses, window)` | mixed | `RevenueDataPoint[N months]` | Q3.L |
| `computeKpiCards(properties, payments, leases, maintenance, expenses, window)` | mixed | `KpiCard[5]` | Q3.K (NOI), Q4.S (Occupancy) |
| `computeLeasePipeline(leases)` | `Lease[]` | `LeasePipelineItem[N]` | Bucketed by months-to-end |
| `computeCapitalGrowth(properties, valuations)` | mixed | `CapitalGrowthItem[N]` | Ranked by appreciation % |
| `computeMaintenanceSpend(expenses, window)` | mixed | `MaintenanceSpendItem[N months]` | Per-month bucket |
| `computeExpenseBreakdown(expenses, window)` | mixed | `{items: ExpenseBreakdownItem[6], total}` | Q5.U |
| `periodToWindow(period)` | `string` | `DateWindow` | Helper |

### `lib/data/derivations/property.ts` (per-property derivations)

| Function | Inputs | Output | Notes |
|---|---|---|---|
| (smaller helpers) | various | various | NOI / income / expense aggregations scoped to one property |

**Convex migration approach:** every `compute*` function becomes a Convex `query`. Inputs become `args` (or are fetched via `ctx.db.query(...).collect()`). Outputs flow directly to the page via `useQuery` (real-time) or `preloadQuery` (one-shot SSR).

### Other derivation home decisions

- **NOT to materialize:** Equity / ROI / Cap Rate / LTV — Q4.E resolved as derive-on-read.
- **TO materialize (eventually):** Daily occupancy snapshots — Q4.J recommends point-in-time for v1, but a `propertyStatusSnapshot` table + cron is the right pattern for sparklines later.
- **Activity events (timeline):** EstateActivityEvent already stored (Phase 8.5); RentalEvent stays derived (Q4.K option 1).

---

## 4. Migration phase sequencing

A 6-phase blueprint. Each phase is independent enough to PR separately.

### Phase 0 — Decisions (~2 hours, no code)
Resolve the 8 Q-blockers in §1 above. Document each resolution as an addendum to `ref/05-open-questions.md`.

### Phase 1 — Convex schema (~1 day)
Write `convex/schema.ts` from §2 mappings. Add the recommended indexes. Add a `users` table mapped to Clerk identity. Generate `convex/_generated/dataModel.ts`.

### Phase 2 — Seed migration (~1 day)
Write a `scripts/migrate-seeds.ts` that walks `public/data/users/demo-user/*/` and creates Convex records via `internalMutation`. For each entity:
1. Read all `core.json` files
2. Apply Zod schema (catches drift from §2)
3. Apply tightening transforms (string → number for Q5.B, string → timestamp for Schema gap B, etc.)
4. Insert via `ctx.db.insert("table", record)`

Run once locally; verify counts match (`16 properties`, `5 notifications`, etc. — see `ref/07-entity-fields.md` quick reference).

### Phase 3 — Page query migration (~3–4 days)
Replace each `app/(shell)/<route>/queries.ts` with a Convex `query`. Strategy:

```ts
// Before (FS-layer):
export async function getPortfolioPageData() {
  const userId = getCurrentUserId();
  const [properties, payments, leases, allValuations] = await Promise.all([...]);
  return { properties, stats: computeStats(properties), kpis: computeKpis(...) };
}

// After (Convex):
export const getPortfolioPageData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    const properties = await ctx.db.query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId)).collect();
    // ... same compute* functions, now operating on Convex-typed records
    return { properties, stats: computeStats(properties), ... };
  }
});
```

Order of routes (low-risk first): `/profile` → `/settings` → `/directory` → `/directory/[id]` → `/portfolio` → `/property/[id]/*` → `/analytics` → `/rental` → `/estate-planning`.

### Phase 4 — Derivations port (~1–2 days)
The 23 derivation functions are **input-shape compatible** with Convex records (just typed objects). The main change is wrapping each as a Convex query for cacheable reads. Optional optimization: collapse adjacent derivations into a single query that returns the page-data shape.

### Phase 5 — Storage migration (~1 day)
- Photos/document blobs (currently file paths in `Document.storageId`) → upload to `_storage`, replace with `_storage` IDs (Q5.C).
- Update `Document` reads to resolve via `ctx.storage.getUrl(storageId)`.

### Phase 6 — Verify (~1 day)
- Spot-check 10 page renders against the FS-layer baseline.
- Verify cross-card identities (e.g. Total Rent − Expenses = NOI).
- Run TypeScript build (`tsc --noEmit`); confirm no type drift.
- Stress-test with paginated portfolio (Q1.A becomes relevant once dataset > 16).

**Total estimated scope:** ~8–10 working days.

---

## 5. Out-of-scope concerns (post-v1)

These are real concerns but should NOT block v1 backend migration:

- **Multi-user & sharing** (Q4.M) — v1 is single-user; defer Clerk org/team patterns.
- **PII encryption** (Q5.S) — `ssnMasked` is forward-compatible; real encryption ships later with KMS.
- **PDF parsing** (Q4.L) — manual entry for now; AI extraction is a separate product phase.
- **External AVM API** (Q4.Q resolved internal) — internal aggregation only.
- **Daily snapshots / cron** (Q4.J) — sparklines stay deferred.
- **RHF adoption** (Q7) — manual state works; refactor when convenient.
- **Audit log (full)** (Q4.P) — Phase 8.5 ships estate-only events; portfolio-wide audit log is later.
- **MFA / password change** (Q5.G, Q6.A–B) — Clerk handles natively post-migration.

---

## 6. What's already migration-ready

- ✅ All 25 Zod schemas have CRUD layers (`lib/data/db/<n>.ts`) following identical patterns
- ✅ Auth shim (`getCurrentUserId()` returning `"demo-user"`) is the only auth surface — single swap to `ctx.auth.getUserIdentity()`
- ✅ All FS reads are async (`listMergedRecords`, `readMergedRecord`) — already fits Convex query style
- ✅ Server actions (`saveProfileInfo`, `markRead`, `addSuccessorAndAssign`) already use Zod validation — translate cleanly to Convex `mutation` with `args: { ... }` validators
- ✅ No client-side direct DB reads — all routes go through `queries.ts` Server Components
- ✅ `Promise.all` parallel reads are already the pattern — Convex auto-parallelizes within a single `query` handler

---

## 7. References

- `convex/_generated/ai/guidelines.md` — Convex API rules (read first per `CLAUDE.md`)
- `ref/00-entity-catalog.md` — older proposed Convex schemas (this file is the refresh)
- `ref/03-data-flow-and-derivations.md` — derivation home assignments
- `ref/05-open-questions.md` — full Q-number inventory (this file's §1 filters to v1 blockers only)
- `ref/09-page-wiring-status.md` — current state per page
- `ref/07-entity-fields.md` — full field tables
