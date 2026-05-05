---
slug: portfolio
route: /portfolio
revision: 1
date: 2026-05-05
verdict: "⚠️ 15 WIRED · 1 HARDCODED · 2 PFn — mostly wired; YoY blocked on PropertyValuation"
---

# Plan — /portfolio
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 1 entity |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 16 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

## 3. Entity Backlog (1 entity)

> **Plain opener:** The 1 hardcoded surface on this page needs 1 missing database concept. Everything else is already wired from real data.

### Entity needed: PropertyValuation (historical)  ← **only blocker**
- **Required by:** row **8** (YoY growth badge on Total Purchase Price card — currently always "— YoY").
- **Catalog reference:** [`ref/00 §16`](../../ref/00-entity-catalog.md) — PropertyValuation (full history).
- **Currently in `lib/data/types/`?** No. `PropertyFinance.currentMarketValue` exists (optional field at `lib/data/types/property.ts:48`) but YoY comparison requires two data points 12 months apart; a single optional field is insufficient.
- **Why it's blocked:** `computeKpis` currently hardcodes `yoyGrowth: { kind: "unknown" }` in `lib/data/derivations/portfolio.ts:84`. Computing real YoY requires at least two valuation snapshots per property.
- **Land first, then audit:** Build PropertyValuation entity with timestamped snapshots; replace the constant with a real derivation; audit row 8 with the **full** template (YoY is a derivation: latest_value − year_ago_value / year_ago_value).
- **Notes:** This entity also unblocks row 7 on `/property/[id]/overview` (current market value). The `/portfolio` YoY badge needs the additional historical dimension (two snapshots), so it remains blocked until PropertyValuation history is built — a seed backfill of `currentMarketValue` alone is NOT sufficient for the portfolio YoY badge.

## 4. Audit Roadmap (16 rows)

> **Plain opener:** Of the 16 audit-relevant rows, 14 are already covered by existing per-datapoint audits. 1 is a WIRED row without an existing audit (health column). 1 is HARDCODED and blocked on an entity. Two superseded audits (attention-count card removed, property-id not shown) are noted for completeness.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 5 + 6 | Properties count + "+N this month" | ✅ audited | — | [portfolio--properties-count](../../portfolio--properties-count.md) — ✅ 3 resolved · 1 deferred (F3 — Zod, awaiting backend) |
| 7 | Total Purchase Price | ✅ audited | — | [portfolio--total-value](../../portfolio--total-value.md) — ✅ 3 resolved · 1 deferred (F4 — dual-format currency) |
| 8 | YoY growth badge | blocked on **PropertyValuation (historical)** | — | wait for entity; audit with **full** template once derivation exists |
| 9 + 10 | Monthly Income (expected + collected) | ✅ audited | — | [portfolio--monthly-income](../../portfolio--monthly-income.md) — ✅ F1+F3 resolved · F2 deferred (UTC timezone) |
| 11 | Occupancy rate % | ✅ audited | — | [portfolio--occupancy](../../portfolio--occupancy.md) — ⚠️ F1+F4 resolved · F2+F3 deferred |
| 19 | Property name (table) | ✅ audited | — | [portfolio--property-name](../../portfolio--property-name.md) — ✅ All 4 findings resolved |
| 20 | Type badge | ✅ audited | — | [portfolio--property-type](../../portfolio--property-type.md) — ✅ F1+F2+F3 resolved · F4 deferred (sorting) |
| 21 | Province text | ✅ audited | — | [portfolio--province](../../portfolio--province.md) — ⚠️ F1+F2+F3 resolved · F4 deferred (sorting) |
| 22 | Status badge | ✅ audited | — | [portfolio--rental-status](../../portfolio--rental-status.md) — ✅ All 3 findings resolved |
| 23 | Size (m²) | ✅ audited | — | [portfolio--size](../../portfolio--size.md) — ✅ F1+F2+F3 resolved · F4 deferred (sorting) |
| 24 | Buy price | ✅ audited | — | [portfolio--buy-price](../../portfolio--buy-price.md) — ⚠️ F1+F3 resolved · F2 deferred (Q5.P — DB migration) |
| 25 | Title deed badge | ✅ audited | — | [portfolio--title-deed-status](../../portfolio--title-deed-status.md) — ✅ All 4 findings resolved |
| 26 | Health score + dot + bar | ready (not yet audited) | lite | _to-do — direct read from `p.health`; use lite template_ |
| 29 | Filtered/total count | ✅ audited | — | [portfolio--filtered-count](../../portfolio--filtered-count.md) — ✅ F1+F2+F4 resolved · F3 partial (Sold shown; Archived via filter) |

**Superseded / removed surfaces (for completeness):**
| Audit | Surface status | Notes |
|---|---|---|
| [portfolio--attention-count](../../portfolio--attention-count.md) | Card removed | Was a KPI card; removed and not in current page. Revisit when health/alert system defined. |
| [portfolio--property-id](../../portfolio--property-id.md) | Code not rendered | Property code (`p.code`) used for client-side search filter but not rendered as a visible table column. All findings resolved. |

**Legend:**
- **✅ audited** — existing per-datapoint audit covers this row; do not re-run unless source SHAs change
- **ready** — WIRED, runnable now, no existing audit
- **blocked on \<Entity\>** — HARDCODED; revisit after entity lands

**Recommended next moves (in order):**
1. Run `/audit-datapoint` on row 26 (health score column — lite template; should be quick direct-read).
2. Land **PropertyValuation** (historical snapshots). Audit row 8 with full template.
3. Revisit deferred findings on rows 9-10 (F2 — UTC timezone fix), rows 11 (F2+F3 — occupancy formula), rows 24 (F2 — DB migration) when their blockers resolve.

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
- `plan.md` contains §3 Entity Backlog + §4 Audit Roadmap + §5 Fix Log.
- 1 entity in backlog: PropertyValuation (for YoY growth badge, row 8).
- 14 existing per-datapoint audits referenced in roadmap; 1 new audit needed (row 26 — health column).

</details>
