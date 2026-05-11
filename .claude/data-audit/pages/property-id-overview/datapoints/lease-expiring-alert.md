---
slug: property-id-overview--lease-expiring-alert
data_point: "Action strip — lease-expiring alert items (derived from Lease.endDate)"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · Q4.F default documented"
---

# Audit — Lease-Expiring Alert on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — no lease alert shown for PROP-0001 (LEASE-0001 expires Oct 2, 2026, 150 days from today — beyond the 30-day threshold)
- ⚠️ 3 findings · 1 P1 (Lease[] userId to browser) · 1 P2 (HVAC alert stays hardcoded — MaintenanceItem Phase 6.x) · 1 P3 (alert badge count includes hardcoded HVAC, so "1 action pending" persists even with no real lease issues)
- 🔧 Top fix: narrow Lease[] server-side (F1)
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers a lease alert? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the 30-day window logic hold? | ✅ |
| 4 | Render | How do alerts reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the alert promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **Q4.F** — Open question: should lease-expiring alerts be derived at query time (current approach) or stored as Notification rows? Default: derive at query time. See `ref/05-open-questions.md`.

---

## 1. Snapshot — ✅

> **Plain opener:** The action strip shows a lease-expiring alert for each signed lease that is within 30 days of its end date. If no leases are expiring soon, no lease alert appears. For PROP-0001, the active lease expires in October 2026 — 150 days away — so no alert is shown. The HVAC maintenance alert is hardcoded and stays until MaintenanceItem is wired.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, right sidebar, Action Strip |
| Label | "Lease Expiring:" |
| Main formula | `leases.filter(l => l.stage === "Signed" && l.endDate > now && l.endDate - now <= 30days)` |
| Reads from | leases for PROP-0001 |
| Canonical home | client (derived at render time — Q4.F default) |
| Edge cases | no expiring leases → no lease alert (correct); all leases expired → no alert (endDate < now excluded by `l.endDate > now`) |

## 2. Entity — ✅

| Field used | Notes |
|---|---|
| `stage` | must be `"Signed"` — Approaching/Offered leases don't trigger alerts |
| `endDate` | Unix ms — checked against `now + 30days` window |
| `unit` | shown in alert body |
| `tenantId` → `Tenant.name` | shown in alert body if linked |

## 3. Formula — ✅

> **Plain opener:** The 30-day window filter correctly catches leases expiring within the next month while excluding already-expired leases. Walking through: an expiring lease (endDate = today+10 days) is included; an expired lease (endDate = yesterday) is excluded by the `endDate > now` guard.

**Formula (verbatim):**
```ts
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const leaseAlerts = leases
  .filter(l => l.stage === "Signed" && l.endDate > now && l.endDate - now <= thirtyDaysMs)
  .map((l, i) => {
    const t = l.tenantId ? tenantMap.get(l.tenantId) : undefined;
    const daysLeft = Math.ceil((l.endDate - now) / 86400000);
    return {
      id: -(i + 1),
      type: "lease",
      body: `${l.unit}${t ? ` — ${t.name}` : ""} (${daysLeft} days remaining)`,
      ...
    };
  });
const alerts = [...leaseAlerts, maintenanceAlert];
```

**Two-edge test:**
- `endDate = now + 1day` → `endDate > now` ✅ → `endDate - now = 86400000 ≤ thirtyDaysMs` ✅ → **included**
- `endDate = now - 1day` → `endDate > now` ❌ → **excluded** (already expired)
- `endDate = now + 31days` → `endDate - now > thirtyDaysMs` ❌ → **excluded** (too far out)

**Golden-value check (PROP-0001 — no alert expected):**

| Source | Value |
|---|---|
| LEASE-0001.endDate | 1790985600000 (Oct 2, 2026) |
| today (May 6, 2026) | ~1778025600000 |
| endDate − now | ~12960000000 ms = 150 days |
| thirtyDaysMs | 2592000000 ms |
| 150 days ≤ 30 days? | ❌ — not within window |
| leaseAlerts | [] |
| alerts shown | [HVAC maintenance alert only] |
| Match? | ✅ (no lease alert correct) |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyOverviewPage>` alerts array + Action Strip JSX |
| Badge count | `alerts.length` — includes HVAC maintenance (always 1) |
| Lease alerts | derived at render time (Q4.F default) |
| Empty state for lease alerts | none shown — the maintenance alert always appears |

**PII / IDOR**
- `Lease[]` carries `userId` to browser. See **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).
- Auth shim: see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Lease alert trigger (overview) = rental expiry countdown trigger | Overview: endDate within 30 days; rental: shows countdown regardless of threshold | ✅ consistent intent |
| No alert for PROP-0001 | 150 days remaining > 30-day threshold | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` | ❌ | F1 |
| HVAC alert hardcoded (MaintenanceItem not wired) | ⚠️ Phase 6.x | F2 |
| Alert badge count inflated by hardcoded HVAC | 🔵 | F3 |

## 7. Meaning — ✅

```
Label rendered:           "Lease Expiring:"
Formula chosen:           endDate within next 30 days, stage=Signed, not yet expired
User's likely inference:  lease about to end — needs renewal action
Match?                    ✅ (Q4.F: derived at render time, not stored as Notification)
```

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Lease[]`
**P1 robustness · confidence: high · `[render]`**

Same finding as `property-id-overview--monthly-income` F1. Narrow `Lease[]` in `overview/queries.ts`.

---

### 🟡 F2 — HVAC maintenance alert stays hardcoded (MaintenanceItem not wired)
**P2 schema smell · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — `maintenanceAlert` object hardcoded inside the component function

**Problem:** The "HVAC Fault: Building A" alert is a static constant. It will show on every property's overview page, not just PROP-0001. Once MaintenanceItem entity lands, this should be replaced with a real `MaintenanceItem.status === "open"` query, filtered to this property.

**Why acceptable now:** Per plan, MaintenanceItem wiring is Phase 6.x. The hardcoded alert is an acknowledged placeholder, not a regression.

**Fix:** When MaintenanceItem lands, replace `maintenanceAlert` with a query that fetches open maintenance items for the property and maps them to alert objects.

---

### 🔵 F3 — Alert badge count includes hardcoded HVAC, inflating "N actions pending"
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — `{alerts.length} action{alerts.length !== 1 ? "s" : ""} pending`

**Problem:** `alerts = [...leaseAlerts, maintenanceAlert]` always has at least 1 (the HVAC). So the badge always shows "1 action pending" even on a property with no real issues and no expiring leases. This is a side-effect of F2 — when MaintenanceItem is real, the HVAC entry may not exist for every property.

**Fix:** Tracked as part of F2 — resolves automatically when the HVAC constant is replaced with real MaintenanceItem data.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> Action Strip — lease alert items
sources:
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/types/tenant.ts
    sha: 6be7b1c46d267aca038e42a68d9a1e4aa7746937
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Check if any PROP-0001 lease is expiring within 30 days
node -e "
const fs = require('fs');
const now = Date.now();
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const dir = 'public/data/users/demo-user/leases';
const leases = fs.readdirSync(dir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(dir+'/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001');
const expiring = leases.filter(l => l.stage === 'Signed' && l.endDate > now && l.endDate - now <= thirtyDaysMs);
console.log('Expiring within 30 days:', expiring.map(l => l.id + ' endDate=' + new Date(l.endDate).toDateString()));
console.log('Days remaining for LEASE-0001:', Math.ceil((leases[0].endDate - now) / 86400000));
"
# Expected: Expiring within 30 days: []
# Expected: Days remaining: ~150
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1 (Q4.F default: derive at render time).
- Golden-value check ✅: no alert for PROP-0001 (150 days remaining).
- Two-edge test verified filter excludes past-expired and far-future leases.
- 3 findings: F1 (userId leak), F2 (HVAC hardcoded, Phase 6.x), F3 (badge count inflated).

</details>
