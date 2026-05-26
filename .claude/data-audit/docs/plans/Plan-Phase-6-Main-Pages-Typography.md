# Phase 6 — Main Pages Mobile Typography & Hierarchy

## Status: Implemented

Applied Phase 5 nine-tier type scale across all main shell routes. Eliminated sub-11px primary UI labels on portfolio cards, rental KPIs, lease table, heatmap legend, analytics charts, home drawer, and portfolio legend.

## Tooling decisions (implementation log)

**ui-ux-pro-max:** Confirmed modular type scale (12/14/16/18/24/32), sequential heading hierarchy, 11px minimum for data labels on mobile dashboards. Valgate keeps existing Geist + inline Phase 5 nine-tier scale — no font family change.

**Mobbin MCP:** Not enabled in workspace; manual reference targets: Zillow/Redfin property cards (11–12px labels, 22px+ values), rental KPI apps (hero + 2×2 secondary grid), map drawer field labels at 11px on scrim.

**impeccable (.impeccable.md):** Hierarchy over decoration; fixed rem scale; 11px Stat Label floor; tabular-nums on KPI values; light-mode contrast on Home drawer (`text-white/70` labels).

---

See attached plan for full file list and verification checklist.
