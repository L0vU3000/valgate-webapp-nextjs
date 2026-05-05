---
slug: property-id-location
route: /property/[id]/location
revision: 1
date: 2026-05-05
verdict: "⚠️ 4 WIRED · 19 HARDCODED · 6 PFn — contra-plan: lowest WIRED ratio of any property tab"
---

# Page Audit — /property/[id]/location — audit.md
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the entity backlog, audit roadmap, and fix log derived from this audit._

## TL;DR
- ⚠️ Only 4 of 33 surfaces are WIRED — **the lowest ratio of any property tab** (12%), contra-plan prediction of "most-WIRED-friendly page"
- 🏗️ 19 HARDCODED — top entities to land: **LandParcel** (12 surfaces) and **PropertyComparable** (7 surfaces), both new and absent from the entity catalog
- 🔧 6 page-wide findings filed (PF1–PF6); most critical: `lat`/`lng` never consumed (PF4), DefaultView hardcodes a specific property identity (PF6), and address fields absent from the page (PF5)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 33 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 6 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` §"Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **LandParcel** — proposed new entity for physical attributes of a land plot (size, zoning, elevation, dimensions). Not yet in catalog `ref/00`.
- **PropertyComparable** — proposed new entity for recent comparable sales data (coordinates, price/m², distance). Not yet fully defined in catalog `ref/00 §16`.

---

## 1. Surface Inventory

> The location page has 33 visible elements. Only 4 are driven by real server data — all in the shared `PropertyLayout` header and the `FullView` page title. The remaining 19 HARDCODED elements are KPI cards, comparable properties tables, and investment metrics that need two new database entities. Notably, `property.lat` and `property.lng` — the fields most relevant to this tab — are never referenced anywhere in the component.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header code + type (e.g. "SR00015 Land") | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:50` |
| 2 | Header health-score badge (e.g. "92% health score") | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Tab nav (7 tabs: Overview … Location) | CHROME | `tabs[]` constant | `PropertyLayout.tsx:8–16` |
| 4 | Share / Get directions / Back / MoreVertical controls | CHROME | static | `PropertyLayout.tsx:42–73` |
| 5 | "Valgate / Location" breadcrumb | CHROME | static string | `PropertyLocationPage.tsx:240–243` |
| 6 | Page heading — "Location & Boundaries {property.code}" | WIRED | `property.code` | `PropertyLocationPage.tsx:247–249` |
| 7 | Page subheading — "{property.type} · {property.province}, Cambodia" | WIRED | `property.type` + `property.province` | `PropertyLocationPage.tsx:250` |
| 8 | "Full Screen View" button | CHROME | static | `PropertyLocationPage.tsx:253–261` |
| 9 | Map area — 3D Aerial View placeholder | HARDCODED | `MapPlaceholder` component; no real map library; `property.lat`/`property.lng` never consumed | `PropertyLocationPage.tsx:76–84` |
| 10 | Zoom In / Zoom Out controls | CHROME | static buttons (non-functional without real map) | `PropertyLocationPage.tsx:136–147` |
| 11 | Border Legend (Property Line / Easement / Setback Zone) + toggle | CHROME | static labels; no boundary entity | `PropertyLocationPage.tsx:86–134` |
| 12 | Total Land Size — "2,450 m²" / "0.245 hectares" | HARDCODED | `kpiData[0]` constant | `PropertyLocationPage.tsx:179–191` |
| 13 | Width "45.2m" / Length "54.3m" | HARDCODED | `kpiData[0].extras` constant | `PropertyLocationPage.tsx:186–189` |
| 14 | Current Zoning — "Agricultural Zone" | HARDCODED | `kpiData[1]` constant | `PropertyLocationPage.tsx:192–197` |
| 15 | "A-2 Classification" badge | HARDCODED | `kpiData[1].badge` constant | `PropertyLocationPage.tsx:195` |
| 16 | Development potential bullets ("Development Potential" / "Residential Subdivision" / "Up to 6 units") | HARDCODED | `kpiData[1].bullets` constant | `PropertyLocationPage.tsx:196` |
| 17 | Elevation Range — "125m" / "Above sea level" | HARDCODED | `kpiData[2]` constant | `PropertyLocationPage.tsx:198–207` |
| 18 | Slope "2.5°" / Terrain "Flat" | HARDCODED | `kpiData[2].extras` constant | `PropertyLocationPage.tsx:203–206` |
| 19 | Comparable corner coordinates table (4 rows: NE/SE/SW/NW, lat/lng/bearing) | HARDCODED | `comparables[]` constant | `PropertyLocationPage.tsx:209–214` |
| 20 | Footer: "Avg comp price: $492,100" / "Estimated value: $485,000" | HARDCODED | inline literals | `PropertyLocationPage.tsx:368–374` |
| 21 | Price per m² — "$245" (Investment Metrics) | HARDCODED | inline literal | `PropertyLocationPage.tsx:385` |
| 22 | "+12% vs. avg area price" badge | HARDCODED | inline literals | `PropertyLocationPage.tsx:387–390` |
| 23 | Comparable sales list (3 rows: area / distance / time / price/m²) | HARDCODED | `compSales[]` constant | `PropertyLocationPage.tsx:216–220` |
| 24 | ExpandedView stats bar — Total Area / Zoning / Elevation / Price/m² | HARDCODED | inline literals (duplicate of rows 12–21 data) | `PropertyLocationPage.tsx:450–461` |
| 25 | ExpandedView Zoning tab — Agricultural Zone / A-2 badge / bullets | HARDCODED | inline literals (duplicate of rows 14–16 data) | `PropertyLocationPage.tsx:487–516` |
| 26 | ExpandedView Measurements tab — Width / Length / Slope / Terrain | HARDCODED | inline literals (duplicate of rows 13 + 18 data) | `PropertyLocationPage.tsx:519–530` |
| 27 | ExpandedView Investment tab — Price/m² $245 / +12% badge | HARDCODED | inline literals (duplicate of rows 21–22 data) | `PropertyLocationPage.tsx:533–543` |
| 28 | DefaultView property card — "SR00015 Land" | HARDCODED | inline string literal (should use `property.code`/`property.type`) | `PropertyLocationPage.tsx:634` |
| 29 | DefaultView property card — "Siem Reap, Cambodia" | HARDCODED | inline string literal (should use `property.province`) | `PropertyLocationPage.tsx:635` |
| 30 | DefaultView stats bar — Total Area / Zoning / Elevation / Price/m² | HARDCODED | inline literals (duplicate of rows 12–21 data) | `PropertyLocationPage.tsx:645–655` |
| 31 | Layer panel toggles (Satellite View / Terrain / Boundaries / Labels) | CHROME | UI state; no data semantics | `PropertyLocationPage.tsx:604–608` |
| 32 | Tools panel (Measure Distance / Measure Area / Drop Pin / Reset View) | CHROME | static buttons | `PropertyLocationPage.tsx:614–627` |
| 33 | Info tabs (Measurements / Zoning / Boundaries / Investment) + Export / "View all comparables →" | CHROME | static | `PropertyLocationPage.tsx:433, 332, 408` |

**Tally:** WIRED 4 · HARDCODED 19 · PARTIAL 0 · CHROME 10 · DECORATIVE 0

---

## 2. Page-wide findings (6 PFn)

> Six systemic problems span the whole page. The two most severe are: `lat`/`lng` are present on the Property entity but never consumed by this page (the map is a non-functional placeholder), and a DefaultView sidebar card hardcodes a specific property's identity string instead of using the `property` prop it already receives.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### 🔴 PF1 — Full Property entity shipped to Client Component
**PF P1 robustness · confidence: high · `[render]` `[schema]`**

**Where:** `app/(shell)/property/[id]/location/page.tsx:11–13` (applies to all 33 inventory rows)

**Problem:** `getPropertyByIdParam(id)` returns the full `Property` object — a union of `PropertyCore + PropertyLocation + PropertyFinance + PropertyMedia` (25+ fields including `buyNumeric`, `purchasePrice`, `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualInsurance`, and photo/document storage IDs). This full object is passed directly to `<PropertyLocationPage property={property} />`, which is a `"use client"` component. The location page uses only 4 fields (`code`, `type`, `province`, `health`). All financial fields cross the RSC boundary and appear in the browser's initial hydration payload unnecessarily.

**Why it matters:** Financial data (`buyNumeric`, `outstandingMortgage`) is sensitive. Shipping it to the client on the location tab — a tab that shows neither price nor mortgage — violates the CLAUDE.md rule: "Never send full DB objects as props — `select` only what the UI renders." There is no `location/queries.ts` file; the narrowing layer is absent.

**Fix:** Create `app/(shell)/property/[id]/location/queries.ts` that exports a `PropertyLocationItem` type narrowed to `Pick<Property, "code" | "type" | "province" | "health">`. Fetch and pass `PropertyLocationItem` to the Client Component instead of `Property`. Once `lat`/`lng` wiring is added (see PF4), also include those two fields.

---

### 🟡 PF2 — No `queries.ts` narrowing layer for this route
**PF P2 schema smell · confidence: high · `[schema]`**

**Where:** `app/(shell)/property/[id]/location/` (directory has only `page.tsx`; applies to all inventory rows)

**Problem:** Every other property-detail route with complex data shapes has a `queries.ts` narrowing layer: `/safety/queries.ts`, `/ownership/queries.ts`, `/valuation/queries.ts`, `/documents/queries.ts`. The location route calls `getPropertyByIdParam()` directly in `page.tsx` with no intermediate narrowing. This is the structural cause of PF1.

**Why it matters:** Pattern inconsistency. When the location page gains more data surfaces (LandParcel entity, map integration, address display), the page.tsx will accumulate multiple `lib/data/*` imports and data-composition logic that belongs in `queries.ts`. Fix PF1 and PF2 together in one PR.

**Fix:** `app/(shell)/property/[id]/location/queries.ts` — compose and export a `getLocationPageData(id)` function that calls `getPropertyByIdParam`, narrows the result to `PropertyLocationItem`, and later adds `getLandParcel(propertyId)` and `getComparables(propertyId)` as the entities are built.

---

### 🟡 PF3 — Auth via single-user shim; multi-tenant isolation pending
**PF P2 schema smell · confidence: medium · `[render]`**

**Where:** `lib/data/properties.ts:19` (`getPropertyByIdParam` calls `getCurrentUserId()`)

**Problem:** Property lookup goes through `propertiesDb.get(getCurrentUserId(), id)`. The DB-layer `get()` check guards against IDOR, but only as long as `getCurrentUserId()` returns the authenticated user's real ID. If the shim returns a fixed demo user ID (standard pattern in the current codebase), then any authenticated user can read any property by guessing its `id`. Same finding as in every other property-tab audit — filed once per page per skill convention.

**Why it matters:** IDOR risk at the route level until Clerk auth replaces the shim.

**Fix:** Replace `getCurrentUserId()` with `auth().userId` from Clerk as part of the backend migration. No location-page-specific change needed — this is a cross-cutting fix.

---

### 🔴 PF4 — `lat`/`lng` exist on Property but are never consumed on this page
**PF P1 robustness · confidence: high · `[negative-space]` `[render]`**

**Where:** `PropertyLocationPage.tsx` (entire file; no reference to `property.lat` or `property.lng`)

**Problem:** `PropertyCore` defines `lat: number` and `lng: number` (catalog `ref/00 §1`). These fields are present in the seed data and were added specifically to power map rendering. The location page never reads them. The map area (`MapPlaceholder`, row 9) is a static dark container with an icon — no coordinates are passed to any map library. There is no map library imported (`PropertyLocationPage.tsx` imports only from `lucide-react`).

**Why it matters:** The property location page shows no property location. Users navigating to this tab see a decorative placeholder that could represent *any* property. Additionally, there is no fallback for `lat === 0 && lng === 0` ("null island") — when real map integration is added without a guard, properties with unset coordinates will render a pin in the Atlantic Ocean.

**Fix:** When adding real map integration (see Q4.Q and Q8 entry for this route in `ref/05-open-questions.md`): (1) add `lat` and `lng` to the `PropertyLocationItem` narrowed shape; (2) add a null-island guard (`if (lat === 0 && lng === 0) return <NoLocationPlaceholder />`); (3) pass `property.lat` and `property.lng` to the map component as the center/pin coordinates.

---

### 🟡 PF5 — Address fields exist on Property entity but are absent from this page
**PF P2 schema smell · confidence: high · `[negative-space]` `[schema]`**

**Where:** `PropertyLocationPage.tsx` (entire file; no reference to address fields)

**Problem:** `PropertyLocation` defines `addressLine?`, `addressLine2?`, `city?`, `zip?`, `country?`, and `province` (catalog `ref/00 §1`; `lib/data/types/property.ts:36–43`). These were collected in the add-property wizard (Step 2). None are rendered on the location tab — the most natural page to surface an address card. Only `province` appears (in the FullView subheading via `property.province`, row 7), but addressLine/city/zip/country are silently dropped.

**Why it matters:** Users who entered an address during property creation cannot find it on the location tab. This is a completeness gap: the data exists in storage and is already in the Property type; it just needs a UI surface. An "Address" card below the map would unblock rows that should be WIRED (and appear here as "absent" rather than HARDCODED).

**Fix:** Add an Address card to `FullView` that renders `property.addressLine`, `property.addressLine2`, `property.city`, `property.province`, `property.zip`, `property.country` (with nullish fallbacks for each optional field). Update `PropertyLocationItem` narrowed type to include these 6 address fields once PF1/PF2 are fixed.

---

### 🔴 PF6 — DefaultView sidebar hardcodes a specific property's identity
**PF P1 robustness · confidence: high · `[render]` `[consistency]`**

**Where:** `PropertyLocationPage.tsx:634–635` (applies to inventory rows 28–29)

**Problem:** The `DefaultView` function includes a sidebar property info card that renders the literal strings `"SR00015 Land"` and `"Siem Reap, Cambodia"`. These are hardcoded references to a specific demo property. The `DefaultView` component does **not** receive `property` as a prop (the component signature at `PropertyLocationPage.tsx:563` omits it), so it cannot access the correct values. Every user navigating to the location tab in DefaultView mode sees "SR00015 Land / Siem Reap, Cambodia" regardless of which property they're viewing.

**Why it matters:** This is a correctness bug visible in production. Any property other than SR00015 in Siem Reap will silently show the wrong identity in the sidebar.

**Fix:** Add `property: PropertyLocationItem` (or `Property` until PF1 is resolved) to `DefaultView`'s props interface. Thread `property` from `PropertyLocationPage` → `DefaultView`. Replace the two literal strings with `{property.code} {property.type}` and `{property.province}, Cambodia`.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/location/page.tsx
  - app/(shell)/property/[id]/_components/PropertyLocationPage.tsx
  - components/property/PropertyLayout.tsx
  - lib/data/types/property.ts
sources:
  - path: app/(shell)/property/[id]/location/page.tsx
    sha: c0bd752ac9e9d0e9ec7eb90354050ff689f9778c
  - path: app/(shell)/property/[id]/_components/PropertyLocationPage.tsx
    sha: b1d279ab2b569e4d646a3ae06c6c0139d0b67ca1
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
notes:
  - No location/queries.ts exists (PF2); no file to hash for that layer.
  - No per-datapoint audits exist for this route (property-id-location--*.md = 0 files).
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm route resolves to the expected file
ls app/(shell)/property/[id]/location/page.tsx

# Verify lat/lng are never referenced in the location component
grep -n "property\.lat\|property\.lng" app/(shell)/property/[id]/_components/PropertyLocationPage.tsx
# Expected: no output

# Confirm DefaultView hardcoded strings
grep -n "SR00015\|Siem Reap" app/(shell)/property/[id]/_components/PropertyLocationPage.tsx
# Expected: line 634 + 635

# Confirm no queries.ts for this route
ls app/(shell)/property/[id]/location/
# Expected: page.tsx only

# Check all property-tab pages for queries.ts pattern
ls app/(shell)/property/[id]/*/queries.ts
# Expected: safety, ownership, valuation, documents (NOT location)
```

</details>

<details>
<summary>🔧 Metric Definition SSOT YAML</summary>

```yaml
# No WIRED rows on this page have been deep-audited yet.
# Paste per-metric SSOT blocks here as /audit-datapoint runs complete.
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Verdict: ⚠️ 4 WIRED · 19 HARDCODED · 6 PFn.
- Contra-plan finding: plan predicted "most-WIRED-friendly page" (address fields expected to be wired); actual result is lowest WIRED ratio of any property tab (12%). Root cause: page body is almost entirely new-entity KPI cards (LandParcel, PropertyComparable), and `lat`/`lng` — though present on the entity — are never rendered.
- 6 PFn filed: PF1 (full entity to client), PF2 (no queries.ts), PF3 (auth shim), PF4 (lat/lng unused), PF5 (address fields absent), PF6 (DefaultView hardcodes property identity).
- 2 new Q4 entries filed: Q4.Q (LandParcel entity) and Q4.R (PropertyComparable entity) in `ref/05-open-questions.md`.
- No existing per-datapoint audits found for this route (zero back-links to insert).
- Source SHAs recorded for 4 walked files.

</details>
