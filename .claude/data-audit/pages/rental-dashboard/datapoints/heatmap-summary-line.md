---
slug: rental--heatmap-summary-line
data_point: "Portfolio Occupancy heatmap — summary line (occupied · vacant · expiring counts) — row 41"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ Resolved with PF3 · summary derived from live heatmapClusters prop via useMemo"
---

# Audit — Heatmap summary line on /rental
_Last revised: 2026-05-07 · Revision 1. Lite report — row 41 of the page inventory (1 surface: "X occupied · Y vacant · Z expiring soon")._

## TL;DR
- ✅ Summary line is fully derived from the live `heatmapClusters` prop — resolves automatically with PF3 fix
- ✅ Was PARTIAL (wired to mock array); now computed from real `computeHeatmapData` output
- 🔧 No fix needed; counts are consistent with tile rendering

_Derived from `PropertyCluster[]` via `useMemo` in `components/rental/HeatmapGrid.tsx:85–92`. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Surface | Source | Status |
|---|---|---|
| "X occupied" count | `data.flatMap(c => c.units).filter(u => u.status === "occupied").length` | ✅ WIRED |
| "Y vacant" count | same flatMap, filter `"vacant"` | ✅ WIRED |
| "Z expiring soon" count | same flatMap, filter `"expiring"` | ✅ WIRED |

**Consistency:** The three counts are computed from the same `data` array that drives the tile grid, so summary line and tile grid are guaranteed consistent — no separate derivation or prop.

## §8 Findings

No findings. This surface is a simple `useMemo` aggregation over the live prop. Identity with the tile counts is structural.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: components/rental/HeatmapGrid.tsx
    sha: 5417a445c33cb4e2f91d3058843b0f28da3ec090
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
```

</details>
