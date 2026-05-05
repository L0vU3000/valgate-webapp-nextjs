---
slug: property-id-ownership
route: /property/[id]/ownership
revision: 1
date: 2026-05-05
verdict: "⚠️ 6 WIRED · 25 HARDCODED · 6 PFn — top entity to land: CoOwner"
---

# Plan — /property/[id]/ownership
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 4 entities/groups |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 37 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

---

## 3. Entity Backlog (4 entities/groups)

> **Plain opener:** The 25 hardcoded surfaces on this page need up to 4 distinct actions, ordered here by impact. Building CoOwner first (10 surfaces) and resolving the OwnershipRecord naming conflict second (6 surfaces) covers the most critical ground. Seven surfaces can be wired immediately from existing `Property` fields with no schema work at all.

### Priority 0 — Resolve `OwnershipRecord` naming conflict first (prerequisite)

Before any entity work, PF5 must be resolved: the existing `OwnershipRecord` TypeScript type is a **document record** (`{name, type, date, owner}`) but catalog §21 defines `OwnershipRecord` as an **ownership structure record** (`{holdingType, currentEstimatedValue, remainingMortgage, coOwnerIds}`). Until these are disambiguated, any new wiring code will reach for the wrong type.

**Action:** Rename `lib/data/types/ownership-record.ts` → `lib/data/types/ownership-document.ts` (interface: `OwnershipDocument`). This is a rename-only refactor — no logic changes. Update `lib/data/db/ownership-records.ts`, `queries.ts`, and `PropertyOwnershipPage.tsx` imports. Then define the real `OwnershipRecord` per catalog §21 in the vacated file.

---

### Entity needed: CoOwner  ← **start here after Priority 0**
- **Required by:** rows **18** (split donut percentages), **19** (legend: name + share%), **20** (owner 1: name, badge, share, equity), **21** (owner 1: email, phone, address), **22** (owner 1: SSN/EIN, tax entity, 1099 status), **23** (owner 2: name, badge, share, equity), **24** (owner 2: email, phone, address), **25** (owner 2: SSN/EIN, tax entity, 1099 status), **28** (rent split amounts — derived from `sharePercent × rental income`), **29** (expense responsibility — derived from `sharePercent`)
- **Catalog reference:** [`ref/00 §21`](../../ref/00-entity-catalog.md) partially — catalog §21 mentions `coOwnerIds: v.array(v.id("userProfiles"))` but UserProfile lacks SSN/tax fields, and co-owners may not be system users. **CoOwner is a new entity not yet in the catalog.** Add it as §21a (or a sub-entity of OwnershipRecord §21) before building.
- **Currently in `lib/data/types/`?** No.
- **Proposed fields:** `id`, `userId`, `propertyId`, `name`, `role` ("Primary" | "Minor"), `sharePercent: number`, `equityValue: number` (derived — Q4.E), `email?`, `phone?`, `address?`, `ssn?` (masked at rest), `taxEntity?` (free text, e.g. "Individual" or "LLC — Jones Prop Holdings"), `tax1099Status?` (e.g. "On file (2024)"), `createdAt`, `updatedAt`.
- **Land first, then audit:** rows 18, 19, 20, 21, 22, 23, 24, 25 as a batch (template: **full** — owner name + share% are direct reads; equity value is a derivation; SSN/tax fields have PII implications). Rows 28–29 (income/expense distribution amounts) can be audited once CoOwner and Lease/Payment exist together (split amounts = `sharePercent × rental income` — needs both entities).
- **Notes:** Single highest-leverage entity on this page — unlocks 10 of 25 HARDCODED rows. SSN/EIN fields require masked storage and access controls (only Admins should read unmasked values — see Q4.N). The equity value per co-owner ($162,480 for 60%) is `CoOwner.sharePercent / 100 × property equity` — a derivation per Q4.E.

---

### Entity needed: OwnershipRecord (catalog §21, properly defined)
- **Required by:** rows **6** (ownership type: "Tenancy in Common"), **7** (total owners count), **13** (mortgage terms: loan type + term, fields not in Property), **17** (next payment due date — not in Property schema), **26** (acquisition details: down payment, closing costs, lender, loan amount, term, origination date, maturity date — 7 of 10 fields not in Property), **27** (distribution method: "Pro-Rata by Share" vs Custom)
- **Catalog reference:** [`ref/00 §21`](../../ref/00-entity-catalog.md) — OwnershipRecord (defined but currently misimplemented — see Priority 0 above).
- **Currently in `lib/data/types/`?** No (the file exists but carries the wrong shape — see PF5).
- **Proposed fields (augmenting catalog §21):** `holdingType` ("Tenancy in Common" | "Joint Tenancy" | "Sole Owner" | "LLC"), `loanType` ("Fixed" | "ARM"), `loanTermYears: number`, `nextPaymentDue: number` (Unix ms), `downPayment: number`, `closingCosts: number`, `lenderName: string`, `loanAmount: number`, `originationDate: number`, `maturityDate: number`, `distributionMethod` ("pro-rata" | "custom"), plus catalog §21 fields: `currentEstimatedValue`, `remainingMortgage`, `equityPercent`.
- **Land first, then audit:** rows 6, 7, 13, 17, 26, 27 as a batch (template: **full** for row 26 — acquisition details is an aggregation of many sub-fields with cross-field identity checks; **lite** for rows 6, 7, 27 — direct enum reads).
- **Notes:** Second-highest entity impact (6 surfaces). Row 7 (total owners) can derive from `CoOwner` count once that entity lands — it doesn't necessarily need a `totalOwners` field on `OwnershipRecord`. Rows 13 + 17 + 26 are the main reasons this entity needs fields beyond what `Property` already provides.

---

### Property fields promotion — 7 surfaces wirable immediately (no new entity)
- **Required by:** rows **8** (acquisition price → `property.purchasePrice`), **10** (current estimated value → `property.currentMarketValue`), **11** (appreciation % → derived from `(currentMarketValue - purchasePrice) / purchasePrice`), **12** (remaining mortgage → `property.outstandingMortgage`), **14** (equity amount + bar → derived from `currentMarketValue - outstandingMortgage`), **15** (LTV ratio → derived from `outstandingMortgage / currentMarketValue`), **16** (monthly P/I → `property.monthlyPayment`)
- **Catalog reference:** [`ref/00 §1`](../../ref/00-entity-catalog.md) — all these fields are in the existing `Property` schema.
- **Currently in `lib/data/types/`?** Yes — all fields exist in `PropertyFinance` (`property.purchasePrice`, `property.currentMarketValue`, `property.outstandingMortgage`, `property.monthlyPayment`, `property.interestRate`). The component ignores them and uses inline literals instead.
- **Caveat:** `property.purchasePrice` is `string | undefined` (from the wizard form) while the UI renders a formatted currency — will need `parseFloat` + `formatCurrency`. `property.currentMarketValue` and `property.outstandingMortgage` are `number | undefined` — add fallback for undefined (empty state).
- **Land first, then audit:** rows 8, 10, 12, 14, 15, 16 can be wired as a batch with **lite** template after `PropertyOwnershipPage` is updated to use `property.*` fields. Row 11 (appreciation %) requires full template (derivation formula, see `ref/03`). Row 11 also needs a denominator edge case (purchasePrice = 0 or undefined). Row 14 (equity bar width) is a visual derivation — the 44% bar width maps to `(currentMarketValue - outstandingMortgage) / currentMarketValue` — full template.
- **Notes:** These 7 rows are a "quick win" — no PR needed for schema or DB changes. Just update `PropertyOwnershipPage.tsx` to read from `property.*` instead of inline literals. The catch: `property.purchasePrice` is currently unset for seed properties (it's the wizard field — verify with `jq .purchasePrice public/data/users/demo-user/properties/PROP-0001/finance.json`). If seed values are missing, backfill them or wire rows 8 + 11 from `property.buyNumeric` instead (which IS populated in seed data).

---

### OwnershipDocument status field — 1 surface
- **Required by:** row **31** (document status badge — hardcoded "Current" with emerald CSS, applies regardless of document state)
- **Catalog reference:** [`ref/00 §2`](../../ref/00-entity-catalog.md) (Document) — if OwnershipDocument folds into `Document` with `category="ownership"`, the status badge could read `document.status`; Q4.C applies.
- **Currently in `lib/data/types/`?** The field is absent — `OwnershipRecord` (which serves as OwnershipDocument today) has no `status` field.
- **Land first, then audit:** Add `status` field to the type (post-Priority-0 rename to `OwnershipDocument`). Likely `"Current" | "Superseded" | "Archived"`. Audit row 31 with the **lite** template once the field exists.
- **Notes:** Lowest priority of the four groups — only 1 surface. The bigger decision is whether to fold this entity into `Document` (Q4.C). If yes, skip adding the field to the renamed type and wire row 30–31 to the `Document` entity's `status` field directly.

---

## 4. Audit Roadmap (37 rows)

> **Plain opener:** Of the 37 inventory rows, 6 are WIRED and runnable now (all lite template). The 25 HARDCODED rows are split: 7 can be wired from existing Property fields immediately (code-only change), 10 wait for CoOwner, 6 wait for OwnershipRecord §21, and 2 wait for resolution of the entity naming conflict.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header code + type | ready | lite | _to-do_ |
| 2 | Header health score | ready | lite | _to-do_ |
| 3 | Tab nav | CHROME | — | — |
| 4 | Breadcrumb code | ready | lite | _to-do_ |
| 5 | Page subtitle (property.name) | ready | lite | _to-do_ |
| 6 | KPI — Ownership Type | blocked on **OwnershipRecord §21** | — | wait for entity |
| 7 | KPI — Total Owners | blocked on **OwnershipRecord §21 / CoOwner count** | — | wait for entity |
| 8 | KPI — Acquisition Price | promotable from **property.buyNumeric** | lite | wire first, then audit |
| 9 | KPI — Holding Period | promotable (derived from **property.purchaseDate**) | full | wire first, then audit |
| 10 | Equity — Current Estimated Value | promotable from **property.currentMarketValue** | lite | wire first, then audit |
| 11 | Equity — Appreciation % | promotable (derived: `(currentMarketValue - buyNumeric) / buyNumeric`) | full | wire first, then audit |
| 12 | Equity — Remaining Mortgage | promotable from **property.outstandingMortgage** | lite | wire first, then audit |
| 13 | Equity — Mortgage terms | blocked on **OwnershipRecord §21** (`loanType` + `loanTermYears`) | — | wait for entity |
| 14 | Equity — Equity amount + bar | promotable (derived: `currentMarketValue - outstandingMortgage`) | full | wire first, then audit |
| 15 | Equity — LTV Ratio | promotable (derived: `outstandingMortgage / currentMarketValue`) | full | wire first, then audit |
| 16 | Equity — Monthly P/I | promotable from **property.monthlyPayment** | lite | wire first, then audit |
| 17 | Equity — Next Payment Due | blocked on **OwnershipRecord §21** (`nextPaymentDue`) | — | wait for entity |
| 18 | Split donut 60%/40% | blocked on **CoOwner** (`sharePercent`) | — | wait for entity |
| 19 | Split legend (name + share%) | blocked on **CoOwner** | — | wait for entity |
| 20 | Owner 1: name, badge, share, equity | blocked on **CoOwner** | — | wait for entity |
| 21 | Owner 1: contact info | blocked on **CoOwner** | — | wait for entity |
| 22 | Owner 1: legal (SSN, entity, 1099) | blocked on **CoOwner** | — | wait for entity (PII — full template) |
| 23 | Owner 2: name, badge, share, equity | blocked on **CoOwner** | — | wait for entity |
| 24 | Owner 2: contact info | blocked on **CoOwner** | — | wait for entity |
| 25 | Owner 2: legal (SSN, entity, 1099) | blocked on **CoOwner** | — | wait for entity (PII — full template) |
| 26 | Acquisition Details (10 fields) | blocked on **OwnershipRecord §21** | — | wait for entity (full — multiple derivations) |
| 27 | Distribution method | blocked on **OwnershipRecord §21** (`distributionMethod`) | — | wait for entity |
| 28 | Rent income split amounts | blocked on **CoOwner** + **Lease/Payment** | — | wait for both entities |
| 29 | Expense responsibility amounts | blocked on **CoOwner** | — | wait for entity |
| 30 | Documents table rows (name/type/date/owner) | ready | lite | _to-do_ — note PF5 type mismatch; wire stable after Priority 0 rename |
| 31 | Documents status badge "Current" | blocked on **OwnershipDocument.status** field | — | wait for field |
| 32 | History timeline items | ready | lite | _to-do_ |
| 33 | "Add Owner" button | CHROME | — | — |
| 34 | "Edit Split" button | CHROME | — | — |
| 35 | "Upload Doc" button | CHROME | — | — |
| 36 | "Edit Owner" / "View Documents" buttons | CHROME | — | — |
| 37 | "Edit Distribution Rules" button | CHROME | — | — |

**Legend:**
- **ready** — WIRED, runnable now with `/audit-datapoint`
- **promotable** — HARDCODED but can be wired using existing `Property` fields without any schema change; run `/audit-datapoint` after the code change
- **blocked on \<Entity\>** — HARDCODED; revisit after entity lands
- **CHROME** — static label/button, no audit needed

**Recommended next moves (in order):**
1. **Priority 0 first:** Rename `OwnershipRecord` → `OwnershipDocument` (no logic changes). Unblocks all future wiring.
2. Run `/audit-datapoint` on rows 1, 2, 4, 5, 32 (lite template — quick). Row 30 is runnable but wait for Priority 0 to land first to avoid type confusion.
3. Wire rows 8, 10, 12, 16 from existing `property.*` fields (code-only). Then run `/audit-datapoint` (lite).
4. Build **CoOwner** entity. Audit rows 18–25 as a batch; rows 28–29 later with Lease/Payment.
5. Build **OwnershipRecord §21**. Audit rows 6, 7, 26, 27 as a batch.
6. Derivations (rows 9, 11, 14, 15) — audit with full template after fields are wired.
7. Rows 13, 17, 31 are lower-priority — depend on OwnershipRecord §21 fields and OwnershipDocument.status.
8. Rows 28–29 (rent/expense split amounts) require CoOwner AND Lease/Payment together.

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial plan (fresh write). 4 entity/action groups in backlog. 37 rows in Audit Roadmap.
- Recommended next: Priority 0 rename (PF5 resolution), then CoOwner entity (10 surfaces), then OwnershipRecord §21 (6 surfaces), then Property field promotions (7 surfaces — code-only).
- Key insight: 7 surfaces are promotable from existing Property fields with no schema changes — these are quick wins before any entity work.
- Key risk: CoOwner carries SSN/EIN fields — requires masked storage + Admin-only read enforcement before shipping (Q4.N).

</details>
