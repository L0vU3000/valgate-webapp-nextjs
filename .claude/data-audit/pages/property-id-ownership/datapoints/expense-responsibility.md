---
slug: property-id-ownership--expense-responsibility
route: /property/[id]/ownership
data_point: "Expense Responsibility — row 29 (per-owner sharePercent → 'shared costs' label)"
verdict: "✅ Wired — 1 finding (P3 deferred scope)"
revision: 1
date: 2026-05-06
template: lite
---

# property-id-ownership--expense-responsibility

📄 Page audit: [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

**TL;DR:** Row 29 renders `{initials} {share}% → "shared costs"` for each co-owner. Pure label render — `sharePercent` is a direct read, "shared costs" is a static qualifier. No $ amount today (no per-owner expense breakdown in the data model).

**Source:** `PropertyOwnershipPage.tsx` — `sortedOwners.map(owner => <div>{ownerInitials(owner.name)} {owner.sharePercent}% / shared costs</div>)`. Data from `CoOwner.sharePercent`.

**Convention match:** "shared costs" label is consistent with Rule 2 (no implied derivation without data). The mock showed "J. Smith 60% / shared costs" — real render is identical in label, dynamic in owner data.

## §8 — Findings

### 🟡 F1 — No per-owner expense $ amount
The original mock implied a breakdown ("J. Smith 60% shared costs") but provided no $ figure. Per-owner expense amounts would require `Expense` records tagged by owner — that data model does not exist. Rendering as label-only is the correct conservative choice. **Fix if needed:** add `coOwnerId` to `Expense` entity and derive per-owner expense total. **Deferred:** out of CoOwner scope; separate entity design decision.
