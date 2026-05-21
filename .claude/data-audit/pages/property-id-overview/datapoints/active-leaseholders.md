---
slug: property-id-overview--active-leaseholders
data_point: "Active Leaseholders table — rows (initials, name, unit, rent, status badge)"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P2)"
---

# Audit — Active Leaseholders Table on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows 1 row: Sok Dara / Unit 1A / $850 / Paid (LEASE-0001 + TEN-0001 seed)
- ⚠️ 2 findings · 1 P1 (Lease[] + Tenant[] ship userId to browser) · 1 P2 (fallback "?" initials for tenantId-less leases is unusual; "—" would be consistent)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this table? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the join logic match the label? | ✅ |
| 4 | Render | How do rows reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The Active Leaseholders table shows a row for each lease that is currently signed and in-date, joined to the associated tenant record to get the tenant's name, status, and initials. For PROP-0001 there is one active lease, so the table shows one row: Sok Dara in Unit 1A at $850/mo with a Paid badge.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, left column, below the Summary Row cards |
| Label | "Active Leaseholders" |
| Main formula | `activeLeases.map(l => join Tenant via l.tenantId)` |
| Reads from | leases + tenants for PROP-0001 |
| Canonical home | client (derived in PropertyOverviewPage) |
| Edge cases | no active leases → empty-state "—" cell spanning all 4 columns; lease with no tenantId → initials "?", name "—" |

## 2. Entity — ✅

| Field | Source entity | Notes |
|---|---|---|
| initials | `Tenant.name.charAt(0)` | first letter of name; "?" if no tenant linked |
| name | `Tenant.name` | `"—"` if `l.tenantId` is undefined or tenant not found |
| unit | `Lease.unit` | string e.g. "Unit 1A" |
| rent | `Lease.monthlyRent` | formatted `"$" + toLocaleString` |
| status | `Tenant.status` | `"Paid" \| "Overdue" \| "Pending"` |
| statusOk | `Tenant.status === "Paid"` | drives badge color (emerald vs danger) |

## 3. Formula — ✅

> **Plain opener:** For each active lease, the formula looks up the linked tenant by `tenantId`. If no tenant is linked, it safely falls back to "—". The active-lease filter is identical to the Monthly Income formula so both surfaces reflect the same set of leases.

**Formula (verbatim):**
```ts
const activeLeaseholders = activeLeases.map(l => {
  const t = l.tenantId ? tenantMap.get(l.tenantId) : undefined;
  return {
    initials: t ? t.name.charAt(0).toUpperCase() : "?",
    name: t?.name ?? "—",
    unit: l.unit,
    rent: "$" + l.monthlyRent.toLocaleString("en-US"),
    status: t?.status ?? "—",
    statusOk: t?.status === "Paid",
  };
});
```

**Active-lease filter:** `stage === "Signed" && startDate <= now && endDate >= now` (same as Monthly Income — Rule 3 consistency check: ✅ both use the same `activeLeases` array).

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001 active? | ✅ (Signed, Oct 2025–Oct 2026) |
| LEASE-0001.tenantId | "TEN-0001" |
| TEN-0001.name | "Sok Dara" |
| initials | "S" |
| unit | "Unit 1A" |
| rent | "$850" |
| status | "Paid" → statusOk=true → emerald badge |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyOverviewPage>` Active Leaseholders table tbody |
| Prop chain | `leases[]` + `tenants[]` → `activeLeases` → `tenantMap` → `activeLeaseholders` → table rows |
| Empty state | `activeLeaseholders.length === 0` → `<td colSpan={4}>—</td>` |
| Animation | per-row fade-up on `mounted`, with staggered `animationDelay` |

**PII / IDOR**
- `Lease[]` and `Tenant[]` both carry `userId` to browser. See **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).
- Auth shim: see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Table row count ≤ Tenant Mix donut Signed count | PROP-0001: 1 row = 1 Signed lease | ✅ |
| Table rent = Lease.monthlyRent | "$850" from LEASE-0001.monthlyRent=850 | ✅ |
| Table status = Tenant.status | "Paid" from TEN-0001.status | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |
| Initials fallback "?" vs "—" convention mismatch | 🔵 | F2 |
| Auth shim | ⚠️ shim | Page-wide: see **PF2** |

## 7. Meaning — ✅

```
Label rendered:           "Active Leaseholders"
Formula chosen:           activeLeases (Signed + in-range) joined to Tenant
User's likely inference:  tenants currently renting this property
Match?                    ✅
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same finding as `property-id-overview--monthly-income` F1, extended to `Tenant[]`. Both arrays ship to `<PropertyOverviewPage>` (a `"use client"` component) without narrowing. `Tenant.userId` is never rendered on this page. Fix: narrow both arrays in `overview/queries.ts` (same `LeaseItem` type as Monthly Income F1; add `TenantItem = Pick<Tenant, "id" | "propertyId" | "name" | "unit" | "rent" | "status" | "email" | "phone">`).

---

### 🔵 F2 — Initials fallback uses "?" rather than "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` activeLeaseholders map — `initials: t ? t.name.charAt(0).toUpperCase() : "?"`

**Problem:** Every other empty-state in this component and in the rental component uses `"—"` as the no-data convention (per Rule 2 sweep). The "?" initials fallback (for leases where `tenantId` is absent) is inconsistent with this convention.

**Fix:** Change to `initials: t ? t.name.charAt(0).toUpperCase() : "—"`.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> Active Leaseholders tbody rows
sources:
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/types/tenant.ts
    sha: 6be7b1c46d267aca038e42a68d9a1e4aa7746937
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
  - path: lib/data/db/tenants.ts
    sha: 9cd6cce0db72120d4a9d73a59936ec9012e0eacd
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Active leases for PROP-0001 joined to tenants
node -e "
const fs = require('fs');
const now = Date.now();
const lDir = 'public/data/users/demo-user/leases';
const tDir = 'public/data/users/demo-user/tenants';
const leases = fs.readdirSync(lDir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(lDir+'/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001' && r.stage === 'Signed' && r.startDate <= now && r.endDate >= now);
const tenants = fs.readdirSync(tDir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(tDir+'/'+d.name+'/core.json','utf8')));
const tMap = Object.fromEntries(tenants.map(t => [t.id, t]));
leases.forEach(l => {
  const t = tMap[l.tenantId];
  console.log(l.id, t?.name, l.unit, l.monthlyRent, t?.status);
});
"
# Expected: LEASE-0001 Sok Dara Unit 1A 850 Paid
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1.
- Golden-value check ✅: LEASE-0001 + TEN-0001 → "S Sok Dara Unit 1A $850 Paid".
- 2 findings: F1 (userId leak in both arrays), F2 ("?" vs "—" initials fallback).

</details>
