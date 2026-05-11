---
slug: rental--heatmap-unit-tiles-mocked
data_point: "Portfolio Occupancy heatmap — property tiles grouped by province (row 40, N tiles)"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ All tiles wired · PF3 fixed · Q4.T resolved (properties by province, no Unit entity)"
---

# Audit — Portfolio Occupancy heatmap tiles on /rental
_Last revised: 2026-05-07 · Revision 1. Bundled lite report — row 40 of the page inventory (N tiles from 16 live properties)._

## TL;DR
- ✅ All tiles wired via `computeHeatmapData` — no hardcoded tile data remains
- ✅ Q4.T resolved: each tile = one Property, grouped by `city || province` into suburb clusters
- 🔧 One cosmetic gap: `unit.tenant` shows `Lease.unit` string (not Tenant.name) — acceptable for Phase 8.2; Tenant join deferred

_Reads from `Property` (§1) and `Lease` (§4) via `computeHeatmapData` → `heatmapClusters` prop. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Surface | Source after wiring | Status |
|---|---|---|
| Tile colour (occupied / vacant / expiring) | `computeHeatmapData` → `unit.status` | ✅ WIRED |
| Tile tooltip — property name | `Property.name` → `unit.name` | ✅ WIRED |
| Tile tooltip — tenant name | `Lease.unit` → `unit.tenant` (not Tenant.name) | ✅ WIRED (partial — see F1) |
| Tile tooltip — rent / vacancy loss | `Lease.monthlyRent` → `unit.rent` | ✅ WIRED |
| Tile tooltip — lease end date | `Lease.endDate` → `unit.leaseEnd` | ✅ WIRED |
| Cluster heading (suburb/province label) | `Property.city \|\| Property.province` → `cluster.property` | ✅ WIRED |

**Expected clusters from demo-user seed (2026-05-07):**

| Province | Tiles | Occupied | Vacant | Expiring |
|---|---|---|---|---|
| Phnom Penh | 5 | up to 5 | depends on active leases | within 30d end |
| Siem Reap | 5 | up to 5 | — | — |
| Prey Veng | 4 | — | — | — |
| Kampong Chhnang | 1 | — | — | — |
| Kampot | 1 | — | — | — |

_Exact occupied/vacant split depends on active Signed leases at the time of rendering. All 16 seed properties have `city = ""`, so grouping falls to `province`._

## §8 Findings

### 🔵 F1 — Tooltip tenant name shows Lease.unit, not Tenant.name
**P3 nit · confidence: high · `[schema]`**

**Where:** `lib/data/derivations/rental.ts:353` — `tenant: lease?.unit` (the unit field from Lease, which is a room/unit identifier string like "Unit 3A").

**Problem:** The heatmap tooltip labels the occupant using `Lease.unit` instead of joining to `Tenant.name`. The `Tenant` entity is fully wired in Phase 6.1 — a join is trivially available.

**Fix:** In `computeHeatmapData`, accept a `tenants: Tenant[]` argument, build a `tenantMap<tenantId → name>`, and return `tenant: tenantMap.get(lease.tenantId) ?? lease.unit`. Add `tenantsDb.list(userId)` to `queries.ts`. ~30 minutes.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: components/rental/HeatmapGrid.tsx
    sha: 5417a445c33cb4e2f91d3058843b0f28da3ec090
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: lib/data/types/property.ts
    sha: 71c0c01c2edbc2bc740a1ffaa48160ab993bacdd
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
```

</details>
