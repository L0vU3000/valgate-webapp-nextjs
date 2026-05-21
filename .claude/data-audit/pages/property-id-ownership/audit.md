---
slug: property-id-ownership
route: /property/[id]/ownership
revision: 1
date: 2026-05-05
verdict: "⚠️ 6 WIRED · 25 HARDCODED · 6 PFn — top entity to land: CoOwner"
---

# Page Audit — /property/[id]/ownership
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 6 of 31 audit-relevant surfaces are WIRED to real data; 25 are placeholders
- ⚠️ 25 HARDCODED surfaces — top entity to land is **CoOwner** (unlocks 10 rows: owner cards, split donut, income distribution)
- 🔧 6 page-wide findings filed (PF1–PF6); per-datapoint audits should cite instead of restating

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 37 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 6 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.
- **CoOwner** — the co-owner contact/equity record needed by the owner cards (name, share %, equity value, contact info, SSN, tax entity); not yet in catalog §13–§22 as a standalone entity.
- **OwnershipRecord §21** — the "correct" ownership-structure record per the entity catalog; distinct from the current `OwnershipRecord` TypeScript type (see PF5).

---

## 1. Surface Inventory

> **Plain opener:** The ownership page shows 37 distinct things. 6 connect to real database data — the property header, breadcrumb, subtitle, documents table rows, and history timeline. The remaining 25 data-bearing surfaces are typed directly into the source: every KPI value, every equity figure, both owner cards, the acquisition-details table, income distribution, and the documents status badge. Plus 6 static action buttons/labels (CHROME).

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header: `{property.code} {property.type}` | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:49-51` |
| 2 | Header: health-score badge (`{property.health}%`) | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Tab nav (7 tabs: Overview, Documents, Safety, Ownership, Rental, Valuation, Location) | CHROME | `tabs[]` constant | `PropertyLayout.tsx:8-16` |
| 4 | Breadcrumb: property code segment | WIRED | `property.code` | `PropertyOwnershipPage.tsx:62` |
| 5 | Page subtitle: `{property.name}` | WIRED | `property.name` | `PropertyOwnershipPage.tsx:73` |
| 6 | KPI — Ownership Type: "Tenancy in Common" / "Joint ownership" | HARDCODED | `kpis[0]` constant | `PropertyOwnershipPage.tsx:25` |
| 7 | KPI — Total Owners: "2" / "Co-owners" | HARDCODED | `kpis[1]` constant | `PropertyOwnershipPage.tsx:26` |
| 8 | KPI — Acquisition Price: "$485,000" / "Mar 2021" | HARDCODED | `kpis[2]` constant | `PropertyOwnershipPage.tsx:27` |
| 9 | KPI — Holding Period: "4 yrs 3 mos" / "Since Mar 2021" | HARDCODED | `kpis[3]` constant | `PropertyOwnershipPage.tsx:28` |
| 10 | Equity card: Current Estimated Value "$612,000" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:123` |
| 11 | Equity card: Appreciation "▲ +26.2% since purchase" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:124` |
| 12 | Equity card: Remaining Mortgage "$341,200" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:131` |
| 13 | Equity card: Mortgage terms "Fixed 30yr @ 3.875%" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:132` |
| 14 | Equity card: Equity amount "$270,800 (44.2%)" + 44% progress bar | HARDCODED | inline literals | `PropertyOwnershipPage.tsx:138-148` |
| 15 | Equity card: LTV Ratio "55.8%" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:153` |
| 16 | Equity card: Monthly P/I "$1,612/mo" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:154` |
| 17 | Equity card: Next Payment Due "Feb 01, 2026" | HARDCODED | inline literal | `PropertyOwnershipPage.tsx:155` |
| 18 | Split donut chart: 60%/40% animated arcs + center "60% · 40%" | HARDCODED | inline literals `60 * 2.51` / `40 * 2.51` | `PropertyOwnershipPage.tsx:176-189` |
| 19 | Split legend: "J. Smith 60%" / "M. Jones 40%" (name + share) | HARDCODED | inline literals | `PropertyOwnershipPage.tsx:193-203` |
| 20 | Owner card 1: name "James Smith", badge "Primary Owner", share 60%, equity "$162,480" | HARDCODED | inline props | `PropertyOwnershipPage.tsx:213-218` |
| 21 | Owner card 1: contact info (email, phone, address) | HARDCODED | inline props | `PropertyOwnershipPage.tsx:218-221` |
| 22 | Owner card 1: legal (SSN "••••-••-4832", entity "Individual", 1099 "On file (2024)") | HARDCODED | inline props | `PropertyOwnershipPage.tsx:221-223` |
| 23 | Owner card 2: name "Maria Jones", badge "Minor Owner", share 40%, equity "$108,320" | HARDCODED | inline props | `PropertyOwnershipPage.tsx:228-234` |
| 24 | Owner card 2: contact info (email, phone, address) | HARDCODED | inline props | `PropertyOwnershipPage.tsx:230-232` |
| 25 | Owner card 2: legal (SSN "••••-••-7710", entity "LLC — Jones Prop Holdings", 1099 "On file (2024)") | HARDCODED | inline props | `PropertyOwnershipPage.tsx:233-235` |
| 26 | Acquisition Details: 10 rows (Purchase Price, Down Payment, Closing Costs, Total Acquisition, Lender, Loan Amount, Rate, Term, Origination Date, Maturity Date) | HARDCODED | inline `[…].map()` | `PropertyOwnershipPage.tsx:247-258` |
| 27 | Distribution method: "Pro-Rata by Share" selected | HARDCODED | inline selected state | `PropertyOwnershipPage.tsx:274-283` |
| 28 | Rent income split: "J. Smith 60% → $1,080/mo" / "M. Jones 40% → $720/mo" | HARDCODED | inline literals | `PropertyOwnershipPage.tsx:292-299` |
| 29 | Expense responsibility: "J. Smith 60% shared costs" / "M. Jones 40% shared costs" | HARDCODED | inline literals | `PropertyOwnershipPage.tsx:302-311` |
| 30 | Ownership Documents table rows: name, type, date, owner | WIRED | `ownershipRecords[].{name, type, date, owner}` | `PropertyOwnershipPage.tsx:362-375` |
| 31 | Ownership Documents table: status badge "Current" | HARDCODED | hardcoded string + emerald CSS | `PropertyOwnershipPage.tsx:377-379` |
| 32 | Ownership History timeline: date, event text, color dot per item | WIRED | `ownershipHistory[].{date, text, color}` | `PropertyOwnershipPage.tsx:403-413` |
| 33 | "Add Owner" button | CHROME | static action | `PropertyOwnershipPage.tsx:75-85` |
| 34 | "Edit Split" button | CHROME | static action | `PropertyOwnershipPage.tsx:204` |
| 35 | "Upload Doc" button | CHROME | static action | `PropertyOwnershipPage.tsx:329-335` |
| 36 | "Edit Owner" + "View Documents" buttons (per owner card) | CHROME | static actions | `PropertyOwnershipPage.tsx:498-503` |
| 37 | "Edit Distribution Rules" button | CHROME | static action | `PropertyOwnershipPage.tsx:318-320` |

**Tally:** WIRED **6** · HARDCODED **25** · PARTIAL **0** · CHROME **6** · DECORATIVE **0**

> **Note on rows 8, 10–12, 14–16 (promotion candidates):** Several HARDCODED rows in the equity card could be wired from _existing_ `Property` fields without any new entity — `property.purchasePrice`, `property.currentMarketValue`, `property.outstandingMortgage`, `property.monthlyPayment`, `property.interestRate`. The component ignores these fields and uses inline literals instead. Wiring them is a code-only change (no schema work). See plan.md §3 Entity Backlog "Property fields promotion" block.

---

## 2. Page-wide findings (6 PFn)

> **Plain opener:** Six systemic problems span this page. Two are auth/isolation issues shared with every property tab (full entity to client, hardcoded user id). Two are data-access design flaws in the queries layer (full-list-then-filter, missing Zod). One is a deep schema naming conflict. One is a critical gap: no audit log for the highest-stakes write path in the app.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### 🔴 PF1 — Full `Property` object serialized to Client Component
**PF P1 robustness · confidence: high · `[render]` `[schema]`**

**Where:** `app/(shell)/property/[id]/ownership/page.tsx:17` (applies to rows 1, 2, 4, 5, 30, 32)

**Problem:** `page.tsx` returns `<PropertyOwnershipPage property={property} {...ownershipData} />`. `PropertyOwnershipPage` is `"use client"` (line 1). The full `Property` object crosses the RSC boundary — including finance fields (`outstandingMortgage`, `currentMarketValue`, `monthlyPayment`, `interestRate`, `buyNumeric`, `purchasePrice`) that don't need to reach the browser. The ownership page uses none of these to power any rendered surface; all equity/financial rows are hardcoded. No `queries.ts` narrowing for the property prop shape.

**Why it matters:** Finance fields are sent to the browser unnecessarily. When hardcoded values are eventually replaced with real data, these fields will be serialized over the network for every pageview. CLAUDE.md rule: "Never send full DB objects as props — `select` only what the UI renders."

**Fix:** Add a `PropertyOwnershipPageProps` narrowed shape in `app/(shell)/property/[id]/ownership/queries.ts` and derive it from `Property` server-side. Only pass `{ id, code, type, health, name }` (the 5 fields that rows 1, 2, 4, 5 actually read). Finance fields should be fetched from the ownership-specific entities once those are wired, not from the core `Property` object.

---

### 🔴 PF2 — `getCurrentUserId()` returns hardcoded "demo-user"; multi-tenant isolation absent
**PF P1 robustness · confidence: high · `[schema]` `[render]`**

**Where:** `app/(shell)/property/[id]/ownership/queries.ts:3` → `lib/data/auth-shim.ts:3` (applies to all reads on this page)

**Problem:** `getOwnershipPageData` calls `getCurrentUserId()` which unconditionally returns `DEMO_USER_ID = "demo-user"`. Every authenticated user who visits this page reads the same demo user's ownership records and history. No Clerk session check, no real identity, no ownership enforcement.

**Why it matters:** The ownership page surfaces sensitive legal and financial information (SSN, equity positions, mortgage details — though currently hardcoded, these will be real when wired). Running under a single hardcoded userId means any user who signs in could see another user's data. See Q4.M (multi-user scope).

**Fix:** Replace `getCurrentUserId()` with a real Clerk session call once auth is wired. Until then, the shim must be replaced before shipping any ownership data that isn't purely decorative.

---

### 🔴 PF3 — Full-list-then-filter: `db.ownershipRecords.list()` and `db.ownershipHistory.list()` fetch all records, then filter in JS
**PF P1 robustness · confidence: high · `[logic]`**

**Where:** `app/(shell)/property/[id]/ownership/queries.ts:7-14` (applies to rows 30, 32)

**Problem:** `getOwnershipPageData` calls `db.ownershipRecords.list(userId)` — fetching ALL ownership records for the user — then filters by `propertyId` in JavaScript:
```
allRecords.filter((x) => x.propertyId === propertyId)
```
Same pattern for `ownershipHistory`. For a user with many properties, this loads every ownership document they've ever created just to show one property's records.

**Why it matters:** This is the same list-then-filter anti-pattern flagged on the rental and documents tabs. At 100+ properties it becomes a significant over-fetch. The `db.ownershipRecords` module has no `listByProperty` helper — only `list(userId)`.

**Fix:** Add `listByProperty(userId, propertyId)` helpers to `lib/data/db/ownership-records.ts` and `lib/data/db/ownership-history.ts`. Both should filter at read time (or, once on Convex, use `by_property` index queries). Update `queries.ts` to call these instead.

---

### 🟡 PF4 — No Zod validation at FS read boundary for `OwnershipRecord` / `OwnershipHistory`
**PF P2 schema smell · confidence: high · `[schema]`**

**Where:** `lib/data/db/ownership-records.ts:16` + `lib/data/db/ownership-history.ts` (same pattern) — applies to rows 30, 32

**Problem:** Both DB modules call `listMergedRecords<T>()` and cast the JSON result directly to the TypeScript type with no runtime validation. A corrupted or partially-migrated seed file (e.g., missing `propertyId`) silently produces a malformed object that reaches the component. The TypeScript type is a compile-time promise, not a runtime guarantee.

**Why it matters:** Silent data corruption reaches the component without error. This is Q5.J applied to the ownership entities. See the portfolio--properties-count audit for a concrete example of this gap producing a cross-card discrepancy.

**Fix:** Add Zod schemas alongside the TypeScript types in `lib/data/types/ownership-record.ts` and `lib/data/types/ownership-history.ts`. Call `schema.parse()` inside `listMergedRecords` (or in each DB module's `list` function) before returning. Match the approach used in `lib/data/db/properties.ts` (`validateProperty()`).

---

### 🟡 PF5 — `OwnershipRecord` TypeScript type conflicts with catalog §21: the current type is a document record, not an ownership-structure record
**PF P2 schema smell · confidence: high · `[schema]` `[semantic]`**

**Where:** `lib/data/types/ownership-record.ts:1-11` (applies to rows 6–29 planning and row 30 wiring)

**Problem:** `lib/data/types/ownership-record.ts` defines `OwnershipRecord` with fields `{id, userId, propertyId, name, type, date, owner}` — clearly a deed/contract record (the documents table renders exactly these fields at lines 367–375). But the entity catalog §21 defines `OwnershipRecord` as `{holdingType, currentEstimatedValue, remainingMortgage, equityPercent, coOwnerIds}` — the ownership **structure** record that would power the KPI row, equity panel, and split chart.

These are two completely different database concepts sharing the same TypeScript name. The UI needs both:
- The current type (a deed/contract document) powers the documents table (rows 30–31) — but should be called `OwnershipDocument` or folded into `Document` with `category="ownership"` (Q4.C).
- A properly-defined `OwnershipRecord` per §21 (holding type, mortgage details, distribution method) powers rows 6, 7, 13, 17, 26, 27.

**Why it matters:** This naming conflict will cause confusion and incorrect wiring as the page is built out. Developers will reach for `OwnershipRecord` to power the equity panel and get a document type. This must be resolved before any of rows 6–29 can be safely wired.

**Fix:** Rename `lib/data/types/ownership-record.ts` → `lib/data/types/ownership-document.ts` with the interface renamed to `OwnershipDocument`. Update `lib/data/db/ownership-records.ts`, `queries.ts`, and `PropertyOwnershipPage.tsx` imports. Then define the real `OwnershipRecord` per catalog §21 in a new `lib/data/types/ownership-record.ts`. Add the new entity to `lib/data/db/` as `ownership-structure.ts` (or keep `ownership-records.ts` once the rename lands). See plan.md §3 for the entity backlog.

---

### 🔴 PF6 — No audit log for ownership mutations — highest-stakes write path in the app
**PF P1 robustness · confidence: high · `[negative-space]`**

**Where:** `PropertyOwnershipPage.tsx:75-85` (Add Owner), `:204` (Edit Split), `:318-320` (Edit Distribution Rules) — applies conceptually to all write CTAs on this page

**Problem:** The "Add Owner", "Edit Split", and "Edit Distribution Rules" buttons exist in the UI but have no server actions wired. When these are eventually wired, **every ownership mutation must write to an immutable audit trail**. Ownership changes affect legal title (who owns what percentage), tax liability (1099 reporting, entity structure), and income distribution — the highest-stakes data in the app. Without an audit log, there is no chain-of-custody for legal disputes or regulatory review.

The `OwnershipHistory` entity (catalog §22, partially wired via rows 32) is a partial solution: it records events and is WIRED for display. But today it is not written atomically on mutation — there is no server action for ownership writes at all. If the history table is populated manually or via seed data, it has no enforcement.

**Why it matters:** Ownership transfer without an audit trail is not legally defensible. Estate-planning use-cases (the stated product positioning) require chain-of-custody. An ownership change that is only stored in the `ownershipRecords` collection with no log entry can be silently overwritten or deleted. See Q4.P (audit log) for the broader question, and Q4.N (Ownership tab visibility — only Admins should be able to mutate ownership).

**Fix:** Before wiring any ownership mutation:
1. Define a server action in `app/(shell)/property/[id]/ownership/actions.ts` for each mutation type.
2. Each action must atomically: (a) update the ownership record, and (b) write an `OwnershipHistory` event (with `kind`: "Transferred" / "OwnerAdded" / "SplitUpdated", `at`: `Date.now()`, and the acting `userId`).
3. Add the `actions.ts` file to the Zod-validation rule: every input shape must be validated before touching DB.
4. Once auth is real, verify the actor is an Admin on this property (Q4.N) before any mutation proceeds.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/ownership/page.tsx
  - app/(shell)/property/[id]/ownership/queries.ts
  - app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx
  - components/property/PropertyLayout.tsx
  - lib/data/types/ownership-record.ts
  - lib/data/types/ownership-history.ts
  - lib/data/db/ownership-records.ts
  - lib/data/db/ownership-history.ts
  - lib/data/auth-shim.ts
sources:
  - path: app/(shell)/property/[id]/ownership/page.tsx
    sha: 02042cf363476e62130c9a0631bd2da4641761c2
  - path: app/(shell)/property/[id]/ownership/queries.ts
    sha: 340e8a3315b8d16e3624f1f7a9b5e0edeab4dda5
  - path: app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx
    sha: 58d03342349c63dee0ac2bda98bf4f3a8f8ddbf6
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
  - path: lib/data/types/ownership-record.ts
    sha: b26d4a44839715f38eef3b2ee18ae4c38457a783
  - path: lib/data/types/ownership-history.ts
    sha: 5fcdd401a5affc2265d1bbf0cb69e7766a7057d8
  - path: lib/data/db/ownership-records.ts
    sha: d6f0adf214e0c7e24793233a487631b497ead658
  - path: lib/data/db/ownership-history.ts
    sha: 06d58a75cecbe06f7ddf0a658454a402c95a8f7c
  - path: lib/data/auth-shim.ts
    sha: 962e3bff445d92309e3f5b7cd1b911519fbbabc7
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm route resolves to expected file
ls "app/(shell)/property/[id]/ownership/page.tsx"

# Check the hardcoded kpis constant
grep -n "const kpis" "app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx"

# Verify OwnershipRecord type shape (should be a document type, not ownership structure)
cat lib/data/types/ownership-record.ts

# Verify OwnershipHistory type shape
cat lib/data/types/ownership-history.ts

# Check auth shim
cat lib/data/auth-shim.ts

# Confirm list-then-filter in queries.ts
cat "app/(shell)/property/[id]/ownership/queries.ts"

# Confirm no Zod in ownership-records DB module
grep -n "parse\|safeParse\|ZodSchema" lib/data/db/ownership-records.ts
```

</details>

<details>
<summary>🔧 Metric Definition SSOT YAML</summary>

```yaml
# No WIRED derivations on this page yet (all 6 WIRED rows are direct reads).
# Paste per-metric SSOT blocks here as they are audited.
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Verdict: ⚠️ 6 WIRED · 25 HARDCODED · 6 PFn.
- 37-row inventory. 6 PFn filed. Source SHAs recorded.
- Key finding: `OwnershipRecord` TypeScript type conflicts with catalog §21 definition (PF5) — must resolve before bulk wiring.
- Key finding: 7 HARDCODED rows in equity card (rows 8, 10–12, 14–16) are promotable from existing `Property` fields — no new entity needed (noted in plan.md §3).
- Key finding: No audit log for ownership mutations — highest-stakes write path (PF6, see Q4.P).
- No pre-existing `property-id-ownership--*.md` per-datapoint audits found; no back-links to insert.
- No new open questions filed (PF5 references Q4.C; PF6 references Q4.P + Q4.N; PF2 references Q4.M — all pre-existing).

</details>
