---
slug: property-id-rental
route: /property/[id]/rental
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 WIRED · 29 HARDCODED · 4 PFn — entire Lease/Tenant/Payment surface is mocked"
---

# Page Audit — /property/[id]/rental
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 3 of 33 data-bearing surfaces are real data — all three are `property.*` direct reads inherited from `PropertyLayout`
- ⚠️ 29 HARDCODED surfaces — the two top entities to land are **Lease** (13 surfaces) and **Payment + Expense** (10 surfaces); together they cover 23 of 29 hardcoded rows
- 🔧 4 page-wide findings: 3 cross-referenced from `property-id-overview` (PF1–PF3); 1 new rental-specific finding (PF4 — mock constants as a silent-override trap)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 34 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 4 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.

---

## 1. Surface Inventory

> **Plain opener:** The page shows 34 classified rows. 3 read real database data (the `PropertyLayout` breadcrumb and health badge). 29 are fake values typed directly into the code as string literals and module-level constants. 2 are static UI scaffolding. This is the most data-starved page in the property detail flow — the ratio of hardcoded-to-wired is roughly 10:1.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | PropertyLayout header: `{property.code} {property.type}` | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:49-51` |
| 2 | PropertyLayout health badge: `{property.health}% health score` | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Tab bar (7 tabs: Overview, Documents, Safety, Ownership, Rental, Valuation, Location) | CHROME | `tabs` const | `PropertyLayout.tsx:8-16` |
| 4 | Page header breadcrumb: `{property.code}` | WIRED | `property.code` | `PropertyRentalPage.tsx:63` |
| 5 | Page header subtitle: "$2,450/mo · Occupied · Lease expires Feb 28, 2026" | HARDCODED | string literal | `PropertyRentalPage.tsx:71` |
| 6 | Unit card — address: "Unit 4B — 123 Maple St, Chicago, IL 60601" | HARDCODED | string literal | `PropertyRentalPage.tsx:88` |
| 7 | Unit card — specs: "3 Bed / 2 Bath · 1,250 sq ft · Floor 4" | HARDCODED | string literal | `PropertyRentalPage.tsx:89` |
| 8 | Unit card — occupancy pill: "Occupied" | HARDCODED | string literal | `PropertyRentalPage.tsx:93` |
| 9 | KPI — Monthly Rent: "$2,450 / ↑ $150 above market avg" | HARDCODED | `KpiCard` props | `PropertyRentalPage.tsx:100` |
| 10 | KPI — Occupancy: "Occupied / 6 months · Since Mar 2024" | HARDCODED | `KpiCard` props | `PropertyRentalPage.tsx:101` |
| 11 | KPI — YTD Net Income: "$21,875 / ↑ +8.2% vs last year" | HARDCODED | `KpiCard` props | `PropertyRentalPage.tsx:102` |
| 12 | KPI — Balance Due: "$0.00 / Current" | HARDCODED | `KpiCard` props | `PropertyRentalPage.tsx:103` |
| 13 | Financial Overview — bar chart (6 monthly rent values: Jan–Jun 2025) | HARDCODED | `chartData` const (lines 14–21) | `PropertyRentalPage.tsx:14-21` |
| 14 | Financial Overview — period selector label: "Jan – Jun 2025" | HARDCODED | string literal | `PropertyRentalPage.tsx:113` |
| 15 | Financial Overview — Total Rent subtotal: "$14,700" | HARDCODED | string literal | `PropertyRentalPage.tsx:131` |
| 16 | Financial Overview — Expenses subtotal: "$3,250" | HARDCODED | string literal | `PropertyRentalPage.tsx:135` |
| 17 | Financial Overview — Net Income subtotal: "$11,450 ↑ vs prior period" | HARDCODED | string literal | `PropertyRentalPage.tsx:139` |
| 18 | Lease Summary — duration badge: "12-month" | HARDCODED | string literal | `PropertyRentalPage.tsx:149` |
| 19 | Lease Summary — tenant name: "Jane Smith" | HARDCODED | string literal | `PropertyRentalPage.tsx:151` |
| 20 | Lease Summary — 5 fields (Lease Start / End / Rent / Deposit / Auto-pay) | HARDCODED | `[l, v]` array literal | `PropertyRentalPage.tsx:153-168` |
| 21 | Lease Summary — expiry countdown: "Expires in 47 days" | HARDCODED | string literal | `PropertyRentalPage.tsx:172` |
| 22 | Tenant Profile — avatar initials: "JS" | HARDCODED | string literal | `PropertyRentalPage.tsx:196` |
| 23 | Tenant Profile — name: "Jane Smith" | HARDCODED | string literal | `PropertyRentalPage.tsx:198` |
| 24 | Tenant Profile — email: "jane@email.com" | HARDCODED | string literal | `PropertyRentalPage.tsx:200` |
| 25 | Tenant Profile — phone: "(312) 555-0192" | HARDCODED | string literal | `PropertyRentalPage.tsx:201` |
| 26 | Tenant Profile — moved-in date: "Mar 1, 2024" | HARDCODED | string literal | `PropertyRentalPage.tsx:206` |
| 27 | Tenant Profile — on-time payments %: "98%" | HARDCODED | string literal | `PropertyRentalPage.tsx:209` |
| 28 | Maintenance — open count badge: "2 Open" | HARDCODED | string literal | `PropertyRentalPage.tsx:225` |
| 29 | Maintenance — item 1: title + priority + assignee | HARDCODED | string literals | `PropertyRentalPage.tsx:230-231` |
| 30 | Maintenance — item 2: title + priority + scheduled date | HARDCODED | string literals | `PropertyRentalPage.tsx:237-238` |
| 31 | Documents card — 3 items (Lease Agreement / Move-in Checklist / Insurance Certificate) | HARDCODED | object array literal | `PropertyRentalPage.tsx:255-265` |
| 32 | Payment History — 6 rows (date, type, amount, method, status) | HARDCODED | `payments` const (lines 25–32) | `PropertyRentalPage.tsx:25-32` |
| 33 | Payment History — pagination: "Showing 1–6 of 24 payments / Page 1 of 4" | HARDCODED | string literals | `PropertyRentalPage.tsx:336, 341` |
| 34 | Action buttons, section headers, table column headers (≥12 static labels) | CHROME | static labels / icons | various |

**Tally:** WIRED **3** · HARDCODED **29** · CHROME **2**

**Audit-relevant rows (WIRED + HARDCODED):** 32. CHROME rows (3, 34) are listed for completeness and intentionally excluded from the Audit Roadmap.

---

## 2. Page-wide findings (4 PFn)

> **Plain opener:** Three of the four systemic problems here are the same ones filed for `/property/[id]/overview` — they are cited below rather than restated. One new finding is rental-specific: the mock data constants will silently persist even after real entities land unless they are explicitly removed.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 PF1 — No `queries.ts` narrowing layer; full `Property` shipped to Client Component
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/rental/page.tsx:13` — passes raw `Property` to `<PropertyRentalPage>` (line 1: `"use client"`). Applies to inventory rows **1, 2, 4**.

**This is the same finding as [`property-id-overview` PF1](../property-id-overview/audit.md#-pf1--no-queriests-narrowing-layer-full-property-incl-finance-fields-shipped-to-client-components).** On the rental tab, only `property.code` (×2), `property.type`, and `property.health` are consumed (all via `PropertyLayout`). The same structural leak applies — `PropertyFinance` fields would ship to the browser the moment the seed is enriched. Fix: add `app/(shell)/property/[id]/rental/queries.ts` with a `PropertyRentalItem` type picking only the 3 fields `PropertyLayout` needs.

---

### 🟡 PF2 — Multi-tenant isolation pending — auth path uses `getCurrentUserId()` shim
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.M_

**Where:** `lib/data/auth-shim.ts` → consumed by `lib/data/properties.ts` → `getPropertyByIdParam`. Applies to all WIRED rows (**1, 2, 4**).

**This is the same finding as [`property-id-overview` PF2](../property-id-overview/audit.md#-pf2--multi-tenant-isolation-pending--auth-path-uses-getcurrentuserid-shim).** The ownership assertion gap is shared across the entire property route family. No new surface to add.

---

### 🟡 PF3 — No audit log of property mutations
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.P_

**Where:** No write path is currently exposed on this route, but lease-related write actions (`Send Renewal Offer` button) are implied. Applies to all WIRED rows (**1, 2, 4**) once write paths exist.

**This is the same finding as [`property-id-overview` PF3](../property-id-overview/audit.md#-pf3--no-audit-log-of-property-mutations).** The missing `propertyAuditEvents` collection must be wired at the `lib/data/db/properties.ts` boundary before any mutation UI lands.

---

### 🟡 PF4 — Module-level mock constants (`chartData`, `payments`) will silently persist after real entities land
**PF P2 schema smell · confidence: high · `[render]`**

**Where:** `PropertyRentalPage.tsx:14-21` (`chartData`) and `:25-32` (`payments`). Applies to inventory rows **13–17** (Financial Overview) and **32–33** (Payment History).

**Problem:** The Financial Overview section and the entire Payment History table are backed by module-level `const` arrays, not any runtime data source. Unlike string literals scattered through JSX (which become obvious compile-time constants once you read the code), these named constants look structurally similar to what a real data prop would look like — they are arrays of objects with the same shape as real Payment and chart data. This creates a **silent-override trap**: once `Lease` + `Payment` entities land and a developer wires `payments` and `chartData` as real props, there is a meaningful risk that the module-level constants remain unreachable dead code rather than being removed — especially if the prop and the const share similar names or if the component evolves with optional prop patterns. If the constant is not removed, any fallback path in the component (`data ?? payments`) would render stale mock data without a compile error.

**Why it matters:** Mock data in production silently passes correctness tests because the shape is valid. A user could pay rent and see stale chart data until the constants are cleaned up.

**Fix:** When wiring Payment + Expense data, explicitly delete the `chartData` and `payments` module-level constants as part of the same PR. Do not use them as default values or fallback props. Track their deletion in the PR checklist.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/rental/page.tsx
  - app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
  - components/property/PropertyLayout.tsx
sources:
  - path: app/(shell)/property/[id]/rental/page.tsx
    sha: 879a2496ad713688dee4db005264b737a0179f3e
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: 5e79ebebaad1c553e77414273ca6117001217f83
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
```

_Note: no `rental/queries.ts` exists — that absence is itself PF1._

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm rental route entry file exists (no queries.ts — validates PF1)
ls 'app/(shell)/property/[id]/rental/'

# Confirm chartData and payments are module-level constants, not props (validates PF4)
grep -n 'const chartData\|const payments' 'app/(shell)/property/[id]/_components/PropertyRentalPage.tsx'

# Confirm no real Lease or Payment data is read from property object
grep -n 'property\.' 'app/(shell)/property/[id]/_components/PropertyRentalPage.tsx'
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit. Verdict: ⚠️ 3 WIRED · 29 HARDCODED · 4 PFn — entire Lease/Tenant/Payment surface is mocked.
- 34-row inventory walked across `rental/page.tsx` + `PropertyRentalPage.tsx` + `PropertyLayout.tsx`.
- No `rental/queries.ts` found (absence is PF1).
- 4 PFn: PF1–PF3 cross-referenced from `property-id-overview`; PF4 new rental-specific finding (mock constant trap).
- No pre-existing `property-id-rental--*.md` per-datapoint audits found — Audit Roadmap rows all set to `_to-do_`.
- 5 entities in backlog: Lease+Tenant (13 surfaces) · Payment+Expense (10 surfaces) · MaintenanceItem (3 surfaces) · Document (1 surface) · deferred unit/address rows (2 surfaces, architecture unclear).

</details>
