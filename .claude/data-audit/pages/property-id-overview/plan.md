---
slug: property-id-overview
route: /property/[id]/overview
revision: 1
date: 2026-05-05
verdict: "⚠️ 5 WIRED · 1 PARTIAL · 10 HARDCODED · 4 PFn — top entity to land: Lease"
---

# Plan — /property/[id]/overview
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 6 entities |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 16 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

## 3. Entity Backlog (6 entities)

> **Plain opener:** The 10 hardcoded numbers on this page need 6 missing database concepts. Building them in this order unlocks the most surfaces per PR.

### Entity needed: Lease  ← **start here**
- **Required by:** rows **8** (Monthly Income — sum of active lease rent), **13** (Tenant Mix donut — categorize by lease type), **14** (Active Leaseholders table), **16** (lease-expiring alert).
- **Catalog reference:** [`ref/00 §5`](../../ref/00-entity-catalog.md) — Lease (defined in catalog, not yet in `lib/data/types/`).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** rows 8, 13, 14, 16 as a batch (template: **full** — all four are derivations: sum / group-by / list-with-filter / date-arithmetic).
- **Notes:** Single highest-leverage entity. Unlocks 4 of 10 HARDCODED rows on this page alone, plus rows on `/property/[id]/rental` and on `/portfolio` (lease-expiry KPI not yet built).

### Entity needed: Tenant
- **Required by:** row **14** (active leaseholders table — needs `name`, `initials`, `unit` per tenant — currently mocked in `tenants` const at lines 31–35).
- **Catalog reference:** [`ref/00 §4`](../../ref/00-entity-catalog.md) — Tenant (defined, not yet in `lib/data/types/`).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** combined with Lease — Tenant is a foreign-key target of Lease, so they should land in the same PR. Audit row 14 with the **full** template once both exist.
- **Notes:** Tenant + Lease together support the "tenant mix by sq-ft / by category" semantics for row 13.

### Entity needed: PropertyValuation  (or backfill the existing field)
- **Required by:** row **7** (Property Valuation $24.85M).
- **Catalog reference:** [`ref/00 §16`](../../ref/00-entity-catalog.md) — PropertyValuation (full history). For row 7 the current display only needs the latest value.
- **Currently in `lib/data/types/`?** Type field exists: `PropertyFinance.currentMarketValue` at `lib/data/types/property.ts:48` (optional). **But the PROP-0001 seed has it `undefined`** — verified via `finance.json`. So row 7 cannot be wired by simply switching the prop chain; the seed must be backfilled first **or** the per-property valuation history (PropertyValuation entity) must be built.
- **Land first, then audit:** two paths, pick one:
  - **Quick path:** backfill `currentMarketValue` on every property's `finance.json`, then wire row 7 to it. Audit lite.
  - **Right path:** build PropertyValuation as its own entity (so the Valuation tab gets history + the "+12%" badge has real meaning). Audit row 7 with **full** template (latest-of-N is a derivation).
- **Notes:** Row 7's "+12%" badge is currently hardcoded (`metrics[1].badge = "+12%"`) — a single `currentMarketValue` field cannot support that badge; only PropertyValuation history can. So the "right path" is needed eventually regardless.

### Entity needed: Payment + Expense (financials)
- **Required by:** rows **10** (NOI $184.2k), **11** (Expenses $42.5k), **12** (Gross Income $226.7k). NOI = Gross Income − Expenses.
- **Catalog reference:** [`ref/00 §6`](../../ref/00-entity-catalog.md) — Payment exists; Expense entity not in catalog (file Q5.<next-letter> when adding).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** depends on Lease (Payment.leaseId). Define Expense in `ref/00` first; then PR Payment + Expense together; audit rows 10–12 as a batch with the **full** template (NOI is a derivation).
- **Notes:** Cross-card identity to verify after wiring: `gross_income − expenses === noi` per property per period.

### Entity needed: RentalEvent / ActivityEvent
- **Required by:** row **15** (Activity Feed: payment received / lease renewed / work order / lease expiring / report generated).
- **Catalog reference:** [`ref/00 §8`](../../ref/00-entity-catalog.md) — RentalEvent (defined).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** lower priority — depends on Lease + Payment + MaintenanceItem (most events are derivable from those entities). Likely best implemented as a derived feed rather than a stored entity. Audit row 15 with the **full** template once derivation exists.
- **Notes:** Open question: store events explicitly or derive from source entities? File as Q4.Q if not already tracked.

### Entity needed: Notification + MaintenanceItem
- **Required by:** row **16** (alerts strip — "Lease Expiring" + "HVAC Fault").
- **Catalog reference:** [`ref/00 §9`](../../ref/00-entity-catalog.md) — Notification; [`§7`](../../ref/00-entity-catalog.md) — MaintenanceItem.
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** the lease-expiring alert is derivable from Lease (no new entity needed for that one — just a query). The HVAC fault needs MaintenanceItem. Notification is the surface layer that aggregates both. Audit row 16 with the **full** template after MaintenanceItem lands.
- **Notes:** Lowest priority of the six entities — affects only row 16.

## 4. Audit Roadmap (16 rows)

> **Plain opener:** Of the 16 audit-relevant rows, 6 can be deeply audited right now (5 with the lite template, 1 already done). The other 10 are blocked on entities — wait for the entity to land before running `/audit-datapoint` on them.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header `code` + `type` | ready | lite | _to-do_ |
| 2 | Header `health` score | ready | lite | _to-do_ |
| 3 | Hero status badge | partial | — | [property-id-overview--rental-status](../../property-id-overview--rental-status.md) — ⚠️ 2 findings (1 P1, 1 P2) |
| 4 | Hero `province` | ready | lite | _to-do_ |
| 5 | Hero "Purchased $X" | ready | lite | _to-do_ |
| 6 | Hero `name` | ready | lite | _to-do_ |
| 7 | Property Valuation $24.85M | blocked on **seed backfill or PropertyValuation** | — | wait for entity (or backfill seed `currentMarketValue` for lite) |
| 8 | Monthly Income | blocked on **Lease** | — | wait for entity |
| 9 | Occupancy Rate 94.8% | blocked on **Lease + Property.units** | — | wait for entity |
| 10 | NOI | blocked on **Payment + Expense** | — | wait for entity |
| 11 | Expenses | blocked on **Expense** | — | wait for entity |
| 12 | Gross Income | blocked on **Payment** | — | wait for entity |
| 13 | Tenant Mix donut | blocked on **Lease + Tenant** | — | wait for entity |
| 14 | Active Leaseholders rows | blocked on **Lease + Tenant** | — | wait for entity |
| 15 | Activity Feed items | blocked on **RentalEvent** (or derivation) | — | wait for entity |
| 16 | Alerts strip | blocked on **MaintenanceItem + Lease query** | — | wait for entity |

**Legend:**
- **ready** — WIRED, runnable now
- **partial** — PARTIAL row; one finding goes to per-datapoint audit, one stays here as PFn
- **blocked on \<Entity\>** — HARDCODED; revisit after the entity lands (or, for row 7, after seed backfill)

**Recommended next moves (in order):**
1. Run `/audit-datapoint` on rows 1, 2, 4, 5, 6 (lite template — should be quick). Each will produce a 4-section report citing PF1/PF2 (see audit.md) instead of restating.
2. Land **Lease + Tenant** as one PR. Audit rows 8, 13, 14, 16 as a batch with full template.
3. Land **Payment + Expense**. Audit rows 10, 11, 12 as a batch with full template.
4. Build **Occupancy** derivation (needs Lease + Property unit count — Property doesn't yet have a `units` field; file Q5.<next-letter>). Audit row 9 with full template.
5. Decide row 7 path: quick (backfill seed `currentMarketValue`) or right (build PropertyValuation history). Audit accordingly.
6. Defer rows 15 and 16 until activity/notification model is decided (likely derivations, not stored entities).

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Extracted action items from initial audit. No fixes applied yet.
- `plan.md` contains §3 Entity Backlog + §4 Audit Roadmap + §5 Fix Log (split from the original single-file report per skill update).

</details>
