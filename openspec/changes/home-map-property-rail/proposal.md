## Why

The home page (`/`) is a full-bleed Mapbox map. Today there is no fast way to *find a specific property on the map from a list* — you either hunt for the right pin visually, open the ⌘K command palette, or expand the bottom "Properties" accordion (which is a heavy full-width data grid, not a locator). The map is the hero, but it has no persistent, scannable index beside it.

The user asked to reshape the current per-pin detail drawer into a **left-side list rail** — "a simple table just to quickly find a property on the map using a list." Real-estate/map products (komoot, Perplexity Places, Zillow) solve this with a list panel beside the map where clicking a row locates the item on the map. We want the komoot variant: a compact list **floating over** the full-bleed map on the left, collapsible from its right edge, so the map stays the hero.

## What Changes

- Add a **left-docked, collapsible property list rail** that floats over the map (does not split the map in half). Collapsed state is a thin handle on the left edge; expanded state slides the panel out with a collapse chevron on its **right** edge (komoot pattern).
- The rail is a **simple, scannable table** of the user's properties: one compact row each — status dot · name · code, with muted progress % · city underneath. No large photo cards.
- A small **search/filter input** at the top of the rail filters the list client-side by name / code / city, so you can find a property fast.
- **Row interaction:** hovering a row highlights its pin on the map; clicking a row **flies the map to that property's pin** and opens the existing right-hand detail drawer. Selection stays in sync both ways (clicking a pin highlights its row).
- **Replace the bottom "Properties" accordion** with the rail — the rail is a strictly better locator and having both is redundant. The `Full List` → `/portfolio` route and ⌘K search are kept.
- **Keep the existing right-hand detail drawer** unchanged as the rich per-property view. Division of labor: **left rail = find + locate**, **right drawer = full detail on select**.
- **Desktop-first:** the rail is a `sm:`+ affordance. On phones the map keeps its existing bottom-sheet detail; the list is offered via a lightweight bottom-sheet toggle (kept intentionally simple).

## Capabilities

### New Capabilities
- `home-map-property-rail`: The home map presents a collapsible left-side list rail of the user's properties with search; selecting a row locates the property on the map and opens its detail, replacing the bottom properties accordion as the on-map locator.

### Modified Capabilities
<!-- None: the home map / property drawer has no existing OpenSpec capability spec; this behavior is captured under the new capability above. -->

## Impact

- **UI:** `app/(shell)/_components/HomePage.tsx` — add the left rail; remove the bottom "Properties" accordion; keep the ⌘K trigger, right detail drawer, legend, and map controls. Adjust the top ⌘K trigger's left offset when the rail is open (it already offsets right when the drawer opens).
- **New component:** a `PropertyRail` (list + search + collapse) under `app/(shell)/_components/` — compact rows bound to `HomeProperty` (`name`, `code`, `status`, `progress`, `city/province`, `lat/lng`), reusing `progressClass`/status styling already in `lib/property-helpers`.
- **Map interaction:** reuse the existing `mapRef` (already captured via `MapView.onMapReady`) to `flyTo` the selected property; reuse existing `selectedPin` / `hoveredProperty` state. No `MapView` API change required.
- **No backend change:** `getHomePageData` already returns the properties the rail needs; no new query, service, or schema.
- **Non-goals:** not building portfolio-grade filtering/sorting (that lives at `/portfolio`); not changing the right detail drawer's contents; not a full mobile redesign of the list; no map clustering/marker changes.
