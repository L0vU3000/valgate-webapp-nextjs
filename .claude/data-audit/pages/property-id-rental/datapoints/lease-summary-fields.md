---
slug: property-id-rental--lease-summary-fields
data_point: "Lease Summary card — 5-row field table (Lease Start, Lease End, Rent, Deposit, Auto-pay)"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3)"
---

# Audit — Lease Summary Fields on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — all 5 rows display expected values for PROP-0001 (Deposit and Auto-pay are intentionally "—")
- ⚠️ 3 findings · 1 P1 (Lease[] + Tenant[] userId to browser) · 1 P2 (Deposit schema gap) · 1 P3 (Auto-pay schema gap)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1); Deposit + Auto-pay fix deferred until schema lands (F2, F3)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What are these 5 fields? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Do the values match their labels? | ✅ |
| 4 | Render | How do the rows reach the user? | ⚠️ |
| 5 | Consistency | Do related values agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does each label promise what the value delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The Lease Summary card contains a table of five labelled rows: Lease Start, Lease End, Rent, Deposit, and Auto-pay. The first three are read from the active lease record. The last two are hardcoded "—" because neither a `deposit` field nor an `autoPay` flag exists on the current `Lease` schema.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Lease Summary card (col-span-4), field table |
| Labels | "Lease Start", "Lease End", "Rent", "Deposit", "Auto-pay" |
| Main formula | `leaseFields: [string, string][]` — 5 tuples |
| Reads from | LEASE-0001 (startDate, endDate, monthlyRent) + hardcoded "—" for Deposit and Auto-pay |
| Canonical home | client (derived in PropertyRentalPage from `leases` prop) |
| Edge cases | no active lease → all 5 values = "—" |

## 2. Entity — ✅

| Label | Field | Notes |
|---|---|---|
| Lease Start | `Lease.startDate` | Unix ms → `formatDate` → `"Oct 2, 2025"` |
| Lease End | `Lease.endDate` | Unix ms → `formatDate` → `"Oct 2, 2026"` |
| Rent | `Lease.monthlyRent` | number → `"$850/mo"` |
| Deposit | _(schema gap)_ | `Lease` has no `deposit` field — hardcoded `"—"` (F2) |
| Auto-pay | _(schema gap)_ | `Lease` has no `autoPay` field — hardcoded `"—"` (F3) |

## 3. Formula — ✅

**Formula (verbatim):**
```ts
const leaseFields: [string, string][] = [
  ["Lease Start", activeLease ? formatDate(activeLease.startDate) : "—"],
  ["Lease End",   activeLease ? formatDate(activeLease.endDate)   : "—"],
  ["Rent",        activeLease ? `$${activeLease.monthlyRent.toLocaleString("en-US")}/mo` : "—"],
  ["Deposit",     "—"],
  ["Auto-pay",    "—"],
];
```

`formatDate` uses `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`.

**Golden-value check**

| Label | Source | Value |
|---|---|---|
| Lease Start | LEASE-0001.startDate = 1759449600000 | `"Oct 2, 2025"` |
| Lease End | LEASE-0001.endDate = 1790985600000 | `"Oct 2, 2026"` |
| Rent | LEASE-0001.monthlyRent = 850 | `"$850/mo"` |
| Deposit | hardcoded | `"—"` |
| Auto-pay | hardcoded | `"—"` |
| Match? | | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` Lease Summary card tbody |
| Prop chain | `leases[]` → `activeLease` → `leaseFields[]` → `{leaseFields.map(([l, v]) => ...)}` |
| Empty state | all `"—"` when no active lease |
| Animation | parent card fades in via `style={fade(140)}` |

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Lease Start = movedInDate in Tenant Profile | Both use `formatDate(activeLease.startDate)` | ✅ |
| Rent field = Monthly Rent KPI (stripped "/mo") | Both use `activeLease.monthlyRent` | ✅ |
| Lease End = page subtitle expiry date | Both use `formatDate(activeLease.endDate)` | ✅ |

## 6. Missing safeties — 3 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |
| `Lease` has no `deposit` field | ⚠️ schema gap | F2 |
| `Lease` has no `autoPay` field | ⚠️ schema gap | F3 |

## 7. Meaning — ✅

```
Label "Lease Start"  → formatDate(activeLease.startDate) → when the lease began ✅
Label "Lease End"    → formatDate(activeLease.endDate)   → when the lease expires ✅
Label "Rent"         → "$850/mo"                          → monthly contractual rent ✅
Label "Deposit"      → "—"                                → field not yet in schema (F2) ✅ (honest gap)
Label "Auto-pay"     → "—"                                → field not yet in schema (F3) ✅ (honest gap)
```

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-rental--page-subtitle` F1. Narrow both arrays in `rental/queries.ts`.

---

### 🟡 F2 — `Deposit` hardcoded "—" — `Lease.deposit` field absent from schema
**P2 schema gap · confidence: high · `[semantic]`**

**Where:** `PropertyRentalPage.tsx` — `leaseFields` tuple `["Deposit", "—"]`

**Problem:** The Lease Summary card shows "Deposit: —" because `LeaseSchema` has no `deposit` field. This is an acknowledged placeholder, not a regression — the schema was intentionally minimal for Phase 6.1.

**Fix:** Add `deposit?: number` to `LeaseSchema` and `Lease` type; seed with a value in LEASE-0001; update `leaseFields[3]` to `activeLease?.deposit ? "$" + activeLease.deposit.toLocaleString("en-US") : "—"`. Coordinate with the schema extension phase.

---

### 🟡 F3 — `Auto-pay` hardcoded "—" — `Lease.autoPay` field absent from schema
**P2 schema gap · confidence: high · `[semantic]`**

**Where:** `PropertyRentalPage.tsx` — `leaseFields` tuple `["Auto-pay", "—"]`

**Problem:** Same as F2 — no `autoPay` field on `LeaseSchema`. The auto-pay status (enabled/disabled, last run date) is a common landlord query.

**Fix:** Add `autoPay?: boolean | "enabled" | "disabled"` to `LeaseSchema`; update `leaseFields[4]` accordingly. Coordinate with the schema extension phase.

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
- Golden-value check ✅: all 5 rows match seed values (Deposit/Auto-pay intentionally "—").
- 3 findings: F1 (userId leak), F2 (deposit schema gap), F3 (autoPay schema gap).

</details>
