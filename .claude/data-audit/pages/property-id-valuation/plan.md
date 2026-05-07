---
slug: property-id-valuation
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "⚠️ 4 WIRED · 1 PARTIAL · 18 HARDCODED · 4 PFn — PropertyValuation entity exists but KPI reads not wired; market/comp data needs external integration"
---

# Plan — /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 3 entities + 2 derivations + 2 new Q-numbers |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 32 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

## 3. Entity Backlog

> **Plain opener:** This page has two distinct problems. First, the PropertyValuation entity already exists but hasn't been wired to the KPI cards — that's quick work. Second, five separate card sections (market insight, comparables, investment metrics, value drivers, appraisal details) need either an external data integration or a new entity design. The external data decisions are the hard part.

### Entity: PropertyValuation  ← **wire first — entity already exists**
- **Status:** `shipped, partial wiring` — `lib/data/types/property-valuation.ts` exists; `lib/data/db/property-valuations.ts` has CRUD; seed records VAL-0001/0002/0003 exist for PROP-0001 (Jan–Mar 2026, values $1.278M–$1.310M). **Queries.ts already fetches and passes `valuations` to the component.**
- **What's not wired:** the `PropertyValuationPage.tsx` KPI cards still use inline hardcoded literals instead of reading from the `valuations` prop.
- **Required by:**
  - Row **8** (Current Market Value headline): read `valuations.sort(v => v.recordedAt).at(-1)?.price`
  - Row **9** (QoQ change sub): subtract previous-quarter max from current-quarter max
  - Row **12** (Total Appreciation headline): `latest.price − property.buyNumeric`
  - Row **13** (Appreciation gain % and purchase date): same derivation + `property.purchaseDate`
  - Row **15** (Value History chart): already wired for PROP-0001; needs empty-state fix (PF3) + Y-axis domain derivation (PF3) + more seed records for PROP-0002 through PROP-0005
  - Row **25** (comparables footer "Your estimate: $485,000"): read same latest valuation price
- **Surfaces unlocked on this page:** 5 (rows 8, 9, 12, 15, 25; row 13 is a sub-label derived from row 12)
- **Catalog reference:** [`ref/00 §16`](../../ref/00-entity-catalog.md)
- **Cross-page tally:** overview row 7 (1) + portfolio row 8 (1) + this page (5) = **7 total surfaces across 3 pages**
- **Land first, then audit:** fix PF3 empty-state + wire KPI cards first; audit rows 8, 9, 12, 13, 15, 25 as a batch with the **full** template (all are derivations: latest-of-N, subtraction, percentage, date formatting).
- **Notes:** The portfolio plan.md (revision 1) incorrectly states PropertyValuation is "not built" — the entity was built between that audit and this one. Update portfolio/plan.md on next re-audit to reflect `shipped, partial wiring` status.

### Entity: MarketComparable  ← **design decision required first**
- **Status:** `not built` — no entity in catalog, no type in `lib/data/types/`. Currently represented by the `comparables` const (4 hardcoded rows at `PropertyValuationPage.tsx:31-36`).
- **Required by:** row **24** (comparable sales table — 4 rows with address, distance, sold date, type, beds/baths, sqft, price, price/sqft), row **25** (avg comp in footer — derived from comparable rows).
- **Open question:** comparable sales data source — see **Q8** for `/property/[id]/valuation` ("manually entered, AVM API, AI?") and **Q4.Q** (new — filed below) for the architectural scope of MarketSnapshot and MarketComparable together.
- **Catalog reference:** Not yet in catalog — file as new entity when decided.
- **Surfaces unlocked:** 2 (rows 24, 25 — noting row 25 also needs PropertyValuation for the "your estimate" half)
- **Notes:** If sourced from an AVM API, MarketComparable may be a pass-through query result (never stored), not a stored entity. If manually entered, it needs a write path. Decide before building.

### Entity: MarketSnapshot  ← **external data integration**
- **Status:** `not built` — no entity in catalog. Currently represented by six inline hardcoded values in the Market Insight card.
- **Required by:** row **18** (location label), row **19** (Market Trend classification), row **20** (above-list-price stat), row **21** (avg days on market + bar), row **22** (inventory level + bars), row **23** (buyer demand + bars).
- **Open question:** See **Q4.Q** (new — filed below). This is likely an external data feed (real-estate market intelligence API) or a manually curated summary updated periodically — not a user-authored entity.
- **Catalog reference:** Not yet in catalog — will need a new §17 or §18 entry.
- **Surfaces unlocked:** 6 (rows 18–23)
- **Notes:** Lowest-complexity unblock for the Market Insight card: make location label (`"Phnom Penh, Cambodia"`) derive from `property.province` — that wires row 18 without waiting for the full MarketSnapshot entity. The remaining 5 rows (19–23) all need the data feed.

### Derivation: Investment Performance metrics (no new entity — see Q4.E)
- **Status:** blocked on upstream entities
- **Required by:** row **27** (4 metrics: Cash-on-Cash Return 8.4%, Cap Rate 6.2%, Total ROI 42.7%, Equity $137,800). All four are derivable from existing or planned data:
  - *Equity*: `latest(valuations).price − outstandingMortgage` (needs PropertyValuation + mortgage field)
  - *Total ROI*: `(latest.price − property.buyNumeric) / property.buyNumeric × 100` (needs PropertyValuation)
  - *Cap Rate*: `annualNOI / latest.price` (needs Payment + PropertyValuation)
  - *Cash-on-Cash*: `annualCashFlow / cashInvested` (needs Payment + initial investment data)
- **Surfaces unlocked:** 4 (row 27, 4 metric cells), but blocked until PropertyValuation + Payment are wired first
- **Decision:** Q4.E — derive at query time, not stored (confirmed pattern)

### Derivation: Value Drivers (low priority)
- **Status:** blocked on MaintenanceItem entity
- **Required by:** row **29** (4 positive factors + 3 opportunities — currently hardcoded strings)
- **Surfaces unlocked:** 1 (the card)
- **Notes:** Positive factors likely need property-condition or renovation data (no entity for this yet). Opportunities overlap with MaintenanceItem (HVAC fault, aging systems). AI-assisted generation is possible (Q4.L pattern). Lowest-priority surface on this page — defer until MaintenanceItem is built.

---

## 4. Audit Roadmap (32 rows)

> **Plain opener:** Of the 32 rows, 4 can be deeply audited right now (WIRED). Rows 8, 9, 12, 13, 15, 25 should be audited as a batch once PropertyValuation KPI wiring is done — that's 6 rows with a single PR. The remaining 12 hardcoded rows (market insight, comparables, investment metrics, value drivers, appraisal) are blocked on entity design decisions.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header `code` + `type` | ready | lite | _to-do_ |
| 2 | Header `health` score badge | ready | lite | _to-do_ |
| 3 | Tab nav | CHROME | — | — |
| 4 | Layout header chrome | CHROME | — | — |
| 5 | Breadcrumb `name` | ready | lite | _to-do_ |
| 6 | Subtitle `name` | ready | lite | _to-do_ |
| 7 | "Refresh Estimates" button | CHROME | — | — |
| 8 | Current Market Value KPI | blocked on **PropertyValuation wiring** | full | wait — wire KPI cards first |
| 9 | QoQ change sub | blocked on **PropertyValuation wiring** | full | wait — needs two adjacent records |
| 10 | Market Rent Estimate KPI | blocked on **MarketComparable / external** | — | wait for Q4.Q decision |
| 11 | Rent upside sub | blocked on **Lease + MarketRent** | — | wait for Lease + Q4.Q |
| 12 | Total Appreciation KPI | blocked on **PropertyValuation wiring** | full | wait — wire KPI cards first |
| 13 | Appreciation gain sub | blocked on **PropertyValuation wiring** | full | same batch as row 12 |
| 14 | KPI CTA buttons | CHROME | — | — |
| 15 | Value History chart data | partial | full | fix PF3 empty-state first, then audit |
| 16 | Chart Y-axis domain | blocked on **PropertyValuation wiring** | — | fix PF3 Y-axis derivation, then audit as part of row 15 batch |
| 17 | "2025" year filter | CHROME | — | — |
| 18 | Market Insight location label | partial (quick fix) | lite | wire `property.province` then audit |
| 19 | Market Trend classification | blocked on **MarketSnapshot** | — | wait for Q4.Q decision |
| 20 | "12% above list price" stat | blocked on **MarketSnapshot** | — | wait for Q4.Q decision |
| 21 | Avg Days on Market | blocked on **MarketSnapshot** | — | wait for Q4.Q decision |
| 22 | Inventory Level | blocked on **MarketSnapshot** | — | wait for Q4.Q decision |
| 23 | Buyer Demand | blocked on **MarketSnapshot** | — | wait for Q4.Q decision |
| 24 | Comparable Sales table (4 rows) | blocked on **MarketComparable** | full | wait for Q4.Q / Q8 decision |
| 25 | Comparables footer avg + estimate + delta | blocked on **PropertyValuation + MarketComparable** | full | wire PropertyValuation first, then audit alongside row 24 |
| 26 | "View Full Report" + "Contract" buttons | CHROME | — | — |
| 27 | Investment Performance 4 metrics | blocked on **PropertyValuation + Payment** | full | wait for upstream entities |
| 28 | "View Detailed Report →" button | CHROME | — | — |
| 29 | Value Drivers (4+3 items) | blocked on **MaintenanceItem** | full | lowest priority; wait for MaintenanceItem |
| 30 | "Get Improvement Estimates →" button | CHROME | — | — |
| 31 | Professional Appraisal details | hardcoded (constants appropriate) | lite | may not need an entity — audit once service model is decided |
| 32 | "Request Appraisal" / "Learn More" buttons | CHROME | — | — |

**Legend:**
- **ready** — WIRED, runnable now with the lite template
- **partial (quick fix)** — one small code change makes it ready; do the fix then audit
- **blocked on \<X\>** — wait for entity or design decision before running `/audit-datapoint`

**Recommended next moves (in order):**
1. Fix PF3 (empty-state for chart) — 20-min code change, no entity needed.
2. Wire PropertyValuation KPIs (rows 8, 9, 12, 13, 15, 25) — entity already exists; just update `PropertyValuationPage.tsx` to read `valuations` prop instead of inline literals. One PR.
3. Resolve Q4.Q (MarketSnapshot architecture) and Q8 (comparables source) — these are design decisions, not code. Once decided, rows 18–24 become buildable.
4. Run `/audit-datapoint` on rows 1, 2, 5, 6 (lite template — straightforward direct-reads citing PF1/PF2). Each produces a short report.
5. After PropertyValuation wiring lands, audit rows 8, 9, 12, 13, 15, 25 as a batch (full template).
6. Fix row 18 (market insight location → `property.province`): quick one-line change, audit with lite.
7. Defer rows 19–23 (market conditions), 24–25 (comparables full), 27 (investment), 29 (value drivers) until Q4.Q decision + upstream entities.

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-05 | Rows 8, 9, 12, 13, 15, 25 — PropertyValuation wiring | Removed `FALLBACK_VALUE_HISTORY` constant; replaced all 5 KPI hardcoded values with derivations from `valuations` prop (`sorted`, `latest`, `prev`, `appreciation`, `yourEstimateStr`, `chartDomain`); added empty-state chart guard; fixed Y-axis domain | valgate-local-db branch |

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit and plan for `/property/[id]/valuation`. Extracted action items; no fixes applied.
- Key finding: PropertyValuation entity already exists in `lib/data/types/` + `lib/data/db/`; KPI wiring is the near-term unlock, not entity creation.
- Two new entity concepts surfaced: MarketComparable + MarketSnapshot (Q4.Q filed in `ref/05-open-questions.md`).

</details>
