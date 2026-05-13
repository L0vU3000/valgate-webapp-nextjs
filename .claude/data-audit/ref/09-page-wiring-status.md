---
title: Page Wiring Status — current state
maintained: yes
last_updated: 2026-05-07
sources: code (queries.ts + components) cross-checked against pages/<slug>/plan.md Fix Logs
---

# Page Wiring Status

> Current per-page wiring state, recomputed from the running code (`queries.ts` + components) on 2026-05-07. Supersedes the original `pages/<slug>/audit.md` Surface Inventory counts, which captured pre-wiring state (2026-05-04 → 2026-05-05).

**Companion files:**
- `ref/07-entity-fields.md` — every entity, every field
- `ref/08-backend-migration-readiness.md` — Convex migration plan
- `pages/SUMMARY.md` — historical cross-page rollup
- `pages/INDEX.md` — master cross-page entity backlog

---

## TL;DR

- **16 routes audited** — 11 ✅ fully wired · 3 🟡 partial · 1 ⏸️ deferred (Safety, per user) · 1 🔴 input-form with bugs (`/add-property`, Phase 9)
- **Pre-wiring HARDCODED count:** ~108 surfaces. **Post-wiring HARDCODED:** ~28 surfaces (74% wired).
- **Remaining HARDCODED clusters** are concentrated in 3 places:
  - `/rental` heatmap LeaseTable yield ranking (PF4 — gated on PropertyComparable)
  - `/property/[id]/valuation` MarketSnapshot + PropertyComparable cards (12 rows — Q4.Q resolved to internal aggregation, not yet built)
  - `/property/[id]/location` PropertyComparable section (rows 19–23, 27)
- **No new entities required to clear remaining HARDCODED surfaces** beyond PropertyComparable (Phase 6.9). Sparkline data (Q4.J — point-in-time only) and Safety KPI derivation (deferred) are the only other live HARDCODED clusters.

---

## Status table

| # | Route | WIRED | HARDCODED | PARTIAL | Verdict | Latest phase |
|---|---|---|---|---|---|---|
| 1 | `/portfolio` | 16 | 0 | 0 | ✅ Fully wired | 6.0 + YoY Rev 2 |
| 2 | `/property/[id]/overview` | 16 | 0 | 0 | ✅ Fully wired | 6.1 + 6.2 + 6.8 + 8.8 |
| 3 | `/property/[id]/safety` | 16 | 9 | 3 | ⏸️ **DEFERRED** (per user) | — |
| 4 | `/property/[id]/ownership` | 37 | 0 | 0 | ✅ Fully wired | 6.5 + 6.6 + 8.7 |
| 5 | `/property/[id]/valuation` | 10 | 12 | 0 | 🟡 Partial (MarketSnapshot + PropertyComparable cards still mocked) | 6.0 valuation Rev 2 |
| 6 | `/property/[id]/rental` | 32 | 0 | 0 | ✅ Fully wired | 6.1 + 6.2 + 6.3 + 6.7 + 6.8 |
| 7 | `/property/[id]/location` | 15 | 7 | 0 | 🟡 Partial (PropertyComparable section + map placeholder) | 6.4 |
| 8 | `/property/[id]/documents` | 16 | 1 | 0 | ✅ Fully wired (upload demo deliberately stubbed) | 6.3 + 6.7 |
| 9 | `/analytics` | 28 | 2 | 1 | ✅ Fully wired (2 minor: change-badge "—", "MARCH 2024" timeline label) | 8.1 |
| 10 | `/rental` | ~58 | ~16 | 1 | 🟡 Partial (LeaseTable yield ranking + sparkline) | 8.2 + 6.8b |
| 11 | `/directory` | 99 | 0 | 0 | ✅ Fully wired | 8.4 |
| 12 | `/directory/[id]` | 11 | 0 | 0 | ✅ Fully wired | 8.4b |
| 13 | `/estate-planning` | 18 | 0 | 2 | ✅ Fully wired (2 PARTIAL: action stubs) | 8.5 |
| 14 | `/profile` | 14 | 0 | 0 | ✅ Fully wired | 8.6 |
| 15 | `/settings` | 16 | 3 | 0 | ✅ Fully wired (NOTIFICATION_ROWS labels are CHROME config) | 8.7 |
| 16 | `/add-property` | 14¹ | 13² | 4 | 🟢 **Input form** (taxonomy adapted: ¹COLLECTED, ²DEFERRED-BY-DESIGN) — Phase 9 Rev 3: 6 of 11 PFn resolved (P0 bugs, schema, status, drafts); 5 open (architectural + cross-route work) | 9 |

¹/² **Note on row 16**: `/add-property` is the only input-capture route audited so far. The "WIRED" column shows COLLECTED fields (user inputs that reach a destination); the "HARDCODED" column lumps 14 DEFERRED-BY-DESIGN fields (transformed in `actions.ts` but never collected in UI) with 2 BROKEN surfaces (Step 4 file inputs without `onChange`). See `pages/add-property/audit.md` for the full taxonomy.

**Legend:** ✅ Fully wired (zero or only-CHROME HARDCODED) · 🟡 Partial (live HARDCODED that block UI work) · ⏸️ Deferred (work explicitly paused).

---

## Per-page detail

### 1. `/portfolio` — ✅ Fully wired

**Entities consumed (`app/(shell)/portfolio/queries.ts`):** Property, Payment, Lease, PropertyValuation
**Derivations:** `computeStats`, `computeKpis` (includes `computeYoyGrowth` via valuations)
**What's wired:** all 5 KPI tiles (totalValue, monthlyIncome, occupancy, attentionCount, YoY badge), the property table (16 surfaces), filtered/total count.
**Remaining HARDCODED:** none.
**Notes:** YoY badge wired in Rev 2; `computeYoyGrowth` uses closest-prior heuristic (Q3.C resolution). Time-gate refinement filed as F1 in `portfolio--yoy-growth.md`.

### 2. `/property/[id]/overview` — ✅ Fully wired

**Entities consumed:** PropertyValuation, Lease, Tenant, Payment, Expense, Notification, MaintenanceItem
**What's wired:** valuation KPI, monthly income, NOI/expenses/gross income (YTD), tenant mix donut, active leaseholders, lease-expiring alerts, notification alerts strip (post-8.8 — propertyId-first matching).
**Remaining HARDCODED:** none.
**Notes:** Activity feed (row 15) was deferred as derivation-only (no RentalEvent entity). Notifications use both stored entity (post-8.8) and derived lease-expiring alerts.

### 3. `/property/[id]/safety` — ⏸️ DEFERRED (per user)

**Entities consumed:** Inspection, Certification, SafetyRisk, EmergencyContact (all 4 fetched via `getSafetyPageData`)
**Status snapshot:** all 4 entity arrays are received as props but `PropertySafetyPage` does not compute KPIs from them. The 9 HARDCODED rows are KPI cards (78.6%, "5 of 6 current", "Compliant", "18 days", "Fire safety · Apr 29, 2026", "2", "1 medium · 1 low") — every input data point exists; only the derivation helper `computeSafetyKpis` is missing.
**Schema gaps tracked but not addressed:**
- Schema gap A — `SafetyRisk.resolved` field missing (currently `risks.length` collapses)
- Schema gap B — `Inspection.date` is a display string, not a timestamp (countdown arithmetic fragile)
- Schema gap C — `Certification.status`, `Inspection.status`, `SafetyRisk.severityLabel` are open strings; need typed unions
**Phase 8.6 plan written but not executed.** Q3.J + Q5.Q resolved 2026-05-07; A/B/C remain.

### 4. `/property/[id]/ownership` — ✅ Fully wired

**Entities consumed:** OwnershipDocument, OwnershipHistory, CoOwner, OwnershipRecord, Lease (for monthly rent income derivation)
**What's wired:** all KPI cards (holding type, total owners, acquisition price, holding period), Equity panel (current value, appreciation, mortgage, equity bar, LTV, monthly P/I, mortgage terms, next payment due), CoOwner split donut + legend + 2 owner cards, acquisition details (10 fields), distribution method, rent split + expense responsibility, history timeline, document status badge.
**Remaining HARDCODED:** none.
**Notes:** Phase 8.7 completed: `OwnershipDocument.status` field added (`Current|Superseded|Archived`), Property financial promotions wired via `buildPropertyFinancials()` (acquisitionPrice, holdingPeriod, currentMarketValue, appreciationPct, outstandingMortgage, equityAmount, equityPct, ltv, monthlyPayment), `listByProperty` added to 4 DB modules (PF3). Phase 6.6 added OwnershipRecord §21 + renamed deed entity to `OwnershipDocument` (PF5).

### 5. `/property/[id]/valuation` — 🟡 Partial

**Entities consumed:** PropertyValuation (filtered)
**What's wired (Rev 2 — 2026-05-05):** Current Market Value KPI, QoQ change, Total Appreciation, appreciation gain sub, Value History chart (with empty-state guard + Y-axis derivation), comparables footer "your estimate".
**Remaining HARDCODED:**
- Rows 18–23 — Market Insight card (location label, market trend, +12% above list, days on market, inventory, buyer demand) — all 6 need MarketSnapshot
- Rows 24–25 — Comparable Sales table (4 rows + footer derivations) — needs PropertyComparable
- Row 27 — Investment Performance metrics (Cash-on-Cash, Cap Rate, Total ROI, Equity) — derivation pending; needs PropertyValuation + Payment
- Row 29 — Value Drivers — deferred, lowest priority
- Row 31 — Professional Appraisal details — service-model decision (may not need an entity)
**Q-blocker:** Q4.Q resolved (internal aggregation, no external API), but Phase 6.9 (PropertyComparable build) not yet executed.

### 6. `/property/[id]/rental` — ✅ Fully wired

**Entities consumed:** Lease, Tenant, Payment, Expense, Document, Folder, MaintenanceItem (all filtered)
**What's wired:** subtitle (rent/status/expiry), unit occupancy, Monthly Rent KPI, Occupancy KPI, YTD Net Income, Balance Due, Financial Overview chart (6 months), period label, Total Rent / Expenses / Net Income subtotals, Lease Summary (5 fields + duration badge + tenant name), expiry countdown, Tenant Profile (avatar, name, email, phone, moved-in date), on-time payments %, Maintenance card (open count + 2 items), Documents card (3 items via `Document` + status derivation), Payment History (sorted + paged) + pagination.
**Remaining HARDCODED:** none (rows 6–7 unit address/specs deferred — Q4.T).
**Notes:** Phases 6.1–6.8 all landed. Schema gaps F2/F3 (Lease.deposit, Lease.autoPay) tracked but not blocking.

### 7. `/property/[id]/location` — 🟡 Partial

**Entities consumed:** LandParcel (filtered)
**What's wired (Phase 6.4):** Total Land Size, Width/Length, Current Zoning, A-2 Classification, development potential, Elevation Range, Slope/Terrain (rows 12–18); ExpandedView stats bar (row 24); Zoning tab (25); Measurements tab (26); DefaultView stats bar (row 30).
**Remaining HARDCODED:**
- Row 9 — Map area placeholder (needs map library; `lat`/`lng` are on Property already)
- Rows 19–23 — Comparable corner coordinates + sales table (PropertyComparable not yet built)
- Row 27 — ExpandedView Investment tab (PropertyComparable)
- PF5 — absent address card (`property.addressLine`/`city`/`zip`/`country` exist but no UI surface)
- PF6 — DefaultView still shows "SR00015 Land" / "Siem Reap, Cambodia" hardcoded (thread-`property`-prop bug fix; trivial)

### 8. `/property/[id]/documents` — ✅ Fully wired

**Entities consumed:** Document, Folder
**What's wired (Phases 6.3 + 6.7):** file count subtitle (row 5), file names, file type icons + colors (`getFileIconStyle`), folder labels (FK `folderId → folderMap`), file sizes (`formatBytes`), file dates (`uploadedAt`), section file count, folder tile grid (row 7, derived from `parentFolderId === null`), Add Folder + Move To location trees (built via `buildFolderTree` recursion), file detail sidebar folders.
**Remaining HARDCODED:** Row 22 — upload demo file list — deliberate UX placeholder (real upload flow is a future phase).
**Notes:** Q5.R (`Document.category` open string) tracked but not blocking; Q5.C (storage ID format) deferred to backend phase. Image thumbnails are `null` placeholders pending storage migration.

### 9. `/analytics` — ✅ Fully wired

**Entities consumed:** Property, Payment, Lease, MaintenanceItem, PropertyValuation, Expense
**Derivations:** `computeRevenueSeries`, `computeKpiCards`, `computeLeasePipeline`, `computeCapitalGrowth`, `computeMaintenanceSpend`, `computeExpenseBreakdown`, `periodToWindow`
**What's wired (Phase 8.1):** revenue series + expense series (PF2 fix — was `* 0`), 5 KPI cards (NOI now `totalRevenue − windowExpenses` — PF3 fix), Occupancy card (point-in-time, sparkline removed — PF4 fix), Lease Pipeline 4 stages, Capital Growth ranking, Maintenance Spend bars, Expense Breakdown donut (6 categories from real Expense entity — PF5 fix), donut center total, period filter (`searchParams.period` → `getAnalyticsPageData(period)` — PF1 fix), saved-reports empty state (PF6 fix).
**Remaining HARDCODED:** Row 18 (KPI change badges showing "—" — no prior-period query) and row 25 (timeline label "MARCH 2024"). Both P3 nits.

### 10. `/rental` — 🟡 Partial

**Entities consumed:** Lease, Payment, MaintenanceItem, Property, Expense
**Derivations:** `computePipeline`, `computeArrears`, `computeMaintenanceSummary`, `computeMaintenanceTotal` (Phase 6.8b — new), `computeUpcomingEvents`, `computeRecoveryRate`, `computeEvictionRisk`, `computeVacancyCost`, `computeTopSpendCategory`, `computeHeatmapData`, `computeOccupancyRate`, `computeMonthlyGrossIncome`, `computeCollectionRate`
**What's wired (Phase 8.2 + 6.8b):** Hero gross income + trend, all 4 KPI cards (Occupancy, Vacancy Cost, Collection, Maintenance — total now sums `MaintenanceItem.cost`), heatmap 33 tiles (Q4.T resolved as suburb grouping — no Unit entity), Lease Pipeline 4 stages, 3 arrears buckets, Recovery Rate, Eviction Risk, 3 maintenance severity items, Top Spend amount + bar, Upcoming Events (5 rows).
**Remaining HARDCODED:**
- Hero sparkline 6 bars (`sparklineHeights = [40,55,45,70,85,96]`) — F1 in `rental--kpi-strip-mocked.md`. Q4.J resolved as point-in-time only; sparkline deferred.
- LeaseTable property yield ranking (rows 25–39) — PF4. Gated on Phase 6.9 (PropertyComparable yield comparison).

### 11. `/directory` — ✅ Fully wired

**Entities consumed:** Professional
**What's wired (Phase 8.4):** 9 professional cards × 11 fields (99 surfaces); contact buttons (mailto/tel + disabled state); filter controls; sort dropdown (Q1.I); pagination (Q1.C — `professionals.length` + dynamic page buttons); VIEW PROFILE link → `/directory/[id]`; verified badge.
**Remaining HARDCODED:** none.
**Notes:** PF6 (linkedProperties scalar) deferred; not blocking.

### 12. `/directory/[id]` — ✅ Fully wired

**Entities consumed:** Professional (single `get`)
**What's wired (Phase 8.4b):** all ~11 unique fields rendered as direct reads.
**Remaining HARDCODED:** none.

### 13. `/estate-planning` — ✅ Fully wired

**Entities consumed:** Property, Successor, Document, SuccessorPropertyAssignment, EstateActivityEvent
**Derivations (in `queries.ts`):** `propertyMetrics` (4-check completion), `portfolioCompletion`, `pendingReviews`, estate documents filtering (`category === "estate"`), timeline (events sorted desc, limit 12).
**What's wired (Phase 8.5):** 4 KPI stats (Plan Completion, Pending Reviews, Assigned Beneficiaries, Estate Documents), property state cards with status, successor table with verified badge + per-property scoping, estate documents (sourced from `Document.category === "Estate"` per Q4.C), recent activity timeline, addSuccessorAndAssign action with primary-share validation (Q3.G).
**Remaining PARTIAL:** action stubs — Generate Portfolio Report, Download Summary, Review All, row menu, footer actions.
**Notes:** EstatePlan formal entity deferred; v1 uses derivation-only checks. PF6 auth shim deferred to backend phase.

### 14. `/profile` — ✅ Fully wired

**Entities consumed:** UserProfile (single `get`)
**What's wired (Phase 8.6):** initials + full name + role, member-since + last-login (timestamps formatted), 4 personal info fields, 3 contact fields, 3 preference fields, security note (static), `rawProfile` typed `Partial<UserProfile>` for edit form. `saveProfileInfo` server action with `SaveProfileInfoSchema` Zod validation (10 user-editable fields).
**Remaining HARDCODED:** none.

### 15. `/settings` — ✅ Fully wired

**Entities consumed:** NotificationPreference, UserProfile
**What's wired (Phase 8.7):** profile section read-only (firstName/lastName/email/jobTitle/role/phone), notification preference matrix (3 rows × 3 channels — auto-save via startTransition + Server Action), dashboardView/language/timezone defaults pulled from `UserProfile` + saved through preference action with Zod validation.
**Remaining HARDCODED:**
- `NOTIFICATION_ROWS` constant (3 rows, label + description) — labels are CHROME config, not data
- `HARD_DEFAULTS` (3-row × 3-channel default matrix) — fallback for first-load before user has preferences
- 3 SelectOption arrays (dashboardView, language, timezone) — UI options, CHROME config

These are config arrays, not data; treating as fully wired.

---

## Pages NOT yet audited

- `/` (home) — map + dashboard composite
- `/login`, `/register`, `/auth/*` — auth flows (Clerk)

These would each need a separate `/audit-page-datapoints` run. They do not change the entity build order.

`/add-property` was audited in Phase 9 (2026-05-13) using an adapted input-form taxonomy — see `pages/add-property/audit.md` and `ref/10-input-data-map.md`.

---

## Method (how this file was built)

For each route:

1. Read `app/(shell)/<route>/queries.ts` — count entity reads + derivations passed to component
2. Read `pages/<slug>/plan.md` Fix Log — confirm phase markers (`Rev N`, "wired", "shipped")
3. Cross-check against component code for any remaining string literals or hardcoded arrays
4. Mark CHROME (config arrays, static UI labels) as wired

The original `pages/<slug>/audit.md` Surface Inventory tables were captured 2026-05-04 → 2026-05-05; phase wiring (6.0–6.8 + 8.1–8.8) has since landed. This file is the post-wiring source of truth as of 2026-05-07.

## Verification (spot-checks performed)

- ✅ `/profile` — `queries.ts` returns 9 fields directly from `UserProfile`; `Partial<UserProfile>` typing confirmed in `rawProfile`. No string literals in `ProfilePage.tsx` for data fields.
- ✅ `/rental` — `queries.ts` returns `maintenanceTotal` (Phase 6.8b just added); `KpiCards.tsx` line 192 reads `{maintenanceTotal}` (was `"$4,800"`). `sparklineHeights = [40,55,45,70,85,96]` confirmed remaining HARDCODED.
