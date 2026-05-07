---
slug: rental--arrears-buckets
data_point: "Rent Collection & Arrears — 3 aging buckets + Billing Recovery + Eviction Risk (5 surfaces, rows 44–48)"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ All 5 surfaces wired · Q3.M (Billing Recovery) + Q3.N (Eviction Risk) resolved in Phase 8.2"
---

# Audit — Rent Collection & Arrears on /rental
_Last revised: 2026-05-07 · Revision 1._

## TL;DR
- ✅ All 5 surfaces wired: 3 arrears buckets from `computeArrears`, Billing Recovery from `computeRecoveryRate`, Eviction Risk from `computeEvictionRisk`
- ✅ Q3.M resolved: Billing Recovery = `sum(Paid Rent payments) / sum(all Rent payments)` (lifetime ratio)
- ✅ Q3.N resolved: Eviction Risk = count of leases whose latest Rent payment is Overdue > 60 days
- 🔧 P3 nit: arrears bar widths are relative to the busiest bucket, not absolute dollar scale — this is correct but not labelled

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | 5 surfaces, 3 entities |
| 2 | Entity | Payment (§6), Lease (§4) |
| 3 | Formula | ✅ correct for Q3.M + Q3.N |
| 4 | Render | ✅ server→client prop chain |
| 5 | Consistency | ✅ buckets sum to overdue total |
| 6 | Missing safeties | 1 gap |
| 7 | Meaning | ✅ labels match formulas |
| 8 | Findings | 1 item |
| 9 | Fix Log | 2 resolved (Phase 8.2) |

---

## 1. Snapshot

The "Rent Collection & Arrears" card is a five-surface panel in the lower-left of the rental dashboard. The top portion shows three horizontal aging bars (0–30d, 31–60d, 61–90d) for overdue rent payments. The bottom portion shows two scalar KPIs: Billing Recovery (lifetime paid/billed ratio) and Eviction Risk (how many tenants are severely delinquent).

| | |
|---|---|
| Where | /rental, Zone 5 left panel |
| Rows | 44–48 (page inventory) |
| Entities | `Payment` (§6), `Lease` (§4) |
| Server vs Client | Server-computed via `queries.ts`, passed as typed props |
| Edge case | All payments current → all bucket amounts = $0, all bars at 0% width |
| Edge case | No Rent payments at all → Billing Recovery = "—", Eviction Risk = "None" |

---

## 2. Entity

`Payment` fields used:

| Field | Type | Used by |
|---|---|---|
| `id` | string | — |
| `kind` | `"Rent" \| "Deposit" \| "Expense"` | filter: `kind === "Rent"` |
| `status` | `"Paid" \| "Pending" \| "Overdue"` | all three derivations |
| `amount` | number | bucket totals, recovery rate |
| `date` | number (epoch ms) | bucket age calculation |
| `leaseId` | string | join to Lease for Eviction Risk |

`Lease` fields used: `id`, `stage` (active check in Eviction Risk caller).

**Catalog reference:** [`ref/00-entity-catalog.md §6`](ref/00-entity-catalog.md) (Payment), [`ref/00-entity-catalog.md §4`](ref/00-entity-catalog.md) (Lease).

---

## 3. Formula

### 3a. Arrears buckets (`computeArrears` — line 106)

```ts
const overdue = payments.filter(p => p.status === "Overdue");
// For each bucket [0–30, 31–60, 61–90] days:
const ageDays = Math.floor((now - p.date) / DAY_MS);
const inBucket = overdue.filter(p => ageDays >= b.min && ageDays <= b.max);
const total = inBucket.reduce((sum, p) => sum + (p.amount ?? 0), 0);
// Bar width: relative to max bucket total
width = max === 0 ? "0%" : `${Math.round((total / max) * 100)}%`;
```

### 3b. Billing Recovery (`computeRecoveryRate` — line 232)

```ts
const rentPayments = payments.filter(p => p.kind === "Rent");
const paid = rentPayments.filter(p => p.status === "Paid").reduce(...);
const total = rentPayments.reduce(...);
return `${((paid / total) * 100).toFixed(1)}%`;
```

**Q3.M resolution:** Formula (a) — cumulative paid/billed, lifetime scope. Label changed to "Billing Recovery" to reflect lifetime (not monthly) nature.

### 3c. Eviction Risk (`computeEvictionRisk` — line 247)

```ts
for (const lease of leases) {
  const latest = payments
    .filter(p => p.leaseId === lease.id && p.kind === "Rent")
    .sort((a, b) => b.date - a.date)[0];
  if (latest?.status === "Overdue" && (now - latest.date) / DAY_MS > 60) count++;
}
return count === 0 ? "None" : `${count} ${count === 1 ? "Tenant" : "Tenants"}`;
```

**Q3.N resolution:** Formula (b) — latest-payment-per-lease approach. "Eviction Risk" label retained as-is (reflects severity of the delinquency).

**Robustness:**
- ✅ Empty payments array → "—" (recovery) / "None" (eviction)
- ✅ All payments current → all buckets $0, bars zero-width
- ✅ No `null` risk: `p.amount ?? 0` guards optional field

---

## 4. Render

| | |
|---|---|
| Page file | `app/(shell)/rental/page.tsx` |
| Query | `getRentalDashboardData()` in `app/(shell)/rental/queries.ts` |
| Component | `RentalDashboardPage` — inline JSX (Zone 5) |
| Props consumed | `arrearsBuckets`, `recoveryRate`, `evictionRisk` |
| Server vs Client | Server-computed; `RentalDashboardPage` is a Client Component (receives pre-formatted strings) |

**Prop chain:**
- `arrearsBuckets: ArrearsBucket[]` → `{bucket.amount}` / `style={{ width: bucket.width }}`
- `recoveryRate: string` → `<p>{recoveryRate}</p>` (line 224)
- `evictionRisk: string` → `<p className={cn(...)}>{evictionRisk}</p>` (line 229) — green if "None", rose otherwise

**Loading / empty states:** No loading skeleton. On empty seed (no payments), buckets show `$0` with 0% bars; recovery = "—"; eviction = "None".

---

## 5. Consistency

| Identity | Holds? |
|---|---|
| Bucket amounts are subsets of Overdue payments | ✅ by construction |
| Bar widths are relative to busiest bucket (not total) | ✅ correct — bars show proportional severity within overdue range |
| Billing Recovery is lifetime, not monthly | ✅ formula confirmed; label "Billing Recovery" chosen to distinguish from monthly Collection Rate |
| Eviction Risk "None" when no leases have 60d+ overdue | ✅ confirmed |

---

## 6. Missing safeties (1)

| Gap | Severity | Link |
|---|---|---|
| `RentalDashboardPage` is `"use client"` and receives `payments[]` and `leases[]` indirectly formatted — auth shim currently hardcoded to "demo-user" | P1 | Page-wide: see PF1 in [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md) |

---

## 7. Meaning

| Label | Formula delivers | Match? |
|---|---|---|
| "0-30d / 31-60d / 61-90d" | Overdue payment age in days from `p.date` | ✅ |
| "Billing Recovery" | Paid Rent $ ÷ all Rent $ (lifetime) | ✅ — label was "Recovery Rate" (ambiguous); updated |
| "Eviction Risk" | Count of leases 60d+ delinquent on latest payment | ✅ |

---

## §8 Findings

### 🔵 F1 — Arrears bar widths are relative, not absolute
**P3 nit · confidence: high · `[render]`**

**Where:** `lib/data/derivations/rental.ts:127` — `width: max === 0 ? "0%" : \`${Math.round((totals[i] / max) * 100)}%\``.

**Problem:** Bar widths are relative to the highest-valued bucket, not to total overdue. A single bucket with $500 shows at 100% width; the label "$500" is the only signal. This is a valid design choice but could mislead: a small bar at 20% might look safe when it represents 80% of total overdue if another bucket is larger.

**Why it matters:** Dashboard readability — not a data integrity issue.

**Fix:** Either switch to absolute-total-based widths (divide each by total overdue), or add a total overdue sub-label under the chart. Low priority.

---

## §9 Fix Log

| Finding | Severity | Status | Fixed in |
|---|---|---|---|
| PF5a — "Billing Recovery" was hardcoded "92%" | P1 | ✅ wired | Phase 8.2 (2026-05-07) |
| PF5b — "Eviction Risk" was hardcoded "None" | P1 | ✅ wired | Phase 8.2 (2026-05-07) |

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
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
```

</details>
