# Valgate Backend Architecture — Summary for HTML Visualizer

> Self-contained brief of the Valgate property-management SaaS backend design, derived from a frontend audit. Pass this to a fresh Claude session to build an interactive HTML visualizer.

---

## Project at a glance

- **Product**: Valgate — property-management SaaS (portfolio, rentals, documents, estate planning).
- **Stack**: Next.js 15 (App Router) · Convex (backend) · Clerk (auth) · Tailwind + shadcn/ui · Zod · React Hook Form · Resend · Stripe · Upstash Redis · Mapbox.
- **Scale**: 19 frontend routes, 22 backend tables, ~21 queries, ~32 mutations, ~6 third-party I/O actions.
- **Status**: Frontend complete with mock data; Convex not yet installed. This is the wiring blueprint.

---

## Visualizer goals (suggested)

Build a single-page HTML interactive visualizer with these views, switchable via a top tab bar:

1. **Entity Map** — boxes for each entity, lines for relationships, click a box to expand fields.
2. **Route → Backend** — list of 19 routes; click one to highlight the queries/mutations it uses and the entities those touch.
3. **Query / Mutation Catalog** — searchable list of all 21 queries and 32 mutations with their args/returns.
4. **Auth Matrix** — a route × role table with read/write cells coloured by permission.
5. **Data Flow** — animated diagram of cross-page flows (e.g. add-property → portfolio refresh).
6. **Open Questions** — kanban of unresolved decisions, grouped by topic.

Style: light, professional, monochrome with one accent colour. Cards, soft shadows, no gradients. Use `font-feature-settings: "tnum"` for any numeric tables.

---

## 1. Entities (22 Convex tables)

Each entity has `userId: v.string()` (Clerk subject) and `.index("by_user", ["userId"])` for ownership. Money is stored in **cents** (number). Timestamps are Unix ms (number). All `_id` fields are `v.id("<table>")`.

### 1. `properties` — central aggregate
**Key fields**: `name`, `code`, `type` (Land|House|Building), `propertyType` (residential|commercial|multi-unit|retail|land|industrial|construction|other), `province`, `status` (Rented|Vacant), `size`, `buyNumeric`, `title` (Hard|Soft|—), `health` (0–100), `lat`, `lng`, address fields (line/line2/city/stateProv/zip/country), specs (`yearBuilt`, `totalAreaSqm`, `bedrooms`, `bathrooms`, `parkingSpaces`), financial fields all in cents (`purchasePriceCents`, `currentMarketValueCents`, `outstandingMortgageCents`, `monthlyPaymentCents`, `interestRateBps`, `annualPropertyTaxCents`, `taxAssessmentValueCents`, `annualInsuranceCents`), `coverPhotoStorageId`.
**Indexes**: `by_user`, `by_user_and_status`, `by_user_and_province`, `by_user_and_health`, `by_user_and_createdAt`.
**Relationships**: 1→N to documents, folders, tenants, leases, payments, maintenanceItems, inspections, certifications, safetyRisks, emergencyContacts, ownershipRecords, ownershipHistory, propertyValuations, comparables.

### 2. `documents` — files attached to a property
**Fields**: `propertyId`, `folderId?`, `name`, `kind` (photo|document), `mimeType?`, `extension?`, `sizeBytes?`, `storageId` (`v.id("_storage")`), `thumbStorageId?`, `category?`, `uploadedBy?`, `uploadedAt`, `deletedAt?` (soft delete).
**Indexes**: `by_property`, `by_property_and_folder`, `by_property_and_uploadedAt`, `by_user`.

### 3. `folders` — hierarchical document folders
**Fields**: `propertyId`, `parentFolderId?`, `name`.
**Indexes**: `by_property`, `by_property_and_parent`.

### 4. `tenants`
**Fields**: `propertyId`, `name`, `unit`, `email?`, `phone?`.

### 5. `leases`
**Fields**: `propertyId`, `tenantId?`, `unit`, `stage` (Approaching|Offered|Signed|Declined|Active|Ended), `startDate?`, `endDate?`, `monthlyRentCents`, `termMonths`.
**Indexes**: `by_user_and_stage`, `by_user_and_endDate`, `by_property`.

### 6. `payments`
**Fields**: `propertyId`, `leaseId?`, `tenantId?`, `date`, `kind` (Rent|Fee|Deposit|Refund), `amountCents`, `method`, `status` (Paid|Pending|Failed|Overdue).
**Indexes**: `by_property_and_date`, `by_user_and_status`, `by_user_and_date`.

### 7. `maintenanceItems`
**Fields**: `propertyId`, `severity` (Emergency|Urgent|Standard), `title`, `status` (Open|InProgress|Resolved), `costCents?`, `resolvedAt?`.
**Indexes**: `by_user_and_severity`, `by_property_and_status`.

### 8. `inspections`
**Fields**: `propertyId`, `date`, `type`, `inspector`, `status` (Pass|Fail|Pending), `issuesCount`, `notes?`.
**Index**: `by_property_and_date`.

### 9. `certifications`
**Fields**: `propertyId`, `name`, `status` (Active|Expiring|Expired), `issuedAt`, `expiresAt`, `inspector`.
**Index**: `by_property_and_expiresAt`.

### 10. `safetyRisks`
**Fields**: `propertyId`, `severity` (High|Medium|Low), `title`, `description`, `resolved`.
**Index**: `by_property_and_severity`.

### 11. `emergencyContacts`
**Fields**: `propertyId`, `name`, `phone`, `category`, `note?`.

### 12. `ownershipRecords`
**Fields**: `propertyId`, `holdingType`, `currentEstimatedValueCents`, `remainingMortgageCents`, `coOwnerProfileIds: v.array(v.id("userProfiles"))`.

### 13. `ownershipHistory`
**Fields**: `propertyId`, `at`, `text`, `kind` (Acquired|Transferred|Refinanced).
**Index**: `by_property_and_at`.

### 14. `propertyValuations`
**Fields**: `propertyId`, `month` (YYYY-MM), `priceCents`, `recordedAt`.
**Index**: `by_property_and_month`.

### 15. `comparables`
**Fields**: `propertyId`, `address`, `distanceKm`, `soldAt`, `type`, `builtYear`, `beds`, `baths`, `sqft`, `priceCents`, `pricePerSqftCents`.
**Index**: `by_property`.

### 16. `userProfiles`
**Fields**: `firstName`, `lastName`, `fullName`, `initials`, `jobTitle?`, `employeeId?`, `role` (Administrator|Manager|Viewer), `email`, `phone?`, `office?`, `language` (en-US|km|zh), `timezone`, `currency`, `dashboardView` (portfolio-overview|analytics|map), `memberSince`, `lastLoginAt`, `mfa: { authenticatorEnabled, smsEnabled }`.
**Index**: `by_user` (unique).

### 17. `notifications`
**Fields**: `category` (MAINTENANCE|LEASING|COMPLIANCE|PAYMENT|APPLICATIONS), `title`, `description`, `createdAt`, `read`, `linkTo?`.
**Indexes**: `by_user`, `by_user_and_read`, `by_user_and_createdAt`.

### 18. `notificationPreferences`
**Fields**: `eventType` (valuationUpdates|teamComments|marketInsights), `channel` (email|slack|sms), `enabled`.
**Indexes**: `by_user_and_eventType`, `by_user`.

### 19. `drafts`
**Fields**: `kind` ("add-property"), `title`, `step`, `form: v.any()`, `updatedAt`.
**Index**: `by_user_and_kind_and_updatedAt`.
**Note**: today persisted as localStorage; migration to Convex is an open question.

### 20. `professionals`
**Fields**: `name`, `company`, `category`, `rating`, `reviewCount`, `linkedPropertyIds: v.array(v.id("properties"))`, `available`, `avatarBg`, `email?`, `phone?`.
**Indexes**: `by_user_and_category`, `by_user`.

### 21. `successors`
**Fields**: `name`, `relation`, `role` (Primary|Contingent), `sharePercent`, `verified`, `linkedPropertyIds: v.array(v.id("properties"))`.
**Indexes**: `by_user`, `by_user_and_role`.

### 22. `(EstateDocument)` — *folded into `documents`* with `category="estate"`.

---

## 2. Derived view-types (NOT tables — composite query return shapes)

These are computed by Convex queries; visualizer should style them differently (e.g. dashed borders).

- **`PortfolioStats`** = `{ totalProperties, totalValue, rentedCount, vacantCount, avgHealth, attentionCount }`
- **`PortfolioKpis`** = `{ totalValueFormatted, monthlyIncome, yoyGrowth, newThisMonth }` *(definitions still TBD)*
- **`PortfolioPageData`** = `{ properties, stats, kpis }`
- **`HomePageData`** — same shape as portfolio
- **`RentalDashboardData`** = `{ pipelineStages, upcomingEvents, maintenanceItems, arrearsBuckets }`
- **`AnalyticsPageData`** — KPIs + chart series (revenue, lease pipeline, capital growth, maintenance spend, expense breakdown)
- **`EstatePlanningPageData`** = `{ stats, properties, successors, documents, timeline }`
- **`DirectoryPageData`** = `{ professionals, categories, total }`
- **`SettingsPageData`** = `{ profile, preferences }`
- **`ProfilePageData`** = `UserProfile` shape

---

## 3. Routes (19) → backend wiring

Every shell route reads via a Convex query. Mutations are listed where the route triggers them.

### Auth group `(auth)`
| Route | Purpose | Handled by |
|---|---|---|
| `/login` | Sign in | Clerk (no Convex) |
| `/register` | Sign up | Clerk + Resend verification email |

### Shell group `(shell)`
| Route | Composite or fan-out? | Reads (entities) | Mutations triggered |
|---|---|---|---|
| `/` (home) | Composite | properties + portfolioStats + portfolioKpis | none |
| `/portfolio` | Composite | properties + stats + kpis | none |
| `/property/[id]/overview` | Fan-out (per-tab) | property + tenants + alerts + recentActivity + metrics | none |
| `/property/[id]/documents` | Fan-out | property + documents + folders | `documents.create`, `documents.move`, `documents.deleteMany`, `folders.create` |
| `/property/[id]/location` | Fan-out | property | none (map data) |
| `/property/[id]/safety` | Fan-out | property + certifications + inspections + safetyRisks + emergencyContacts | `certifications.create`, `safetyRisks.create`, `safetyRisks.resolve`, `emergencyContacts.upsert` |
| `/property/[id]/ownership` | Fan-out | property + ownershipRecord + ownershipHistory | `ownershipRecords.upsert`, `ownershipHistory.append` |
| `/property/[id]/rental` | Fan-out | property + currentLease + payments + rentSeries | `leases.renew`, `payments.record` |
| `/property/[id]/valuation` | Fan-out | property + valuations + comparables | `propertyValuations.record`, `comparables.create` |
| `/add-property` | List drafts | drafts | `properties.create` (final), `drafts.upsert` (autosave), `drafts.delete` (after submit) |
| `/rental` | Composite | leases + maintenanceItems + payments + rentalEvents (derived) | `leases.create`, `leases.advanceStage`, `maintenanceItems.create` |
| `/analytics` | Composite | aggregations over payments + leases + maintenance + valuations | none |
| `/settings` | Fan-out (profile + prefs) | userProfile + notificationPreferences | `userProfiles.update`, `notificationPreferences.set` |
| `/profile` | Single | userProfile | `userProfiles.update` |
| `/directory` | Composite | professionals + categories | `professionals.create/update/delete`, `professionals.linkToProperty` |
| `/estate-planning` | Composite | properties + successors + documents (estate) + timeline | `successors.create/update/delete` |

---

## 4. Queries (~21)

### Per-route composites (preserve existing names from `app/.../queries.ts`)
1. `getHomePageData()` → `HomePageData`
2. `getPortfolioPageData()` → `PortfolioPageData`
3. `getRentalDashboardData({ window? })` → `RentalDashboardData`
4. `getAnalyticsPageData({ period: MTD|QTD|YTD|12M|{from,to} })` → `AnalyticsPageData`
5. `getSettingsPageData()` → `{ profile, preferences }` *(consider splitting)*
6. `getProfilePageData()` → `UserProfile`
7. `getDirectoryPageData({ category?, search? })` → `DirectoryPageData`
8. `getEstatePlanningPageData()` → `EstatePlanningPageData`
9. `getAddPropertyPageData()` → `{ drafts: PropertyDraftSummary[] }`

### Per-property tab queries (fan-out)
10. `properties.layoutHeader({ propertyId })` — for the layout breadcrumb
11. `properties.overview({ propertyId })`
12. `documents.listByProperty({ propertyId, folderId? })`
13. `folders.tree({ propertyId })`
14. `properties.location({ propertyId })`
15. `properties.safety({ propertyId })`
16. `properties.ownership({ propertyId })`
17. `properties.rental({ propertyId })`
18. `properties.valuation({ propertyId })`

### Cross-cutting
19. `notifications.list()` → `Notification[]`
20. `notifications.unreadCount()` → `number`
21. `notificationPreferences.list()` → `NotificationPreference[]`
22. `userProfiles.me()` → `UserProfile`
23. `drafts.list({ kind: "add-property" })` → `Draft[]` *(only if drafts migrate to Convex)*

---

## 5. Mutations (~32)

### Property lifecycle
- `properties.create(input: fullPropertySchema)` → triggered by `submitPropertyAction`
- `properties.update({ propertyId, patch })`
- `properties.archive({ propertyId })` *(soft delete)*
- `drafts.upsert({ id?, title, step, form })` → `saveDraftAction`
- `drafts.delete({ id })` → `deleteDraftAction`

### Documents
- `documents.generateUploadUrl()` → returns Convex storage upload URL
- `documents.create({ propertyId, folderId?, name, kind, storageId, mimeType?, sizeBytes?, category? })`
- `documents.move({ documentIds, targetFolderId })`
- `documents.deleteMany({ documentIds })`
- `folders.create({ propertyId, parentFolderId?, name })`
- `folders.rename`, `folders.delete` *(future)*

### Tenants & leases
- `tenants.create({ propertyId, name, unit, email?, phone? })`
- `leases.create({ propertyId, tenantId?, unit, monthlyRentCents, termMonths, startDate?, endDate? })`
- `leases.advanceStage({ leaseId, toStage })`
- `leases.renew({ leaseId, newEndDate, monthlyRentCents })`
- `leases.endLease({ leaseId, endedAt })`
- `payments.record({ propertyId, leaseId?, tenantId?, date, kind, amountCents, method, status })`

### Maintenance, inspections, safety, ownership
- `maintenanceItems.create({ propertyId, severity, title, description? })`
- `maintenanceItems.updateStatus({ id, status })`
- `inspections.create({ propertyId, date, type, inspector, status, issuesCount, notes? })`
- `certifications.create({ propertyId, name, issuedAt, expiresAt, inspector })`
- `safetyRisks.create`, `safetyRisks.resolve`
- `emergencyContacts.upsert`
- `ownershipRecords.upsert`
- `ownershipHistory.append`
- `propertyValuations.record({ propertyId, month, priceCents })`
- `comparables.create`, `comparables.delete`

### User profile, preferences, notifications
- `userProfiles.update({ firstName?, lastName?, jobTitle?, phone?, office?, language?, timezone?, currency?, dashboardView? })`
- `notifications.create({ category, title, description, linkTo? })` *(server-only)*
- `notifications.markAllRead()`
- `notifications.markAsRead({ id })`
- `notificationPreferences.set({ eventType, channel, enabled })`

### Directory, succession
- `professionals.create`, `.update`, `.delete`
- `professionals.linkToProperty({ professionalId, propertyId })`
- `successors.create`, `.update`, `.delete` *(validation: Primary shares sum to 100%)*

### Convex actions (third-party I/O)
- `email.sendVerification` *(Resend or Clerk)*
- `email.sendNotification` *(Resend; gated by `notificationPreferences.email`)*
- `slack.sendNotification` *(webhook; gated by `notificationPreferences.slack`)*
- `sms.sendNotification` *(Twilio; gated by `notificationPreferences.sms`)*
- `payments.createCheckout` *(Stripe; future)*
- `documents.parsePdf` *(extract metadata from contracts; AI or regex)*

---

## 6. Cross-page flows (11)

| # | Trigger | Mutation chain | Downstream invalidations |
|---|---|---|---|
| 1 | Add-property final submit | `properties.create` → clear localStorage draft | `/portfolio`, `/`, `/analytics`, `/property/[newId]/*` |
| 2 | Document upload | `documents.generateUploadUrl` → POST file → `documents.create` | `/property/[id]/documents`, `/property/[id]/overview` (activity), optional `notifications.create` |
| 3 | Folder create / move / delete | `folders.create` / `documents.move` / `documents.deleteMany` | documents tab + folder tree |
| 4 | Notifications mark-read | `notifications.markAllRead` / `markAsRead` | header badge updates live (Convex reactivity) |
| 5 | Settings notification toggle | `notificationPreferences.set` | settings page; future dispatchers consult prefs |
| 6 | Settings preference change | `userProfiles.update` | language re-renders i18n; timezone affects date formats |
| 7 | Profile edit | `userProfiles.update` | header avatar, `/profile` |
| 8 | Login | Clerk sign-in | redirect to `userProfile.dashboardView` or `/` |
| 9 | Register | Clerk + Resend verification | success card with resend countdown |
| 10 | Property selection | navigation only | `/property/[id]/overview` |
| 11 | Lease lifecycle | `leases.advanceStage` / `renew` / `endLease` | `/rental` pipelines, `/property/[id]/rental` |

---

## 7. Auth & ownership matrix

Roles: **Owner** (`userProfile.role = Administrator`), **Manager**, **Viewer**, **CoOwner** (in `ownershipRecord.coOwnerProfileIds`), **Tenant** *(out of scope v1)*, **Public** (never).

| Surface | Read | Write |
|---|---|---|
| `/login`, `/register` | Public | Public |
| `/` (home), `/portfolio` | Owner / Manager / Viewer | — |
| `/add-property` (drafts) | Owner / Manager | Owner / Manager |
| `/add-property` (submit) | — | Owner / Manager |
| `/property/[id]/overview` | Owner / Manager / Viewer / CoOwner | — |
| `/property/[id]/documents` | Owner / Manager / Viewer / CoOwner | Owner / Manager |
| `/property/[id]/location` | Owner / Manager / Viewer / CoOwner | — |
| `/property/[id]/safety` | Owner / Manager / Viewer / CoOwner | Owner / Manager |
| `/property/[id]/ownership` | Owner / CoOwner *(hide from Viewer)* | Owner |
| `/property/[id]/rental` | Owner / Manager / Viewer | Owner / Manager |
| `/property/[id]/valuation` | Owner / Manager / Viewer | — |
| `/rental` | Owner / Manager | Owner / Manager |
| `/analytics` | Owner / Manager | — |
| `/settings`, `/profile` | self | self |
| `/directory` | Owner / Manager | Owner / Manager |
| `/estate-planning` | Owner | Owner |
| Notifications panel | self | self |

**Pattern**: every mutation calls `ctx.auth.getUserIdentity()` then verifies `resource.userId === identity.subject`.

---

## 8. Derivations (where computed values live)

### Server-derived (computed inside Convex queries)
- All `PortfolioStats` (totalProperties, totalValue, rentedCount, vacantCount, avgHealth, attentionCount).
- All `PortfolioKpis` (definitions still TBD — see open questions).
- `RentalDashboardData.pipelineStages` (group leases by stage).
- `RentalDashboardData.upcomingEvents` (UNION over leases endDate, maintenance due, payments overdue, inspections).
- `RentalDashboardData.arrearsBuckets` (group overdue payments by ageing).
- `AnalyticsPageData.kpiCards` (sum payments by status × month).
- `AnalyticsPageData.revenueData[]` (bucket payments by month).
- `AnalyticsPageData.leasePipeline` (bucket leases by months-until-end).
- `AnalyticsPageData.capitalGrowth` (rank by `(current − purchase) / purchase`).
- `AnalyticsPageData.expenseBreakdown` (group by category).
- Property compliance % (active certs / total cert types).
- Successor share validation (sum Primary shares === 100).

### Materialized (stored on entity rows)
- `Property.coverPhotoStorageId`.
- `OwnershipRecord.currentEstimatedValueCents`, `remainingMortgageCents`.

### Client-side (stay in components)
- All CSS class lookups in `lib/property-helpers.ts` (badge colors by status/health/title).
- All formatters in `lib/format.ts` (`formatCurrency`, `formatRelativeTime`).
- Equity %, ROI, cap rate, cash-on-cash *(simple math on read; one multiply is cheap)*.
- Days until cert expires (`expiresAt - now`).
- Derived `fullName`, `initials`.
- Map static-image URL templating in Step5Review.
- All animation state, view-mode, filter-state, search-query.

---

## 9. Open questions (top 5 blockers — visualize as "🚧 must resolve" cards)

1. **Drafts: client-only or migrate to Convex** — affects whether `saveDraftAction` / `deleteDraftAction` get wired.
2. **Multi-user scope for v1** — single-user-only is simplest; CoOwner/Successor links suggest sharing but no invite flow exists. Decision affects every `userId` index and the ownership matrix.
3. **PortfolioKpis definitions** (4 hardcoded values today):
   - `totalValueFormatted` — sum of `buyNumeric` (purchase) or `currentMarketValue` (market)?
   - `monthlyIncome` — expected (sum of active leases) or received (sum of paid payments)?
   - `yoyGrowth` — value delta over 12 months, including new properties?
   - `newThisMonth` — `count(properties WHERE createdAt >= startOfMonth)`.
4. **Schema tightness** — add-property Zod is all `string().optional()` (including financial fields). Tighten to numbers/dates/cents now or convert at the Convex boundary?
5. **Notification triggers** — mutation side-effects, Convex cron, or both? Affects every entity that creates notifications (lease expiring, cert expiring, payment overdue, document uploaded).

---

## 10. Schema constants (for visualizer enums / dropdowns)

- **Property.type**: `Land`, `House`, `Building`
- **Property.propertyType**: `residential`, `commercial`, `multi-unit`, `retail`, `land`, `industrial`, `construction`, `other`
- **Property.status**: `Rented`, `Vacant`
- **Property.title**: `Hard title`, `Soft title`, `—`
- **Lease.stage**: `Approaching`, `Offered`, `Signed`, `Declined`, `Active`, `Ended`
- **Payment.kind**: `Rent`, `Fee`, `Deposit`, `Refund`
- **Payment.status**: `Paid`, `Pending`, `Failed`, `Overdue`
- **MaintenanceItem.severity**: `Emergency`, `Urgent`, `Standard`
- **MaintenanceItem.status**: `Open`, `InProgress`, `Resolved`
- **Inspection.status**: `Pass`, `Fail`, `Pending`
- **Certification.status**: `Active`, `Expiring`, `Expired`
- **SafetyRisk.severity**: `High`, `Medium`, `Low`
- **OwnershipHistory.kind**: `Acquired`, `Transferred`, `Refinanced`
- **Notification.category**: `MAINTENANCE`, `LEASING`, `COMPLIANCE`, `PAYMENT`, `APPLICATIONS`
- **NotificationPreference.eventType**: `valuationUpdates`, `teamComments`, `marketInsights`
- **NotificationPreference.channel**: `email`, `slack`, `sms`
- **UserProfile.role**: `Administrator`, `Manager`, `Viewer`
- **UserProfile.language**: `en-US`, `km`, `zh`
- **UserProfile.dashboardView**: `portfolio-overview`, `analytics`, `map`
- **Successor.role**: `Primary`, `Contingent`

---

## 11. Relationship summary (for the entity-relationship diagram)

```
userProfiles (1) ─── (N) properties
                       ├── (N) documents ──┐
                       ├── (N) folders ────┘ (folder hierarchy via parentFolderId)
                       ├── (N) tenants ─── (N) leases ─── (N) payments
                       ├── (N) maintenanceItems
                       ├── (N) inspections
                       ├── (N) certifications
                       ├── (N) safetyRisks
                       ├── (N) emergencyContacts
                       ├── (1) ownershipRecord ─ (N) coOwnerProfileIds → userProfiles
                       ├── (N) ownershipHistory
                       ├── (N) propertyValuations
                       └── (N) comparables

userProfiles (1) ─── (N) notifications
userProfiles (1) ─── (N) notificationPreferences
userProfiles (1) ─── (N) drafts
userProfiles (1) ─── (N) professionals ─── (N) linkedPropertyIds → properties
userProfiles (1) ─── (N) successors ───── (N) linkedPropertyIds → properties
```

---

## 12. Suggested visualizer technical approach

Single-file `index.html` with:
- **No build step** — vanilla HTML/CSS/JS or one CDN-hosted library (e.g. `https://cdn.jsdelivr.net/npm/d3@7` for the entity-relationship diagram).
- **Inline JSON data** — encode this entire summary as JS objects (`const ENTITIES = [...]`, `const ROUTES = [...]`, `const QUERIES = [...]`, etc.) so there's no fetching.
- **Tabs** for the six views above.
- **Search** input that filters the current tab.
- **Click-to-detail** — click an entity/route/query to open a side panel with full detail.
- **Keyboard**: `/` to focus search, arrow keys to navigate.

Aim for ~600 LOC in the HTML file. Avoid frameworks unless asked.
