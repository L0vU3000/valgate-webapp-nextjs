---
slug: property-id-valuation
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "⚠️ 4 WIRED · 1 PARTIAL · 18 HARDCODED · 4 PFn — PropertyValuation entity exists but KPI reads not wired; market/comp data needs external integration"
---

# Page Audit — /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 4 surfaces are real data (PropertyLayout code/type/health + `property.name` in breadcrumb/subtitle); 1 is partially real (Value History chart)
- ⚠️ 18 HARDCODED surfaces — but **PropertyValuation already exists as an entity** (`lib/data/types/property-valuation.ts` + `lib/data/db/property-valuations.ts` + 3 seed records for PROP-0001); KPIs just haven't been wired to it yet
- 🔧 4 page-wide findings (PF1–PF4); per-datapoint audits should cite instead of restating
- 🆕 2 new entity concepts surfaced: **MarketComparable** (comparable sales data) + **MarketSnapshot** (regional market conditions) — neither is in the catalog

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 32 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 4 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.

---

## 1. Surface Inventory

> **Plain opener:** The page shows 32 distinct things. 4 are connected to real data (property code, type, health score, and name); 1 uses real data when available but silently falls back to fabricated data (the valuation history chart). 18 are placeholder values typed directly into the code — many could already be wired since the PropertyValuation entity exists but hasn't been connected to the KPI cards. 9 are buttons or nav elements with no functionality.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header `{property.code} {property.type}` | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:49-51` |
| 2 | Header health score badge (`{property.health}%`) | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Tab nav (7 tabs: Overview → Location) | CHROME | `tabs` const | `PropertyLayout.tsx:8-16` |
| 4 | Layout header chrome (back, Share, Get directions, MoreVertical) | CHROME | static labels/icons | `PropertyLayout.tsx:39-73` |
| 5 | Breadcrumb `{property.name}` | WIRED | `property.name` | `PropertyValuationPage.tsx:155` |
| 6 | Page subtitle "…comparables for {property.name}" | WIRED | `property.name` | `PropertyValuationPage.tsx:163` |
| 7 | "Refresh Estimates" button | CHROME | static button, no handler | `PropertyValuationPage.tsx:167-176` |
| 8 | KPI: Current Market Value headline ($485,000) | HARDCODED | inline literal — seed VAL-0003 for PROP-0001 is $1,310,000; values disagree | `PropertyValuationPage.tsx:183` |
| 9 | KPI: QoQ change sub (+$18,500 since last quarter) | HARDCODED | inline literal — requires two adjacent `PropertyValuation` records | `PropertyValuationPage.tsx:184` |
| 10 | KPI: Market Rent Estimate headline ($2,850) | HARDCODED | inline literal — needs external market-rent estimate (no entity covers this) | `PropertyValuationPage.tsx:195` |
| 11 | KPI: Rent upside sub (Your current: $2,650/mo · $200 upside) | HARDCODED | inline literal — needs `Lease.monthlyRent` comparison | `PropertyValuationPage.tsx:197` |
| 12 | KPI: Total Appreciation headline ($112,500) | HARDCODED | inline literal — derivable as `latest.price − property.buyNumeric` | `PropertyValuationPage.tsx:207` |
| 13 | KPI: Appreciation gain sub (30.2% since purchase, Dec 2019) | HARDCODED | inline literal — same derivation + `property.purchaseDate` | `PropertyValuationPage.tsx:208` |
| 14 | KPI card CTA buttons (3: Update Estimates, View Rental, View Full History) | CHROME | static labels, no handlers or routing | `PropertyValuationPage.tsx:113-119` |
| 15 | Value History chart data (month/price series) | PARTIAL | `valuations.map(v => ({ month: v.month, price: v.price }))` when `valuations.length > 0`; falls back to `FALLBACK_VALUE_HISTORY` const (12 fabricated months) for all properties without seed records — currently only PROP-0001 has data (3 months) | `PropertyValuationPage.tsx:133-135` |
| 16 | Chart Y-axis domain [340,000–520,000] | HARDCODED | inline constant — not derived from actual data range; PROP-0001 real valuations are 1.27M–1.31M (scale mismatch) | `PropertyValuationPage.tsx:256` |
| 17 | "2025" year filter button on chart | CHROME | static label, no handler | `PropertyValuationPage.tsx:229-233` |
| 18 | Market Insight location label ("Phnom Penh, Cambodia") | HARDCODED | inline string — should derive from `property.province` / `property.city` | `PropertyValuationPage.tsx:288` |
| 19 | Market Trend classification ("Seller's Market") | HARDCODED | inline literal — needs MarketSnapshot entity (see Q4.Q) | `PropertyValuationPage.tsx:293` |
| 20 | "12% above list price on average" market stat | HARDCODED | inline literal — needs MarketSnapshot | `PropertyValuationPage.tsx:295` |
| 21 | Avg Days on Market (42 days + animated 42% bar) | HARDCODED | inline literal — needs MarketSnapshot | `PropertyValuationPage.tsx:300-310` |
| 22 | Inventory Level (Low + 2/5 bars) | HARDCODED | `i <= 2` condition — needs MarketSnapshot | `PropertyValuationPage.tsx:313-325` |
| 23 | Buyer Demand (High + 4/5 bars) | HARDCODED | `i <= 4` condition — needs MarketSnapshot | `PropertyValuationPage.tsx:330-342` |
| 24 | Comparable Sales table (4 rows: address, dist, sold date, type, beds/baths, sqft, price, $/sqft) | HARDCODED | `comparables` const — needs MarketComparable source; see Q8 for `/property/[id]/valuation` | `PropertyValuationPage.tsx:31-36` |
| 25 | Comparable Sales footer (avg comp $492K, your estimate $485K, 1.4% below) | HARDCODED | inline literals — "your estimate" should read `latest(valuations).price`; avg comp derived from comparable rows | `PropertyValuationPage.tsx:401-409` |
| 26 | "View Full Report" + per-row "Contract" link buttons | CHROME | static labels, no handlers | `PropertyValuationPage.tsx:357, 393-395` |
| 27 | Investment Performance: 4 metrics (Cash-on-Cash 8.4%, Cap Rate 6.2%, Total ROI 42.7%, Equity $137,800) | HARDCODED | `investmentMetrics` const — derivable once PropertyValuation + Payment entities are wired; see Q4.E | `PropertyValuationPage.tsx:38-43` |
| 28 | "View Detailed Report →" button (Investment Performance) | CHROME | static label, no handler | `PropertyValuationPage.tsx:430` |
| 29 | Value Drivers: 4 positive factors + 3 opportunities | HARDCODED | `positiveFactors` + `opportunities` consts — no entity for property condition data exists yet | `PropertyValuationPage.tsx:45-56` |
| 30 | "Get Improvement Estimates →" button (Value Drivers) | CHROME | static label, no handler | `PropertyValuationPage.tsx:456` |
| 31 | Professional Appraisal details (4 rows: Licensed, Bank-acceptable, 3–5 days, $350) | HARDCODED | inline array — service catalog; may be appropriate as constants, not a DB entity | `PropertyValuationPage.tsx:471-480` |
| 32 | "Request Appraisal" / "Learn More" buttons | CHROME | static labels, no handlers | `PropertyValuationPage.tsx:484-493` |

**Surface counts:** 4 WIRED · 1 PARTIAL · 18 HARDCODED · 9 CHROME

---

## 2. Page-wide findings (PF1–PF4)

> **Plain opener:** Four systemic problems affect multiple rows on this page. Filing them once here so per-datapoint audits can cross-link instead of repeating the same finding.

---

### PF1 — Full Property object passed to Client Component
**Summary:** `page.tsx:17` passes the entire `Property` object (all fields: `code`, `type`, `health`, `name`, `province`, `buyNumeric`, `status`, `title`, `statusVariant`, `titleVariant`, `media`, etc.) as a prop to `PropertyValuationPage`, which is a `"use client"` component. Only `code`, `type`, `health`, and `name` are rendered on this page — the rest of the object is sent to the browser unnecessarily.

**Risk:** Over-exposure of data; any future sensitive field added to `Property` automatically leaks to the client without a deliberate decision.

**Fix:** Define a `ValuationPageProperty` narrowing type (selecting `code`, `type`, `health`, `name`, `province`) and apply it in `queries.ts` before returning to the page.

**Applies to rows:** 1, 2, 5, 6

---

### PF2 — Multi-tenant shim (all users share demo-user data)
**Summary:** `queries.ts:7` calls `getCurrentUserId()` from `lib/data/auth-shim.ts`, which returns the hardcoded string `"demo-user"`. The `getValuationPageData()` function then loads all property valuations for `demo-user`, regardless of the actual authenticated user.

**Risk:** Any production deploy with more than one user would cross-contaminate valuation data. User A sees User B's valuation history.

**Fix:** Replace `getCurrentUserId()` with Clerk `auth()` once authentication is wired. The DB `list()` + filter pattern already works; only the `userId` value needs to change.

**Applies to rows:** 15 (and all future PropertyValuation-wired rows)

---

### PF3 — Fallback data silently replaces real data with no UI indicator
**Summary:** `PropertyValuationPage.tsx:133-135`:
```ts
const valueHistory = valuations.length > 0
  ? valuations.map((v) => ({ month: v.month, price: v.price }))
  : FALLBACK_VALUE_HISTORY;
```
When `valuations.length === 0` (true for PROP-0002 through PROP-0005 — no seed records exist for those properties), the component renders the 12-month `FALLBACK_VALUE_HISTORY` constant (lines 16–29) as if it were the property's real historical data. There is no placeholder state, no "No valuation history yet" message, no visual indicator that the chart is fabricated.

**Additional scale mismatch:** `FALLBACK_VALUE_HISTORY` values are in the $380K–$485K range; the PROP-0001 real seed valuations are $1.27M–$1.31M. If any property gains real valuation data, the Y-axis domain (`[340000, 520000]` at line 256) will clip all bars above $520K — a second hardcoded value that must be derived from the data range.

**Risk:** Users cannot distinguish real history from placeholder data. This is a correctness defect, not just a UX gap.

**Fix:** Check `valuations.length === 0` and render an empty-state component (e.g., "No valuation history added yet. Add your first valuation to start tracking.") instead of `FALLBACK_VALUE_HISTORY`. Also derive the Y-axis domain from `Math.min/max(valueHistory.map(v => v.price))` with appropriate padding.

**Applies to rows:** 15, 16

---

### PF4 — Missing audit trail on PropertyValuation mutations
**Summary:** `lib/data/types/property-valuation.ts:1-8`: the `PropertyValuation` type has no `createdAt`, `updatedAt`, `createdBy`, or `version` fields. The DB `update()` function at `property-valuations.ts:37-46` silently overwrites the existing record:
```ts
const updated = { ...current, ...patch, id: current.id, userId: current.userId };
await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
```
No prior value is retained.

**Risk:** In an estate-planning context where property values drive mortgage eligibility, tax assessments, and inheritance share calculations, a chain-of-custody requirement applies. Any valuation edit is irrecoverably lost. A tax authority or legal proceeding that asks "what was the recorded valuation on date X?" cannot be answered.

**Fix:** Add `createdAt: number` and `updatedAt: number` (Unix ms) to the type. On Convex migration, use append-only snapshot semantics (insert new record per valuation point rather than updating existing rows — the entity's `month` field already supports this). See Q4.P for the broader audit-log question.

**Applies to rows:** 8, 9, 12, 13, 15, 25

---

<details>
<summary>🔍 Source files & hashes</summary>

| File | SHA (git hash-object) |
|---|---|
| `app/(shell)/property/[id]/valuation/page.tsx` | `cb85d928f858e1776fd6b5c16b770441bb2f9f76` |
| `app/(shell)/property/[id]/valuation/queries.ts` | `e7a521135d3872161f96a9df58e619543d6ffebe` |
| `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` | `2a6e463fb2d1ead88d7519757933101fc2ce406c` |
| `components/property/PropertyLayout.tsx` | `543f6dc98c411c84cfe562855b487a2146fa48e0` |
| `lib/data/types/property-valuation.ts` | `af622a0c0d43fe39ce858fb92490afe99d5234d8` |
| `lib/data/db/property-valuations.ts` | `290f0041e4e6ef10abbca45d49c2a5719b48ac06` |

</details>
