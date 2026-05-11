---
slug: rental--upcoming-events
data_point: "Upcoming Events timeline — ≤5 event rows (time, title, detail, dot colour) — row 54"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ All wired via computeUpcomingEvents · 14-day horizon · 3 event types"
---

# Audit — Upcoming Events on /rental
_Last revised: 2026-05-07 · Revision 1. Lite report — row 54 of the page inventory (up to 5 event rows)._

## TL;DR
- ✅ Events sourced live from `Lease`, `MaintenanceItem`, and `Payment` — no hardcoded data
- ✅ 14-day forward horizon; events sorted ascending; capped at 5; first event highlighted in blue
- 🔧 P3 nit: `event.detail` for leases shows raw `Lease.tenantId` (an ID string), not the tenant name — Tenant join not resolved

_Reads from `Lease` (§4), `MaintenanceItem` (§9), `Payment` (§6) via `computeUpcomingEvents` → `upcomingEvents` prop. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Surface | Source | Status |
|---|---|---|
| Event time string ("Today · 08:00" / "Tomorrow…" / weekday) | `formatEventTime(c.at)` | ✅ WIRED |
| Event title | `"Lease expiring: " + Lease.unit` / `MaintenanceItem.title` / `"Payment due: " + Payment.kind` | ✅ WIRED |
| Event detail | lease → raw `Lease.tenantId`; maintenance → `"Severity: X"`; payment → `"Amount: $X"` | ✅ WIRED (partial — see F1) |
| Dot colour (blue = first, slate = rest) | index position | ✅ WIRED |
| Active dot animation (first event only) | `active: i === 0` | ✅ WIRED |

**Event inclusion rules (`lib/data/derivations/rental.ts:147–196`):**
- Lease: `endDate` within `[now, now + 14d]`
- MaintenanceItem: `status !== "Resolved"` AND `createdAt >= now - 7d` (recent unresolved items)
- Payment: `status === "Pending"` AND `date` within `[now, now + 14d]`

## §8 Findings

### 🔵 F1 — Lease event detail shows tenantId, not tenant name
**P3 nit · confidence: high · `[render]`**

**Where:** `lib/data/derivations/rental.ts:163` — `detail: l.tenantId ? \`Tenant: ${l.tenantId}\` : ""`.

**Problem:** The detail line under a lease-expiry event reads e.g. "Tenant: TENANT-0001" rather than the tenant's name. `Tenant` entity is fully wired (Phase 6.1), so a join is available.

**Fix:** Accept `tenants: Tenant[]` in `computeUpcomingEvents`, build a name lookup, and substitute `tenantMap.get(l.tenantId) ?? l.tenantId`.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: aa661a28ef303d4f4762cfe662275b3855edeeec
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/types/maintenance-item.ts
    sha: 4c0f8d7864584fc3bb850677f6463415cdf7e968
```

</details>
