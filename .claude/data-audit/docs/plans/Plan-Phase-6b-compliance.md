# Plan — Phase 6b: Compliance page (`/pro/compliance`)

> Status: **SHIPPED** 2026-06-12 · branch `L0vU3000/pro-interface-valgate` · workspace `monterrey`

## Context

The last net-new item on the Valgate Pro design track. The locked Phase 6 plan
calls for a "compliance calendar" from Certification + Inspection + SafetyRisk.

Two data-layer facts shaped the design:
- **Certifications** carry a real `expiresAt` + `status` (Valid/Expiring/Expired),
  but most fall far in the future — a month grid would look empty, so the layout
  is a **timeline/agenda grouped by expiry horizon**.
- **Inspections** (10) and **safety risks** (7) were loaded into the Pro context
  for client-health alerts but had **zero UI anywhere**. Surfacing them is the
  high-value part of this page.

Outcome: a dedicated `/pro/compliance` route — a certification expiry timeline plus
a safety-risk register and a recent-inspections log — so an asset manager sees, in
one place, what's overdue, what's expiring, what risks are open, and how recent
inspections went. Everything binds to real records (no invented dates); the page
reuses the modal/motion/skeleton system built earlier this session.

## Data (verified)

- `lib/data/types/certification.ts` — `name` (Fire Safety Certificate / Electrical
  Compliance / Plumbing Certificate), `status` (Valid|Expiring|Expired), `issuedAt`,
  `expiresAt`, `propertyId`.
- `lib/data/types/inspection.ts` — `type` (Annual Fire Safety|Electrical|Plumbing),
  `inspectedAt`, `status` (Passed|Failed|Satisfactory), `issues` (count), `propertyId`.
- `lib/data/types/safety-risk.ts` — `severity` (Critical|High|Medium|Low), `title`,
  `description`, `createdAt`, `propertyId`. No `resolved` flag — all listed risks
  are "open".
- `app/(pro)/pro/queries.ts` `loadProContext()` loads `certifications`, `inspections`,
  `safetyRisks` and exposes `propertyById` / `clientById` lookup maps.
  - **Correction found during build:** `inspections` was destructured in
    `loadProContext` but never added to the returned `ProContext` (only used for the
    progress derivation). Added `inspections: Inspection[]` to the type and the return.

## What shipped

### 1. Query layer — `app/(pro)/pro/queries.ts`
- Added `daysLeft: number` to `ProComplianceRow`, set from the existing `daysDiff`
  in `buildComplianceRows()`. Server-computed at request time (route is
  force-dynamic), so the client buckets by horizon with no hydration mismatch.
  Backward-compatible — the dashboard's ComplianceTable ignores it.
- Added `inspections` to `ProContext` (type + return).
- New types: `ProSafetyRiskRow`, `ProInspectionRow`, `CompliancePageData`.
- New `safetyRiskSeverityRank()` helper (Critical→Low).
- New `getCompliancePageData()`: certifications via `buildComplianceRows`, safety
  risks joined + severity-sorted, inspections joined + newest-first, the owning
  clients for the filter, and a book-level `summary`.
- **Summary refinement (vs. original plan):** the three cert counts are computed
  from `status` (`Expired` / `Expiring` / `Valid`) rather than a `daysLeft 0–30`
  window. Reason: the live seed has two `Expiring` certs whose expiry date already
  slipped a few days past, so a day-window count left their amber pills reconciling
  with no KPI number. Status-based counts mirror the visible pills and sum to the
  cert total.

### 2. `dashboard/_components/ComplianceTable.tsx`
- Exported `STATUS_PILL` (Valid=emerald / Expiring=amber / Expired=red) so the
  timeline shares one cert-status color source.

### 3. Route + skeleton
- `app/(pro)/pro/compliance/page.tsx` — `dynamic = "force-dynamic"`;
  `getCompliancePageData()` → `<CompliancePage data=… />`.
- `app/(pro)/pro/compliance/loading.tsx` — `SkeletonPageFrame` + header + KPI strip
  + a 65/35 of `SkeletonWidgetCard`s.

### 4. Page + widgets — `app/(pro)/pro/compliance/_components/`
- `CompliancePage.tsx` (client): header, 5-cell `KpiMetricStrip`, an animated
  client filter chip row (`motion` shared-layout pill, reduced-motion aware), and a
  65/35 grid. Filtering runs over all three sections by `clientId` with `useMemo`.
  Sections wrapped in `SectionEnter`.
- `CertTimeline.tsx`: one `WidgetCard` with four horizon groups bucketed from
  `daysLeft` — Overdue (`<0`) · Due in 30 days (`0–30`) · 31–90 days · Later
  (`>90`). `EnterLi` rows with a continuous running index for a clean top-down
  stagger; cert `STATUS_PILL`. Empty groups hidden; whole-empty → empty state.
- `SafetyRisksCard.tsx`: `WidgetCard`, `EnterLi` rows severity-sorted with a
  severity badge (Critical=red / High=orange / Medium=amber / Low=slate).
- `InspectionsCard.tsx`: `WidgetCard`, `EnterLi` rows with type, status pill
  (Passed=emerald / Satisfactory=blue / Failed=red), issue count, property·client,
  relative date. Inspector name omitted (fragile `inspectorId` join).

### 5. Navigation — `app/(pro)/pro/_components/ManagerSidebar.tsx`
- Added `{ label: "Compliance", icon: ShieldCheck, href: "/pro/compliance" }` to
  `PRIMARY_NAV`, last. Active state uses the existing `startsWith` branch.

## Verification (passed)
1. `npx tsc --noEmit` filtered to `app/(pro)` → clean; `npx eslint` on new/changed
   files → clean. (Pre-existing unrelated tsc errors in `(shell)`, `convex`,
   `rental.ts` remain; build ignores them via `ignoreBuildErrors`.)
2. `npm run build` → green; `/pro/compliance` present as a dynamic (ƒ) route.
3. Headless browser at `/pro/compliance`:
   - Timeline — Overdue (3): Plumbing Cert (Overdue 437d, Expired), 2 Electrical
     Compliance (Overdue 7d / 2d, Expiring); 31–90 days (1): Fire Safety (in 85d);
     Later (6): the Valid certs. Status pills correct.
   - Safety risks: 7, High "Outdated wiring" first. Inspections: 10, the 1 Failed
     (Plumbing, 5 issues, Nov 1) visible.
   - KPI strip: Expired 1 · Expiring 2 · Valid 7 · Open risks 7 · Failed 1.
   - Client filter → Tan Holdings Co.: sections narrow (certs 10→5, risks 7→3,
     inspections 10→5); chip pill animates to the new position.
   - Sidebar "Compliance" active; console clean.

## Out of scope (deferred)
- No create/edit modals for certs/inspections/risks (read-only oversight page).
- No month-grid calendar toggle (timeline-only, user's choice).
- Inspector names (fragile `inspectorId` join) left out.
- Deep `/impeccable` polish pass remains separate, pending motion-language sign-off.
