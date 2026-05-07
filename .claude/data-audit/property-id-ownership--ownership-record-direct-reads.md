---
slug: property-id-ownership--ownership-record-direct-reads
route: /property/[id]/ownership
data_point: "OwnershipRecord §21 direct-read bundle — rows 6, 13, 17, 27 (4 surfaces: holdingType KPI, mortgage terms, next payment due, distribution method)"
verdict: "✅ Wired · 2 findings (1 P1 systemic, 1 P3 deferred)"
revision: 1
date: 2026-05-06
template: lite (bundle)
---

> **Plain English:** Four surfaces on the ownership page all read directly from the same OwnershipRecord §21 entity (one record per property). This bundle covers them together since they share the same source entity, query path, and systemic findings. Row 6 shows the legal holding type, row 13 shows the mortgage terms string, row 17 shows the next payment due date, and row 27 shows the distribution method radio. All four now read real data from the database seed.

## TL;DR

- **Row 6 (Ownership Type KPI):** reads `ownershipRecord.holdingType` — "Tenancy in Common" for PROP-0001 ✅
- **Row 13 (Mortgage terms sub-label):** all-or-nothing concat of `loanType + loanTermYears + interestRate` — "Fixed 30yr @ 3.875%" for PROP-0001 ✅; shows "—" if any field absent ✅
- **Row 17 (Next Payment Due):** `formatDate(ownershipRecord.nextPaymentDue)` — "Feb 01, 2026" ✅; "—" if undefined ✅
- **Row 27 (Distribution method radio):** maps `ownershipRecord.distributionMethod` to selected radio among 3 options — "Pro-Rata by Share" selected ✅; all options unselected when undefined ✅
- **PF5 closed:** old `OwnershipRecord` (deed type) renamed to `OwnershipDocument`; new §21 `OwnershipRecord` is the correct entity now.
- **2 findings:** F1 (P1 systemic — userId never reaches client), F2 (P3 deferred — mortgage terms label "Joint ownership" under row 6 is still hardcoded)

📄 Page audit: [property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

## §1 — Surface inventory (4 surfaces)

| Row | Surface | Source field | Empty state | Value for PROP-0001 |
|---|---|---|---|---|
| 6 | KPI "Ownership Type" — value | `ownershipRecord.holdingType` | `"—"` | "Tenancy in Common" |
| 6 | KPI "Ownership Type" — sub | hardcoded `"Joint ownership"` | — | "Joint ownership" (TODO: P3) |
| 13 | Mortgage terms sub-label | `${loanType} ${loanTermYears}yr @ ${interestRate}%` (all-or-nothing) | `"—"` if any field absent | "Fixed 30yr @ 3.875%" |
| 17 | Next Payment Due | `formatDate(ownershipRecord.nextPaymentDue)` | `"—"` if undefined | "Feb 01, 2026" |
| 27 | Distribution method radio | `ownershipRecord.distributionMethod` → selected option | all unselected if undefined | "Pro-Rata by Share" selected |

## §2 — Source trace

```
OREC-0001/core.json
  → db.ownershipRecords.list(userId)             lib/data/db/ownership-records.ts
  → OwnershipRecordSchema.parse()                lib/data/types/ownership-record.ts
  → queries.ts ownershipRecord (first match)     ownership/queries.ts:30-31
  → PropertyOwnershipPage ownershipRecord prop   _components/PropertyOwnershipPage.tsx
  → buildKpis(ownershipRecord, coOwners)[0]      row 6
  → mortgage terms inline                        row 13
  → formatDate(ownershipRecord.nextPaymentDue)   row 17
  → distributionMethod radio map                 row 27
```

## §3 — Findings

🔴 **F1 — userId propagates to client (P1 systemic)** — `ownershipRecord` is the full §21 entity object including `userId`. The component receives it as a prop from the server component, which means `userId` transits the RSC boundary. For a Client Component, the prop is serialized and potentially visible in React DevTools.

> **Fix:** Narrow `ownershipRecord` to only the fields consumed: `Pick<OwnershipRecord, "holdingType" | "loanType" | "loanTermYears" | "interestRate" | "nextPaymentDue" | "lenderName" | "loanAmount" | "closingCosts" | "downPayment" | "originationDate" | "maturityDate" | "distributionMethod">`. Apply the same narrowing pattern established in Phase 6.0 for other entities.

> **One-liner stub** — systemic PF1 finding, applies to all entity props on this page. Tracked at page level.

🟡 **F2 — KPI row 6 "sub" label hardcoded as "Joint ownership" (P3 deferred)** — The sub-label always reads "Joint ownership" regardless of `holdingType`. For "Sole Ownership" or "LLC" holding types this is misleading.

> **Fix:** Derive sub-label from `holdingType`: e.g. `holdingType === "Sole Ownership" ? "Single owner" : holdingType === "LLC" ? "LLC ownership" : "Joint ownership"`. Deferred — no other seed properties exercise alternate holding types currently; revisit when more seeds are added.

## §4 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-06 | Initial write — Phase 6.6. All 4 surfaces wired. PF5 closed. |
