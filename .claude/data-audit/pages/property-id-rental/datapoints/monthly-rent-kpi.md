---
slug: property-id-rental--monthly-rent-kpi
data_point: "Monthly Rent KPI card — headline value \"$X\""
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3)"
---

# Audit — Monthly Rent KPI on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — displays "$850" for PROP-0001, matching LEASE-0001 seed
- ⚠️ 2 findings · 1 P1 (Lease[] + Tenant[] userId to browser) · 1 P3 (empty state "$0" not "—")
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this KPI? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the value match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The Monthly Rent KPI shows the contracted monthly rent from the active lease. For PROP-0001 with one active lease at $850/mo, the card displays "$850".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, KPI Row, first card (label "Monthly Rent") |
| Label | "Monthly Rent" |
| Main formula | `rentValue = activeLease ? "$" + activeLease.monthlyRent.toLocaleString("en-US") : "$0"` |
| Reads from | LEASE-0001 (monthlyRent=850) |
| Canonical home | client (derived in PropertyRentalPage from `leases` prop) |
| Edge cases | no active lease → "$0" (F2) |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Lease.monthlyRent` | `number` | non-negative; formatted `"$" + toLocaleString("en-US")` |

## 3. Formula — ✅

**Formula (verbatim):**
```ts
const rentValue = activeLease ? "$" + activeLease.monthlyRent.toLocaleString("en-US") : "$0";
// rendered as:
<KpiCard label="Monthly Rent" value={rentValue} sub="/mo" ... />
```

**Active-lease filter:** `stage === "Signed" && startDate <= now && endDate >= now` (consistent with all other rental surfaces).

**Note:** Unlike the overview Monthly Income (which sums all active leases with `reduce`), this KPI reads only `activeLease[0].monthlyRent` — the first active lease. For a single-unit property this is equivalent. For multi-lease properties, only the first lease in the filtered array contributes to this surface.

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001.monthlyRent | 850 |
| `"$" + (850).toLocaleString("en-US")` | `"$850"` |
| Displayed | `"$850"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → `<KpiCard label="Monthly Rent" value={rentValue} sub="/mo">` |
| Prop chain | `leases[]` → `activeLease` → `rentValue` → KpiCard value prop |
| Empty state | `"$0"` when no active lease (F2) |
| Animation | KPI row fades in via `style={fade(80)}` |

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| KPI rent = Lease Summary "Rent" field | Both use `activeLease.monthlyRent` | ✅ |
| KPI rent = overview Monthly Income (PROP-0001) | Overview sums all activeLeases; for one active lease both = $850 | ✅ |
| KPI rent = page subtitle rent | Subtitle uses same `activeLease.monthlyRent` | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |
| Empty state shows "$0" instead of "—" | 🔵 | F2 |

## 7. Meaning — ✅

```
Label rendered:           "Monthly Rent"
Formula chosen:           activeLease.monthlyRent (contractual, not received)
User's likely inference:  what this tenant pays each month
Match?                    ✅ (single-lease context; see §3 note for multi-lease edge)
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-rental--page-subtitle` F1. Narrow both arrays in `rental/queries.ts`.

---

### 🔵 F2 — Empty state shows "$0" instead of "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyRentalPage.tsx` — `rentValue = activeLease ? "..." : "$0"`

**Problem:** Same pattern as `property-id-overview--monthly-income` F3. When there is no active lease, `"$0"` looks like a real rent figure rather than "no data". Consistent fix would match the established "—" convention on this page.

**Fix:** `rentValue = activeLease ? "$" + activeLease.monthlyRent.toLocaleString("en-US") : "—"`.

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
- Golden-value check ✅: "$850" from LEASE-0001.monthlyRent=850.
- 2 findings: F1 (userId leak), F2 (empty state "$0").

</details>
