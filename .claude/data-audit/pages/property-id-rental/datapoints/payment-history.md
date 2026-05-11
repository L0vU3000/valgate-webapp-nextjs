---
slug: property-id-rental--payment-history
data_point: "Payment History — table rows (date, type, amount, method, status)"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · 3 rows shown; sorted desc by date"
template: lite
---

# Audit — Payment History Rows on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Rows are correct — 3 rows rendered from real payment seeds, sorted by date descending
- ⚠️ 1 finding · 1 P1 (Payment[] userId to browser)
- 🔧 Top fix: narrow Payment[] server-side to strip userId (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this table? | — |
| 2 | Entity | What fields are read? | ✅ |
| 3 | Render | How do rows reach the user? | ⚠️ |
| 4 | Findings | What to fix | 1 item |

_Lite template — 4 sections. Applies to direct field reads over a sorted collection where the formula is `sort + paginate`, not a derivation._

---

## 1. Snapshot — ✅

> **Plain opener:** The Payment History table shows all payments for this property, newest first. For PROP-0001, there are three payment records. All three fit on the first page (page size = 6), so no pagination is needed. The table displays each payment's date, type (kind), amount, method, and status directly from the Payment entity.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Payment History card, `<tbody>` |
| Label | "Payment History" |
| Source | `payments[]` prop, sorted descending by date, sliced to `pageSize=6` |
| Rows shown | 3 (all payments for PROP-0001) |

**Rows rendered (sorted desc):**

| Row | ID | Date | Type | Amount | Method | Status |
|---|---|---|---|---|---|---|
| 1 | PMT-0006 | May 5, 2026 | Rent | $850 | ABA Bank | Paid |
| 2 | PMT-0002 | Mar 31, 2026 | Rent | $850 | ABA Bank | Paid |
| 3 | PMT-0001 | Mar 2, 2026 | Rent | $850 | ABA Bank | Paid |

## 2. Entity — ✅

| Field rendered | Column | Source |
|---|---|---|
| `p.date` | Date | `formatDate(p.date)` → `"May 5, 2026"` etc. |
| `p.kind` | Type | direct string render: `"Rent"` |
| `p.amount` | Amount | `formatCurrencyFull(p.amount)` → `"$850"` |
| `p.method` | Method | direct string: `"ABA Bank"` |
| `p.status` | Status | direct string + `paymentStatusVariant(p.status)` for color |
| `p.id` | React `key` | not displayed; used as `key={p.id}` |

**Unused fields (shipped to browser):** `userId`, `propertyId`, `leaseId`, `tenantId` — see F1.

## 3. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Payment History `<tbody>` |
| Sort | `[...payments].sort((a, b) => b.date - a.date)` — descending |
| Pagination | `sortedPayments.slice(0, pageSize)` — page 1 only (no next-page action yet) |
| Status color | `paymentStatusVariant(p.status)` → `"success"` (emerald) / `"warning"` (amber) / `"neutral"` |
| Overdue row | `p.status === "Overdue"` → amber-50/40 row background |

**PII / IDOR:** `Payment[]` carries `userId`, `leaseId`, `tenantId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 4. Findings — 1 item

---

### 🔴 F1 — `userId`, `leaseId`, `tenantId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

`Payment` carries three relational IDs that are not rendered in the table: `userId`, `leaseId`, and `tenantId`. All three reach the browser via the `payments` prop. Strip them in `rental/queries.ts` using a `PaymentTableRow` type that picks only `id`, `date`, `kind`, `amount`, `method`, `status`, and `propertyId`.

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (PF4 sprung: module-level `payments` const deleted; real Payment[] now drives the table).
- 3 rows verified against seed data.
- 1 finding: F1 (userId/leaseId/tenantId leak in Payment[]).

</details>
