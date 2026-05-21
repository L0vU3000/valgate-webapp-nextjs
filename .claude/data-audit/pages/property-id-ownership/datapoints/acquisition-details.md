---
slug: property-id-ownership--acquisition-details
route: /property/[id]/ownership
data_point: "Acquisition Details table — row 26 (10 sub-rows: Purchase Price, Down Payment, Closing Costs, Total Acquisition, Lender, Loan Amount, Interest Rate, Loan Term, Origination Date, Maturity Date)"
verdict: "✅ Wired · 3 findings (1 P1 systemic, 1 P2, 1 P3 deferred)"
revision: 1
date: 2026-05-06
template: full
---

> **Plain English:** The Acquisition Details card shows a 10-row table breaking down how a property was bought and financed. Most fields come from the OwnershipRecord §21 entity. "Purchase Price" comes from `Property.purchasePrice` (backfilled for PROP-0001 in Phase 6.6). "Total Acquisition" is derived: `downPayment + closingCosts`. Each row independently shows "—" if its source field is absent — so a property with no active loan gracefully shows mostly "—".

## TL;DR

- **10 rows wired:** Purchase Price (Property), Down Payment, Closing Costs, Total Acquisition (derived), Lender, Loan Amount, Interest Rate, Loan Term, Origination Date, Maturity Date (all OwnershipRecord §21)
- **PROP-0001 golden values verified:** Purchase $485,000 · Down $97,000 · Closing $9,200 · Total $106,200 · Lender First Midwest Bank · Loan $388,000 · Rate 3.875% Fixed · Term 30 Years · Originated Mar 15, 2021 · Maturity Mar 15, 2051
- **Total Acquisition derivation:** `downPayment + closingCosts` — only rendered when both fields present
- **Empty-state rule:** each row independently falls back to "—" — no row collapse when data absent
- 3 findings: F1 (P1 systemic — userId), F2 (P2 — Down Payment % annotation hardcoded in old mock, now removed), F3 (P3 deferred — Purchase Price string parse brittle)

📄 Page audit: [property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

## §1 — What the table shows

Ten fields describing acquisition costs and loan terms. Mix of two sources:

| Row | Label | Source | Type |
|---|---|---|---|
| 1 | Purchase Price | `property.purchasePrice` (string → parseFloat) | direct read |
| 2 | Down Payment | `ownershipRecord.downPayment` | direct read |
| 3 | Closing Costs | `ownershipRecord.closingCosts` | direct read |
| 4 | Total Acquisition | `downPayment + closingCosts` | derivation |
| 5 | Lender | `ownershipRecord.lenderName` | direct read |
| 6 | Loan Amount | `ownershipRecord.loanAmount` | direct read |
| 7 | Interest Rate | `ownershipRecord.interestRate + " " + ownershipRecord.loanType` | concat |
| 8 | Loan Term | `ownershipRecord.loanTermYears + " Years"` | concat |
| 9 | Origination Date | `formatDate(ownershipRecord.originationDate)` | formatted direct read |
| 10 | Maturity Date | `formatDate(ownershipRecord.maturityDate)` | formatted direct read |

## §2 — Source trace

```
PROP-0001/finance.json (purchasePrice: "485000")
OREC-0001/core.json (all loan/acquisition fields)
  → db.properties.get() + db.ownershipRecords.list()    ownership/queries.ts
  → PropertyOwnershipPage: property + ownershipRecord props
  → AcquisitionDetails sub-component                    _components/PropertyOwnershipPage.tsx:583+
```

## §3 — Golden value check (PROP-0001)

| Row | Expected | Seed source |
|---|---|---|
| Purchase Price | $485,000 | `finance.json.purchasePrice = "485000"` → `parseFloat` → `formatCurrencyFull(485000)` |
| Down Payment | $97,000 | `OREC-0001.downPayment = 97000` |
| Closing Costs | $9,200 | `OREC-0001.closingCosts = 9200` |
| Total Acquisition | $106,200 cash deployed | 97000 + 9200 = 106200 ✓ |
| Lender | First Midwest Bank | `OREC-0001.lenderName` |
| Loan Amount | $388,000 | `OREC-0001.loanAmount = 388000` |
| Interest Rate | 3.875% Fixed | `3.875 + " " + "Fixed"` |
| Loan Term | 30 Years | `OREC-0001.loanTermYears = 30` |
| Origination Date | Mar 15, 2021 | `formatDate(1615766400000)` |
| Maturity Date | Mar 15, 2051 | `formatDate(2562451200000)` |

## §4 — Derivation correctness

**Total Acquisition** = `downPayment + closingCosts`.

Walk 1 (PROP-0001): 97000 + 9200 = 106200. Display: "$106,200 cash deployed" ✅

Walk 2 (PROP-0002, no loan): `downPayment` = undefined, `closingCosts` = undefined → `totalAcquisition = null` → displays "—" ✅ (no crash, no NaN)

Walk 3 (partial): if only `downPayment` is defined but `closingCosts` is undefined: `totalAcquisition = null` → "—". This is conservative (both must be present), which is correct — a partial sum would be misleading.

## §5 — Empty states

Each row independently empty-states to "—":
- `purchasePriceNum = null` → "—" (when `property.purchasePrice` is undefined or non-numeric)
- `record?.downPayment != null` guard → "—" if absent
- Same pattern for all numeric fields
- `record?.lenderName ?? "—"` for string field
- `record?.originationDate != null ? formatDate(...) : "—"` for date fields

PROP-0002 (no loan seed): rows 2–10 all show "—". The table renders but is all empty-state — correct for a fully-paid property.

## §6 — Consistency checks

- **Down Payment + Purchase Price → Loan Amount:** For PROP-0001: 485000 - 97000 = 388000 ✓ (matches `loanAmount` in seed). These three values are separately stored but happen to be consistent in the seed.
- **interestRate on OwnershipRecord vs Property:** `OREC-0001.interestRate = 3.875`. `Property.interestRate` is also on the PropertyFinance schema and may diverge over time. §21 is the transactional source (loan origination terms); Property.interestRate is the current rate (may be updated on refinance). For v1, both exist independently — no reconciliation needed.

## §7 — Findings

🔴 **F1 — userId propagates to client (P1 systemic)** — `property` and `ownershipRecord` props both include `userId`. Same systemic issue as all entity props on this page. Tracked at page level.

> **Fix:** Narrow both props at the server boundary before serialization.

🟠 **F2 — Purchase Price parsed from string without validation (P2)** — `property.purchasePrice` is `z.string().optional()` (a wizard-entry field). The component does `parseFloat(property.purchasePrice)` without checking for NaN. If someone enters "~$485K" in the wizard, `parseFloat` returns NaN and `formatCurrencyFull(NaN)` shows "$NaN".

> **Fix:** Add a guard: `const p = parseFloat(property.purchasePrice ?? ""); const purchasePriceNum = isNaN(p) ? null : p;`. Then the NaN case renders "—" correctly. Low priority for demo era (seed data is clean numeric strings), but should be fixed before real user data can enter.

🟡 **F3 — Interest Rate label omits loanType when loanType is absent (P3 deferred)** — The component renders `${interestRate}% ${loanType}`. If `loanType` is undefined but `interestRate` is present, it shows "3.875% undefined". Currently guarded by the all-or-nothing pattern (both fields must be present for row 13 mortgage terms), but the Acquisition Details table row renders them separately — `loanType` could be missing while `interestRate` is set.

> **Fix:** The Interest Rate row should check both: `record?.interestRate != null ? \`${record.interestRate}%${record.loanType ? " " + record.loanType : ""}\` : "—"`. Deferred — not reproducible with current seeds.

## §8 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-06 | Initial write — Phase 6.6. 10-row table documented. Derivation walks verified. |
