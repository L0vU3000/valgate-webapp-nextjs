---
slug: property-id-rental--occupancy-kpi
data_point: "Occupancy KPI card — value (\"Occupied\"/\"Vacant\") + accent (\"N months · Since Mon YYYY\")"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Occupancy KPI on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "Occupied" / "7 months · Since Oct 2025" for PROP-0001, matching LEASE-0001 seed
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What does this KPI show? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the value + accent match the label? | ✅ |
| 4 | Render | How do the values reach the user? | ⚠️ |
| 5 | Consistency | Do related strings agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The Occupancy KPI card shows two values: the main occupancy status ("Occupied" or "Vacant") and an accent line that says how long the tenant has been here and when they moved in. For PROP-0001 with LEASE-0001 starting Oct 2025, the accent reads "7 months · Since Oct 2025".

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, KPI Row, second card (label "Occupancy") |
| Label | "Occupancy" |
| Main formula | `occupancyValue = isOccupied ? "Occupied" : "Vacant"` |
| Accent formula | `occupancyAccent = activeLease ? monthsSince(startDate) + " months · Since " + formatMonthYear(startDate) : "No active lease"` |
| Reads from | LEASE-0001 (startDate=1759449600000, Oct 2, 2025) |
| Canonical home | client (derived in PropertyRentalPage from `leases` prop) |
| Edge cases | no active lease → "Vacant" + "No active lease" |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Lease.startDate` | Unix ms — drives both `monthsSince()` count and `formatMonthYear()` label |
| `isOccupied` | `activeLease !== null` — drives main value |

## 3. Formula — ✅

**Formula (verbatim):**
```ts
function monthsSince(ts: number): number {
  const start = new Date(ts);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

const occupancyValue = isOccupied ? "Occupied" : "Vacant";
const occupancyAccent = activeLease
  ? `${monthsSince(activeLease.startDate)} months · Since ${formatMonthYear(activeLease.startDate)}`
  : "No active lease";
```

`formatMonthYear` uses `toLocaleDateString("en-US", { month: "short", year: "numeric" })`.

**Two-edge test:**
- `startDate = Oct 2, 2025`, `now = May 6, 2026`:
  - `(2026 − 2025) × 12 + (4 − 9) = 12 − 5 = 7 months` ✅
- `activeLease = null` → accent = `"No active lease"` ✅

**Note on month counting:** `monthsSince` uses calendar-month difference (no day-of-month adjustment). A tenant who moved in on Oct 31 2025 would show "7 months" as of May 6 2026, same as one who moved in Oct 1. This is a deliberate approximation consistent with the "Since Mon YYYY" framing.

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001.startDate | 1759449600000 (Oct 2, 2025) |
| now | May 6, 2026 |
| `monthsSince(1759449600000)` | 7 |
| `formatMonthYear(1759449600000)` | `"Oct 2025"` |
| `occupancyValue` | `"Occupied"` |
| `occupancyAccent` | `"7 months · Since Oct 2025"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → `<KpiCard label="Occupancy" value={occupancyValue} accent={occupancyAccent}>` |
| Prop chain | `leases[]` → `activeLease` → `occupancyValue` + `occupancyAccent` → KpiCard |
| Empty state | `"Vacant"` + `"No active lease"` |
| Animation | KPI row fades in via `style={fade(80)}` |

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| KPI "Occupied" = Unit header pill "Occupied" | Both use `isOccupied = activeLease !== null` | ✅ |
| KPI "Occupied" = page subtitle "Occupied" | Subtitle also tests `activeLease !== null` | ✅ |
| KPI accent "Since Oct 2025" = Tenant Profile "Moved in Oct 2, 2025" | KpiCard uses `formatMonthYear`; Tenant Profile uses `formatDate` on the same `startDate` | ✅ (month-precision vs day-precision, intentional) |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "Occupancy"
Main value:               "Occupied" / "Vacant" — activeLease presence
Accent:                   "7 months · Since Oct 2025" — calendar-month count + startDate
User's likely inference:  current occupancy state and how long tenant has been here
Match?                    ✅
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-rental--page-subtitle` F1. Narrow both arrays in `rental/queries.ts`.

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
- Golden-value check ✅: "Occupied" / "7 months · Since Oct 2025" for PROP-0001 / LEASE-0001.
- monthsSince walk: (2026−2025)×12 + (4−9) = 7 months verified.
- 1 finding: F1 (userId leak).

</details>
