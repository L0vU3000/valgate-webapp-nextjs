---
slug: property-id-rental
route: /property/[id]/rental
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 WIRED · 29 HARDCODED · 4 PFn — Lease+Payment cover 23 of 29 hardcoded rows"
---

# Plan — /property/[id]/rental
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 5 entities + 1 deferred |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 32 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

## 3. Entity Backlog (5 entities + 1 deferred)

> **Plain opener:** The 29 hardcoded surfaces on this page need 5 missing database concepts. The first two — Lease + Tenant and Payment + Expense — together cover 23 of the 29 hardcoded rows and should be treated as the top priority.

### Entity needed: Lease + Tenant  ← **start here**
- **Required by:** rows **5** (page subtitle — rent, status, expiry date), **8** (unit occupancy pill), **9** (Monthly Rent KPI headline — `Lease.monthlyRent`; accent needs market data), **10** (Occupancy KPI — status + duration since start), **18** (Lease Summary duration badge), **19** (Lease Summary tenant name via `Lease.tenantId → Tenant.name`), **20** (Lease Summary 5 fields: start, end, rent, deposit, auto-pay), **21** (expiry countdown — date arithmetic from `Lease.endDate`), **22** (Tenant avatar initials), **23** (Tenant name in profile), **24** (Tenant email), **25** (Tenant phone), **26** (moved-in date — `Lease.startDate` shown in Tenant Profile).
- **Surfaces from this page:** 13 (rows 5, 8–10, 18–26)
- **Catalog reference:** [`ref/00 §5`](../../ref/00-entity-catalog.md) (Lease) · [`§4`](../../ref/00-entity-catalog.md) (Tenant).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** rows 5, 8–10, 18–26 as a batch (template: **full** — these are derivations: date-arithmetic for expiry countdown, status-to-badge mapping, string formatting for initials, Lease–Tenant join for name/contact fields).
- **Cross-page note:** This page adds 13 surfaces to the Lease+Tenant cross-page count (overview contributed 4). Total cross-page: **17 surfaces** — now the single highest-priority entity pair in the backlog.
- **Notes:** Row 21 ("Expires in 47 days") is a static string literal, not a computed value — it will need a date-arithmetic derivation even after `Lease.endDate` lands. Row 20 covers 5 separate Lease fields in one JSX block; audit them as a single full-template run once Lease is built.

### Entity needed: Payment + Expense  ← **second priority**
- **Required by:** rows **11** (YTD Net Income — Payment sum + prior-year comparison), **12** (Balance Due — Payment ledger), **13** (Financial Overview chart — 6 months of Payment.amount grouped by type), **14** (period selector label — date range derivable from Payment data), **15** (Total Rent subtotal — `sum(Payment.amount, type=rent)`), **16** (Expenses subtotal — `sum(Expense.amount)`), **17** (Net Income subtotal — derivation: Total Rent − Expenses), **27** (on-time payments % — `count(Payment, status=on-time) / total`), **32** (Payment History 6 rows — direct Payment entity reads), **33** (pagination — `Payment.count` for total and page math).
- **Surfaces from this page:** 10 (rows 11–17, 27, 32, 33)
- **Catalog reference:** [`ref/00 §6`](../../ref/00-entity-catalog.md) — Payment exists; Expense entity not in catalog (file Q5.\<next-letter\> when adding).
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** rows 11–17, 27, 32, 33 as a batch (template: **full** for aggregations/derivations; rows 32–33 use **lite** if Payment is a direct list read).
- **PF4 dependency:** when wiring Payment data, explicitly remove the `chartData` and `payments` module-level constants (see audit.md PF4). Do not use them as fallback defaults.
- **Cross-page note:** Overview contributed 3 Payment+Expense surfaces. This page adds 10. Total cross-page: **13 surfaces**.

### Entity needed: MaintenanceItem
- **Required by:** rows **28** (open count badge — `count(MaintenanceItem, status=open)`), **29** (item 1 — title, priority, assignee), **30** (item 2 — title, priority, scheduled date).
- **Surfaces from this page:** 3 (rows 28–30)
- **Catalog reference:** [`ref/00 §7`](../../ref/00-entity-catalog.md) — MaintenanceItem.
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** rows 28–30 as a batch (template: **full** — aggregate count + list with priority/status filter).
- **Cross-page note:** Overview had 1 MaintenanceItem surface (row 16, alerts strip, bundled with Notification). This page adds 3 more. Total cross-page: **4 surfaces** (Notification + MaintenanceItem combined).
- **Notes:** The Maintenance card on this page is pure MaintenanceItem — no Notification layer. The "2 Open" badge is an aggregate count, not a direct field. A paginated `View All Orders` link implies the full entity list lives on a separate route; this audit covers only the 2-item summary card.

### Entity needed: Document
- **Required by:** row **31** (Documents card — 3 items: Lease Agreement, Move-in Checklist, Insurance Certificate; each has name, status/label, date).
- **Surfaces from this page:** 1 (row 31 — one surface row representing 3 document items)
- **Catalog reference:** Document not yet in `ref/00-entity-catalog.md`. Add it before building.
- **Currently in `lib/data/types/`?** No.
- **Land first, then audit:** row 31 (template: **lite** if Document is a direct list read; **full** if status derivation needed for "Expiring" badge).
- **Cross-page note:** New entity — not seen on overview or portfolio. This is the only page in the current backlog that surfaces it (3 items visible; "View All Docs →" implies a dedicated documents route with more — Phase 4c will audit `/property/[id]/documents` and likely expand this count significantly).

### ⚠️ Deferred: Unit entity / Property address fields (rows 6–7)
- **Required by:** row **6** (unit address: "Unit 4B — 123 Maple St, Chicago, IL 60601"), row **7** (unit specs: "3 Bed / 2 Bath · 1,250 sq ft · Floor 4").
- **Surfaces from this page:** 2 (rows 6, 7)
- **Why deferred:** These surfaces sit at an architectural fork: if Valgate supports only single-unit properties, rows 6–7 map to `Property.address` + `Property.bedrooms / bathrooms / floor` (i.e., a schema field expansion on the existing Property type). If it supports multi-unit properties, they map to a `Unit` entity with a `Lease.unitId` foreign key. The correct path is not yet decided.
- **Action:** File this as a new open question in `ref/05-open-questions.md` before attempting to wire either row.
- **Notes:** The `property.size` field already exists in the current Property type (surfaced on `/portfolio`); `floor` and `bedrooms`/`bathrooms` are absent. "Unit 4B" implies multi-unit. The demo PROP-0001 seed shows "1,250 sq ft" which does not match `property.size` for any seed property, confirming this is a hardcoded value not sourced from the current data model.

## 4. Audit Roadmap (32 rows)

> **Plain opener:** Of the 32 audit-relevant rows, only 3 can be audited right now (all with the lite template — they are direct reads from `property.*` via `PropertyLayout`). The other 29 are blocked on entities — wait for the entity to land before running `/audit-datapoint` on them.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | PropertyLayout header: `{property.code} {property.type}` | ready | lite | _to-do_ |
| 2 | PropertyLayout health badge: `{property.health}%` | ready | lite | _to-do_ |
| 4 | Page header breadcrumb: `{property.code}` | ready | lite | _to-do_ |
| 5 | Page subtitle | blocked on **Lease** | — | wait for entity |
| 6 | Unit card — address | blocked on **Unit entity / Property.address** (see deferred §) | — | wait for architecture decision |
| 7 | Unit card — specs | blocked on **Unit entity / Property fields** (see deferred §) | — | wait for architecture decision |
| 8 | Unit card — occupancy pill | blocked on **Lease** | — | wait for entity |
| 9 | KPI — Monthly Rent | blocked on **Lease** (+ market data for accent) | — | wait for entity |
| 10 | KPI — Occupancy | blocked on **Lease** | — | wait for entity |
| 11 | KPI — YTD Net Income | blocked on **Payment** | — | wait for entity |
| 12 | KPI — Balance Due | blocked on **Payment** | — | wait for entity |
| 13 | Financial Overview chart | blocked on **Payment** | — | wait for entity |
| 14 | Period label | blocked on **Payment** | — | wait for entity |
| 15 | Total Rent subtotal | blocked on **Payment** | — | wait for entity |
| 16 | Expenses subtotal | blocked on **Expense** | — | wait for entity |
| 17 | Net Income subtotal | blocked on **Payment + Expense** | — | wait for entity |
| 18 | Lease duration badge | blocked on **Lease** | — | wait for entity |
| 19 | Lease Summary tenant name | blocked on **Tenant + Lease** | — | wait for entity |
| 20 | Lease Summary 5 fields | blocked on **Lease** | — | wait for entity |
| 21 | Expiry countdown | blocked on **Lease** (+ date arithmetic) | — | wait for entity |
| 22 | Tenant avatar initials | blocked on **Tenant** | — | wait for entity |
| 23 | Tenant name | blocked on **Tenant** | — | wait for entity |
| 24 | Tenant email | blocked on **Tenant** | — | wait for entity |
| 25 | Tenant phone | blocked on **Tenant** | — | wait for entity |
| 26 | Moved-in date | blocked on **Lease** | — | wait for entity |
| 27 | On-time payments % | blocked on **Payment** | — | wait for entity |
| 28 | Maintenance open count | blocked on **MaintenanceItem** | — | wait for entity |
| 29 | Maintenance item 1 | blocked on **MaintenanceItem** | — | wait for entity |
| 30 | Maintenance item 2 | blocked on **MaintenanceItem** | — | wait for entity |
| 31 | Documents card (3 items) | blocked on **Document** | — | wait for entity |
| 32 | Payment History rows | blocked on **Payment** | — | wait for entity |
| 33 | Payment History pagination | blocked on **Payment** | — | wait for entity |

**Legend:**
- **ready** — WIRED, runnable now
- **blocked on \<Entity\>** — HARDCODED; revisit after the entity lands

**Recommended next moves (in order):**
1. Run `/audit-datapoint` on rows 1, 2, 4 (lite template). Each should cite `property-id-overview` PF1/PF2/PF3 rather than restating. These are the same `PropertyLayout` reads audited on the overview page — the per-datapoint reports will be brief.
2. Land **Lease + Tenant** as one PR (same as overview priority — this page's 13 surfaces add urgency). Audit rows 5, 8–10, 18–26 as a batch with full template.
3. Land **Payment + Expense**. When wiring, delete `chartData` and `payments` constants (see PF4). Audit rows 11–17, 27, 32, 33 as a batch.
4. Land **MaintenanceItem**. Audit rows 28–30 as a batch with full template.
5. Decide Document entity vs. file-in-folder architecture. Audit row 31 accordingly.
6. Defer rows 6–7 until the Unit entity / Property field expansion decision is resolved (file open question in `ref/05-open-questions.md` first).

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
- `plan.md` contains §3 Entity Backlog + §4 Audit Roadmap + §5 Fix Log (matching format from overview + portfolio plans).
- 5 entities in backlog: Lease+Tenant (13 surfaces, cross-page total 17) · Payment+Expense (10 surfaces, cross-page total 13) · MaintenanceItem (3 surfaces, cross-page total 4) · Document (1 surface, new entity) · deferred unit/address (2 surfaces, architecture undecided).
- 3 rows ready for `/audit-datapoint` immediately; 29 blocked on entities.

</details>
