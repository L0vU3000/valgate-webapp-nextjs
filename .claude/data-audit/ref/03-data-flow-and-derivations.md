# 03 — Data Flow and Derivations

> Section A: cross-page flows (trigger → mutation → invalidations).
> Section B: every derived/aggregate value gets an assigned home (server query, materialized field, or client-side).

---

## A. Cross-page flows

### A1. Add Property wizard → Portfolio refresh
- **Trigger**: `Step6Success` mount after `submitPropertyAction` resolves with `{ ok: true, propertyId }`.
- **Today**: `actions.ts:11` returns `PR${Date.now()}` placeholder; no DB.
- **After Convex**: `submitPropertyAction(input)` calls `api.properties.create(input)`. On success: clear `localStorage:valgate:add-property:drafts:v1` (via `useDrafts.remove(draftId)`), revalidate any portfolio-data caches.
- **Downstream invalidations**:
  - `/portfolio` — `getPortfolioPageData()` (re-query property list, stats, kpis)
  - `/` (home) — `getHomePageData()` (same)
  - `/analytics` — KPI cards reflect property count change
  - `/property/[id]/*` — newly addressable for the new id

### A2. Document upload (Step 4 + per-property tab)
- **Trigger**: file picker submit / drag-drop in `/property/[id]/documents` upload modal, or `Step4PhotosDocs` photo/document field.
- **Today**: filenames stored in form state; `File` blobs filtered out before localStorage. No persist.
- **After Convex**: client gets storage URL via `generateUploadUrl()` action → POSTs file → calls `api.documents.create({ propertyId, name, kind, storageId, ... })`.
- **Downstream invalidations**:
  - `/property/[id]/documents` — refetch `api.documents.listByProperty({ propertyId })`
  - `/property/[id]/overview` — Activity log entry "Document uploaded"
  - Notification side-effect (optional): `api.notifications.create({ category: "COMPLIANCE" or similar })` — Q4.F.

### A3. Folder create / move / delete
- **Trigger**: New-folder modal submit; multi-select Move modal submit; bulk delete from action bar.
- **Today**: all UI-only. No persist.
- **After Convex**: `api.folders.create`, `api.documents.move`, `api.documents.deleteMany`.
- **Downstream**: refetch `documents.listByProperty` and `folders.tree` (or whichever shape we settle on).

### A4. Notifications mark-read flow
- **Trigger**: Click "Mark all read" button in `<NotificationsPanel />`; click individual notification row.
- **Today**: `useNotifications` mutates client-only state (`lib/hooks/use-notifications.ts:14–24`).
- **After Convex**: replace with `useMutation(api.notifications.markAllRead)` and `useMutation(api.notifications.markAsRead)` exactly per the reference pattern in `docs/mock-to-backend-pattern.md:113–133`. The `useQuery(api.notifications.list)` reactivity makes invalidation automatic.

### A5. Settings notification-preference toggle
- **Trigger**: any of the 9 Email/Slack/SMS toggles in `/settings`.
- **Today**: state only; flashes a row for 350ms then nothing.
- **After Convex**: `api.notificationPreferences.set({ eventType, channel, enabled })`. Mutation is reactive — same panel updates instantly via `api.notificationPreferences.list`.
- **Side effects**: future notification dispatchers consult these preferences before pushing to email/Slack/SMS (Resend, Slack webhook, Twilio — none wired yet).

### A6. Settings preference change (dashboardView, language, timezone)
- **Trigger**: select change in `/settings`.
- **After Convex**: `api.userProfiles.updatePreferences({ dashboardView?, language?, timezone? })`.
- **Downstream**: language change re-renders i18n (not yet wired); timezone change affects every formatted date across the app; `dashboardView` controls landing route after `/login`.

### A7. Profile edit
- **Trigger**: "Edit profile" button (no handler today — Q4.A).
- **After Convex**: `api.userProfiles.update({ firstName?, lastName?, jobTitle?, phone?, office? })`.
- **Downstream**: `<AppHeader />` avatar and `/profile` re-render; no other screen depends on the user record beyond Clerk identity.

### A8. Login → home redirect
- **Trigger**: `/login` form submit (today: 800ms `setTimeout`, mock).
- **After Clerk**: replace with Clerk's `useSignIn` flow; on success route to `userProfiles.dashboardView` (or `/` fallback).

### A9. Register → email verification
- **Trigger**: `/register` form submit (today: 800ms timeout, renders local success card with "Resend 0:45" countdown — RegisterPage.tsx:259).
- **After Clerk + Resend**: Clerk handles verification email; resend countdown is real (Clerk's `prepareEmailAddressVerification`).

### A10. Property selection drives detail-page navigation (read-only)
- `/portfolio` PropertyTable row click → `/property/[id]/overview`.
- `/` (home) map pin click → state highlight (no navigation today; could route to detail — Q4.G).
- `/estate-planning` PropertyCard click → updates right-panel state only (no route change).

### A11. Lease lifecycle (future flow — implied by UI, not yet implemented)
- Approaching → Offered (button in `/rental` quick actions — no handler).
- Offered → Signed (CTA on detail rental tab "Send Renewal Offer" — no handler).
- Endpoint mutations needed: `api.leases.advanceStage`, `api.leases.renew`, `api.leases.endLease`.

---

## B. Derivations — assigned homes

Each derived/aggregate value below gets one of three homes:
- **Server (Convex query)**: computed inside the query function, returned as part of the page-data shape.
- **Materialized field**: stored on the entity row, updated by mutations, read directly.
- **Client-side**: derived in the component (kept where it is today).

### B1. PortfolioStats
| Value | Today | Home | Why |
|---|---|---|---|
| `totalProperties` | `properties.length` (queries.ts:39) | **Server** | Trivial; one number, fits in composite query. |
| `totalValue` | sum of `buyNumeric` (queries.ts:31) | **Server** | Avoids shipping all rows just to sum on client. |
| `rentedCount` / `vacantCount` | `filter(p.statusVariant)` (queries.ts:41–44) | **Server** | Same — sum on server. |
| `avgHealth` | average of `health` (queries.ts:32–34) | **Server** | Same. |
| `attentionCount` | `filter(p.health < 30)` (queries.ts:46) | **Server** | Same; if the dataset grows, add an index `by_user_and_health_lt`. |

### B2. PortfolioKpis (currently HARDCODED — `TODO(backend):` × 4)
Each one needs a real definition before the query can be implemented. Logged in `05` Q3.

| Value | Today | Home (proposed) | Definition still needed? |
|---|---|---|---|
| `totalValueFormatted` | `"$42.8M"` (HARDCODED) | **Server** + **client format** | Convex returns `totalValueCents: number`; client formats via `formatCurrency`. |
| `monthlyIncome` | `"$312,450"` (HARDCODED) | **Server** | Sum of active-lease monthly rent for current month. **Q3.B** for definition. |
| `yoyGrowth` | `"4.2%"` (HARDCODED) | **Server** | Compare today's total `currentMarketValue` (or `buyNumeric`?) vs. 12 months ago. **Q3.C**. |
| `newThisMonth` | `2` (HARDCODED) | **Server** | Count `properties` where `createdAt >= startOfMonth(now)`. Trivial after Convex. |

### B3. RentalDashboardData
| Value | Home | Notes |
|---|---|---|
| `pipelineStages` (counts + recent leases per stage) | **Server query** over `leases` grouped by `stage` | Needs `by_user_and_stage` index. |
| `upcomingEvents[]` | **Server query** UNION across `leases` (endDate within window), `maintenanceItems` (next due), `payments` (overdue) | Pure derivation. |
| `maintenanceItems` (counts by severity) | **Server** | Group `maintenanceItems` where `status = "Open"` by severity. |
| `arrearsBuckets` (0–30d / 31–60d / 61–90d) | **Server** | Group `payments` where `status = "Overdue"` by `now - dueDate` age. Q3.E for ageing rules. |

### B4. AnalyticsPageData
All hardcoded today. Real derivations:

| Value | Home | Source entities |
|---|---|---|
| `kpiCards.totalRevenue` | **Server** | sum of `payments.amount` where `kind="Rent"` and `status="Paid"`, in window. |
| `kpiCards.NOI` | **Server** | revenue − expenses (need `expenses` table — Q4.H). |
| `kpiCards.occupancy` | **Server** | rentedCount / totalProperties × 100. |
| `kpiCards.rentCollection` | **Server** | paid amount / billed amount in window. |
| `kpiCards.maintenanceSpend` | **Server** | sum `maintenanceItem.cost` (need `cost` field — Q4.H). |
| `revenueData[]` (9 months) | **Server** | bucket `payments` by month. |
| `leasePipeline` (3 ranges) | **Server** | bucket `leases` by months-until-end. |
| `capitalGrowth[]` | **Server** | rank `properties` by ((current − purchase) / purchase). |
| `maintenanceSpend[]` (6 months) | **Server** | bucket maintenance items by month. |
| `expenseBreakdown[]` (pie) | **Server** | group `expenses` by category. |
| `savedReports[]` | **Server** | new entity `Report` (out of scope today — Q4.I). |
| Sparkline (occupancy) | **Server** | snapshot occupancy daily (cron — Q4.J). |

### B5. Property-detail derivations
| Value | Home | Notes |
|---|---|---|
| Equity % (PropertyOwnershipPage:121–125) | **Materialized** on `OwnershipRecord` | `(currentEstimatedValue − remainingMortgage) / currentEstimatedValue`. Stored to avoid recomputation. |
| Days until certification expires ("18 days", PropertySafetyPage:130–167) | **Client-side** | One subtraction; never stale per-render. |
| Compliance % (78.6%) | **Server** | (`active certs` / `total cert types`). Stored on `OwnershipRecord` or computed per-render. |
| Investment ROI / Cap rate / Cash-on-Cash (PropertyValuationPage) | **Materialized** | Periodic recalculation; stored on `propertyValuations` row. |
| Value-history chart points | **Server** | Read `propertyValuations` rows ordered by `recordedAt`. |
| Comparable price/sqft | **Server** | Stored on `comparables` sub-table. |

### B6. Notification-feed derivations
| Value | Home | Notes |
|---|---|---|
| "Time ago" ("2m ago", "Yesterday") | **Client-side** | Uses `formatRelativeTime(createdAt)` from `lib/format.ts`. Per pattern doc — keep. |
| Unread count (badge in header) | **Server** | `api.notifications.unreadCount` query. |
| Category icon/color | **Client-side** | Mapping in component. |

### B7. UI presentation derivations — **stay client-side**
The following are **not data**; they're CSS class lookups. They must NOT migrate to Convex:

- `lib/property-helpers.ts` → `TYPE_ICON`, `TYPE_COLOR`, `typeBadgeClasses`, `statusBadgeClasses`, `titleBadgeClasses`, `healthDotColor`, `healthClass`, `healthBgClass`.
- `lib/format.ts` → `formatCurrency`, `formatCurrencyFull`, `formatRelativeTime`.
- All `staggerStyle()` animation helpers.
- All `useCountUp()` animation hooks.
- `STRENGTH_COLORS` array (RegisterPage.tsx:29).

### B8. Form-state derivations (add-property)
| Value | Home | Notes |
|---|---|---|
| Map static-image URL (Step5Review.tsx:59) | **Client** | Pure URL templating from `form.mapCenter`. |
| Property-type icon + gradient (Step5Review:146) | **Client** | Pure lookup. |
| Currency-formatted display in Step3/Step5 | **Client** | `lib/format.ts`. |
| Initials from `fullName` | **Client** (split + map first letters) | Avoid storing — derive. (Q5.F) |

### B9. Estate-planning derivations
| Value | Home | Notes |
|---|---|---|
| Total `Plan Completion` % | **Server** | mean across `EstateProperty.completion` values. |
| Successor share total = 100% guard | **Server (validation)** | mutation rejects if sum ≠ 100. |
| "Verified across 32 properties in Cambodia" caption | **Server** | count `properties` where some criterion. (Q3.F) |
| Verified count of beneficiaries | **Server** | count `successors` where `verified = true`. |

---

## C. Decision summary — composite vs. fan-out queries

The frontend bundles many entities into single page-data shapes. Each route requires a recurring decision: **one composite Convex query** or **N small reactive queries composed in the page**. Recommendation per route:

| Route | Composite or fan-out? | Reason |
|---|---|---|
| `/portfolio` | **Composite** (`getPortfolioPageData`) | Stats need a sum over properties; bundling avoids waterfall. |
| `/` (home) | **Composite** | Same data as portfolio + recent activity. |
| `/rental` | **Composite** | Pipelines, arrears, maintenance, events all aggregate; one query keeps the dashboard atomic. |
| `/analytics` | **Composite** | Heavy aggregation; one query with `args: { period }`. |
| `/settings` | **Fan-out** (preferences + notification matrix) | Two distinct mutations; reactivity is cleaner per resource. |
| `/profile` | **Single query** | Just `userProfiles.me`. |
| `/directory` | **Composite** | List + facet counts. |
| `/estate-planning` | **Composite** | Multiple sub-tables, one screen. |
| `/property/[id]/*` | **Fan-out per tab** | Seven tabs; each tab gets its own query (`overview`, `documents`, `safety`, etc.). Layout fetches the property header. |

Document this decision per route in `04` (b).
