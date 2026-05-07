---
slug: property-id-ownership--rent-income-split
route: /property/[id]/ownership
data_point: "Rent Income Split — row 28 (per-owner $/mo derived from sharePercent × active lease monthlyRent)"
verdict: "✅ Wired — 2 findings (1 P1 systemic, 1 P2 cross-entity derivation note)"
revision: 1
date: 2026-05-06
template: full
---

# property-id-ownership--rent-income-split

📄 Page audit: [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

**TL;DR:** Per-owner rent split is derived at query time from signed Lease records — `monthlyRentIncome = sum(lease.monthlyRent where stage="Signed" and propertyId=propertyId)`. Component multiplies each co-owner's `sharePercent` by `monthlyRentIncome` and formats as "$X/mo". For PROP-0001: 1 signed lease at $850/mo → JS 60% = $510/mo, MJ 40% = $340/mo. Shows "—" if no signed leases.

---

## §1 — What it shows

For each co-owner (in share-descending order): `{initials} {share}% → $X/mo`. X = `Math.round(sharePercent × monthlyRentIncome / 100)`. If `monthlyRentIncome === 0`, shows "—" to avoid misleading "$0/mo" for properties with no active lease.

## §2 — Source

- `app/(shell)/property/[id]/ownership/queries.ts` — `signedLeases.reduce((s, l) => s + l.monthlyRent, 0)` returned as `monthlyRentIncome: number`
- `lib/data/db/leases.ts` — data source for leases
- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — `formatCurrencyFull(Math.round(sharePercent * monthlyRentIncome / 100))`

## §3 — Formula verification (Rule 3 — sum check)

| Property | Lease(s) | monthlyRentIncome | Owner A | Owner B | Sum |
|---|---|---|---|---|---|
| PROP-0001 | LEASE-0001 ($850, Signed) | $850 | JS 60% → $510 | MJ 40% → $340 | $850 ✓ |
| PROP-0002 | none | $0 | DC 100% → "—" | — | — |
| PROP-0006 | LEASE-0002 ($1,200, Signed) | $1,200 | SW 40% → $480 | RK 30% → $360 / LP 30% → $360 | $1,200 ✓ |

Note: PROP-0001 real data is $850/mo (LEASE-0001). The old hardcoded values ($1,080 / $720) were based on an assumed $1,800 total — those are now replaced with real data.

## §4 — Golden value check

PROP-0001: JS gets $510/mo, MJ gets $340/mo. These differ from the hardcoded $1,080/$720 — the old values were aspirational; real seed data gives $850/mo as the active lease rent.

## §5 — Adjacent hardcode scan (Rule 1)

`Distribution Method` radio ("Pro-Rata by Share") is hardcoded — it's OwnershipRecord §21 territory (row 27), Phase 6.6. No adjacent claim-string near the income split rows.

## §6 — Missing-safeguards check (Rule 2)

- No signed leases → `monthlyRentIncome = 0` → all per-owner cells show "—". No crash.
- `Math.round()` prevents fractional cents from appearing.
- `formatCurrencyFull` formats large amounts correctly (e.g. "$1,200").

## §7 — Meaning / labelling

"Rent Income Split" heading is accurate. The formula is pro-rata by share — consistent with the "Distribution Method: Pro-Rata by Share" label above it (row 27, hardcoded but semantically correct for the FS demo).

## §8 — Findings

### 🔴 F1 — userId leak via full Property prop chain
Systemic — see PF1 in [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md).

### 🟠 F2 — Income split uses expected rent, not received payments
`monthlyRentIncome` is the sum of `Lease.monthlyRent` for signed leases — this is **expected** income, not **received** income (actual payments). This matches the Q3.B resolution for Phase 6.2 ("use expected for now"). A future refinement could switch to `sum(payments.amount where kind='Rent' and status='Paid' and date in current month)`. **Deferred:** pending Q3.B final resolution and Payment history analysis.
