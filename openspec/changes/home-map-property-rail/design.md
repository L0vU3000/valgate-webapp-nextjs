## Context

`app/(shell)/_components/HomePage.tsx` is a client component that owns the whole home experience:

- A full-bleed `MapView` (dynamic, `ssr:false`) with `selectedPin` / `hoveredProperty` state and a captured `mapRef` (via `onMapReady`).
- A top-center ⌘K command trigger + quick-action chips (offsets `sm:right-80` when the right drawer is open).
- A **right-hand detail drawer** (`sm:right-4 sm:top-4 sm:bottom-4 sm:w-80`, bottom sheet on phone) that opens on pin-click and renders hero + progress + Property/Physical/Location/Financials + CTA.
- A **bottom "Properties" accordion** that expands a full `PropertyTable` grid.
- `PortfolioLegend` (bottom-center) and `MapControls` (satellite toggle etc.).

`MapView` reacts to `selectedId` only by scaling/highlighting the matching marker; it does **not** pan to it. `HomeProperty` (from `app/(shell)/queries.ts`) already carries `id, name, code, status, progress, city, province, lat, lng, type, …`. `lib/property-helpers` provides `progressClass` / `progressBgClass` / `titleToVariant`.

This change adds a left list rail as a *new locator surface* and retires the bottom accordion. It is UI-only; the data and map already support it.

## Goals / Non-Goals

**Goals:**
- A persistent, scannable left rail to find a property and locate it on the map.
- Full-bleed map preserved — the rail *floats over* the map (komoot), it does not split the viewport (not Zillow's half-map).
- Collapsible: thin handle when closed, panel with a right-edge chevron when open.
- Search-to-filter, hover-to-highlight-pin, click-to-fly-and-open-detail. Two-way selection sync with pins.
- Reuse existing state (`selectedPin`, `hoveredProperty`, `mapRef`) — no `MapView` prop changes.

**Non-Goals:**
- Portfolio-grade multi-column sort/filter (that is `/portfolio`).
- Changing the right detail drawer's contents or the map's markers/clustering.
- A full mobile list redesign — phone keeps the existing bottom-sheet detail; the list gets a simple sheet toggle.
- Any backend/query/schema change.

## Decisions

### D1: Left rail floats over the map (komoot), not a split column (Zillow)

Render a `PropertyRail` absolutely-positioned on the left of the map area (`sm:left-4 sm:top-4 sm:bottom-4 sm:w-72`), same floating-card treatment as the right drawer (`bg-glass-panel-fill backdrop-blur-md border`). The map stays full-bleed underneath.

- **Why:** The map is the product's hero; halving it (Zillow) would demote it. komoot/Perplexity keep a full map with a floating list — matches the user's "quickly find a property *on the map*."
- **Alternative — split layout (map | list):** stronger for pure browsing, but changes the whole page's spatial model and shrinks the map. Rejected for this surface.

### D2: Collapsible with the seam on the right edge

Two states driven by one `railOpen` boolean:
- **Open:** the `w-72` panel is visible with a collapse chevron (`‹`) pinned to its **right** edge (`ChevronLeft`), plus the phone grab-handle idiom is not needed on desktop.
- **Collapsed:** the panel slides left off-canvas, leaving a thin vertical **handle/tab** on the left edge (an icon button, e.g. `PanelLeft` / `ListIcon`) that reopens it (`ChevronRight`).

Animate with the same `cubic-bezier(0.16,1,0.3,1)` slide the drawer uses (`slide-in`/`slide-out` on the X axis). Default `railOpen = true` on desktop.

- **Why:** Directly matches the ask ("on the left side… opens up from the right side") and the komoot reference (chevron on the panel's inner/right edge). The left-edge handle keeps the map uncluttered when closed.

### D3: Compact table rows bound to `HomeProperty`

Each row is one selectable button:
- Top line: a **status dot** (Rented = emerald, Vacant = amber, else neutral — mirror the drawer's status pill colors) · **name** (truncate) · **code** (muted, `text-[11px] uppercase tracking`).
- Second line (muted): **progress %** (colored via `progressClass`) · **city, province**.
- No thumbnail — keeps it a fast-scan *table*, not a card list (the user said "simple table"). (A small thumbnail is a deliberate later option, not in this cut.)
- States: `hover` → set `hoveredProperty` (pin highlights); `selected` (`selectedPin === id`) → tinted background + left accent bar.

- **Why:** "Simple table just to quickly find" — density and scan speed over richness. Reuses existing helpers so styling stays consistent with the drawer and portfolio table.

### D4: Row interaction reuses existing selection + `mapRef.flyTo`

- **Hover row →** `setHoveredProperty(id)` / clear on leave. (`MapView` already consumes hover highlighting via the pin styling; if not wired for hover, this is a no-op visually and safe — highlight-on-select still works.)
- **Click row →** `setSelectedPin(id)` (opens the existing right drawer + highlights the pin) **and** `mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 600 })`. If the property has no real coords (`lat === 0 && lng === 0`), skip the fly and just select.
- **Click pin (unchanged) →** already sets `selectedPin`; the rail row for that id shows selected and scrolls into view (`scrollIntoView({ block: "nearest" })`).

- **Why:** Zero new map plumbing — the ref is already captured and `flyTo` is the stock Mapbox call. Selection is a single source of truth (`selectedPin`) shared by pins, rail, and drawer.

### D5: Search filters the rail client-side

A small search input at the top of the rail (icon + text) filters `initialProperties` in memory by `name` / `code` / `city` (case-insensitive `includes`). Empty query = full list. Show a tiny empty state ("No properties match") when filtered to zero.

- **Why:** "Quickly find" is the core job. The set is small and already in memory (`initialProperties`), so client-side filtering is instant and needs no server round-trip. This is distinct from ⌘K (global search across documents/tenants too) — the rail search is scoped to *properties on this map*.

### D6: Retire the bottom "Properties" accordion; adjust the top trigger offset

- Remove the bottom accordion block (the `PropertyTable` + `tableOpen` state and its animation config) from `HomePage`. `PropertyTable` itself stays (used by `/portfolio`).
- The top ⌘K trigger currently shifts `sm:right-80` when the right drawer is open; add a matching **left** offset (`sm:left-72`-ish) when the rail is open so the trigger stays centered in the remaining map space. Both offsets can apply at once (rail left + drawer right).
- Keep `PortfolioLegend` bottom-center (it already dodges the drawer via `drawerOpen`); pass rail-open state if it needs to dodge the rail too.

- **Why:** The rail replaces the accordion's "browse my properties" job with a better locator. Layout math must account for a left-anchored panel the page didn't have before.

### D7: Mobile stays simple

The rail is `hidden` below `sm`. On phones:
- Keep the existing bottom-sheet detail (unchanged).
- Offer the list via a small floating **"Properties" button** that opens a bottom sheet containing the same compact list + search (reuse the rail's list body). Tapping a row flies the map, closes the sheet, and opens the detail sheet.

- **Why:** A left rail doesn't fit a phone; a bottom sheet is the platform-correct pattern and reuses the same list component. Kept minimal to avoid a mobile redesign in this change.

## Risks / Trade-offs

- **Two panels open at once** (rail left + detail right) could crowd a narrow desktop → both are `w-72`/`w-80` with the map between; on `sm` (small tablets) consider auto-collapsing the rail when the detail drawer opens. Leaning: allow both, revisit if QA feels tight.
- **Hover highlight may not be wired in `MapView`** → treat hover as best-effort; the guaranteed feedback is select+fly on click. Not a blocker.
- **Losing the bottom data grid** on `/` → mitigated by `Full List` → `/portfolio` and the richer rail; the grid was rarely the fast path anyway.
- **`flyTo` with clustered pins** — flying to a property inside a cluster may land on the cluster, not a separate pin → acceptable; zoom 15 generally breaks clusters apart, and selection still highlights.

## Migration Plan

1. Build `PropertyRail` (list body + search + collapse chrome) as a new component; bind to `HomeProperty`.
2. Mount it in `HomePage`; wire hover/click to existing `hoveredProperty` / `selectedPin` / `mapRef.flyTo`.
3. Remove the bottom accordion (`tableOpen`, the `PropertyTable` block, `HOME_TABLE_ANIMATION`); adjust the top trigger's offset for the open rail.
4. Add the mobile bottom-sheet list toggle reusing the rail's list body.
5. Verify with `tsc`/eslint + live QA (the `/verify` + `/code-build-loop` loop).
6. Rollback = revert `HomePage` + delete `PropertyRail`; nothing else touched.

## Open Questions

- Should the rail auto-collapse when the right detail drawer opens on smaller desktops, or always stay open? Leaning: stay open on `lg+`, auto-collapse on `sm`–`md` if it feels tight in QA.
- Include a tiny thumbnail per row (warmer, komoot-ish) or stay text-only (faster scan)? Leaning: text-only for this cut; thumbnail is a one-line follow-up if the user wants it.
- Sort order of the list — as returned (`getHomePageData` order) vs alphabetical vs by progress? Leaning: keep source order for now; sorting belongs to `/portfolio`.
