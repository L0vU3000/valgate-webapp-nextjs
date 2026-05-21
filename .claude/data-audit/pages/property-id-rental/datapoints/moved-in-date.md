---
slug: property-id-rental--moved-in-date
data_point: "Tenant Profile card — \"Moved in\" date field"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Moved-In Date on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "Oct 2, 2025" for PROP-0001, matching LEASE-0001.startDate
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

---

## 1. Snapshot

> **Plain opener:** The Tenant Profile card shows when the tenant moved in — the start date of the active lease, formatted as "Month Day, Year". For PROP-0001 with LEASE-0001 starting Oct 2, 2025, this reads "Oct 2, 2025". If there is no active lease it shows "—".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Tenant Profile card, "Moved in" row |
| Label | "Moved in" |
| Reads | `activeLease.startDate` → `formatDate` → `"Oct 2, 2025"` |
| Canonical home | client (`PropertyRentalPage`) |
| Edge case | no active lease → `"—"` |

**Formula:** `const movedInDate = activeLease ? formatDate(activeLease.startDate) : "—"`

`formatDate` uses `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`.

## 2. Entity

| Field | Source | Value (PROP-0001) |
|---|---|---|
| `Lease.startDate` | LEASE-0001 | 1759449600000 → `"Oct 2, 2025"` |

**Consistency:** `movedInDate` uses the same `startDate` as Lease Summary "Lease Start" field, both via `formatDate` — values are identical for the same lease record.

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
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1.
- Golden-value check ✅: LEASE-0001.startDate 1759449600000 → formatDate → "Oct 2, 2025".
- 1 finding: F1 (userId leak).

</details>
