---
slug: home
route: /
revision: 1
date: 2026-05-14
verdict: "⚠️ ~38 WIRED · 5 PARTIAL (p.health drift) · 3 HARDCODED · 2 PFn cited · 4 PFn actionable/deferred — high wiring quality; hero image + mock docs + health/progress drift are the actionable gaps"
---

# Page Audit — / (Home / Map)
_Last revised: 2026-05-14 · Revision 1 · Phase 10_

_See [plan.md](./plan.md) for action items derived from this audit._

## TL;DR
- ✅ ~38 surfaces are real data — map pins bound to `Property.lat/lng`, drawer fields bound to `HomeProperty`, legend stats via `computeStats`, CommandPalette properties via `initialProperties`
- ⚠️ 5 PARTIAL surfaces: all `p.progress` reads flow through `queries.ts:27` which assigns `progress: p.health ?? 0` — `Property.health` is the legacy field; the weighted Progress derivation (Location 15% · Financials 20% · Rental 20% · Ownership 15% · Valuation 10% · Safety 10% · Estate 5% · Docs 5%) is not yet wired here (PF5 · Q3.S)
- 🔴 1 HARDCODED **deferred upfront**: drawer hero image is one hardcoded Unsplash URL shared across all properties (PF1 · Q5.Y · gated on Q5.C storage)
- 🔴 1 HARDCODED actionable: CommandPalette Documents section shows 4 fake document entries — `mockDocs` array, never queries `Document` entity (PF7)
- 🔴 1 HARDCODED low-priority: rotating trigger placeholder strings are fixed copy, not seeded property names (PF4 — classified CHROME with P3 follow-up flag)
- 🔧 6 page-wide findings filed (PF1–PF7 minus PF6; see §2); PF2 and PF6 cite portfolio/overview cross-page findings
- ⚠️ No `HomeListItem` narrowing: `HomeProperty = Property & { buy; progress }` passes the full entity to the Client Component; `MapView` only needs 4 fields (PF3)

---

## Contents

| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 59 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 7 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — surface classification used throughout the audit corpus
- **PFn** — page-wide finding (filed once; per-datapoint audits cite instead of restating)
- **HomeProperty** — `Property & { buy: string; progress: number }` defined at `app/(shell)/queries.ts:15`; extends the full `Property` object with two additional derived fields; no narrowing applied

---

## 1. Surface Inventory

> **Plain opener:** The home page shows 59 distinct things. About 38 are connected to real database data. 5 are real-but-wrong — they read a legacy `health` field instead of the new weighted Progress formula. 3 are hardcoded strings or fake data. About 10 are static labels, buttons, and controls. The rest are loading states, animations, and visual decorations.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| **Loading screen** | | | | |
| 1 | Map loading overlay container | CHROME | `mapLoaded` state gate — fades to transparent on ready | `HomePage.tsx:143-161` |
| 2 | "Loading map…" text + Map icon pulse | CHROME | static string; icon animation | `HomePage.tsx:154-156` |
| 3 | Loading progress bar animation | DECORATIVE | CSS `loading-bar` keyframe — pure visual | `HomePage.tsx:157-159` |
| **MapView — Mapbox map** | | | | |
| 4 | Map tile rendering (light/dark style) | WIRED | `isDark` from `useShellContext` → `mapbox://styles/mapbox/light-v11` or `dark-v11` | `MapView.tsx:57-65,104-111` |
| 5 | Property pin positions (all properties) | WIRED | `p.lat`, `p.lng` per `Property` entity via Supercluster index | `MapView.tsx:49-55,378-424` |
| 6 | Pin tooltip text on hover | WIRED | `tooltip.textContent = p.name` — direct `Property.name` read | `MapView.tsx:205` |
| 7 | Cluster circle — point count number | WIRED | `f.properties.point_count` from Supercluster output | `MapView.tsx:157` |
| 8 | Pin selection highlight (scale + ring shadow) | WIRED | `selectedId` state → CSS transform on `[data-pin]` element | `MapView.tsx:113-128` |
| 9 | Cluster ring pulse animation | DECORATIVE | `cluster-ring-pulse` CSS keyframe | `MapView.tsx:139-145` |
| 10 | Pin enter / emerge animations | DECORATIVE | `pin-appear`, `pin-emerge` CSS keyframes | `MapView.tsx:411-416` |
| 11 | Pin exit / converge animations | DECORATIVE | `pin-exit`, `pin-converge-exit` CSS keyframes | `MapView.tsx:322-337` |
| **Command Palette Trigger bar** | | | | |
| 12 | Search icon (magnifier) | CHROME | `<Search>` Lucide icon — static | `HomePage.tsx:190` |
| 13 | Rotating placeholder text | HARDCODED | `triggerPlaceholders` — 5 fixed strings: "Search properties…", "Find: Phnom Penh land plots", "Find: Q1 2026 valuation report", "Find: Hard title properties", "Find: Vacant properties in Siem Reap" | `HomePage.tsx:52-58,197` |
| 14 | ⌘K keyboard badge | CHROME | `<CommandIcon>` + literal "K" | `HomePage.tsx:199-202` |
| 15 | Quick action: "New Property" → `/add-property` | CHROME | static label + route | `HomePage.tsx:208` |
| 16 | Quick action: "Analytics" → `/analytics` | CHROME | static label + route | `HomePage.tsx:209` |
| 17 | Quick action: "Documents" → opens palette | CHROME | static label + `setCommandOpen(true)` | `HomePage.tsx:210` |
| 18 | Quick action: "Tenants" → `/estate-planning` | CHROME | static label + route | `HomePage.tsx:211` |
| **CommandPalette dialog** | | | | |
| 19 | Search input (placeholder text) | CHROME | `placeholder="Search properties, documents, tenants..."` — static | `CommandPalette.tsx:83` |
| 20 | Property rows: name (up to 5 properties) | WIRED | `properties.slice(0, 5)` → `p.name` | `CommandPalette.tsx:98,109` |
| 21 | Property rows: type + province sub-line | WIRED | `p.type`, `p.province` | `CommandPalette.tsx:114` |
| 22 | Property rows: status badge | WIRED | `p.status` → `statusClasses[p.status]` | `CommandPalette.tsx:119-123` |
| 23 | Property rows: buy price | WIRED | `p.buy` (pre-formatted in `queries.ts`) | `CommandPalette.tsx:116` |
| 24 | Property rows: progress dot color | PARTIAL | `progressClass(p.progress)` where `p.progress = p.health ?? 0` — legacy field, not weighted Progress (PF5 · Q3.S) | `CommandPalette.tsx:113` |
| 25 | Documents section: 4 rows (name, type, modified) | HARDCODED | `mockDocs` array — 4 hardcoded entries with fake names and relative-date strings that never change; `Document` entity never queried (PF7) | `CommandPalette.tsx:67-72,133-159` |
| 26 | Navigate section: 7 items with routes | CHROME | static `[{ label, icon, path }]` array — all routes are real | `CommandPalette.tsx:166-188` |
| 27 | Footer: ↑↓ / Enter / Esc keyboard hints | CHROME | static UI affordance copy | `CommandPalette.tsx:193-210` |
| 28 | Footer: "Valgate Search" label | CHROME | static branding string | `CommandPalette.tsx:211` |
| 29 | Empty state ("No matching properties or documents found") | CHROME | `<CommandEmpty>` — conditional on search returning zero | `CommandPalette.tsx:87-94` |
| **PortfolioLegend (bottom-center stats pill)** | | | | |
| 30 | "Portfolio" label | CHROME | static string | `PortfolioLegend.tsx:34` |
| 31 | Portfolio total value | WIRED | `formatCurrency(stats.totalValue)` ← `computeStats(items).totalValue` = sum of `buyNumeric` across active properties | `PortfolioLegend.tsx:37` |
| 32 | Property count number | WIRED | `stats.totalProperties` ← `computeStats(items).totalProperties` = count of active (non-archived, non-sold) properties | `PortfolioLegend.tsx:47` |
| 33 | "Properties" label | CHROME | static string | `PortfolioLegend.tsx:49` |
| 34 | Rented count number | WIRED | `stats.rentedCount` ← `active.filter(p => p.status === "Rented").length` | `PortfolioLegend.tsx:56` |
| 35 | "Rented" label + green dot | CHROME | static string; dot color hardcoded `bg-status-success` | `PortfolioLegend.tsx:54,58` |
| 36 | Vacant count number | WIRED | `stats.vacantCount` ← `active.filter(p => p.status === "Vacant").length` | `PortfolioLegend.tsx:63` |
| 37 | "Vacant" label + amber dot | CHROME | static string; dot color hardcoded `bg-status-warning` | `PortfolioLegend.tsx:62,65` |
| 38 | Avg Progress value + color | PARTIAL | `stats.avgProgress` ← `computeStats.avgProgress` ← `p.progress` ← `p.health ?? 0` (drift — PF5 · Q3.S); value reads a real DB field but wrong formula | `PortfolioLegend.tsx:87` |
| 39 | Avg Progress color dot | PARTIAL | `progressBgClass(stats.avgProgress)` — color is driven by the same drifted value (PF5) | `PortfolioLegend.tsx:75-81` |
| 40 | "Avg Progress" text label | CHROME | static string | `PortfolioLegend.tsx:80` |
| 41 | Legend pill dividers (×2) | DECORATIVE | `w-px h-4 bg-border-subtle` separators — purely visual | `PortfolioLegend.tsx:41,70` |
| **MapControls** | | | | |
| 42 | Zoom In button | CHROME | `mapRef.current?.zoomIn()` — map control, no data | `MapControls.tsx:26-28` |
| 43 | Zoom Out button | CHROME | `mapRef.current?.zoomOut()` — map control, no data | `MapControls.tsx:29-31` |
| 44 | Reset / fly-to Cambodia button | CHROME | `flyTo({ center: [104.9, 12.5], zoom: 7 })` — hardcoded geographic constant (appropriate config, not a data surface) | `MapControls.tsx:32-39` |
| **Property Drawer (selected pin panel)** | | | | |
| 45 | Hero image | HARDCODED | single Unsplash URL shared across all properties (`photo-1665691964802-956fc06b93cf`) — no `Property.imageUrl` field; no `photoStorageIds[]` read; PF1 **deferred upfront** (gated on Q5.C storage) | `HomePage.tsx:260` |
| 46 | Gradient scrim over hero | DECORATIVE | `bg-gradient-to-t from-black/60` CSS — visual layer only | `HomePage.tsx:265` |
| 47 | Status pill (e.g. "Rented", "Vacant") | WIRED | `drawerProperty.status` with conditional `bg-emerald-500/90` vs `bg-amber-400/90` | `HomePage.tsx:276-282` |
| 48 | Property code (sub-label) | WIRED | `drawerProperty.code` | `HomePage.tsx:286` |
| 49 | Property name (hero overlay h3) | WIRED | `drawerProperty.name` | `HomePage.tsx:287` |
| 50 | Province with MapPin icon | WIRED | `drawerProperty.province` | `HomePage.tsx:289-291` |
| 51 | Buy Price row | WIRED | `drawerProperty.buy` (pre-formatted `formatCurrency(buyNumeric)` from `queries.ts`) | `HomePage.tsx:298` |
| 52 | Size row | WIRED | `drawerProperty.totalArea` + `Number.toLocaleString()` + "m²"; "—" fallback when null | `HomePage.tsx:299` |
| 53 | Type row | WIRED | `drawerProperty.type` | `HomePage.tsx:300` |
| 54 | Title row | WIRED | `drawerProperty.title` + `titleClasses[titleToVariant(title)]` for color | `HomePage.tsx:301` |
| 55 | Progress bar (fill width + color) | PARTIAL | `drawerProperty.progress` = `p.health ?? 0` — legacy field, not weighted Progress (PF5 · Q3.S) | `HomePage.tsx:318-323` |
| 56 | Progress % label + color | PARTIAL | same drift as row 55; `progressClass(drawerProperty.progress)` for text color | `HomePage.tsx:324-327` |
| 57 | Close X button | CHROME | `closeDrawer()` — no data dependency | `HomePage.tsx:267-271` |
| 58 | "View Property" CTA → `/property/${id}` | CHROME | static label; routing uses `drawerProperty.id` (wired, but the button label is chrome) | `HomePage.tsx:337-342` |
| 59 | Drawer slide-in / slide-out animation | DECORATIVE | `slide-in-right` / `slide-out-right` keyframes; `isDrawerClosing` state | `HomePage.tsx:251-253` |
| **PropertyTable accordion** | | | | |
| 60 | "Properties" heading + "Full List" → `/portfolio` | CHROME | static heading; button is a fixed nav link | `HomePage.tsx:354-368` |
| 61 | ChevronUp accordion toggle icon | CHROME | `tableOpen` state drives rotation — UI affordance | `HomePage.tsx:357-361` |
| 62 | Table rows — all data fields | WIRED | `initialProperties` passed as `pageRows`, `filtered`, `properties` props to `<PropertyTable>`; same `PropertyTable` component as `/portfolio`; data fields already audited in `pages/portfolio/datapoints/*.md` — do not re-walk | `HomePage.tsx:381-397` |
| 63 | Accordion open / close animation | DECORATIVE | CSS `grid-rows-[0fr]` → `grid-rows-[1fr]` transition | `HomePage.tsx:374-376` |

**Tally:** WIRED **~38** · PARTIAL **5** · HARDCODED **3** · CHROME **~27** · DECORATIVE **~8**

**Audit-relevant rows (WIRED + PARTIAL + HARDCODED):** ~46. CHROME and DECORATIVE listed for completeness.

**Note — Progress column in table (row 62):** `PropertyTable` receives `initialProperties` which carries `progress = p.health ?? 0` (same drift as PF5). The table's progress-bar column is affected by the same formula gap. Cited from the portfolio audit (where the column is `p.health` after Phase 6 wiring); the home-page pass inherits the same drift. Fix tracked under PF5.

---

## 2. Page-wide findings (7 PFn)

> **Plain opener:** These are problems that affect the whole page rather than one specific number. They're filed once here so that future per-datapoint audits can just reference "PF3" or "PF5" instead of re-explaining the same issue. Three are deferred or cited cross-page; four are actionable in Phase 10.1 or later.

---

### PF1 — Drawer hero image is a single hardcoded Unsplash URL ⏸️ DEFERRED UPFRONT

**Scope:** every drawer panel across all properties  
**What happens:** `HomePage.tsx:260` embeds one Unsplash photo URL for all property drawer panels. Every property displays the same luxury driveway photo. No `Property.imageUrl` field exists in the schema; `Property.photoStorageIds[]` is planned but upload infrastructure is not built.  
**Why deferred:** joint fix with Q5.C (storage provider decision). The wizard's photo upload step and the drawer's hero image must land together so neither ships without the other.  
**Resolution gate:** Q5.C (storage provider) → Q5.Y (imageUrl field vs photoStorageIds[0] — new Q-code filed in this audit)  
**Priority:** P2 · deferred upfront · no action in Phase 10 or 10.1 until Q5.C resolves  
**Tag:** `deferred-upfront`

---

### PF2 — Multi-tenant auth shim: `getCurrentUserId()` returns `"demo-user"` 🔁 CITED

**Scope:** cross-page systemic  
**What happens:** `getHomePageData()` calls `getProperties()` which calls `getCurrentUserId()` (returns the fixed string `"demo-user"`). All property data is user-scoped to this shim — no real authentication boundary exists. Any route that fetches properties shares this vulnerability.  
**Citation:** this is the same systemic concern as `pages/portfolio/audit.md PF1` and `pages/property-id-overview/audit.md PF2`. Resolution tied to Clerk integration (Q4.M).  
**Priority:** P1 systemic · cross-page · deferred to backend phase

---

### PF3 — No `HomeListItem` narrowing — full `Property` object flows to Client Component

**Scope:** `app/(shell)/queries.ts` → `HomePage.tsx` → `MapView.tsx`, `CommandPalette.tsx`, `PropertyTable.tsx`  
**What happens:** `HomeProperty = Property & { buy: string; progress: number }` (`queries.ts:15`). This type extends the **full** `Property` record (which includes `PropertyCore`, `PropertyFinance`, `PropertyLocation`, `PropertyMedia` sub-schemas) with two appended fields. The entire object is spread at `queries.ts:24` (`...p`). `MapView.tsx` only reads `p.id`, `p.lat`, `p.lng`, `p.name` (4 fields). `CommandPalette.tsx` reads `p.id`, `p.name`, `p.code`, `p.province`, `p.type`, `p.status`, `p.buy`, `p.progress` (8 fields). Financial sub-fields (`buyNumeric`, `outstandingMortgage`, `annualPropertyTax`) and location sub-fields (`addressLine`, `postalCode`, `lat`, `lng`) flow to Client Components that do not need them.  
**Comparison:** `/portfolio` has `PropertyListItem` (10-field narrowing at `lib/data/types/property.ts`); `/home` has no equivalent `HomeListItem`.  
**Risk:** over-serialization leaks more property data than the UI consumes; increases client bundle payload; potential PII exposure path when multi-user arrives (Q4.M).  
**Fix in 10.1:** create `HomeListItem` (or `MapPin`-scoped narrowing) in `queries.ts`; update `MapView` props type accordingly.  
**Priority:** P2 · actionable in Phase 10.1

---

### PF4 — Command-palette rotating placeholders are hardcoded copy strings

**Scope:** `HomePage.tsx:52-58` — `triggerPlaceholders` array  
**What happens:** Five strings ("Search properties…", "Find: Phnom Penh land plots", "Find: Q1 2026 valuation report", "Find: Hard title properties", "Find: Vacant properties in Siem Reap") are hardcoded inline. They cycle on a 3.5 s timer. They look like real-data examples but are fixed copy.  
**Decision:** treat as CHROME (intentional UX) with a P3 follow-up flag. A future improvement could populate these from actual seeded property names (`properties[0].name` + province), but this is low priority.  
**Priority:** P3 · CHROME classification · no action in Phase 10.1 unless user requests real-name cycling

---

### PF5 — `stats.avgProgress` and all `p.progress` reads use legacy `Property.health` field 🔴 P2

**Scope:** `app/(shell)/queries.ts:27`, `lib/data/derivations/portfolio.ts:47`, `PortfolioLegend.tsx:87`, `HomePage.tsx:318-327`, `CommandPalette.tsx:113`  
**What happens:** `queries.ts:27` sets `progress: p.health ?? 0`. This means:
- `PortfolioLegend` `avgProgress` value = average of `p.health` across active properties (or 0 when absent)
- Drawer progress bar and % value = `p.health ?? 0` for the selected property
- CommandPalette progress dot color = `progressClass(p.health ?? 0)`

Per memory `project_property_progress_stat` and commit `a468a9a`, "Progress" was renamed from `health` and should now be a **weighted-pillar completeness score** (Location 15% · Financials 20% · Rental 20% · Ownership 15% · Valuation 10% · Safety 10% · Estate 5% · Docs 5%). If `Property.health` was removed from `PropertyCoreSchema` (per Q5.K resolution: "Resolved 2026-05-06: REMOVE the field"), then `p.health ?? 0` evaluates to `0` for all properties — every progress bar would show 0%.  
**New Q-code filed:** Q3.S — is `Property.health` still present in `PropertyCoreSchema`, or was it removed? What should `queries.ts:27` read instead?  
**Fix in 10.1:** replace `p.health ?? 0` with the weighted Progress derivation function (or import from `lib/data/derivations/progress.ts` if it exists).  
**Priority:** P2 · actionable in Phase 10.1 · confirm schema state before fixing

---

### PF6 — No audit log of property mutations 🔁 CITED

**Scope:** cross-page systemic  
**What happens:** property reads on the home route (map pins, drawer, legend, table) involve no write path, but there is also no chain-of-custody log for any mutations that affect the properties displayed here.  
**Citation:** same systemic concern as `pages/portfolio/audit.md PF2` / Q4.P. Resolution: Q4.P was partially resolved 2026-05-07 via `estate-activity-events` entity for estate actions; a broader property-mutation audit log is deferred to the backend phase.  
**Priority:** P1 systemic · cross-page · deferred to backend phase

---

### PF7 — CommandPalette Documents section shows 4 hardcoded mock entries 🔴 P2

**Scope:** `CommandPalette.tsx:67-72`  
**What happens:** `const mockDocs = [...]` defines 4 fake document entries inline. Names ("Land near river - Lease Agreement.pdf", "Siem Reap Land Plot - Title Deed.pdf", "Maintenance Log - Commercial Building", "Portfolio Valuation Report Q1 2026") look like real property documents. `modified` timestamps are relative strings ("2 days ago", "1 week ago") that never update. The `Document` entity (already wired on `/property/[id]/documents`, `/property/[id]/rental`) is never queried here.  
**Fix in 10.1:** replace `mockDocs` with `documents.slice(0, 4)` fetched in `getHomePageData()` from `db.documents.listForUser(userId)` sorted by `uploadedAt` desc; pass to `<CommandPalette>` as a new prop.  
**Priority:** P2 · actionable in Phase 10.1

---

<details>
<summary>🔍 Source files & hashes (2026-05-14)</summary>

| File | SHA (git hash-object) |
|---|---|
| `app/(shell)/page.tsx` | `bd60cc1d` |
| `app/(shell)/queries.ts` | `309ad30b` |
| `app/(shell)/_components/HomePage.tsx` | `f9f3cbaf` |
| `app/(shell)/_components/PortfolioLegend.tsx` | `c5d44ff7` |
| `components/map/MapView.tsx` | `2ccb121b` |
| `components/map/MapControls.tsx` | `0b060b72` |
| `components/home/CommandPalette.tsx` | `d60f57ee` |
| `lib/data/derivations/portfolio.ts` | `22df8773` |
| `lib/data/types/property.ts` | `27dd0d62` |

Verification commands:
```bash
# Confirm progress drift
grep "health" app/\(shell\)/queries.ts
# Expected: progress: p.health ?? 0 at line 27

# Confirm hero image URL is hardcoded
grep "unsplash" app/\(shell\)/_components/HomePage.tsx
# Expected: 1 match (photo-1665691964802)

# Confirm mockDocs inline array
grep "mockDocs" components/home/CommandPalette.tsx
# Expected: const mockDocs = [...] at line 67

# Confirm no HomeListItem narrowing type
grep "HomeListItem" app/\(shell\)/queries.ts lib/data/types/property.ts
# Expected: zero matches
```
</details>

<details>
<summary>📜 Revision history</summary>

| Rev | Date | Author | Changes |
|---|---|---|---|
| 1 | 2026-05-14 | Phase 10 audit | Initial audit — 63-row Surface Inventory, 7 PFn filed (PF1 deferred-upfront, PF2+PF6 cited, PF3+PF5+PF7 actionable, PF4 CHROME); Q3.S + Q5.Y new Q-codes filed |

</details>
