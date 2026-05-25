# Phase 3 — Mobile Optimization Pass

## Context

The Valgate web app is currently a squeezed desktop layout on mobile (≤ 484px viewport). Tables overflow, KPI grids stay multi-column, sidebars and detail panels don't stack, and chrome elements (search, AI button, command palette) are not tuned for thumb reach.

**Goal:** Every page reads as a vertical scroll of clearly-bounded sections/cards, with the highest-priority data points at the top. Each visual element gets its own card/section instead of sharing crowded rows. Reference pattern: `/settings`, which already does this well via `grid-cols-1 sm:grid-cols-3`.

**Scope:** 6 areas — mobile shell chrome, four pages (`/portfolio`, `/rental`, `/estate-planning`, `/analytics`), and 2 mobile fixes on `/` (HomePage — `AppHeaderProperties` + `PortfolioLegend`).

**Tooling during implementation:** `/ui-ux-pro-max` for layout patterns, `/impeccable` for polish/animations/typography, **Mobbin MCP** (`mcp__mobbin__search_screens`) for reference designs from production mobile apps.

**Out of scope:** `/settings` (already good per user), Convex/data layer changes (this is purely a layout/UI pass), backend logic.

---

## Codebase facts (from exploration)

**Breakpoints:** Standard Tailwind v4 — `sm: 640px`, `md: 768px`, `lg: 1024px`. The shell already toggles desktop/mobile at `sm:` (`hidden sm:flex` / `sm:hidden`). The `useIsMobile` hook in `components/ui/use-mobile.ts` uses 768px (Tailwind `md:`); the layout convention uses `sm:`. We'll keep using `sm:` for layout, reserving `useIsMobile` for runtime branching where unavoidable.

**Safe areas:** `pt-safe` / `pb-safe` utilities are already wired (Dynamic Island / home indicator).

**Existing FAB:** None. Will need to build one.

---

## 1. Mobile shell chrome

### PhoneTopBar — `components/layout/PhoneTopBar.tsx`

| Change | Location | Detail |
|---|---|---|
| Remove search button | lines 121–128 | Delete the search-icon button. `CommandPalette` remains reachable via ⌘K on desktop (no mobile entry point needed). |
| Center logo | lines 80–117 | Currently sits between hamburger (left) and the icon cluster (right). Use 3-column flex (`justify-between`) so the wordmark is visually centered between equal-width left/right groups. |
| Move AI button → FAB | lines 171–178 | Delete from top bar. Replace with a new `<MobileAIFab>` component (see below). |
| Keep | lines 70–77 (hamburger), 131–169 (bell) | Hamburger + Notifications stay. |

### New `MobileAIFab` — new file `components/layout/MobileAIFab.tsx`

- Rendered inside `ShellLayout.tsx` (alongside `PhoneTopBar`, `sm:hidden`).
- Position: `fixed bottom-4 right-4 z-40`, with `bottom: calc(1rem + env(safe-area-inset-bottom))`.
- Visual: 56×56 rounded-full, `bg-interactive-primary text-on-primary shadow-lg`, Sparkles icon, subtle pulse / scale on press.
- Behavior: calls `onOpenAI()` (same handler currently wired in PhoneTopBar at line 175).
- Hide when `aiOpen` is true so it doesn't sit behind the overlay.
- Add small enter animation (fade-up 200ms).

### Sidebar — `components/layout/Sidebar.tsx`

- Line 180 (`title="Architect Core"`) and line 190 (label text) → rename to **`Valgate Agent`**.
- That's the only rename. Icon, color, click handler stay.

### CommandPalette — `components/home/CommandPalette.tsx`

- Once the search button is removed from `PhoneTopBar`, the palette has no mobile trigger.
- Wrap the open path so that on mobile (`useIsMobile() === true`) we don't open it. Two options:
  - **(a)** Don't render the Dialog at all on mobile — cheaper and matches the "desktop-only" intent.
  - **(b)** Render but ignore `setOpen(true)` calls on mobile.
- **Recommend (a):** simpler, no risk of accidental mount, no orphan DOM. Wrap the component body in `if (isMobile) return null;` so any caller (⌘K, `AppHeader`, future callers) is a no-op on mobile.

---

## 2. `/portfolio` mobile — `PropertyTable` → card list

The 9-column table is the biggest violation. Below are 3 mobile layout options, then a recommendation.

### Option A — Card list (RECOMMENDED)
Each property becomes a full-width card stacked vertically. 3-row card layout:
- **Row 1:** Type icon + property name (bold) + status badge (right)
- **Row 2:** Province / city (muted)
- **Row 3:** Size · Buy price · Progress bar (right-aligned)
- Tap card → opens the same detail flow as the desktop row click.

**Why recommend:** matches the "each element its own card" goal exactly; thumb-friendly tap targets; easy to scan top-to-bottom; mirrors property apps in the wild (Mobbin examples available for Zillow, Redfin, Notion-like dashboards).

### Option B — Horizontal scroll table
Keep table structure, wrap in `overflow-x-auto`. Pin first column (name) sticky.

**Tradeoff:** preserves all data but requires horizontal scroll, which is a known anti-pattern on mobile. Doesn't satisfy "each element its own section" goal.

### Option C — Accordion rows
Compact 2-line summary per row, tap to expand into full detail inline.

**Tradeoff:** denser than cards, but expand/collapse adds interaction cost. Better when there are 50+ items; the portfolio is unlikely that long.

### Plan (assuming Option A confirmed)
- New component: `components/portfolio/PropertyMobileCard.tsx` — extracts the row visual primitives already used at `PropertyTable.tsx:226–311` (icon, badge helpers `typeBadgeClasses`, `statusBadgeClasses`, `titleBadgeClasses`).
- In `PropertyTable.tsx`, branch render: `<table>` on `sm:` and above; `<div className="flex flex-col gap-3">` of `<PropertyMobileCard>` below `sm:`. Keep sort + filter state intact — only the visual changes.
- Reuse: same `PropertyListItem` type, same click handlers, same badge utilities.

---

## 3. `/rental` mobile — `RentalDashboardPage.tsx`

Current desktop sections (kept in order, restacked for mobile):

1. **Hero header** (lines 59–73) — stays compact, smaller title on mobile (`text-2xl` vs `text-4xl`).
2. **KPI Cards** (lines 78–86) — `KpiCards` component:
   - Hero income card: full-width.
   - 2x2 grid: stays 2-col on mobile (already roughly works).
3. **Quick Actions** (lines 91–125) — convert from flex row → horizontal scroll snap (`overflow-x-auto snap-x`) so all 5 buttons remain reachable without wrapping awkwardly.
4. **Asymmetric grid** (lines 130–133) — `LeaseTable` and `HeatmapGrid` stack vertically full-width.
5. **Lease Renewal Pipeline** (lines 138–172) — convert horizontal kanban → vertical stacked stages (each stage = section), OR horizontal scroll snap (pick during impl; vertical stacked is cleaner).
6. **Bottom triptych** (lines 177–283) — Rent Collection, Maintenance Exposure, Upcoming Events each become their own full-width section, stacked.

**Priority reordering on mobile:**
Top → Income (hero), Occupancy %, Collection Rate, Vacancy Loss → Then heatmap → Then everything else. The KPI grid already sorts this way; no reorder needed inside `KpiCards`.

**Animations:** keep parity with desktop — same timings on mobile. (User confirmed: no mobile-specific animation tuning.)

---

## 4. `/estate-planning` mobile — `SuccessionPage.tsx`

Current desktop is a fixed 4/8 column split that ignores `sm:` — biggest violation.

1. **Header + actions** (lines 415–449) — stack title above buttons on mobile; "Add New" becomes primary, "View Analytics" secondary.
2. **Stats grid** (lines 452–460) — keep `grid-cols-1 xs:grid-cols-2` (already responsive).
3. **Property List + Detail Panel** (lines 463–758):
   - On mobile: hide the property list panel by default; show the detail panel of the currently-selected property as the main scroll.
   - At the top of the detail panel, add a "Change property" button that opens a bottom sheet (or full-screen modal) with the property list.
   - This mirrors how property detail apps work on phones (Mobbin will give good references for Real Estate detail views).
4. **Status bar** (lines 570–589) — stays, full width, sticky-ish under header.
5. **Beneficiaries table** (lines 592–666) — convert custom grid → card list, one beneficiary per card with name, role badge, share %, verification status.
6. **Estate documents** (lines 669–704) — `grid-cols-2` → `grid-cols-1` on mobile.
7. **Timeline** (lines 707–738) — stays vertical, already mobile-friendly.

---

## 5. `/analytics` mobile — `AnalyticsPage.tsx`

1. **Title + actions** (lines 82–113) — stack title above search/compare buttons; search becomes full-width.
2. **Filters bar** (lines 116–175) — wrap into rows; period tabs row 1, dropdowns row 2, view-mode + export row 3. Or collapse non-period filters behind a "Filters" disclosure to save vertical space. Pick during impl.
3. **KPI strip** (lines 178–182) — 5-col → `grid-cols-2` on mobile. Each KPI is its own card.
4. **Primary content** (lines 185–336) — stack:
   - Revenue vs Expenses chart full-width (chart already responsive via Recharts).
   - Occupancy sparkline, Lease Expiry, Saved Reports each become their own section below.
5. **Bottom row** (lines 339–455) — already `grid-cols-1 sm:grid-cols-3`. No change.

---

## 6. HomePage mobile fixes — `AppHeaderProperties` + `PortfolioLegend` (484×1005)

Per the page feedback, both flagged flex elements are at **484×1005 mobile viewport** (not desktop — the original prompt was mislabeled).

### `AppHeaderProperties` — `app/(shell)/_components/HomePage.tsx:185–232`

Issues at 484px:
- Container is positioned `absolute` with `right: selectedProperty ? "20rem" : 0`. On mobile the property drawer sits at the **bottom**, not the right, so the 20rem right offset is wrong on mobile and pushes the header off-center / cuts width.
- Search bar is `w-[700px] max-w-[calc(100%-3rem)]`. `max-w` saves it from overflow but the `w-[700px]` is still semantically wrong for mobile.
- Quick actions row (4 buttons, `flex items-center gap-3`) likely wraps awkwardly or pushes the row outside the visible width at 484px.

Fixes:
- Container: drop the right-drawer offset on mobile — `right: { mobile: 0, sm+: selectedProperty ? "20rem" : 0 }`. Cleanest is a `sm:right-*` Tailwind class instead of inline style.
- Search bar: change to `w-full max-w-[700px]` with `mx-4 sm:mx-0`. Always fills available width on mobile, capped at 700px on desktop.
- Quick actions: switch to `flex-wrap` on mobile (allow 2-row wrap) **or** convert to `overflow-x-auto snap-x` horizontal scroll. Recommendation: **horizontal scroll** — keeps the row visually compact and lets all 4 stay reachable. Each button needs `flex-shrink-0`.

### `PortfolioLegend` — `app/(shell)/_components/PortfolioLegend.tsx:25–27`

Issues at 484px:
- `whitespace-nowrap` + 4 stat groups + dividers in a single row = overflows the viewport. The pill is wider than 484px even without the drawer offset.
- `absolute bottom-4` placement also competes with the mobile FAB we're introducing in Section 1.

Fix:
- **On mobile**, change the layout from a horizontal pill → a compact 2×2 grid card. Same glass-panel styling, same 4 stats (Value, Rented, Vacant, Avg Progress), arranged as 2 rows of 2.
- Keep `absolute bottom-4` placement but offset so it doesn't overlap the new FAB (FAB at `right-4`, legend at `left-4 right-20` on mobile, or stack the FAB to the legend's right edge — TBD during impl).
- Alternative if it still feels cramped: move the legend out of the absolute bottom-anchored layer entirely on mobile and into the normal scroll flow below the search bar. Decide during impl based on visual weight.

---

## Critical files

| File | Purpose |
|---|---|
| `components/layout/PhoneTopBar.tsx` | Remove search + AI button, center logo |
| `components/layout/ShellLayout.tsx` | Mount new `MobileAIFab` |
| `components/layout/MobileAIFab.tsx` *(new)* | Floating AI button, mobile-only |
| `components/layout/Sidebar.tsx` | Rename "Architect Core" → "Valgate Agent" (lines 180, 190) |
| `components/home/CommandPalette.tsx` | Bail out on mobile |
| `components/portfolio/PropertyTable.tsx` | Branch desktop table vs mobile card list |
| `components/portfolio/PropertyMobileCard.tsx` *(new)* | Card variant of property row |
| `app/(shell)/rental/_components/RentalDashboardPage.tsx` | Stack sections on mobile |
| `app/(shell)/estate-planning/_components/SuccessionPage.tsx` | Stack 4/8 grid; bottom-sheet property switcher |
| `app/(shell)/analytics/_components/AnalyticsPage.tsx` | Stack KPI strip + main grid on mobile |
| `app/(shell)/_components/HomePage.tsx` | Fix `AppHeaderProperties` width behavior |
| `app/(shell)/_components/PortfolioLegend.tsx` | Fix overflow when drawer open |

---

## Reusable functions / utilities to lean on

- `typeBadgeClasses()`, `statusBadgeClasses()`, `titleBadgeClasses()` in `PropertyTable.tsx` — reuse in `PropertyMobileCard`.
- `KpiCard` (`AnalyticsPage.tsx:464–494`), `StatCard` (`SuccessionPage.tsx:100–155`) — already card-shaped, just need responsive parent grid.
- `PropertyCard` inside `SuccessionPage.tsx:157–206` — already mobile-friendly card pattern; can lift the pattern for `PropertyMobileCard`.
- Settings page's responsive section helper at `app/(shell)/settings/_components/SettingsPage.tsx:11–16` + `:67–68` — the canonical "stack on mobile" pattern; mirror this everywhere.
- `useIsMobile` in `components/ui/use-mobile.ts` — for runtime branching (e.g. `CommandPalette`, `MobileAIFab` visibility).
- Mobbin MCP (`mcp__mobbin__search_screens`) — use during implementation to validate card patterns against real-world property/finance apps.

---

## Implementation order (when we leave plan mode)

1. Shell chrome (PhoneTopBar, MobileAIFab, Sidebar rename, CommandPalette gate) — small, isolated wins.
2. `/portfolio` PropertyTable → card list — biggest user-facing win.
3. `/rental` stacking pass.
4. `/estate-planning` stacking + property-switcher bottom sheet.
5. `/analytics` stacking pass.
6. Desktop `AppHeaderProperties` + `PortfolioLegend` fixes.
7. Polish pass with `/impeccable` and Mobbin MCP cross-checks.

---

## Verification

For each section, smoke-test at three viewports: **375×812** (iPhone SE), **484×1005** (user's reference viewport), **1496×804** (desktop check for regressions).

- Run `bun dev` (or `pnpm dev`), open each page, toggle viewport in DevTools.
- Confirm:
  - PhoneTopBar shows hamburger + centered logo + bell only.
  - FAB visible bottom-right; opens AI overlay; hides when overlay is open.
  - Sidebar label reads "Valgate Agent".
  - ⌘K does nothing on mobile (or palette doesn't render).
  - `/portfolio` shows a vertical card stack on mobile, table on desktop.
  - `/rental`, `/estate-planning`, `/analytics` scroll cleanly top-to-bottom with each section as a discrete card.
  - `/settings` unchanged.
  - Desktop `/` no longer has the two flagged flex issues.
- No TypeScript errors: `bun run typecheck` (or equivalent).
- Visual regression: spot-check Convex-fed pages still render real data (no UI-only mocks introduced — per `CLAUDE.md` rule).

---

## User decisions (confirmed)

1. **PropertyTable mobile layout:** Option A — full-width stacked card list.
2. **HomePage flagged flex elements (at 484×1005, mobile):** `AppHeaderProperties` search bar/quick actions + `PortfolioLegend` pill. Fixes spec'd in Section 6.
3. **`/estate-planning` property switcher on mobile:** Bottom sheet — tap "Change property" → sheet slides up with the property list.
4. **Animations:** Keep parity with desktop — same timings on mobile, no special mobile tuning.
