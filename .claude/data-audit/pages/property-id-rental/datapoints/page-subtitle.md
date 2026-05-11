---
slug: property-id-rental--page-subtitle
data_point: "Page header subtitle — "$X/mo · Occupied · Lease expires DATE""
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P2)"
---

# Audit — Page Subtitle on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — displays "$850/mo · Occupied · Lease expires Oct 2, 2026" for PROP-0001, matching LEASE-0001 seed
- ⚠️ 2 findings · 1 P1 (Lease[]/Tenant[] userId to browser) · 1 P2 (empty-state "No active lease" differs from "—" convention used elsewhere on this page)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this subtitle? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the string assembly match the label? | ✅ |
| 4 | Render | How does this reach the user? | ⚠️ |
| 5 | Consistency | Do related strings agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the subtitle promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The page subtitle under the "Rental" heading assembles three values from the active lease: the monthly rent, the occupancy status, and the lease end date. For PROP-0001 with one active lease, the subtitle reads "$850/mo · Occupied · Lease expires Oct 2, 2026".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, page header below the "Rental" h1 |
| Label | _none — the subtitle itself is the display_ |
| Main formula | `` `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo · Occupied · Lease expires ${formatDate(activeLease.endDate)}` `` |
| Reads from | LEASE-0001 (monthlyRent=850, endDate=1790985600000) |
| Canonical home | client (PropertyRentalPage) |
| Edge cases | no active lease → "No active lease" (F2) |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Lease.monthlyRent` | number → formatted "$850" |
| `Lease.endDate` | Unix ms → `toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })` |

## 3. Formula — ✅

**Formula (verbatim):**
```ts
const pageSubtitle = activeLease
  ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo · Occupied · Lease expires ${formatDate(activeLease.endDate)}`
  : "No active lease";
```

**Active-lease filter:** `stage === "Signed" && startDate <= now && endDate >= now` (same filter as Monthly Income — consistent).

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001.monthlyRent | 850 → "$850" |
| LEASE-0001.endDate | 1790985600000 → Oct 2, 2026 |
| `formatDate(1790985600000)` | "Oct 2, 2026" |
| Displayed | "$850/mo · Occupied · Lease expires Oct 2, 2026" |
| Match? | ✅ |

## 4. Render — ⚠️

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Subtitle rent = Monthly Rent KPI | Both use `activeLease.monthlyRent` | ✅ |
| Subtitle expiry date = Lease Summary "Lease End" field | Both use `formatDate(activeLease.endDate)` | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` | ❌ | F1 |
| Empty state convention | 🔵 | F2 |

## 7. Meaning — ✅

```
Label rendered:           "$850/mo · Occupied · Lease expires Oct 2, 2026"
Formula chosen:           activeLease.monthlyRent + "Occupied" + formatDate(activeLease.endDate)
User's likely inference:  current rent, occupancy state, and upcoming expiry
Match?                    ✅
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as overview F1. Narrow both arrays in `rental/queries.ts`.

---

### 🔵 F2 — Empty state "No active lease" differs from "—" convention
**P3 nit · confidence: medium · `[render]`**

**Where:** `PropertyRentalPage.tsx` — `pageSubtitle = activeLease ? "..." : "No active lease"`

**Problem:** All other empty states on this page use `"—"` (tenant email, phone, deposit, auto-pay). The subtitle uses a descriptive "No active lease" phrase — more informative but inconsistent with the established file convention.

**Fix (optional):** Either accept "No active lease" as a deliberate exception (it's in a heading-level position where "—" would be confusing) or standardize. Document the exception if kept.

## 9. Fix Log

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
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/rental/page.tsx
    sha: a77c6477c66eeecfcd9f844a2dd138ccdc49c0e0
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1.
- Golden-value check ✅: "$850/mo · Occupied · Lease expires Oct 2, 2026".
- 2 findings: F1 (userId leak), F2 (empty state convention).

</details>
