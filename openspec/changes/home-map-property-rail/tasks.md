## 1. PropertyRail component (list + search + collapse)

- [x] 1.1 New `app/(shell)/_components/PropertyRail.tsx` (client): props = `properties: HomeProperty[]`, `selectedId`, `onSelect(id)`, `open`, `onToggle()`. (Dropped `onHover` — `MapView` can't consume hover highlight; skipped dead plumbing.)
- [x] 1.2 Compact rows per D3: status dot · name · code (top), progress % (via `progressClass`) · city, province (muted, second line); truncation; no thumbnail. Verified live.
- [x] 1.3 Row states: selected (`selectedId === id`) → tinted bg + left accent bar; `scrollIntoView({ block: "nearest" })` when selected from a pin click.
- [x] 1.4 Search input at top: client-side filter by name / code / city (case-insensitive); empty query = full list; zero-match empty state. Verified: "Olympic" → 8/29, no-match → empty state.
- [x] 1.5 Collapse chrome: open = `w-72` floating card with a `ChevronLeft` collapse button on the **right** edge; collapsed = off-canvas (`-translate-x-96`) with a left-edge `Properties ›` handle to reopen. **Review fix:** split into outer (translate, no clip) + inner (rounded card, `overflow-hidden`) so the right-edge chevron isn't clipped; replaced fragile `calc(100%+…)` translate with a fixed off-canvas shift.

## 2. Wire into HomePage

- [x] 2.1 Mounted `PropertyRail` in `HomePage`; `hidden` below `sm`; added `railOpen` state (default true).
- [x] 2.2 `onSelect(id)` → `flyToProperty`: `setSelectedPin(id)` (opens right drawer) **and** `mapRef.current?.flyTo({ center:[lng,lat], zoom:15, duration:600 })`, skipping fly when `lat===0 && lng===0`. Verified: row click flies map + opens drawer.
- [x] 2.3 Dropped `onHover` (see 1.1) — no `MapView` consumer; not worth dead state.
- [x] 2.4 Two-way sync verified: selected row shows accent + scrolls into view.
- [x] 2.5 Trigger offset: added `railOpen && "sm:left-80"`, composing with `selectedProperty && "sm:right-80"`. Verified centered with both open.
- [x] 2.6 `PortfolioLegend` left as-is (bottom-center; rail is far-left and doesn't overlap). No change needed.

## 3. Retire the bottom accordion

- [x] 3.1 Removed the bottom "Properties" accordion (the `PropertyTable` usage, `tableOpen`/`tableOpenCount` state + effect, `HOME_TABLE_ANIMATION`, markup, and now-dead `ChevronUp`/`Button`/`useShellContext`/`hoveredProperty`). `/portfolio` still reachable via the "Portfolio" quick-action chip.
- [x] 3.2 `components/portfolio/PropertyTable.tsx` untouched (still used by `/portfolio`).

## 4. Mobile list sheet (simple)

- [x] 4.1 Built (phone only, `sm:hidden`): a floating "Properties" button (bottom-left) opens a bottom sheet with the same `RailBody` (search + list).
- [x] 4.2 Row tap in the sheet: `handleMobileSelect` flies the map, closes the sheet, opens the detail sheet.

## 5. Verify

- [x] 5.1 `tsc` clean + eslint clean (fixed a pre-existing unused-import warning too).
- [x] 5.2 QA (live, desktop, Playwright): rail lists all 29; search "Olympic" → 8, no-match → empty state; row click → map flies to pin (zoom 15) + right drawer opens; selected row shows accent + scrolls; collapse (right chevron) → `Properties ›` handle → reopen all work.
- [ ] 5.3 QA (live): property with no coords (0/0) — not explicitly driven; guard is code-verified (`lat===0 && lng===0` skips fly, still selects).
- [ ] 5.4 QA (live, mobile viewport): built but not yet driven at a phone width — **open follow-up**.
- [x] 5.5 Bottom accordion gone; legend, map controls, ⌘K, quick-action chips, AI bar all intact (verified in screenshots).
