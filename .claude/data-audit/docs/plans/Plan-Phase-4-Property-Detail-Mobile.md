# Phase 4 — Mobile Optimization Pass — Property Detail Pages

## Context

Phase 3 (main app pages) is shipped. The Valgate property detail pages (`/property/PROP-XXXX/*`) are now the next mobile target. Today they're squeezed-desktop layouts: the shared chrome header overflows at 484px, multiple sub-pages use `grid-cols-12` / `col-span-N` without mobile gating, several tables force horizontal scroll via `min-w-[…]`, and the Location/Overview map heroes are too tall for a phone viewport.

**Goal:** Same approach that worked in Phase 3 — every page becomes a vertical scroll of clearly-bounded sections/cards, with the highest-priority data at the top. Tables become card lists. Side-by-side details stack. Hero/header gets thumb-friendly density.

**Scope (in order):**
1. Shared chrome — `PropertyLayout` header + tab nav.
2. Per-page passes for the seven sub-pages: Overview, Financials, Ownership, Ownership2, Rental, Location, Documents, Safety.

**Tooling during implementation:** `/ui-ux-pro-max` for layout patterns, `/impeccable` for polish, **Mobbin MCP** (`mcp__mobbin__search_screens`) for reference property-detail apps (Zillow, Redfin, Notion-style detail panes).

**Out of scope:** Convex/data changes, new features, route restructuring, archive flow.

---

## Codebase facts (from exploration)

- **Single shared shell:** `components/property/PropertyLayout.tsx` (249 lines) wraps every sub-page. Header (lines 63–151), tab nav (154–194), then `<children>` content.
- **Tab nav already mobile-friendly:** `overflow-x-auto snap-x snap-mandatory sm:snap-none` ✓ — no rework needed for the tab strip itself.
- **Active ownership route:** `/ownership` → `PropertyOwnershipPage.tsx`. `/ownership2` → `PropertyOwnershipPage2.tsx` exists but isn't linked in the main tabs (redesign branch).
- **No `pt-safe` / `pb-safe` in the property shell** — should add for Dynamic Island and home indicator handling.
- **Reusable patterns** present in pages already: `MetricCell`, `KpiCard`, `KpiStat`, `AttributeChip`, `DeltaBadge`, `MetaCell`, `StackedCardTable`, `OwnerCard` — reuse these where they fit.
- **The shared shell does not contain the hero** — each page renders its own hero/title block (Overview has a full-bleed map background, others have a simpler heading + actions). The "page header" the user flagged means BOTH the chrome header AND each page's hero/title row.

---

## 1. Shared chrome — `components/property/PropertyLayout.tsx`

At 484px the header overflows: breadcrumb + progress badge + `headerSlot` button + bell + more = ~452px of content trying to fit into `px-6` (24px each side) of a 484px viewport.

### Header changes (lines 63–151)

- `px-6 py-3` → `px-3 sm:px-6 py-3`. Drops the side padding by 12px on mobile.
- Add `pt-safe` to the outer container so the header sits below the Dynamic Island.
- Breadcrumb row: hide the literal `"Property"` text and the first `/` separator on mobile (`hidden sm:inline`). Keep the back chevron + `{code} {type}` — still readable, half the width.
- Progress badge: keep the dot + percent; hide the trailing word `"progress"` on mobile (`hidden sm:inline` on that text fragment).
- Right cluster `gap-3` → `gap-1 sm:gap-3`. Tighter spacing between icons.
- `headerSlot` (page-specific button — usually "Edit data" / "Unlock"): on mobile, pages should pass an icon-only button or `null`. We'll patch the two pages that currently pass full buttons (Ownership, Rental, Safety, Location, Financials use `UnlockButton`; check that component supports an icon-only mobile variant or wrap it in a class that hides the label below `sm:`).

### Tab nav (lines 154–194)

- Already scrollable. Add `pt-safe`? No — header above already absorbs it.
- Tab `px-4 py-3 min-h-11` is already thumb-friendly. No change.
- The "soon" badge on the Safety tab uses small text — fine on mobile.

### What stays

- Dropdown menu, notifications panel, archive dialog — all already responsive.
- Sliding active-indicator under tabs — keep.

---

## 2. Per-page passes

For each page, the recurring pattern is: **(a)** stack the hero/title row; **(b)** gate every `grid-cols-N`/`col-span-N` behind `lg:`; **(c)** convert any `min-w-[…]` table to a mobile card list; **(d)** reduce hero map heights.

### 2A. `PropertyOverviewPage.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Hero (map background + title) | 431–497 | Reduce map background height: currently 360px → `h-[240px] sm:h-[360px]`. Title scales via `clamp(28px, 5vw, 58px)` — OK. Hero text container `px-4 sm:px-8` — OK. |
| Attribute chip strip | 502–533 | Wrap chips, already flexes. No change. |
| KPI metrics bar | 535–550 | Already `grid-cols-2 sm:flex` ✓. |
| Main 8/4 split | 553–941 | `grid-cols-12` parent → `grid-cols-1 lg:grid-cols-12`. Left children: `col-span-8` → `lg:col-span-8`. Right sidebar: `col-span-4` → `lg:col-span-4` (and moves below the main column on mobile). |
| Financials + Ownership 2-col | 559 | `xs:grid-cols-2` → `grid-cols-1 sm:grid-cols-2`. |
| Active Leaseholders table | 690–753 | Already uses `StackedCardTable` — verify it stacks cleanly at 484px. If still side-by-side cells, add mobile card branch. |
| Location side-by-side | 944–1041 | `sm:flex-row` (300px sidebar + map) → `flex-col lg:flex-row`. Map height reduced same way as hero. |
| Quick Actions 2×2 | 924–937 | Keep 2-col on mobile. |

### 2B. `PropertyFinancialsPage.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Page header + breadcrumb | 240–289 | Inherits from PropertyLayout. Local "Financials Verified" badge — keep, already small. |
| 5-KPI row | 292–378 | Already `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` ✓ — but each `KpiCard` may still feel cramped at 484px / 2-col. Reduce KpiCard internal padding from `p-5` → `p-4 sm:p-5`. |
| Equity & Financial Position 3-col | 404–506 | Already `flex flex-col sm:flex-row` ✓. Internal `grid-cols-2 sm:grid-cols-4` (line 474) — OK. |
| Value History + Market Insight (7/5) | 510–647 | Already `grid-cols-1 lg:grid-cols-12` ✓. |
| **Comparable Sales table** (7 cols) | 661–709 | **Critical violation.** Convert to mobile card list on `sm:` and below. Each card: address + price + price/sqft (top row), beds/bath + sqft + type (sub-row). Pattern reused from Phase 3's `PropertyMobileCard`. Desktop keeps the table. |
| Bottom 3-card row | 714–799 | Already `sm:grid-cols-3` → change to `grid-cols-1 sm:grid-cols-3` for mobile stacking. |

### 2C. `PropertyOwnershipPage.tsx` (active)

| Section | Lines | Mobile change |
|---|---|---|
| Page header + breadcrumb | 205–248 | Inherits from PropertyLayout. |
| KPI row (4 cards) | 252–279 | `grid-cols-1 xs:grid-cols-2 sm:grid-cols-4` → `grid-cols-2 sm:grid-cols-4` (skip the 1-col stage, 2-col reads better on mobile). |
| Equity + Ownership Split (7/5) | 281–464 | `lg:grid-cols-12` already stacks to 1-col on mobile ✓. |
| Owner cards 2-col | 467–516 | `sm:grid-cols-2` → `grid-cols-1 sm:grid-cols-2`. |
| Acquisition Details + Income Distribution 2-col | 518–626 | Add mobile single-column stack. |
| **Ownership Documents table** `min-w-[560px]` | 628–769 | Convert to mobile card list (same pattern as Financials Comparable Sales above). Desktop keeps the `TableScroll` table. |
| History timeline | 771–807 | Vertical already. No change. |

### 2D. `PropertyOwnershipPage2.tsx` (redesign branch, unrouted)

Note: this page is unrouted but the user is iterating on it. Worth fixing while we're here — same mobile work as Ownership Page plus:

| Section | Lines | Mobile change |
|---|---|---|
| Summary bar (3 KPIs) | 167–196 | `grid-cols-1 xs:grid-cols-3` → `grid-cols-3` so all three sit on one row at 484px (small cards). |
| Equity & Financial + Split | 199–305 | Already stacks. |
| Owner cards | 308–332 | `sm:grid-cols-2` → `grid-cols-1 sm:grid-cols-2`. |
| Tabbed section (Details/Documents/History) | 335–583 | Tab strip already flex. |
| Details tab 2-col with divider | 355–446 | `grid-cols-2 divide-x` → `grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x` (flip the divider direction on mobile). |
| **Documents table** `min-w-[680px]` | 472–530 | Convert to mobile card list (worst overflow in the codebase — 196px over). |

### 2E. `PropertyRentalPage.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Page header | 374–420 | Inherits from PropertyLayout. |
| Unit context line | 423–436 | OK. |
| Lease expiry alert banner | 439–459 | Add `flex-wrap`. |
| KPI row (4 cards) | 462–496 | Already `grid-cols-2 sm:grid-cols-4 divide-y sm:divide-x` ✓. |
| Financial Overview (8) + Lease Summary (4) | 499–608 | `col-span-8` / `col-span-4` → `lg:col-span-8` / `lg:col-span-4`. Parent: `grid-cols-1 lg:grid-cols-12`. Recharts BarChart already `ResponsiveContainer width="100%"` — reduce YAxis width via `width={36}` at mobile (need a `useIsMobile` check or just shrink uniformly). |
| Tenant Profile | 618–693 | `xs:grid-cols-3` → keep, fits at 484px. |
| Maintenance + Documents 2-col | 696–791 | Stack on mobile. |
| Payment History table (5 cols) | 796–910 | Convert to mobile card list (each row → card with date + amount + status). Keep pagination footer. |

### 2F. `PropertyLocationPage.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Page header | 298–348 | Inherits from PropertyLayout. |
| Address & Identity card (4 MetaCells) | 352–356 | Already `grid-cols-2 gap-px sm:grid-cols-4` ✓ — but `gap-px` (1px gap) creates a hairline visual divider grid; at 2-col on mobile this is fine. |
| Mapbox map | 359–412 | Reduce `h-[340px]` → `h-[240px] sm:h-[340px]`. Map expand modal already covers full-screen. |
| KPI row (3 cards) | 425–515 | `grid-cols-1 xs:grid-cols-3` → `grid-cols-3` (small cards fit at 484px). |
| Comparables table (4 cols) + Investment Metrics (7/5) | 517–609 | `lg:grid-cols-12` already stacks. Comparables 4-col table at 484px gives ~121px per column — keep but reduce padding to `px-3 sm:px-6` and `text-[12px] sm:text-[14px]`. |

### 2G. `PropertyDocumentsPage.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Page header | 508–525 | Inherits from PropertyLayout. |
| Folder tiles | 527–575 | Already `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6` ✓. |
| Toolbar (Select + View toggle + Upload) | 579–645 | Convert to a flex-wrap with `gap-2`, primary CTA "Upload" full-width on mobile. |
| **Detail sidebar `w-[180px] shrink-0`** | 438 | On mobile: hide the sidebar entirely (`hidden sm:flex`). When a file is selected on mobile, surface a bottom sheet with the same detail content (uses our existing `Sheet` component with `side="bottom"`). The main file list takes the full width. |
| List/Grid view | 655–673 | Already supports both modes — verify each is mobile-friendly (likely list is fine; grid uses internal cols). |
| Bulk action bar | 677–710 | Already fixed-bottom — keep, ensure it stays clear of the FAB (`right-20` left of FAB on mobile). |

### 2H. `PropertySafetyPageFull.tsx`

| Section | Lines | Mobile change |
|---|---|---|
| Page header | 131–154 | Inherits from PropertyLayout. |
| Status strip (4 MetricCells) | 157–216 | Already `grid-cols-2 sm:grid-cols-4 divide-x divide-y` ✓ — but `divide-x` on a 2-col mobile grid creates only one vertical line; verify it looks intentional. |
| Certifications list | 220–273 | Already `sm:flex-row` ✓. |
| **Inspections table** `min-w-[640px]` (6 cols) | 276–358 | Convert to mobile card list. Each card: date + type + status (top row), inspector + issues + report link (sub-row). |
| Risks (7) + Emergency Contacts (5) | 361–461 | Already `lg:grid-cols-12` ✓. |

---

## 3. Reusable building block — `MobileCardTable` helper (NEW)

Four tables across pages need the same desktop-table → mobile-card pattern (Comparable Sales, Ownership Docs ×2, Inspections, Payment History). Rather than write the branching twice each time, introduce a small helper:

```
components/property/MobileCardTable.tsx — new
```

A typed wrapper that takes:
- `desktop`: the existing `<table>` JSX
- `mobile`: a render function `(rows) => JSX` for the mobile card list

Internally branches via `hidden sm:block` / `block sm:hidden`. Pages call it once per table and pass both renderers inline so the helper stays thin and each page controls its own card visual.

Alternative: keep inline branching per page (no helper). I lean toward the helper because four tables justify the consolidation, but if the helper feels like overkill we can inline.

---

## Critical files to modify

| File | Purpose |
|---|---|
| `components/property/PropertyLayout.tsx` | Mobile header padding, breadcrumb truncation, `pt-safe`, `headerSlot` mobile treatment |
| `components/property/MobileCardTable.tsx` *(new, optional)* | Reusable table → mobile card wrapper |
| `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` | Hero map height, stack 8/4, stack Location, leaseholders cards |
| `app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx` | KPI density, Comparable Sales table → cards, bottom row stack |
| `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` | KPI row 2-col, owner cards stack, Documents table → cards |
| `app/(shell)/property/[id]/_components/PropertyOwnershipPage2.tsx` | Details tab stack, Documents table → cards |
| `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` | 8/4 stack, BarChart YAxis trim, Payment History → cards |
| `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` | Map height, Comparables column padding |
| `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` | Hide detail sidebar on mobile + bottom sheet, toolbar wrap, bulk-bar FAB clearance |
| `app/(shell)/property/[id]/_components/PropertySafetyPageFull.tsx` | Inspections table → cards |

---

## Reusable functions / utilities to lean on

- `useIsMobile()` — `components/ui/use-mobile.ts`. Already used in Phase 3.
- Existing `MetricCell`, `KpiCard`, `KpiStat`, `AttributeChip`, `MetaCell`, `StackedCardTable`, `OwnerCard`, `OwnerCard2`, `FinancialStatCell`, `LedgerChip` — reuse for card variants instead of building new components.
- `Sheet` with `side="bottom"` (`components/ui/sheet.tsx`) — already used for the estate-planning property switcher; reuse for the Documents file detail sheet.
- `MobileCardTable` (new helper, see Section 3).
- Mobbin MCP (`mcp__mobbin__search_screens`) — search "real estate detail", "property documents", "inspection report" for reference card patterns.

---

## Implementation order

1. Shared chrome — `PropertyLayout` header pass + `pt-safe` + breadcrumb truncation. Affects every property page so it lands first.
2. Optional helper — `MobileCardTable` if we commit to the wrapper.
3. Page-by-page in the order users hit them: Overview → Financials → Ownership → Rental → Location → Documents → Safety.
4. (Skip `PropertyOwnershipPage2` until last — it's the redesign branch and isn't routed.)
5. Polish pass: `/impeccable` checks for spacing/typography; Mobbin MCP cross-checks.

---

## Verification

For each property sub-page, smoke-test at three viewports:
- **375×812** (iPhone SE / SE 3)
- **484×1005** (user's reference)
- **1496×804** (desktop regression check)

Checks per page:
- PropertyLayout header fits without overflow; breadcrumb readable; progress badge readable.
- Tab strip still scrollable; active indicator follows the active tab.
- Hero/map heights feel proportional (not eating >40% of screen).
- All wide tables show as card lists on mobile; same data is reachable; sort/filter state preserved (where applicable).
- Documents detail bottom sheet opens, displays correctly, dismisses cleanly.
- Bulk action bar on Documents doesn't overlap the FAB.
- No new TypeScript errors: `npx tsc --noEmit`.
- No regressions to desktop layouts.

---

## User decisions (confirmed)

- **Active ownership page:** `/ownership` → `PropertyOwnershipPage.tsx`. `Page2` is unrouted; we'll fix it last.
- **Wide tables on mobile:** card list (Option A). All 5 wide tables convert.
- **Reusable helper:** yes, introduce `components/property/MobileCardTable.tsx`.
- **Documents detail sidebar on mobile:** hide, surface a bottom sheet on file tap (reusing the `Sheet` component from `/estate-planning`).
- **Map hero heights on mobile:** reduce to `h-[240px]` on Overview and Location.
