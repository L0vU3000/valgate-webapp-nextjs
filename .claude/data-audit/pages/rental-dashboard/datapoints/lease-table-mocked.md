---
slug: rental--lease-table-mocked
data_point: "Property Ranking table — 3 rows × 5 fields (NOI, Rent, Market Index) — 15 surfaces, rows 25–39"
route: /rental
revision: 1
date: 2026-05-07
verdict: "⚠️ All 15 surfaces HARDCODED · PF4 open · pending Phase 6.9 (computePropertyYieldRanking)"
---

# Audit — Property Ranking table on /rental
_Last revised: 2026-05-07 · Revision 1. Bundled lite report — 15 surfaces, rows 25–39 of the page inventory._

## TL;DR
- ❌ All 15 surfaces are hardcoded in a `propertyRows` static const — no DB connection
- ⚠️ Blocked on Phase 6.9: requires `PropertyComparable` entity + `computePropertyYieldRanking` derivation for NOI and Market Index
- 🔧 Top fix: ship Phase 6.9 then wire `computePropertyYieldRanking(properties, valuations, leases, payments)` into a `data` prop on `<LeaseTable>`

_Reads from `propertyRows` const (`components/rental/LeaseTable.tsx:7`) — no entity, no derivation. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Row | Surface | Current source | Status |
|---|---|---|---|
| 25 | Property thumbnail gradient | `row.img` (hardcoded CSS class) | ⚠️ HARDCODED |
| 26 | Property name | `row.name` ("Borey Tonle Bassac" etc.) | ⚠️ HARDCODED |
| 27 | Property location | `row.location` ("BKK1, Phnom Penh" etc.) | ⚠️ HARDCODED |
| 28 | NOI (Annual) | `row.noi` ("$412,000" etc.) | ⚠️ HARDCODED |
| 29 | Monthly Rent | `row.rent` ("$4,200 avg" etc.) | ⚠️ HARDCODED |
| 30 | Market Index badge text | `row.index` ("Below Market (8%)" etc.) | ⚠️ HARDCODED |
| 31 | Market Index badge color | `row.indexColor` (Tailwind class string) | ⚠️ HARDCODED |
| 32–39 | Rows 2–3 (same 5 fields × 2 more rows) | same static const | ⚠️ HARDCODED ×8 |

## §8 Findings

### 🔴 F1 — LeaseTable entirely backed by static mock data
**P1 data integrity · confidence: high · `[schema]` + `[wiring]`**

**Where:** `components/rental/LeaseTable.tsx:7–35` — `const propertyRows = [...]` with 3 hardcoded objects.

**Problem:** The component accepts no props and reads no data. All three rows — names, locations, NOI figures, rent averages, and market index badges — are static strings with no connection to the property DB or any derivation function.

**Why it matters:** PF4 ("LeaseTable property ranking mocked"). The table is the primary yield-ranking surface on the rental dashboard; it shows fictitious numbers.

**Fix:** Gated on Phase 6.9 (PropertyComparable entity). Once available, implement `computePropertyYieldRanking(properties, valuations, leases, payments)` in `lib/data/derivations/rental.ts`, add a `rows` prop to `<LeaseTable>`, and wire through `queries.ts → RentalDashboardPage.tsx`. Market index ("Below Market", "Optimal", "Market Leader") requires comparable sale data from PropertyComparable; without it, rank against internal portfolio avg rent only.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: components/rental/LeaseTable.tsx
    sha: d9bb6ce1c6e1d9654a0db8f0126f3aee6b240ecf
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: aa661a28ef303d4f4762cfe662275b3855edeeec
```

</details>
