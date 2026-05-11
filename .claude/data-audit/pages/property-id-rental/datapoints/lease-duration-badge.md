---
slug: property-id-rental--lease-duration-badge
data_point: "Lease Summary card — term badge (\"12-month\")"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Lease Duration Badge on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "12-month" for PROP-0001, matching LEASE-0001.termMonths=12
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

---

## 1. Snapshot

> **Plain opener:** The Lease Summary card header shows a small blue badge with the lease term duration. For PROP-0001 with a 12-month lease, the badge reads "12-month".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Lease Summary card header, right-side badge |
| Label | _none — badge text is self-labeling_ |
| Reads | `activeLease.termMonths` → `"12-month"` |
| Canonical home | client (`PropertyRentalPage`) |
| Edge case | no active lease → `"—"` |

**Formula:** `termLabel = activeLease ? \`${activeLease.termMonths}-month\` : "—"`

## 2. Entity

| Field | Source | Value (PROP-0001) |
|---|---|---|
| `Lease.termMonths` | `number` | 12 → `"12-month"` |

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
- Golden-value check ✅: LEASE-0001.termMonths=12 → "12-month".
- 1 finding: F1 (userId leak).

</details>
