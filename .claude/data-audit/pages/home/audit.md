---
slug: home
route: /
revision: 2
date: 2026-05-26
verdict: "~42 WIRED · 1 HARDCODED · 1 PARTIAL · ~27 CHROME · ~8 DECORATIVE — PF5 resolved (computeProgress wired); PF7 resolved (real Document list); PF1 deferred-upfront; PF3 open (no HomeListItem narrowing)"
---

# Page Audit — / (Home / Map)
_Last revised: 2026-05-26 · Revision 2 · Post-wiring pass_

_See [plan.md](./plan.md) for action items derived from this audit._

## TL;DR
- **~42 surfaces** are connected to real typed data — map pins, all drawer fields, legend stats, CommandPalette property and document rows, and PropertyTable rows are all wired
- **PF5 resolved:** `queries.ts` now calls `computeProgress(p, ctx)` with a full 13-entity `ProgressContext` — the weighted-pillar Progress score (Location 15% · Financials 20% · Rental 20% · Ownership 15% · Valuation 10% · Safety 10% · Estate 5% · Docs 5%) now flows through all progress surfaces (legend, drawer, CommandPalette dot)
- **PF7 resolved:** `CommandPalette` now receives a real `documents: Document[]` prop from `getHomePageData()`; the `mockDocs` array is gone; document rows render real `doc.name`, `doc.category`, `doc.extension`, and `doc.uploadedAt`
- **PF1 remains deferred:** drawer hero image is still a single hardcoded Unsplash URL — no `Property.photoUrl` field exists (gated on Q5.C storage decision)
- **PF3 remains open:** full `HomeProperty` (= `Property & { buy; progress }`) still flows to all Client Components; `MapView` only reads 4 fields; no `HomeListItem` narrowing type exists

---

## Contents

| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 63 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 7 PFn (2 resolved, 2 deferred, 3 open) |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — surface classification used throughout the audit corpus
- **PFn** — page-wide finding (filed once; per-datapoint audits cite instead of restating)
- **HomeProperty** — `Property & { buy: string; progress: number }` defined at `app/(shell)/queries.ts`; `buy` is `formatCurrency(buyNumeric)` and `progress` is `computeProgress(p, ctx)` (weighted 8-pillar score); full `Property` spread with no narrowing

---

## 1. Surface Inventory

> **Plain opener:** The home page shows 63 distinct things. About 42 are connected to real database data. 1 is hardcoded (hero image). About 27 are static navigation labels and UI controls. The rest are loading states, animations, and visual decorations.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| **Loading screen** | | | | |
| 1 | Map loading overlay container | CHROME | `mapLoaded` state gate — fades to transparent on ready | `HomePage.tsx:149-167` |
| 2 | "Loading map…" text + Map icon pulse | CHROME | static string; icon animation | `HomePage.tsx:161-163` |
| 3 | Loading progress bar animation | DECORATIVE | CSS `loading-bar` keyframe — pure visual | `HomePage.tsx:164-166` |
| **MapView — Mapbox map** | | | | |
| 4 | Map tile rendering (light/dark style) | WIRED | `isDark` from `useShellContext` → `mapbox://styles/mapbox/light-v11` or `dark-v11` | `MapView.tsx:64-72` |
| 5 | Property pin positions (all properties) | WIRED | `p.lat`, `p.lng` per `Property` entity via Supercluster index | `MapView.tsx:54-61` |
| 6 | Pin tooltip text on hover | WIRED | `p.name` — direct `Property.name` read | `MapView.tsx` (marker tooltip) |
| 7 | Cluster circle — point count number | WIRED | `f.properties.point_count` from Supercluster output | `MapView.tsx` (cluster label) |
| 8 | Pin selection highlight (scale + ring shadow) | WIRED | `selectedId` state → CSS transform on `[data-pin]` element | `MapView.tsx` |
| 9 | Cluster ring pulse animation | DECORATIVE | `cluster-ring-pulse` CSS keyframe | `MapView.tsx` |
| 10 | Pin enter / emerge animations | DECORATIVE | `pin-appear`, `pin-emerge` CSS keyframes | `MapView.tsx` |
| 11 | Pin exit / converge animations | DECORATIVE | `pin-exit`, `pin-converge-exit` CSS keyframes | `MapView.tsx` |
| **Command Palette Trigger bar** | | | | |
| 12 | Search icon (magnifier) | CHROME | `<Search>` Lucide icon — static | `HomePage.tsx:210` |
| 13 | Rotating placeholder text | HARDCODED | `triggerPlaceholders` — 5 fixed strings: "Search properties…", "Find: Phnom Penh land plots", "Find: Q1 2026 valuation report", "Find: Hard title properties", "Find: Vacant properties in Siem Reap" (PF4 — classified CHROME with P3 follow-up) | `HomePage.tsx:58-64,216` |
| 14 | ⌘K keyboard badge | CHROME | `<CommandIcon>` + literal "K" | `HomePage.tsx:219-222` |
| 15 | Quick action: "New Property" → `/add-property` | CHROME | static label + route | `HomePage.tsx:234` |
| 16 | Quick action: "Analytics" → `/analytics` | CHROME | static label + route | `HomePage.tsx:235` |
| 17 | Quick action: "Documents" → opens palette | CHROME | static label + `setCommandOpen(true)` | `HomePage.tsx:236` |
| 18 | Quick action: "Tenants" → `/estate-planning` | CHROME | static label + route | `HomePage.tsx:237` |
| **CommandPalette dialog** | | | | |
| 19 | Search input (placeholder text) | CHROME | `placeholder="Search properties, documents, tenants..."` — static | `CommandPalette.tsx:100` |
| 20 | Property rows: name (up to 5 properties) | WIRED | `properties.slice(0, 5)` → `p.name` | `CommandPalette.tsx:115,127` |
| 21 | Property rows: type + province sub-line | WIRED | `p.type`, `p.province` | `CommandPalette.tsx:131` |
| 22 | Property rows: status badge | WIRED | `p.status` → `statusClasses[p.status]` | `CommandPalette.tsx:136-140` |
| 23 | Property rows: buy price | WIRED | `p.buy` (pre-formatted in `queries.ts`) | `CommandPalette.tsx:133` |
| 24 | Property rows: progress dot color | WIRED | `progressClass(p.progress)` where `p.progress = computeProgress(p, ctx)` — weighted 8-pillar score (PF5 resolved) | `CommandPalette.tsx:130` |
| 25 | Documents section: up to 5 rows (name, type/category, uploadedAt) | WIRED | `documents.slice(0, 5)` from `getHomePageData()` → real `Document` entity; `doc.name`, `doc.category`, `doc.extension`, `doc.uploadedAt` (PF7 resolved) | `CommandPalette.tsx:150-179` |
| 26 | Navigate section: 7 items with routes | CHROME | static `[{ label, icon, path }]` array — all routes are real | `CommandPalette.tsx:185-207` |
| 27 | Footer: ↑↓ / Enter / Esc keyboard hints | CHROME | static UI affordance copy | `CommandPalette.tsx:213-228` |
| 28 | Footer: "Valgate Search" label | CHROME | static branding string | `CommandPalette.tsx:230` |
| 29 | Empty state ("No matching properties or documents found") | CHROME | `<CommandEmpty>` — conditional on search returning zero | `CommandPalette.tsx:104-111` |
| **PortfolioLegend (bottom-center stats pill)** | | | | |
| 30 | "Portfolio" label | CHROME | static string | `PortfolioLegend.tsx:66` |
| 31 | Portfolio total value | WIRED | `formatCurrency(stats.totalValue)` ← `computeStats(items).totalValue` = sum of `buyNumeric` across active properties | `PortfolioLegend.tsx:40,69` |
| 32 | Property count number | WIRED | `stats.totalProperties` ← `computeStats(items).totalProperties` = count of non-archived, non-sold properties | `PortfolioLegend.tsx:81` |
| 33 | "Properties" label | CHROME | static string | `PortfolioLegend.tsx:82` |
| 34 | Rented count number | WIRED | `stats.rentedCount` ← `active.filter(p => p.status === "Rented").length` | `PortfolioLegend.tsx:169` |
| 35 | "Rented" label + green dot | CHROME | static string; dot color `bg-status-success` | `PortfolioLegend.tsx:167-171` |
| 36 | Vacant count number | WIRED | `stats.vacantCount` ← `active.filter(p => p.status === "Vacant").length` | `PortfolioLegend.tsx:176` |
| 37 | "Vacant" label + amber dot | CHROME | static string; dot color `bg-status-warning` | `PortfolioLegend.tsx:174-178` |
| 38 | Avg Progress value + color | WIRED | `stats.avgProgress` ← `computeStats.avgProgress` ← mean of `computeProgress(p, ctx)` across active properties (PF5 resolved) | `PortfolioLegend.tsx:195` |
| 39 | Avg Progress color dot | WIRED | `progressBgClass(stats.avgProgress)` — color driven by weighted Progress score (PF5 resolved) | `PortfolioLegend.tsx:188-194` |
| 40 | "Avg Progress" text label | CHROME | static string | `PortfolioLegend.tsx:194` |
| 41 | Legend pill dividers (×2) | DECORATIVE | `w-px h-4 bg-border-subtle` separators — purely visual | `PortfolioLegend.tsx:155,184` |
| **MapControls** | | | | |
| 42 | Zoom In button | CHROME | `mapRef.current?.zoomIn()` — map control, no data | `MapControls.tsx` |
| 43 | Zoom Out button | CHROME | `mapRef.current?.zoomOut()` — map control, no data | `MapControls.tsx` |
| 44 | Reset / fly-to Cambodia button | CHROME | `flyTo({ center: [104.9, 12.5], zoom: 7 })` — hardcoded geographic constant (appropriate config) | `MapControls.tsx` |
| **Property Drawer (selected pin panel)** | | | | |
| 45 | Hero image | HARDCODED | single Unsplash URL shared across all properties (`photo-1665691964802-956fc06b93cf`) — no `Property.photoUrl` field; `photoStorageIds[]` in schema but upload infra not built; PF1 deferred-upfront (gated on Q5.C) | `HomePage.tsx:304` |
| 46 | Gradient scrim over hero | DECORATIVE | `bg-gradient-to-t from-black/65` CSS — visual layer only | `HomePage.tsx:309` |
| 47 | Status pill (e.g. "Rented", "Vacant") | WIRED | `drawerProperty.status` with conditional color classes | `HomePage.tsx:319-328` |
| 48 | Property code (sub-label) | WIRED | `drawerProperty.code` | `HomePage.tsx:332` |
| 49 | Property name (hero overlay h3) | WIRED | `drawerProperty.name` | `HomePage.tsx:333` |
| 50 | City + Province with MapPin icon | WIRED | `drawerProperty.city`, `drawerProperty.province` filtered and joined | `HomePage.tsx:335-338` |
| 51 | Property Type | WIRED | `drawerProperty.type` | `HomePage.tsx:372` |
| 52 | Property Use | WIRED | `drawerProperty.propertyUse` with "—" fallback | `HomePage.tsx:376` |
| 53 | Title (with variant color) | WIRED | `drawerProperty.title` + `titleClasses[titleToVariant(title)]` | `HomePage.tsx:380` |
| 54 | Year Built | WIRED | `drawerProperty.yearBuilt` with "—" fallback | `HomePage.tsx:384` |
| 55 | Total Area | WIRED | `drawerProperty.totalArea` formatted with `toLocaleString()` + "m²" | `HomePage.tsx:399` |
| 56 | Parking Spaces | WIRED | `drawerProperty.parkingSpaces` with "—" fallback | `HomePage.tsx:404` |
| 57 | Bedrooms | WIRED | `drawerProperty.bedrooms` with "—" fallback | `HomePage.tsx:408` |
| 58 | Bathrooms | WIRED | `drawerProperty.bathrooms` with "—" fallback | `HomePage.tsx:412` |
| 59 | Address Line | WIRED | `drawerProperty.addressLine` (conditional render) + `addressLine2` | `HomePage.tsx:424-430` |
| 60 | City (Location section) | WIRED | `drawerProperty.city` with "—" fallback | `HomePage.tsx:434` |
| 61 | Province (Location section) | WIRED | `drawerProperty.province` with "—" fallback | `HomePage.tsx:438` |
| 62 | Country | WIRED | `drawerProperty.country` (conditional render) | `HomePage.tsx:441-446` |
| 63 | ZIP | WIRED | `drawerProperty.zip` (conditional render) | `HomePage.tsx:447-452` |
| 64 | Purchase Price (large display) | WIRED | `drawerProperty.buy` = `formatCurrency(buyNumeric)` from `queries.ts` | `HomePage.tsx:466` |
| 65 | Market Value | WIRED | `drawerProperty.currentMarketValue` with `formatCurrency()` + "—" fallback | `HomePage.tsx:471` |
| 66 | Outstanding Mortgage | WIRED | `drawerProperty.outstandingMortgage` with `formatCurrency()` + "—" fallback | `HomePage.tsx:476` |
| 67 | Monthly Payment | WIRED | `drawerProperty.monthlyPayment` with `toLocaleString()` + "—" fallback | `HomePage.tsx:483` |
| 68 | Annual Tax | WIRED | `drawerProperty.annualPropertyTax` with `toLocaleString()` + "—" fallback | `HomePage.tsx:489` |
| 69 | Purchase Date | WIRED | `drawerProperty.purchaseDate` with `formatDate()` (conditional render) | `HomePage.tsx:494-499` |
| 70 | Progress bar (fill width + color) | WIRED | `drawerProperty.progress` = `computeProgress(p, ctx)` — weighted 8-pillar score (PF5 resolved) | `HomePage.tsx:353-357` |
| 71 | Progress % label + color | WIRED | same; `progressClass(drawerProperty.progress)` for text color (PF5 resolved) | `HomePage.tsx:347-349` |
| 72 | Close X button | CHROME | `closeDrawer()` — no data dependency | `HomePage.tsx:311-314` |
| 73 | "View Property" CTA → `/property/${id}` | CHROME | static label; routing uses `drawerProperty.id` | `HomePage.tsx:508-514` |
| 74 | Drawer slide-in / slide-out animation | DECORATIVE | `slide-in-up` / `slide-in-right` keyframes; `isDrawerClosing` state | `HomePage.tsx:291-293` |
| **PropertyTable accordion** | | | | |
| 75 | "Properties" heading + "Full List" → `/portfolio` | CHROME | static heading; button is a fixed nav link | `HomePage.tsx:526-541` |
| 76 | ChevronUp accordion toggle icon | CHROME | `tableOpen` state drives rotation — UI affordance | `HomePage.tsx:529-533` |
| 77 | Table rows — all data fields | WIRED | `initialProperties` passed as `pageRows`, `filtered`, `properties` props to `<PropertyTable>`; same component as `/portfolio`; data fields audited in `pages/portfolio/datapoints/` — do not re-walk | `HomePage.tsx:553-569` |
| 78 | Accordion open / close animation | DECORATIVE | CSS `grid-rows-[0fr]` → `grid-rows-[1fr]` transition | `HomePage.tsx:545-549` |

**Tally:** WIRED **~42** · HARDCODED **1** · CHROME **~27** · DECORATIVE **~8** (PARTIAL: 0 — PF5 resolved)

**Audit-relevant rows (WIRED + HARDCODED):** ~43. CHROME and DECORATIVE listed for completeness.

**Note — PropertyTable progress column (row 77):** `PropertyTable` receives `initialProperties` which carries `progress = computeProgress(p, ctx)` (post-PF5 fix). The progress-bar column in the home table is now correctly wired to the weighted formula.

---

## 2. Page-wide findings (7 PFn)

> **Plain opener:** Seven systemic findings were filed in Revision 1. Two are now resolved (PF5 — progress formula drift, PF7 — mock documents). One remains deferred pending a storage infrastructure decision (PF1 — hero image). One is open for a typing/narrowing cleanup (PF3). Three are cross-page or low-priority (PF2, PF4, PF6).

---

### PF1 — Drawer hero image is a single hardcoded Unsplash URL ⏸️ DEFERRED UPFRONT

**Scope:** every drawer panel across all properties  
**What happens:** `HomePage.tsx:304` embeds one Unsplash photo URL for all property drawer panels. Every property displays the same luxury driveway photo (`photo-1665691964802-956fc06b93cf`). No `Property.imageUrl` field exists in the schema; `Property.photoStorageIds[]` is present in `PropertyMediaSchema` but the upload infrastructure is not built.  
**Why deferred:** joint fix with Q5.C (storage provider decision). The wizard's photo upload step and the drawer's hero image must land together.  
**Resolution gate:** Q5.C (storage provider) → Q5.Y (imageUrl field vs photoStorageIds[0])  
**Priority:** P2 · deferred-upfront · no action until Q5.C resolves  
**Tag:** `deferred-upfront`

---

### PF2 — Multi-tenant auth shim: `getCurrentUserId()` returns `"demo-user"` 🔁 CITED

**Scope:** cross-page systemic  
**What happens:** `getHomePageData()` calls `getProperties()` which calls `getCurrentUserId()` (returns the fixed string `"demo-user"`). All 13 entity queries are scoped to this shim.  
**Citation:** same systemic concern as `pages/portfolio/audit.md PF1` and `pages/property-id-overview/audit.md PF2`. Resolution tied to Clerk integration (Q4.M).  
**Priority:** P1 systemic · cross-page · deferred to backend phase

---

### PF3 — No `HomeListItem` narrowing — full `Property` object flows to Client Component

**Scope:** `app/(shell)/queries.ts` → `HomePage.tsx` → `MapView.tsx`, `CommandPalette.tsx`, `PropertyTable.tsx`  
**What happens:** `HomeProperty = Property & { buy: string; progress: number }` extends the full `Property` record with two appended fields and spreads the whole object (`...p`). `MapView.tsx` only reads 4 fields (`id`, `lat`, `lng`, `name`). `CommandPalette.tsx` reads 8 fields. Financial and location sub-fields flow to Client Components that do not need them.  
**Comparison:** `/portfolio` has `PropertyListItem` (10-field narrowing); `/home` has no equivalent.  
**Risk:** over-serialization; increased client bundle payload; PII exposure path when multi-user arrives (Q4.M).  
**Fix:** create `HomeListItem` (or a `MapPin`-scoped narrowing type) in `queries.ts`; update `MapView` props accordingly.  
**Priority:** P2 · open · target Phase 10.1

---

### PF4 — Command-palette rotating placeholders are hardcoded copy strings

**Scope:** `HomePage.tsx:58-64` — `triggerPlaceholders` array  
**What happens:** Five fixed strings cycle on a 3.5 s timer. They look like real-data examples but never change.  
**Decision:** CHROME classification (intentional UX). A future improvement could populate from `properties[0].name + province` but is low priority.  
**Priority:** P3 · CHROME · no action in Phase 10.1 unless requested

---

### ~~PF5 — `stats.avgProgress` and all `p.progress` reads used legacy `Property.health` field~~ ✅ RESOLVED

**Resolved in Revision 2 (2026-05-26).**  
`queries.ts` now imports `computeProgress` and builds a full `ProgressContext` from all 13 entity lists, then calls `computeProgress(p, ctx)` for every property. The weighted-pillar formula (Location 15% · Financials 20% · Rental 20% · Ownership 15% · Valuation 10% · Safety 10% · Estate 5% · Docs 5%) now flows to all three surfaces: `PortfolioLegend.avgProgress`, drawer progress bar + %, and CommandPalette progress dot. `Property.health` is not present in the current `PropertyCoreSchema` and is no longer referenced anywhere in the home data path.

---

### PF6 — No audit log of property mutations 🔁 CITED

**Scope:** cross-page systemic  
**Citation:** same as `pages/portfolio/audit.md PF2` / Q4.P. Partially resolved for estate actions; broader mutation log deferred to backend phase.  
**Priority:** P1 systemic · cross-page · deferred

---

### ~~PF7 — CommandPalette Documents section showed 4 hardcoded mock entries~~ ✅ RESOLVED

**Resolved in Revision 2 (2026-05-26).**  
`getHomePageData()` now fetches `documentsDb.list(userId)` and includes the result in `HomePageData`. `CommandPalette` accepts a `documents?: Document[]` prop and renders `documents.slice(0, 5)` with real `doc.name`, `doc.category ?? doc.extension`, and `doc.uploadedAt`. The `mockDocs` inline array is gone. Document rows navigate to `/portfolio` on selection (appropriate — no per-document deep-link route exists yet).

---

<details>
<summary>Source files & hashes (2026-05-26)</summary>

| File | SHA (git hash-object) |
|---|---|
| `app/(shell)/page.tsx` | `abd8c18b` |
| `app/(shell)/queries.ts` | `1bf856f4` |
| `app/(shell)/_components/HomePage.tsx` | `722aa029` |
| `app/(shell)/_components/PortfolioLegend.tsx` | `9a383b97` |
| `components/map/MapView.tsx` | `f7f01c46` |
| `components/map/MapControls.tsx` | `2648fa3e` |
| `components/home/CommandPalette.tsx` | `9e66ddc5` |
| `lib/data/derivations/portfolio.ts` | `fc81423a` |
| `lib/data/types/property.ts` | `fa064c8d` |

Verification commands:
```bash
# Confirm computeProgress is used (not health)
grep "computeProgress\|health" app/\(shell\)/queries.ts
# Expected: computeProgress at lines ~17+93; no p.health reference

# Confirm real documents are fetched
grep "documentsDb\|documents" app/\(shell\)/queries.ts
# Expected: documentsDb.list(userId) in Promise.all; documents in HomePageData return

# Confirm hero image is still hardcoded
grep -i "unsplash" app/\(shell\)/_components/HomePage.tsx
# Expected: 1 match (photo-1665691964802)

# Confirm mockDocs is gone
grep "mockDocs" components/home/CommandPalette.tsx
# Expected: zero matches

# Confirm CommandPalette accepts documents prop
grep "documents" components/home/CommandPalette.tsx
# Expected: documents?: Document[] in props; documents.slice(0, 5) in render
```
</details>

<details>
<summary>Revision history</summary>

| Rev | Date | Author | Changes |
|---|---|---|---|
| 1 | 2026-05-14 | Phase 10 audit | Initial audit — 63-row Surface Inventory, 7 PFn filed (PF1 deferred-upfront, PF2+PF6 cited, PF3+PF5+PF7 actionable, PF4 CHROME); Q3.S + Q5.Y new Q-codes filed |
| 2 | 2026-05-26 | Post-wiring pass | PF5 resolved: `computeProgress(p, ctx)` replaces `p.health ?? 0`; PF7 resolved: `mockDocs` replaced with real `Document` entity via `getHomePageData()`; surface count expanded to 78 rows (drawer sections fully itemised); tally updated to ~42 WIRED · 1 HARDCODED · ~27 CHROME · ~8 DECORATIVE; source SHAs refreshed |

</details>
