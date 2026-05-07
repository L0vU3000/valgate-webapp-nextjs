---
slug: property-id-ownership--co-owner-cards-direct-reads
route: /property/[id]/ownership
data_point: "CoOwner cards bundle — rows 19–25 (7 surfaces: legend, Owner 1 identity/share/equity/contact/tax, Owner 2 identity/share/equity/contact/tax)"
verdict: "✅ Wired — 2 findings (1 P1 systemic, 1 P3)"
revision: 1
date: 2026-05-06
template: bundle-lite
---

# property-id-ownership--co-owner-cards-direct-reads

📄 Page audit: [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

**TL;DR:** 7 CoOwner direct-read surfaces wired in Phase 6.5. Data flows from `lib/data/db/co-owners.ts` → `ownership/queries.ts` → `PropertyOwnershipPage.tsx`. Legend maps all N owners; OwnerCards cap at top-2 by share with "+N more" indicator. All optional PII fields fall back to `"—"`. One systemic P1 finding (userId leak via PF1); one P3 (equity shows "—" until `currentMarketValue` is seeded).

---

## Surface inventory (7 surfaces)

| Row | Surface | Source field | Verdict |
|---|---|---|---|
| 19 | Legend dot + initials + share% | `CoOwner.name` → `ownerInitials()`, `CoOwner.sharePercent` | ✅ Wired |
| 20 | Owner 1 — name, badge, share%, equity bar | `name`, `role`, `sharePercent`, derived `sharePercent × currentMarketValue / 100` | ✅ Wired (equity "—" if `currentMarketValue` unset) |
| 21 | Owner 1 — email, phone, address | `CoOwner.email`, `phone`, `address` (optional, "—" fallback) | ✅ Wired |
| 22 | Owner 1 — SSN/EIN, tax entity, 1099 status | `CoOwner.ssnMasked`, `taxEntity`, `tax1099Status` (optional, "—" fallback) | ✅ Wired |
| 23 | Owner 2 — name, badge, share%, equity bar | same as row 20, second coOwner | ✅ Wired (hidden if only 1 owner) |
| 24 | Owner 2 — email, phone, address | same as row 21 | ✅ Wired |
| 25 | Owner 2 — SSN/EIN, tax entity, 1099 status | same as row 22 | ✅ Wired |

## Source files

- `lib/data/types/co-owner.ts` — CoOwnerSchema + CoOwnerRoleSchema + TaxEntitySchema
- `lib/data/db/co-owners.ts` — `list()` via `listMergedRecords`
- `app/(shell)/property/[id]/ownership/queries.ts` — `coOwners: allCoOwners.filter(x => x.propertyId === propertyId)`
- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — `ownerInitials()`, `sortedOwners`, `displayedOwners`, `OwnerCard` render

## Findings

### 🔴 F1 — userId leak via full Property + CoOwner prop chain
Systemic — see PF1 in [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md).

### 🟡 F2 — Equity value shows "—" for all current seeds
`property.currentMarketValue` is not set in any seed (`PROP-0001/finance.json` only has `buyNumeric`). Equity per co-owner derives from `sharePercent × currentMarketValue / 100` and shows "—" when the denominator is missing. **Fix:** seed `currentMarketValue` for demo properties, or wire row 10 (Current Estimated Value) in the Property-field-promotions batch. Does not affect correctness of other CoOwner fields. **Deferred:** Property field promotions phase.
