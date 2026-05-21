# 01 — Read Map

> Per-route inventory of every rendered field. Reads are grouped by entity. `(HARDCODED)` means the value lives inside a component file or `queries.ts` literal, not a mock data file.

---

## Auth group `(auth)`

### `/login`
- **Auth**: unauthenticated
- **Source today**: `app/(auth)/login/page.tsx` (LoginPage client component, no `queries.ts`)
- **Reads**: none (only static UI strings)

### `/register`
- **Auth**: unauthenticated
- **Source today**: `app/(auth)/register/page.tsx` (RegisterPage client component, no `queries.ts`)
- **Reads**:
  - `email` echoed in success card — RegisterPage.tsx:234 (from form state)
  - Password strength label & color — RegisterPage.tsx:23–29 (HARDCODED scoring + STRENGTH_COLORS)
  - Resend countdown "0:45" — RegisterPage.tsx:259 (HARDCODED)

---

## Shell group `(shell)`

### `/` (home)
- **Auth**: assumed signed in (no explicit guard)
- **Source today**: `app/(shell)/queries.ts` → `getHomePageData()` → `lib/data/properties.ts` → `lib/mock-data.ts`
- **Reads (Property)**:
  - `Property.id` — HomePage.tsx:115, 132
  - `Property.name` — HomePage.tsx:294
  - `Property.code` — HomePage.tsx:293
  - `Property.status` — HomePage.tsx:288
  - `Property.statusVariant` — HomePage.tsx:284
  - `Property.province` — HomePage.tsx:297
  - `Property.buy` (formatted string) — HomePage.tsx:305
  - `Property.size` — HomePage.tsx:306
  - `Property.type` — HomePage.tsx:307
  - `Property.title` + `titleVariant` — HomePage.tsx:308
  - `Property.health` — HomePage.tsx:327, 332
  - `Property.lat`, `lng` (map pins) — `MapboxMap` consumer
- **Reads (PortfolioStats — derived)**:
  - `totalProperties` — PortfolioLegend
  - `totalValue` — `app/(shell)/portfolio/queries.ts:31` (sum of `buyNumeric`)
  - `rentedCount` / `vacantCount` — `portfolio/queries.ts:41–44`
  - `avgHealth` — `portfolio/queries.ts:32–34`
  - `attentionCount` — `portfolio/queries.ts:46` (filter `health < 30`)

### `/portfolio`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/portfolio/queries.ts` → `getPortfolioPageData()` → `lib/data/properties.ts`
- **Reads (Property — full row)**: `name`, `code`, `type`, `province`, `status`, `size`, `buy`, `title`, `health` rendered via PropertyTable — PortfolioPage.tsx:203–214
- **Reads (PortfolioStats)**:
  - `totalProperties` — PortfolioPage.tsx:133
  - `avgHealth` — PortfolioPage.tsx:169
  - `attentionCount` — PortfolioPage.tsx:182
- **Reads (PortfolioKpis — all HARDCODED today, 4× `TODO(backend):`)**:
  - `totalValueFormatted: "$42.8M"` — `portfolio/queries.ts:50`, displayed PortfolioPage.tsx:144
  - `monthlyIncome: "$312,450"` — `portfolio/queries.ts:51`, displayed PortfolioPage.tsx:158
  - `yoyGrowth: "4.2%"` — `portfolio/queries.ts:52`, displayed PortfolioPage.tsx:147
  - `newThisMonth: 2` — `portfolio/queries.ts:53`, displayed PortfolioPage.tsx:134
- **Reads (UI options)**: provinces filter list — PortfolioPage.tsx:31–37 (HARDCODED)

### `/property/[id]/overview`
- **Auth**: signed in via `app/(shell)/property/[id]/layout.tsx`; **ownership not enforced**
- **Source today**: `getPropertyByIdParam(id)` → `lib/data/properties.ts`
- **Reads (Property)**:
  - `Property.name` — PropertyOverviewPage.tsx:179
  - `Property.province` — PropertyOverviewPage.tsx:157
  - `Property.status` — PropertyOverviewPage.tsx:147
  - `Property.buy` — PropertyOverviewPage.tsx:159
- **Reads (Tenant — HARDCODED)**: `name`, `unit`, `rent`, `status` — PropertyOverviewPage.tsx:19–21
- **Reads (Alert — HARDCODED)**: `title`, `body` — PropertyOverviewPage.tsx:8–16
- **Reads (Activity — HARDCODED)**: `text`, `time`, `color` — PropertyOverviewPage.tsx:24–28
- **Reads (Metric — HARDCODED, count-up animated)**: `label`, `value`, `badge` — PropertyOverviewPage.tsx:31–34

### `/property/[id]/documents`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → component-local `files[]` and `locationTree[]`
- **Reads (Property)**: `property` (passed through layout) — PropertyDocumentsPage.tsx:10
- **Reads (Document — HARDCODED `files[]`)**: `name`, `type`, `icon`, `iconClass`, `thumb`, `folder`, `size`, `date` — PropertyDocumentsPage.tsx:67–92
- **Reads (Folder tree — HARDCODED `locationTree[]`)**: `label`, `children[]` — PropertyDocumentsPage.tsx:137–170
- **Reads (Folder root — HARDCODED `mainFolders[]`)**: `name`, `icon` — PropertyDocumentsPage.tsx:60–64
- **Reads (Sub-folder labels — HARDCODED)**: "Contract", "Receipts", "Tax", … — PropertyDocumentsPage.tsx:66

### `/property/[id]/location`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → Property only; map content is placeholder
- **Reads (Property)**: `property` — PropertyLocationPage.tsx:10
- **Reads (UI labels — HARDCODED)**: "3D Aerial View" / "Interactive terrain scan" — MapPlaceholder.tsx:61–63; legend items "Property Line", "Easement", "Setback Zone" — BorderLegend.tsx:92–109

### `/property/[id]/safety`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → component-local arrays
- **Reads (Property)**: `Property.code` — PropertySafetyPage.tsx:74
- **Reads (Certification — HARDCODED)**: `name`, `status`, `issued`, `expires`, `inspector` — PropertySafetyPage.tsx:9–14
- **Reads (Inspection — HARDCODED)**: `date`, `type`, `inspector`, `status`, `statusClass`, `issues` — PropertySafetyPage.tsx:17–22
- **Reads (SafetyRisk — HARDCODED)**: `severityLabel`, `severityBadgeClass`, `title`, `desc` — PropertySafetyPage.tsx:25–27
- **Reads (EmergencyContact — HARDCODED)**: `name`, `phone`, `sub`, `iconBg`, `iconText` — PropertySafetyPage.tsx:30–36
- **Reads (Compliance KPIs — HARDCODED computed)**: "78.6% compliant", "5 of 6 current", "All obligations met", "18 days" — PropertySafetyPage.tsx:130–167

### `/property/[id]/ownership`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → component-local arrays
- **Reads (Property)**: `Property.code` — PropertyOwnershipPage.tsx:66; `Property.name` — PropertyOwnershipPage.tsx:82
- **Reads (OwnershipKpi — HARDCODED `kpis[]`)**: `label`, `value`, `sub`, `Icon` — PropertyOwnershipPage.tsx:18–21
- **Reads (OwnershipDocument — HARDCODED `docs[]`)**: `name`, `type`, `date`, `owner` — PropertyOwnershipPage.tsx:23–27
- **Reads (OwnershipHistoryItem — HARDCODED)**: `date`, `text`, `color` — PropertyOwnershipPage.tsx:29–34
- **Reads (Equity figures — HARDCODED)**: "Current Estimated Value: $612,000", "Remaining Mortgage: $341,200", equity 44.2% — PropertyOwnershipPage.tsx:110–151

### `/property/[id]/rental`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → component-local arrays
- **Reads (Property)**: `Property.code` — PropertyRentalPage.tsx:71
- **Reads (RentSeries — HARDCODED, 6 months)**: `month`, `rent` — PropertyRentalPage.tsx:15–22
- **Reads (Payment — HARDCODED)**: `date`, `type`, `amount`, `method`, `status`, `variant` — PropertyRentalPage.tsx:28–40
- **Reads (Unit — HARDCODED)**: "Unit 4B — 123 Maple St, Chicago, IL 60601", "3 Bed / 2 Bath · 1,250 sq ft" — PropertyRentalPage.tsx:95–97
- **Reads (Rental KPIs — HARDCODED)**: "Monthly Rent: $2,450", "Occupancy: Occupied", "YTD Net Income: $21,875", "Balance Due: $0.00" — PropertyRentalPage.tsx:103–106

### `/property/[id]/valuation`
- **Auth**: signed in (ownership not enforced)
- **Source today**: `getPropertyByIdParam(id)` → component-local arrays
- **Reads (Property)**: `Property.name` — PropertyValuationPage.tsx:106
- **Reads (ValueHistoryPoint — HARDCODED, 12 months)**: `month`, `price` — PropertyValuationPage.tsx:26–38
- **Reads (Comparable — HARDCODED)**: `address`, `dist`, `sold`, `type`, `builtYear`, `beds`, `baths`, `sqft`, `price`, `psqft` — PropertyValuationPage.tsx:40–45
- **Reads (InvestmentMetric — HARDCODED)**: `label`, `value` ("Cash-on-Cash 8.4%", "Cap Rate 6.2%", "Total ROI 42.7%", "Equity Gained $137,800") — PropertyValuationPage.tsx:47–51
- **Reads (Factor lists — HARDCODED)**: positive factors (4 items) — :53–56; opportunities (4 items) — :58–60

### `/add-property`
Wizard with 6 steps; reads come almost entirely from form state. Drafts list comes from server.

- **Step 1 — Type** — Source: `getAddPropertyPageData()` returns `{ drafts: [] }` (lib/data/add-property-page.ts:11–13). Reads: PropertyType options (icon, label, sub) — Step1PropertyType.tsx:58–67 (HARDCODED).
- **Step 2 — Basic Info** — Reads form state: `propertyName`, `addressLine`, `addressLine2`, `city`, `state`, `zip`, `country`, `mapCenter` — Step2BasicInfo.tsx:60–119. Default map center `[104.9282, 11.5564]` — Step2BasicInfo.tsx:10 (HARDCODED).
- **Step 3 — Financial** — Reads form state: `currentMarketValue` (formatted) — Step3Financial.tsx:28. Other financial fields rendered read-only in Step 5.
- **Step 4 — Photos & Documents** — Reads form state: `photos[]` (filename strings only — actual `File` blobs filtered out of localStorage by `drafts-storage.tsx:7–8`), `documents[]` — Step4PhotosDocs.tsx:78, 88, 161, 183. Document type lookup `getDocMeta` — Step4PhotosDocs.tsx:10–16 (HARDCODED).
- **Step 5 — Review** — Reads all form fields read-only. Static Mapbox snapshot URL constructed at Step5Review.tsx:59 from `form.mapCenter`. Currency formatting via `lib/format.ts`.
- **Step 6 — Success** — Reads: returned `propertyId`, plus form fields for confirmation card. Mapbox snapshot background at Step6Success.tsx:423. Feature pills HARDCODED — Step6Success.tsx:357–363.

### `/rental`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/rental/queries.ts` → `getRentalDashboardData()` (all HARDCODED)
- **Reads (LeasePipelineStage — HARDCODED)**: `stage` (Approaching/Offered/Signed/Declined), unit cards — RentalDashboardPage.tsx:32; `queries.ts:94–117`
- **Reads (RentalEvent — HARDCODED, upcomingEvents)**: `time`, `title`, `detail`, `statusDot` — RentalDashboardPage.tsx:32
- **Reads (MaintenanceItem — HARDCODED)**: counts by severity (Emergency / Urgent / Standard) — RentalDashboardPage.tsx:32
- **Reads (ArrearsBucket — HARDCODED)**: `0–30d`, `31–60d`, `61–90d` amounts — RentalDashboardPage.tsx:32

### `/analytics`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/analytics/queries.ts` → `getAnalyticsPageData()` (all HARDCODED)
- **Reads (AnalyticsKpiCard — HARDCODED, 5 cards)**: `label`, `value`, `change`, `positive` — AnalyticsPage.tsx:177; queries.ts:65–70
  - "Total Revenue $1,248,300", "NOI $712,500", "Occupancy 91.4%", "Rent Collection 97.8%", "Maintenance $48,200"
- **Reads (RevenueSeries — HARDCODED, 9 months)**: `month`, `revenue`, `expenses` — queries.ts:54–64
- **Reads (LeasePipelineRange — HARDCODED, 3 ranges)**: 0–3M, 4–6M, 7–12M — queries.ts:72–76
- **Reads (CapitalGrowth — HARDCODED, 3 properties)**: address + growth % — queries.ts:77–81
- **Reads (MaintenanceSpend — HARDCODED, 6 months Mar–Aug)**: queries.ts:82–89
- **Reads (ExpenseBreakdown — HARDCODED, pie)**: Maintenance 45% / Utilities 25% / Taxes 30% — queries.ts:95–99
- **Reads (SavedReport — HARDCODED, 3 names)**: queries.ts:90–94
- **Reads (Sparkline — HARDCODED, 6 points)**: AnalyticsPage.tsx:270

### `/settings`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/settings/queries.ts` → `getSettingsPageData()`
- **Reads (NotificationPreference matrix — HARDCODED defaults)**: 3 event types × 3 channels — SettingsPage.tsx:21–23; queries.ts
- **Reads (Preference)**: `dashboardView` options (portfolio-overview, analytics, map) — queries.ts:36–39; `language` options (en-US, km, zh) — queries.ts:41–45; `timezone` options (5) — queries.ts:46–52

### `/profile`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/profile/queries.ts` → `getProfilePageData()` (HARDCODED user)
- **Reads (UserProfile)**:
  - `initials` — ProfilePage.tsx:26
  - `fullName` — ProfilePage.tsx:29
  - `role` (badge) — ProfilePage.tsx:32
  - `memberSince` — ProfilePage.tsx:39
  - `lastLogin` — ProfilePage.tsx:43
  - `personalInfo.firstName`, `lastName`, `jobTitle`, `employeeId` — ProfilePage.tsx:81–83
  - `contactFields.email`, `phone`, `office` — ProfilePage.tsx:90–102
  - `preferences.language`, `timezone`, `currency` — ProfilePage.tsx:109–111
  - `securityNote` (banner text) — ProfilePage.tsx:116–120

### `/directory`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/directory/queries.ts` → `getDirectoryPageData()` (HARDCODED, 6 professionals)
- **Reads (Professional — HARDCODED)**: `id`, `name`, `company`, `category`, `rating`, `reviewCount`, `linkedProperties`, `available`, `initials`, `avatarBg` — ProfessionalDirectoryPage.tsx:54+
- **Reads (Category list — HARDCODED, 9 entries)**: queries.ts:107
- **Reads (Total count — HARDCODED)**: "142" — ProfessionalDirectoryPage.tsx:328

### `/estate-planning`
- **Auth**: assumed signed in
- **Source today**: `app/(shell)/estate-planning/queries.ts` → `getEstatePlanningPageData()` (HARDCODED)
- **Reads (EstateStat — HARDCODED, 4)**: `label`, `value`, `sub`, `progress` — SuccessionPage.tsx:219; queries.ts:55–87
- **Reads (EstateProperty — HARDCODED, 4)**: `id`, `name`, `address`, `status`, `initials`, `color` — SuccessionPage.tsx:243; queries.ts:88–121
- **Reads (Successor — HARDCODED, 3)**: `initials`, `name`, `relation`, `role`, `share`, `verified` — SuccessionPage.tsx:334; queries.ts:122–147
- **Reads (EstateDocument — HARDCODED, 2)**: `name`, `meta`, `iconBg` — SuccessionPage.tsx:371; queries.ts:148–158
- **Reads (TimelineEvent — HARDCODED, 3)**: `title`, `time`, `desc`, `active` — SuccessionPage.tsx:408; queries.ts:160–179
