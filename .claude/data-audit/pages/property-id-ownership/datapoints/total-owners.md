---
slug: property-id-ownership--total-owners
route: /property/[id]/ownership
data_point: "KPI — Total Owners (row 7)"
verdict: "✅ Wired · 2 findings (1 P1 systemic, 1 P3)"
revision: 1
date: 2026-05-06
template: full
---

> **Plain English:** The "Total Owners" KPI card shows how many co-owners a property has. It reads `coOwners.length` — the count of CoOwner records for this property. This is a cross-entity derivation: the data comes from the CoOwner entity (Phase 6.5), not from OwnershipRecord §21 itself. The sub-label pluralizes correctly: "1 Co-owner" vs "2 Co-owners".

## TL;DR

- **Value:** `coOwners.length` — "2" for PROP-0001 ✅
- **Sub:** `coOwners.length === 1 ? "Co-owner" : "Co-owners"` — "Co-owners" for PROP-0001 ✅
- **Empty state:** "—" if `coOwners.length === 0` ✅
- **Cross-entity dependency:** CoOwner entity (Phase 6.5) must be shipped for this surface to show real data — confirmed shipped.
- 2 findings: F1 (P1 systemic — userId propagates), F2 (P3 — KPI sub-label ignores primary-owner record; count includes primary + co-owners)

📄 Page audit: [property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

## §1 — What the number means

The "Total Owners" KPI answers "how many co-owners does this property have?" For PROP-0001, the answer is 2 — matching seed records CO-0001 (Chan Family Trust, 60%) and CO-0002 (Lee Investment Group, 40%).

## §2 — Source trace

```
co-owners/CO-0001/core.json, CO-0002/core.json
  → db.coOwners.list(userId)              lib/data/db/co-owners.ts
  → CoOwnerSchema.parse()                 lib/data/types/co-owner.ts
  → allCoOwners.filter(propertyId)        ownership/queries.ts:22
  → PropertyOwnershipPage coOwners prop   _components/PropertyOwnershipPage.tsx
  → buildKpis(ownershipRecord, coOwners)[1].value = coOwners.length
  → KPI strip row index 1
```

## §3 — Golden value check

| Property | coOwners seed records | Expected KPI value |
|---|---|---|
| PROP-0001 | CO-0001, CO-0002 | "2" Co-owners |
| PROP-0002 | (none seeded) | "—" |
| PROP-0006 | CO-0003, CO-0004, CO-0005 | "3" Co-owners |

## §4 — Derivation correctness

`coOwners.length` is the correct derivation. The plan considered a `totalOwners` field on `OwnershipRecord` but rejected it (Phase 6.6 decision): CoOwner has its own `propertyId` FK so the count is always fresh and consistent. Storing a `totalOwners` count would require keeping it in sync on CoOwner create/delete — unnecessary materialization.

## §5 — Empty states

- `coOwners.length === 0`: value = "—", sub = "Co-owners" (safe fallback; string never shows "0 Co-owners" which would be misleading)
- Correct per file convention: "—" for missing/zero numeric values

## §6 — Consistency checks

KPI row 7 ("Total Owners") is consistent with:
- The Ownership Split donut (row 18): renders N arcs = coOwners.length ✅
- OwnerCards (rows 20-25): shows up to 2 cards + "+N more" if more ✅
- The count is a simple length — no deduplication risk (each CoOwner is a distinct record)

## §7 — Findings

🔴 **F1 — userId propagates to client via coOwners prop (P1 systemic)** — Same issue as all entity props on this page. `coOwners` array includes `userId` on each element.

> **Fix:** Narrow the `coOwners` prop to `Pick<CoOwner, "id" | "sharePercent" | ...fields used>` before passing to Client Component. Systemic — tracked at page level (PF1).

🟡 **F2 — "Total Owners" counts co-owner records but may not represent all stakeholders (P3 deferred)** — The CoOwner seed for PROP-0001 has 2 records (60% + 40%). If the primary owner is not themselves a CoOwner record, the KPI could undercount. The data model doesn't require the property creator to be a CoOwner.

> **Fix:** Define semantics: are CoOwners "all owners including primary" or "secondary owners only"? Document the convention in `co-owner.ts` type comment. Deferred — out of scope for 6.5/6.6 wiring.

## §8 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-06 | Initial write — Phase 6.6. Cross-entity derivation documented. |
