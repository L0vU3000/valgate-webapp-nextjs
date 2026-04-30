# 04 — Convex Plan

> Three subsections plus an appendix:
> (a) `defineSchema` tables + indexes
> (b) Query function signatures (preserve existing `queries.ts` export names)
> (c) Mutation function signatures (preserve existing `actions.ts` export names where present)
> Appendix: Auth & ownership matrix

Convex API names follow `docs/mock-to-backend-pattern.md` (e.g. `api.notifications.list`, `api.notifications.markAllRead`). Every entity table includes `userId: v.string()` and `.index("by_user", ["userId"])` per the same pattern.

---

## (a) `convex/schema.ts` — tables + indexes

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userProfiles: defineTable({
    userId:         v.string(),                          // Clerk subject
    firstName:      v.string(),
    lastName:       v.string(),
    fullName:       v.string(),                          // Q5.F: derive vs store
    initials:       v.string(),                          // Q5.F
    jobTitle:       v.optional(v.string()),
    employeeId:     v.optional(v.string()),
    role:           v.union(v.literal("Administrator"),
                            v.literal("Manager"),
                            v.literal("Viewer")),
    email:          v.string(),
    phone:          v.optional(v.string()),
    office:         v.optional(v.string()),
    language:       v.union(v.literal("en-US"),
                            v.literal("km"),
                            v.literal("zh")),
    timezone:       v.string(),
    currency:       v.string(),
    dashboardView:  v.union(v.literal("portfolio-overview"),
                            v.literal("analytics"),
                            v.literal("map")),
    memberSince:    v.number(),
    lastLoginAt:    v.number(),
    mfa:            v.object({
      authenticatorEnabled: v.boolean(),
      smsEnabled:           v.boolean(),
    }),
  }).index("by_user", ["userId"]),

  properties: defineTable({
    userId:                v.string(),
    name:                  v.string(),
    code:                  v.string(),
    type:                  v.union(v.literal("Land"),
                                   v.literal("House"),
                                   v.literal("Building")),
    propertyType:          v.optional(v.union(
                              v.literal("residential"), v.literal("commercial"),
                              v.literal("multi-unit"),  v.literal("retail"),
                              v.literal("land"),        v.literal("industrial"),
                              v.literal("construction"), v.literal("other"))),
    province:              v.string(),
    status:                v.union(v.literal("Rented"), v.literal("Vacant")),
    size:                  v.string(),                 // sq m as string today (Q5.B)
    buyNumeric:            v.number(),                 // canonical price
    title:                 v.union(v.literal("Hard title"),
                                   v.literal("Soft title"),
                                   v.literal("—")),
    health:                v.number(),                 // 0–100
    lat:                   v.number(),
    lng:                   v.number(),
    addressLine:           v.optional(v.string()),
    addressLine2:          v.optional(v.string()),
    city:                  v.optional(v.string()),
    stateProv:             v.optional(v.string()),
    zip:                   v.optional(v.string()),
    country:               v.optional(v.string()),
    yearBuilt:             v.optional(v.number()),     // Q5.B
    totalAreaSqm:          v.optional(v.number()),
    bedrooms:              v.optional(v.number()),
    bathrooms:             v.optional(v.number()),
    parkingSpaces:         v.optional(v.number()),
    storageUnit:           v.optional(v.string()),
    purchasePriceCents:    v.optional(v.number()),     // money in cents
    purchaseDate:          v.optional(v.number()),
    currentMarketValueCents: v.optional(v.number()),
    ownershipStatus:       v.optional(v.string()),
    outstandingMortgageCents: v.optional(v.number()),
    monthlyPaymentCents:   v.optional(v.number()),
    interestRateBps:       v.optional(v.number()),     // basis points
    annualPropertyTaxCents: v.optional(v.number()),
    taxAssessmentValueCents: v.optional(v.number()),
    annualInsuranceCents:  v.optional(v.number()),
    coverPhotoStorageId:   v.optional(v.id("_storage")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_province", ["userId", "province"])
    .index("by_user_and_health", ["userId", "health"])
    .index("by_user_and_createdAt", ["userId", "_creationTime"]),

  documents: defineTable({
    userId:           v.string(),
    propertyId:       v.id("properties"),
    folderId:         v.optional(v.id("folders")),
    name:             v.string(),
    kind:             v.union(v.literal("photo"), v.literal("document")),
    mimeType:         v.optional(v.string()),
    extension:        v.optional(v.string()),
    sizeBytes:        v.optional(v.number()),
    storageId:        v.id("_storage"),
    thumbStorageId:   v.optional(v.id("_storage")),
    category:         v.optional(v.string()),
    uploadedBy:       v.optional(v.string()),
    uploadedAt:       v.number(),
    deletedAt:        v.optional(v.number()),          // Q5.E soft delete
  })
    .index("by_property", ["propertyId"])
    .index("by_property_and_folder", ["propertyId", "folderId"])
    .index("by_property_and_uploadedAt", ["propertyId", "uploadedAt"])
    .index("by_user", ["userId"]),

  folders: defineTable({
    userId:         v.string(),
    propertyId:     v.id("properties"),
    parentFolderId: v.optional(v.id("folders")),
    name:           v.string(),
  })
    .index("by_property", ["propertyId"])
    .index("by_property_and_parent", ["propertyId", "parentFolderId"]),

  tenants: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    name:       v.string(),
    unit:       v.string(),
    email:      v.optional(v.string()),
    phone:      v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"]),

  leases: defineTable({
    userId:         v.string(),
    propertyId:     v.id("properties"),
    tenantId:       v.optional(v.id("tenants")),
    unit:           v.string(),
    stage:          v.union(v.literal("Approaching"),
                            v.literal("Offered"),
                            v.literal("Signed"),
                            v.literal("Declined"),
                            v.literal("Active"),
                            v.literal("Ended")),
    startDate:      v.optional(v.number()),
    endDate:        v.optional(v.number()),
    monthlyRentCents: v.number(),
    termMonths:     v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_stage", ["userId", "stage"])
    .index("by_user_and_endDate", ["userId", "endDate"])
    .index("by_property", ["propertyId"]),

  payments: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    leaseId:    v.optional(v.id("leases")),
    tenantId:   v.optional(v.id("tenants")),
    date:       v.number(),
    kind:       v.union(v.literal("Rent"), v.literal("Fee"),
                        v.literal("Deposit"), v.literal("Refund")),
    amountCents: v.number(),
    method:     v.string(),
    status:     v.union(v.literal("Paid"), v.literal("Pending"),
                        v.literal("Failed"), v.literal("Overdue")),
  })
    .index("by_property_and_date", ["propertyId", "date"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_date", ["userId", "date"]),

  maintenanceItems: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    severity:   v.union(v.literal("Emergency"),
                        v.literal("Urgent"),
                        v.literal("Standard")),
    title:      v.string(),
    status:     v.union(v.literal("Open"),
                        v.literal("InProgress"),
                        v.literal("Resolved")),
    costCents:  v.optional(v.number()),                  // Q4.H
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user_and_severity", ["userId", "severity"])
    .index("by_property_and_status", ["propertyId", "status"]),

  inspections: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    date:       v.number(),
    type:       v.string(),
    inspector:  v.string(),
    status:     v.union(v.literal("Pass"), v.literal("Fail"), v.literal("Pending")),
    issuesCount: v.number(),
    notes:      v.optional(v.string()),
  })
    .index("by_property_and_date", ["propertyId", "date"]),

  certifications: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    name:       v.string(),
    status:     v.union(v.literal("Active"),
                        v.literal("Expiring"),
                        v.literal("Expired")),
    issuedAt:   v.number(),
    expiresAt:  v.number(),
    inspector:  v.string(),
  })
    .index("by_property_and_expiresAt", ["propertyId", "expiresAt"]),

  safetyRisks: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    severity:   v.union(v.literal("High"),
                        v.literal("Medium"),
                        v.literal("Low")),
    title:       v.string(),
    description: v.string(),
    resolved:    v.boolean(),
  })
    .index("by_property_and_severity", ["propertyId", "severity"]),

  emergencyContacts: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    name:       v.string(),
    phone:      v.string(),
    category:   v.string(),
    note:       v.optional(v.string()),
  }).index("by_property", ["propertyId"]),

  ownershipRecords: defineTable({
    userId:                  v.string(),
    propertyId:              v.id("properties"),
    holdingType:             v.string(),
    currentEstimatedValueCents: v.number(),
    remainingMortgageCents:  v.number(),
    coOwnerProfileIds:       v.array(v.id("userProfiles")),
  }).index("by_property", ["propertyId"]),

  ownershipHistory: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    at:         v.number(),
    text:       v.string(),
    kind:       v.union(v.literal("Acquired"),
                        v.literal("Transferred"),
                        v.literal("Refinanced")),
  }).index("by_property_and_at", ["propertyId", "at"]),

  propertyValuations: defineTable({
    userId:     v.string(),
    propertyId: v.id("properties"),
    month:      v.string(),                              // "YYYY-MM"
    priceCents: v.number(),
    recordedAt: v.number(),
  }).index("by_property_and_month", ["propertyId", "month"]),

  comparables: defineTable({
    userId:        v.string(),
    propertyId:    v.id("properties"),
    address:       v.string(),
    distanceKm:    v.number(),
    soldAt:        v.number(),
    type:          v.string(),
    builtYear:     v.number(),
    beds:          v.number(),
    baths:         v.number(),
    sqft:          v.number(),
    priceCents:    v.number(),
    pricePerSqftCents: v.number(),
  }).index("by_property", ["propertyId"]),

  notifications: defineTable({
    userId:      v.string(),
    category:    v.union(v.literal("MAINTENANCE"),
                         v.literal("LEASING"),
                         v.literal("COMPLIANCE"),
                         v.literal("PAYMENT"),
                         v.literal("APPLICATIONS")),
    title:       v.string(),
    description: v.string(),
    createdAt:   v.number(),
    read:        v.boolean(),
    linkTo:      v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"])
    .index("by_user_and_createdAt", ["userId", "createdAt"]),

  notificationPreferences: defineTable({
    userId:    v.string(),
    eventType: v.union(v.literal("valuationUpdates"),
                       v.literal("teamComments"),
                       v.literal("marketInsights")),
    channel:   v.union(v.literal("email"),
                       v.literal("slack"),
                       v.literal("sms")),
    enabled:   v.boolean(),
  })
    .index("by_user_and_eventType", ["userId", "eventType"])
    .index("by_user", ["userId"]),

  drafts: defineTable({                                // Q4.A: keep client-side or migrate
    userId:    v.string(),
    kind:      v.literal("add-property"),
    title:     v.string(),
    step:      v.number(),
    form:      v.any(),
    updatedAt: v.number(),
  }).index("by_user_and_kind_and_updatedAt",
           ["userId", "kind", "updatedAt"]),

  professionals: defineTable({
    userId:             v.string(),                     // Q4.A: per-user vs global
    name:               v.string(),
    company:            v.string(),
    category:           v.string(),
    rating:             v.number(),
    reviewCount:        v.number(),
    linkedPropertyIds:  v.array(v.id("properties")),
    available:          v.boolean(),
    avatarBg:           v.string(),
    email:              v.optional(v.string()),
    phone:              v.optional(v.string()),
  })
    .index("by_user_and_category", ["userId", "category"])
    .index("by_user", ["userId"]),

  successors: defineTable({
    userId:            v.string(),
    name:              v.string(),
    relation:          v.string(),
    role:              v.union(v.literal("Primary"), v.literal("Contingent")),
    sharePercent:      v.number(),
    verified:          v.boolean(),
    linkedPropertyIds: v.array(v.id("properties")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_role", ["userId", "role"]),
});
```

Notes:
- Money is stored as `*Cents: number` to avoid floating-point.
- `_creationTime` is built-in to Convex; no need for explicit `createdAt` unless filtering on a different value.
- `EstateDocument` is folded into `documents` with `category="estate"` (Q4.C).
- `RentalEvent` is **not a table** — derived from `leases`, `maintenanceItems`, `payments`, `inspections` (see `03` B3). Add it as a table only if upcoming-events become user-authored (Q4.K).

---

## (b) Query function signatures

Each entry: `name` · `args` · `returns` · access pattern · auth · route consumer.

### Per-route composite queries (preserve existing names)

- **`api.queries.getHomePageData`** · `args: {}` · `returns: HomePageData = { properties: Property[], stats: PortfolioStats, kpis: PortfolioKpis }` · pattern: full table scan over user's properties + aggregations · auth: `ctx.auth.getUserIdentity()` filter `by_user` · consumer: `app/(shell)/page.tsx`. **Same shape as portfolio**; consider a single `api.portfolio.dashboard` query and call from both routes.
- **`api.queries.getPortfolioPageData`** · same as home (composite). The current `app/(shell)/portfolio/queries.ts` export.
- **`api.queries.getRentalDashboardData`** · `args: { window?: number }` · `returns: RentalDashboardData = { pipelineStages, upcomingEvents, maintenanceItems, arrearsBuckets }` · derived (see `03` B3) · consumer: `app/(shell)/rental/queries.ts`.
- **`api.queries.getAnalyticsPageData`** · `args: { period: "MTD" | "QTD" | "YTD" | "12M" | { from: number, to: number } }` · `returns: AnalyticsPageData` · derived · consumer: `app/(shell)/analytics/queries.ts`.
- **`api.queries.getSettingsPageData`** · `args: {}` · `returns: { profile: UserProfile, preferences: NotificationPreference[] }` · consumer: `app/(shell)/settings/queries.ts`. *(Recommend splitting into `api.userProfiles.me` + `api.notificationPreferences.list` — see `03` C.)*
- **`api.queries.getProfilePageData`** · `args: {}` · `returns: UserProfile` · consumer: `app/(shell)/profile/queries.ts`.
- **`api.queries.getDirectoryPageData`** · `args: { category?: string, search?: string }` · `returns: { professionals: Professional[], categories: string[], total: number }` · consumer: `app/(shell)/directory/queries.ts`.
- **`api.queries.getEstatePlanningPageData`** · `args: {}` · `returns: EstatePlanningPageData = { stats, properties, successors, documents, timeline }` · consumer: `app/(shell)/estate-planning/queries.ts`.
- **`api.queries.getAddPropertyPageData`** · `args: {}` · `returns: { drafts: PropertyDraftSummary[] }` · consumer: `app/(shell)/add-property/queries.ts` (or wherever the existing `getAddPropertyPageData()` sits).

### Per-property tab queries (fan-out — recommended in `03` C)

- **`api.properties.layoutHeader`** · `args: { propertyId: Id<"properties"> }` · `returns: { property: Property, breadcrumb: { name, code, status } }` · consumer: `app/(shell)/property/[id]/layout.tsx`.
- **`api.properties.overview`** · `args: { propertyId }` · `returns: { property, tenants, alerts, recentActivity, metrics }`.
- **`api.documents.listByProperty`** · `args: { propertyId, folderId?: Id<"folders"> | null }` · `returns: Document[]` · index: `by_property_and_folder`.
- **`api.folders.tree`** · `args: { propertyId }` · `returns: FolderNode[]` (recursive).
- **`api.properties.location`** · `args: { propertyId }` · `returns: { property, neighborhood?: ... }`.
- **`api.properties.safety`** · `args: { propertyId }` · `returns: { certifications, inspections, risks, emergencyContacts, complianceStats }`.
- **`api.properties.ownership`** · `args: { propertyId }` · `returns: { record, history, kpis, documents }`.
- **`api.properties.rental`** · `args: { propertyId }` · `returns: { unit, currentLease, payments, kpis, rentSeries }`.
- **`api.properties.valuation`** · `args: { propertyId }` · `returns: { valueHistory, comparables, investmentMetrics, factors }`.

### Cross-cutting queries

- **`api.notifications.list`** · `args: {}` · `returns: Notification[]` · index: `by_user_and_createdAt` desc · consumer: `lib/hooks/use-notifications.ts` (TODO line 7). **This name is already chosen** by the pattern doc — preserve.
- **`api.notifications.unreadCount`** · `args: {}` · `returns: number` · index: `by_user_and_read`.
- **`api.notificationPreferences.list`** · `args: {}` · `returns: NotificationPreference[]` · consumer: `/settings`.
- **`api.userProfiles.me`** · `args: {}` · `returns: UserProfile` · consumer: `/profile`, header avatar.
- **`api.drafts.list`** · `args: { kind: "add-property" }` · `returns: DraftRecord[]` · only if Q4.A resolves to "migrate to Convex".

### Total: ~21 queries

---

## (c) Mutation function signatures

Each entry: `name` · `args` · auth/ownership rule · `returns` · side effects · triggering surface.

### Property lifecycle (preserve `submitPropertyAction` / `saveDraftAction` / `deleteDraftAction`)

- **`api.properties.create`** · `args: fullPropertySchema (server-side)` · auth: identity required; sets `userId = identity.subject` · returns: `{ propertyId: Id<"properties"> }` · side effect: insert default `ownershipRecord`, optional welcome `Notification` · trigger: `submitPropertyAction` in `app/(shell)/add-property/actions.ts:7`. **The existing server action calls this; preserve `submitPropertyAction` name.**
- **`api.properties.update`** · `args: { propertyId, patch: PartialProperty }` · auth: ownership check (`property.userId === identity.subject`) · returns: `Property` · trigger: future "edit property" UI (none today).
- **`api.properties.archive`** · `args: { propertyId }` · auth: ownership · returns: `void` · soft-delete (Q5.E).
- **`api.drafts.upsert`** · `args: { id?: string, title, step, form }` · auth: ownership · returns: `Draft` · trigger: `saveDraftAction` (today a stub at `actions.ts:16`).
- **`api.drafts.delete`** · `args: { id }` · auth: ownership · returns: `void` · trigger: `deleteDraftAction`.

### Documents

- **`api.documents.generateUploadUrl`** · `args: {}` · returns: `{ uploadUrl: string, storageId: Id<"_storage"> }` · Convex storage upload primitive.
- **`api.documents.create`** · `args: { propertyId, folderId?, name, kind, storageId, mimeType?, sizeBytes?, category? }` · auth: ownership of property · returns: `Document` · trigger: `/property/[id]/documents` upload modal; `Step4PhotosDocs` photo/document inputs.
- **`api.documents.move`** · `args: { documentIds: Id<"documents">[], targetFolderId: Id<"folders"> | null }` · auth: ownership of all documents · returns: count moved · trigger: documents tab Move modal.
- **`api.documents.deleteMany`** · `args: { documentIds }` · auth: ownership · returns: count · trigger: documents tab bulk delete.
- **`api.folders.create`** · `args: { propertyId, parentFolderId?, name }` · auth: ownership · returns: `Folder` · trigger: New-folder modal.
- **`api.folders.rename`** / **`api.folders.delete`** · trigger: future UI.

### Tenants & leases

- **`api.tenants.create`** · `args: { propertyId, name, unit, email?, phone? }` · auth: ownership · trigger: future UI.
- **`api.leases.create`** · `args: { propertyId, tenantId?, unit, monthlyRentCents, termMonths, startDate?, endDate? }` · auth: ownership · trigger: `/rental` "Create New Lease" (no handler today).
- **`api.leases.advanceStage`** · `args: { leaseId, toStage }` · auth: ownership · trigger: pipeline movement.
- **`api.leases.renew`** · `args: { leaseId, newEndDate, monthlyRentCents }` · auth: ownership · trigger: PropertyRentalPage "Send Renewal Offer".
- **`api.leases.endLease`** · `args: { leaseId, endedAt }` · auth: ownership · trigger: future UI.
- **`api.payments.record`** · `args: { propertyId, leaseId?, tenantId?, date, kind, amountCents, method, status }` · auth: ownership · trigger: future UI.

### Maintenance, inspections, safety, ownership

- **`api.maintenanceItems.create`** · `args: { propertyId, severity, title, description? }` · auth: ownership.
- **`api.maintenanceItems.updateStatus`** · `args: { id, status }` · auth: ownership.
- **`api.inspections.create`** · `args: { propertyId, date, type, inspector, status, issuesCount, notes? }` · auth: ownership.
- **`api.certifications.create`** · `args: { propertyId, name, issuedAt, expiresAt, inspector }` · auth: ownership · trigger: PropertySafetyPage "Add Certificate".
- **`api.safetyRisks.create`** / **`api.safetyRisks.resolve`** · auth: ownership.
- **`api.emergencyContacts.upsert`** · auth: ownership.
- **`api.ownershipRecords.upsert`** · auth: ownership · trigger: PropertyOwnershipPage "Add Owner".
- **`api.ownershipHistory.append`** · auth: ownership.
- **`api.propertyValuations.record`** · args: `{ propertyId, month, priceCents }` · auth: ownership.
- **`api.comparables.create`** / **`.delete`** · auth: ownership.

### User profile, preferences, notifications

- **`api.userProfiles.update`** · `args: { firstName?, lastName?, jobTitle?, phone?, office?, language?, timezone?, currency?, dashboardView? }` · auth: identity required · trigger: `/profile` Edit, `/settings` selects.
- **`api.userProfiles.changePassword`** · *(handled by Clerk; no Convex mutation)* — flag in `05`.
- **`api.userProfiles.toggleAuthenticatorMfa`** / **`api.userProfiles.toggleSmsMfa`** · *(also Clerk)*.
- **`api.notifications.create`** · `args: { category, title, description, linkTo? }` · auth: server-only (called from other mutations).
- **`api.notifications.markAllRead`** · `args: {}` · auth: identity · trigger: `useNotifications.markAllRead` (replaces `lib/hooks/use-notifications.ts:14–17`). **Name preserved per pattern doc.**
- **`api.notifications.markAsRead`** · `args: { id }` · auth: ownership · trigger: `useNotifications.markAsRead` (replaces `:19–24`). **Name preserved.**
- **`api.notificationPreferences.set`** · `args: { eventType, channel, enabled }` · auth: identity · returns: `NotificationPreference` · trigger: `/settings` 9-toggle matrix. Idempotent upsert.

### Directory, succession

- **`api.professionals.create`** / **`.update`** / **`.delete`** · auth: identity · trigger: `/directory` "Add Professional" (no handler today).
- **`api.professionals.linkToProperty`** · `args: { professionalId, propertyId }`.
- **`api.successors.create`** / **`.update`** / **`.delete`** · auth: identity · trigger: `/estate-planning` "Add Beneficiary" (no handler today).
  Validation: `sum(sharePercent for role="Primary") === 100` (Q3.G).

### Convex actions (third-party I/O)

- **`api.email.sendVerification`** *(action)* — Resend (or Clerk built-in; choose — Q5.G).
- **`api.email.sendNotification`** *(action)* — Resend, only when `notificationPreferences.email = true`.
- **`api.slack.sendNotification`** *(action)* — webhook, only when `notificationPreferences.slack = true`.
- **`api.sms.sendNotification`** *(action)* — Twilio, only when `notificationPreferences.sms = true`.
- **`api.payments.createCheckout`** *(action)* — Stripe; future, no UI yet.
- **`api.documents.parsePdf`** *(action)* — extract metadata from uploaded contracts (PropertyDocumentsPage shows extracted fields like transfer tax, agent fee — Q4.L).

### Total: ~32 mutations + 6 actions

---

## TODO(backend): reconciliation

Every `TODO(backend):` marker maps to:

| Marker | Resolves to |
|---|---|
| `lib/hooks/use-notifications.ts:6` ("Replace useState…") | swap to `useQuery(api.notifications.list)` + two `useMutation`s |
| `lib/hooks/use-notifications.ts:15` (`markAllReadMutation()`) | `api.notifications.markAllRead` |
| `lib/hooks/use-notifications.ts:20` (`markAsReadMutation({ id })`) | `api.notifications.markAsRead` |
| `app/(shell)/portfolio/queries.ts:17` (`totalValueFormatted`) | server-derive in `getPortfolioPageData`, format on client (`formatCurrency`) |
| `app/(shell)/portfolio/queries.ts:18` (`monthlyIncome`) | server-derive — needs definition (Q3.B) |
| `app/(shell)/portfolio/queries.ts:19` (`yoyGrowth`) | server-derive — needs definition (Q3.C) |
| `app/(shell)/portfolio/queries.ts:20` (`newThisMonth`) | server-derive — `_creationTime >= startOfMonth` |
| `app/(shell)/add-property/actions.ts:10` ("mutate Convex/DB, revalidateTag('portfolio'), return real id") | `api.properties.create` + clerk auth + clear localStorage draft |

---

## Appendix — Auth & ownership matrix

> Every read AND write surface gets a row stating who can see/do it. Built from scratch; nothing extractable from existing code (Clerk is wired but every check is commented out — `app/(shell)/add-property/actions.ts:5`).

Roles (proposed):
- **Owner** — `userProfiles.role = "Administrator"` AND/OR `entity.userId === identity.subject`
- **Manager** — extended access, scoped per-property (Q4.M)
- **Viewer** — read-only, scoped per-property
- **CoOwner** — appears on `ownershipRecords.coOwnerProfileIds` (read-only by default)
- **Tenant** — appears on `tenants` (NOT a Clerk-authenticated role today; tenant portal is out of scope)
- **Public** — never (no public reads anywhere)

| Surface | Read | Write | Notes |
|---|---|---|---|
| `/login`, `/register` | Public | Public | Mock today; replace with Clerk. |
| `/` (home) | Owner / Manager / Viewer | — | Filtered to user's `properties`. |
| `/portfolio` | Owner / Manager / Viewer | — | Filtered to user's `properties`. |
| `/add-property` (read drafts) | Owner / Manager | Owner / Manager | Filter `drafts` by `userId`. |
| `/add-property` (submit) | — | Owner / Manager | `properties.create` sets `userId`. |
| `/property/[id]/overview` | Owner / Manager / Viewer / CoOwner | — | **Add ownership check** — currently absent. |
| `/property/[id]/documents` (list) | Owner / Manager / Viewer / CoOwner | — | Same. |
| `/property/[id]/documents` (upload/move/delete/folder) | — | Owner / Manager | Manager scope per-property (Q4.M). |
| `/property/[id]/location` | Owner / Manager / Viewer / CoOwner | — | |
| `/property/[id]/safety` (read) | Owner / Manager / Viewer / CoOwner | — | |
| `/property/[id]/safety` (add cert / risk / contact) | — | Owner / Manager | |
| `/property/[id]/ownership` (read) | Owner / CoOwner | — | Hide from Viewer (Q4.N). |
| `/property/[id]/ownership` (add owner / record) | — | Owner | CoOwner cannot modify. |
| `/property/[id]/rental` (read) | Owner / Manager / Viewer | — | |
| `/property/[id]/rental` (renew/send offer) | — | Owner / Manager | |
| `/property/[id]/valuation` | Owner / Manager / Viewer | — | |
| `/rental` (dashboard) | Owner / Manager | — | |
| `/rental` (create lease, etc.) | — | Owner / Manager | |
| `/analytics` | Owner / Manager | — | |
| `/settings` (read) | self | — | `userProfiles.me`. |
| `/settings` (write profile/prefs/notif) | — | self | Identity-scoped only; no admin override. |
| `/profile` | self | self | Identity-scoped. |
| `/directory` | Owner / Manager | Owner / Manager | Today scoped per-user (Q4.A). |
| `/estate-planning` | Owner | Owner | Sensitive; default Owner only. |
| Notifications panel | self | self | `userId === identity.subject`. |

Pattern for every Convex function:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

// For per-resource mutations, always also:
const resource = await ctx.db.get(args.id);
if (!resource || resource.userId !== identity.subject) {
  throw new Error("Not found");   // never leak existence
}
```
