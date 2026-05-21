---
slug: portfolio
route: /portfolio
revision: 1
date: 2026-05-05
verdict: "⚠️ 15 WIRED · 1 HARDCODED · 2 PFn — mostly wired; YoY blocked on PropertyValuation"
---

# Page Audit — /portfolio
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 15 of 16 audit-relevant surfaces are real data — narrowing layer (`PropertyListItem`) already in place, no PII leak
- ⚠️ 1 HARDCODED surface: YoY growth badge always shows "— YoY" (formula returns `{kind:"unknown"}` constant)
- 🔧 2 page-wide findings filed (PF1–PF2); per-datapoint audits should cite instead of restating
- 📋 14 existing per-datapoint audits cover this route — back-links inserted in each

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 31 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 2 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **PropertyListItem** — the narrowed type at `lib/data/types/property.ts:76–87`; only the 10 fields the table renders. Prevents PII leak.

---

## 1. Surface Inventory

> **Plain opener:** The page shows 31 distinct things. 15 are connected to real database data. 1 is a stub value typed directly into the derivation function (the YoY growth badge). 13 are static labels and controls, and 2 are purely visual decoration.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | "Valgate / Portfolio" breadcrumb | CHROME | static labels | `PortfolioPage.tsx:102-104` |
| 2 | "Portfolio" h1 heading | CHROME | static label | `PortfolioPage.tsx:106` |
| 3 | Page description subtitle | CHROME | static string | `PortfolioPage.tsx:107-109` |
| 4 | "Add Property" button | CHROME | static CTA — pushes to `/add-property` | `PortfolioPage.tsx:111-118` |
| 5 | KPI: Properties count | WIRED | `stats.totalProperties` ← `computeStats(properties).totalProperties` | `PortfolioPage.tsx:130` |
| 6 | KPI: "+N this month" sub-label | WIRED | `kpis.newThisMonth` ← `active.filter(p => p.createdAt >= monthStart).length` | `PortfolioPage.tsx:131` |
| 7 | KPI: Total Purchase Price | WIRED | `kpis.totalValueFormatted` ← `formatCurrency(active.reduce((s,p) => s + p.buyNumeric, 0))` | `PortfolioPage.tsx:141` |
| 8 | KPI: YoY growth badge ("— YoY") | HARDCODED | `kpis.yoyGrowth: { kind: "unknown" }` — literal constant, no historical computation | `derivations/portfolio.ts:84` |
| 9 | KPI: Monthly Income expected | WIRED | `kpis.monthlyExpected` ← sum of `monthlyRent` for active Signed leases | `PortfolioPage.tsx:169` |
| 10 | KPI: Monthly Income collected + month label | WIRED | `kpis.monthlyCollected`, `kpis.monthLabel` ← Paid Rent payments this UTC month | `PortfolioPage.tsx:171-173` |
| 11 | KPI: Occupancy rate % | WIRED | `stats.occupancyRate` ← `Math.round(rentedCount / n * 100)` | `PortfolioPage.tsx:183` |
| 12 | KPI: Occupancy animated bar | DECORATIVE | visual encoding of `stats.occupancyRate` | `PortfolioPage.tsx:185` |
| 13 | Province filter dropdown | CHROME | client-side filter; options from `CAMBODIA_PROVINCES` constant | `PropertyFilters.tsx:169-175` |
| 14 | Type filter dropdown | CHROME | client-side filter; options from `TYPE_LABEL` constant | `PropertyFilters.tsx:177-183` |
| 15 | Status filter dropdown | CHROME | client-side filter; `STATUS_OPTIONS` constant (5 statuses) | `PropertyFilters.tsx:185-194` |
| 16 | "Clear" button (filters) | CHROME | static label — conditional on `hasActiveFilters` | `PropertyFilters.tsx:196-205` |
| 17 | Search input (state present, input not in filter bar) | CHROME | `searchQuery` state in `PortfolioPage.tsx:38`; filtered by name/code/province; no visible input in `PropertyFilters.tsx` | `PortfolioPage.tsx:38,52-60` |
| 18 | Table: row # (sequential) | CHROME | `pageStart + i + 1` — pagination position, not a DB field | `PropertyTable.tsx:143` |
| 19 | Table: Property cell — icon + name | WIRED | `p.name` (primary text), `p.type` (icon via `TYPE_ICON[p.type]`, color via `TYPE_COLOR[p.type]`) | `PropertyTable.tsx:153-155` |
| 20 | Table: Type badge | WIRED | `p.type` → `TYPE_LABEL[p.type]`, styled via `typeBadgeClasses(p.type)` | `PropertyTable.tsx:160-162` |
| 21 | Table: Province text | WIRED | `p.province` | `PropertyTable.tsx:166` |
| 22 | Table: Status badge | WIRED | `p.status` → `statusBadgeClasses(p.status)` | `PropertyTable.tsx:170-172` |
| 23 | Table: Size (m²) | WIRED | `p.totalArea` ← `property.totalArea`, formatted with `Number.toLocaleString()` | `PropertyTable.tsx:177` |
| 24 | Table: Buy price | WIRED | `p.buy` ← `formatCurrency(property.buyNumeric)` (pre-formatted server-side) | `PropertyTable.tsx:183` |
| 25 | Table: Title deed badge | WIRED | `p.title` → `titleBadgeClasses(p.title)` | `PropertyTable.tsx:190-192` |
| 26 | Table: Health score + dot + bar | WIRED | `p.health` → `healthDotColor(p.health)` | `PropertyTable.tsx:199-210` |
| 27 | Table: Checkboxes (select-all + per-row) | CHROME | no-op UI affordance — no selection handler wired | `PropertyTable.tsx:66,132-138` |
| 28 | Table: Empty state ("No properties match") | CHROME | static strings — conditional on `pageRows.length === 0` | `PropertyTable.tsx:100-108` |
| 29 | Filtered/total count ("Showing X of Y") | WIRED | `filtered.length` (after client filters), `properties.length` (total) | `PropertyTable.tsx:225-243` |
| 30 | Pagination controls (Prev / Page# / Next) | CHROME | UI navigation — `totalPages > 1` conditional | `PropertyTable.tsx:246-265` |
| 31 | All animations (card stagger, row fade, health bar) | DECORATIVE | CSS transitions + `mounted` state gate | `PortfolioPage.tsx:96-98,127-129`; `PropertyTable.tsx:125-129` |

**Tally:** WIRED **15** · PARTIAL **0** · HARDCODED **1** · CHROME **13** · DECORATIVE **2**

**Audit-relevant rows (WIRED + PARTIAL + HARDCODED):** 16. CHROME and DECORATIVE rows are listed for completeness and intentionally excluded from the Audit Roadmap.

**Note — search state without a visible input:** `searchQuery` state (row 17) is defined and wires into the filter logic (name/code/province substring match), but `PropertyFilters.tsx` accepts the prop without destructuring or rendering it — no search `<input>` appears in the filter bar. The input either lives in `AppHeader` or is not yet built.

---

## 2. Page-wide findings (2 PFn)

> **Plain opener:** Two problems affect the whole page rather than any single number. Both are pre-existing systemic concerns shared with the `/property/[id]/overview` route — they are filed here so per-datapoint audits for `/portfolio` can cite instead of repeating.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### 🟡 PF1 — Multi-tenant isolation pending — auth path uses `getCurrentUserId()` shim
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.M_

**Where:** `lib/data/auth-shim.ts` → `getCurrentUserId()` returns hardcoded `"demo-user"`; consumed by `app/(shell)/portfolio/queries.ts:4`. Applies to all WIRED rows (**5–7, 9–11, 19–26, 29**).

**Problem:** Every read on this page trusts the auth shim. There is no actual ownership check between the current session and the data returned — the FS layer's per-user folder isolates by path alone. If the shim returns a real Clerk subject in production but two users' IDs share an FS path, an IDOR crossover is possible. The same concern applies to all entity reads the query layer performs (`paymentsDb.list`, `leasesDb.list`).

**Why it matters:** Tracked as Q4.M. Multi-tenant isolation must be enforced before real auth lands, otherwise the whole route family inherits the IDOR risk silently. The same finding is PF2 in `pages/property-id-overview/audit.md`.

**Fix:** Replace `getCurrentUserId()` with a real Clerk auth call (`auth().userId`). In every db read, assert `record.userId === auth().userId` and return 404/empty on mismatch. Audit once at the `lib/data/db/_fs.ts` boundary — the fix lands across every entity at the same time.

---

### 🟡 PF2 — No audit log of property mutations
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.P_

**Where:** No write path is currently exposed on the `/portfolio` route, but the table row click navigates to `/property/${p.id}` — any future inline edit, status toggle, or bulk-action button on this page would need mutation tracking. Applies to all WIRED rows (**5–7, 9–11, 19–26, 29**) once write paths exist.

**Problem:** The seed JSON has no `auditLog` field on Property, and no separate `propertyAudit` collection exists. When a user changes `status` from `Rented` → `Vacant` (or any other field), there is no record of who/when/why. The gap spans all property routes, not just this one.

**Why it matters:** Tracked as Q4.P. Compliance-relevant for financial fields on property records. The same finding is PF3 in `pages/property-id-overview/audit.md`.

**Fix:** Define a `propertyAuditEvents` collection in `ref/00-entity-catalog.md` (currently absent) with `userId`, `propertyId`, `field`, `oldValue`, `newValue`, `at`, `actor`. Wire it into every write path at the `lib/data/db/properties.ts` boundary.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/portfolio/page.tsx
  - app/(shell)/portfolio/queries.ts
  - app/(shell)/portfolio/_components/PortfolioPage.tsx
  - components/portfolio/PropertyTable.tsx
  - components/portfolio/PropertyFilters.tsx
  - lib/data/derivations/portfolio.ts
  - lib/data/types/property.ts
  - lib/data/properties.ts
sources:
  - path: app/(shell)/portfolio/page.tsx
    sha: 490da8542d8d654acf73f854aeff39b9cbfce3f6
  - path: app/(shell)/portfolio/queries.ts
    sha: dc1d5b66f4f716463a734e633b48b1b568a8e4a7
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 449ea7abea164169ae6b2344e07885097c3fad53
  - path: components/portfolio/PropertyTable.tsx
    sha: 8bbe025e9564f97023bb85909ad2dfe5b5eff5a8
  - path: components/portfolio/PropertyFilters.tsx
    sha: 17ecc0976f991d4e7928ffe732da34691141b364
  - path: lib/data/derivations/portfolio.ts
    sha: a43e7bb5c9ab9a828d42262a4aa7c6ddb17be628
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: lib/data/properties.ts
    sha: 4f231bfe5ffcd4192bd038e4d044ea0fd2fea807
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm narrowing — PropertyListItem fields vs full Property (no finance/location fields in payload)
node -e "
const c = require('./public/data/users/demo-user/properties/PROP-0001/core.json');
const listItemFields = ['id','name','code','type','province','status','buy','health','totalArea','title'];
const extras = Object.keys(c).filter(k => !listItemFields.includes(k));
console.log('fields in PropertyListItem:', listItemFields.length);
console.log('extra core fields NOT sent to browser:', extras);
"

# Verify YoY growth is always unknown (no PropertyValuation in seed)
grep -n 'yoyGrowth' lib/data/derivations/portfolio.ts

# Check search state: verify searchQuery prop is accepted but not rendered in PropertyFilters
grep -n 'searchQuery' components/portfolio/PropertyFilters.tsx
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (first run for `/portfolio` in the page-audit format).
- 31-row inventory walked across `page.tsx` + `queries.ts` + `PortfolioPage.tsx` + `PropertyTable.tsx` + `PropertyFilters.tsx` + `derivations/portfolio.ts`.
- Verdict: 15 WIRED · 1 HARDCODED · 2 PFn. Narrowing already in place (`PropertyListItem`) — no PF1-equivalent needed (contrast with property-id-overview PF1).
- 2 PFn filed: multi-tenant shim (PF1, mirrors overview PF2) and no audit log (PF2, mirrors overview PF3).
- 14 existing per-datapoint audits noted in Audit Roadmap; back-links inserted into each.
- Search input anomaly noted: `searchQuery` prop accepted by `PropertyFilters` but not rendered — no visible search input in the filter row.

</details>
