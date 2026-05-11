---
slug: property-id-rental--tenant-avatar-initials
data_point: "Tenant Profile card — avatar circle initials (\"SD\")"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Tenant Avatar Initials on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "SD" for PROP-0001, matching TEN-0001.name = "Sok Dara"
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

---

## 1. Snapshot

> **Plain opener:** The Tenant Profile card header shows a small filled circle with the tenant's initials. For "Sok Dara" the circle shows "SD". If there is no linked tenant it shows "—".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Tenant Profile card, top-right avatar circle |
| Label | _none — initials are self-labeling_ |
| Reads | `primaryTenant.name` — first letter of each word, up to 2, uppercased |
| Canonical home | client (`PropertyRentalPage`) |
| Edge case | no tenant → `"—"` |

**Formula:**
```ts
const avatarInitials = primaryTenant
  ? primaryTenant.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  : "—";
```

## 2. Entity

| Field | Source | Value (PROP-0001) |
|---|---|---|
| `Tenant.name` | TEN-0001 | `"Sok Dara"` → split → `["S","D"]` → `"SD"` |

## 3. Findings — 1 item

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-rental--page-subtitle` F1. Narrow both arrays in `rental/queries.ts`.

## 4. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/tenant.ts
    sha: 6be7b1c46d267aca038e42a68d9a1e4aa7746937
  - path: lib/data/db/tenants.ts
    sha: 9cd6cce0db72120d4a9d73a59936ec9012e0eacd
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1.
- Golden-value check ✅: "Sok Dara".split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() = "SD".
- 1 finding: F1 (userId leak).

</details>
