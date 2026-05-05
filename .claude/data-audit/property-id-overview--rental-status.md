---
slug: property-id-overview--rental-status
data_point: "Rental status badge (\"Rented\")"
route: /property/[id]/overview
revision: 1
date: 2026-05-04
verdict: "⚠️ 2 findings (1 P1, 1 P2)"
---

# Audit — Rental Status Badge on /property/[id]/overview
_Last revised: 2026-05-04 · Revision 1_

## TL;DR
- ✅ "Rented" is correct — `core.json` for PROP-0001 has `status: "Rented"` matching the display
- ⚠️ 2 findings · 1 important · 1 medium
- 🔧 Top fix: add a `queries.ts` narrowing layer — stop shipping 18+ unused fields (including mortgage, tax, insurance data) to the browser (F1) — _now also filed as page-wide_ **PF1**
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md) (and [plan.md](pages/property-id-overview/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this badge, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the display match the stored value? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the badge promise what the value delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a piece of data.
- **PII** — Personal info (including financial data) that should not leak to the browser.
- **IDOR** — A bug where user A can read user B's data because ownership wasn't enforced.
- **FS boundary** — the point where raw JSON files are read from disk and cast to TypeScript types.

---

## 1. Snapshot
> The "Rented" badge appears in the hero section of the property overview page. It comes directly from the `status` field stored in the property's `core.json` file — no calculation is involved.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, hero section (top-left badge above the property name) |
| Label | _none_ — the value itself is the badge text |
| Formula | Direct read — `property.status` rendered verbatim |
| Reads from | `public/data/users/demo-user/properties/PROP-0001/core.json` → `"status": "Rented"` |
| Canonical home | server _(per `data-audit/03 §B1`)_ |
| Edge cases | 5 valid values: `"Rented"` `"Vacant"` `"For Sale"` `"Sold"` `"Archived"` — badge color must vary per value |

## 2. Entity — ✅
> The `status` field is typed as a five-value union and validated with Zod at the FS read boundary — any invalid seed value throws immediately rather than silently displaying garbage.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | record identity |
| `userId` | `string` | ownership |
| `status` | `PropertyStatus` | `"Rented" \| "Vacant" \| "For Sale" \| "Sold" \| "Archived"` — stored in `core.json` |
| `isArchived?` | `boolean` | optional soft-delete flag (independent of `status`) — not present in PROP-0001 |

**Issues**
- `isArchived` flag and `status: "Archived"` are two independent ways to archive a property with no enforced invariant between them. No active-display impact today since neither read path is wired to the overview page's KPI cards, but worth tracking. (Q4.D)

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅
> No calculation needed — the stored value is displayed verbatim. The Zod validation added in `portfolio--rental-status` Rev 2 ensures the stored value is always one of the five valid enum members.

| | |
|---|---|
| Source file | `lib/data/db/properties.ts` |
| Function | `validateProperty(p)` → `propertyStatusSchema.parse(p.status)` |
| Output | `p.status` passed through unchanged |

**Formula** (verbatim):
```ts
// lib/data/db/properties.ts:23-29
const propertyStatusSchema = z.enum([
  "Rented", "Vacant", "For Sale", "Sold", "Archived",
]);
function validateProperty(p: Property): Property {
  propertyStatusSchema.parse(p.status);
  ...
}
```

**Golden-value check**

| Source | Value |
|---|---|
| Displayed on page | "Rented" (rendered as "RENTED" by CSS `text-transform: uppercase`) |
| `core.json` for PROP-0001 | `"Rented"` |
| Match? | ✅ |

**Robustness notes**
- ✅ No arithmetic — direct read, nothing to go wrong
- ✅ Zod validates at FS boundary; invalid values now throw a `ZodError` (resolved in `portfolio--rental-status` Rev 2)
- ✅ No TZ or currency concerns

## 4. Render — ⚠️
> The status badge reaches the screen correctly, but two problems exist: the hero badge uses hardcoded green colours regardless of what status value is stored, and the server passes far more financial data to the browser than the page ever uses.

| | |
|---|---|
| Page file | `app/(shell)/property/[id]/overview/page.tsx` |
| Query | `getPropertyByIdParam(id)` in `lib/data/properties.ts` — returns full `Property` |
| Component | `<PropertyOverviewPage>` → hero `<span>` at line 157–159 |
| Prop chain | `property.status` → `{property.status}` |
| Server vs Client | `PropertyOverviewPage` is `"use client"` (line 1); full `Property` serialised over RSC boundary |
| Loading / empty / error states | `notFound()` on missing property; no loading skeleton; no per-badge fallback |
| Formatting | `text-transform: uppercase` via Tailwind `uppercase` class — cosmetic only, stored value is unchanged |
| A11y | Badge renders the status text — adequate for screen readers |

**PII / IDOR**
- `PropertyOverviewPage` is a Client Component but receives the full `Property` object including `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `taxAssessmentValue`, `annualInsurance`, and `currentMarketValue`. None of these fields are rendered anywhere on this page (the Financials card uses hardcoded constants, not real property data). They are sent to the browser unnecessarily. (F1)
- Auth path goes through `getCurrentUserId()` shim → returns hardcoded `"demo-user"`. Ownership enforcement is implicit but correct for the demo; must be real before multi-user launch. (Q4.M)

## 5. Consistency — ✅
> The "Rented" badge on this page agrees with the same property's badge in the portfolio table and the stored seed data.

| Identity | Verification | Holds? |
|---|---|---|
| Overview hero badge matches `core.json` | `"Rented"` in seed = `"Rented"` rendered | ✅ |
| Portfolio table badge for PROP-0001 matches | Portfolio uses same `p.status` from `PropertyListItem` | ✅ |
| `propertyStatusSchema` Zod enum matches `PropertyStatus` type | Both list the same 5 values | ✅ |

**Note:** The surrounding "Key Metrics" strip (Property Valuation `$24,850,000`, Monthly Income `$312,400`, Occupancy Rate `94.8%`) and the Financials, Tenant Mix, Active Leaseholders, and Activity Feed panels on this page are entirely hardcoded constants at `PropertyOverviewPage.tsx:31–56`. They do not reflect PROP-0001's real data. This is a separate, broader gap from the status badge audit; each metric would warrant its own audit when wired to real data.

## 6. Missing safeties (3 gaps)
> Three protection mechanisms are absent from this route.

| Gap | Status | Link |
|---|---|---|
| `queries.ts` narrowing layer — no server-side narrowing before the full `Property` reaches the client | ❌ | F1 |
| Multi-tenant isolation — `getCurrentUserId()` returns `"demo-user"` hardcoded | ⚠️ shim | Q4.M |
| Audit log for status mutations (who changed Rented → Vacant and when) | ❌ | Q4.P |

## 7. Meaning — ✅
> "Rented" accurately describes that PROP-0001 has an active tenant. The badge conveys the correct operational state.

```
Label rendered:           "RENTED" (CSS uppercase of stored "Rented")
Formula chosen:           direct read of PropertyCore.status
User's likely inference:  this property currently has an active tenant
Match?                    ✅
```

**Counterexample considered:**
> "If the status could be 'Rented but overdue', displaying just 'Rented' would NOT match, because users read 'Rented' as 'occupied and paying'. But the current formula is a direct read of a single status field — no overdue/arrears dimension is conflated with it."

The current formula is a direct read; no mismatch exists today.

## 8. Findings (2 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — Full `Property` (incl. finance fields) shipped to Client Component
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/overview/page.tsx:13`

**Problem:** `page.tsx` passes the full `Property` object — the merge of `PropertyCore`, `PropertyLocation`, `PropertyFinance`, and `PropertyMedia` — directly to `<PropertyOverviewPage>`, which is a `"use client"` component. Of the 25+ fields in `Property`, only 7 are ever read across `PropertyOverviewPage` and `PropertyLayout`: `status`, `province`, `buyNumeric`, `name`, `code`, `type`, `health`. The remaining fields — including `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `taxAssessmentValue`, `annualInsurance`, and `currentMarketValue` — are serialised and sent to the browser without being used.

**Why it matters:** Sensitive financial data (mortgage balance, interest rate, tax figures) that a server component should keep private is unnecessarily exposed in the browser's network response and JavaScript heap. Violates the CLAUDE.md rule: "Never send full DB objects as props — select only what the UI renders." The same gap was found in the portfolio route and corrected there via the `PropertyListItem` type.

**Fix:** Add `app/(shell)/property/[id]/overview/queries.ts` with a `getOverviewPageData(id)` function that calls `getPropertyByIdParam` and returns a narrowed pick:
```ts
// app/(shell)/property/[id]/overview/queries.ts
import { getPropertyByIdParam } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types/property";

export type PropertyOverviewItem = Pick<
  Property,
  "id" | "status" | "province" | "buyNumeric" | "name" | "code" | "type" | "health"
>;

export async function getOverviewPageData(id: string): Promise<PropertyOverviewItem | null> {
  const p = await getPropertyByIdParam(id);
  if (!p) return null;
  return { id: p.id, status: p.status, province: p.province, buyNumeric: p.buyNumeric,
           name: p.name, code: p.code, type: p.type, health: p.health };
}
```
Update `page.tsx` to call `getOverviewPageData(id)` and update `PropertyOverviewPage` / `PropertyLayout` props to accept `PropertyOverviewItem` instead of `Property`.

---

### 🟡 F2 — Hero badge hardcodes emerald styles instead of using `statusBadgeClasses()`
**P2 schema smell · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx:157`

**Problem:** The hero badge `<span>` has `className="bg-emerald-50 border border-emerald-200 text-emerald-700 ..."` hardcoded. This renders a green badge for all five possible `PropertyStatus` values — `"Rented"`, `"Vacant"`, `"For Sale"`, `"Sold"`, and `"Archived"` would all appear green. `statusBadgeClasses()` in `lib/property-helpers.ts:59` already handles all five values with the correct per-status colours (amber for Vacant, blue for For Sale, grey for Sold/Archived), is exhaustive over the `PropertyStatus` union, and was specifically built for this purpose after `portfolio--rental-status` Rev 2.

**Why it matters:** A property with `status: "Vacant"` or `status: "Sold"` on this page would display a green "Rented"-style badge, misleading the user about the property's operational state.

**Fix:**
```tsx
// PropertyOverviewPage.tsx:156-159 — replace hardcoded className
import { statusBadgeClasses } from "@/lib/property-helpers";

// before:
<span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-0.5 rounded-full">
// after:
<span className={`${statusBadgeClasses(property.status)} text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-0.5 rounded-full`}>
```

## 9. Fix Log

> A chronological record of fixes applied after the initial audit.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> <PropertyLayout>
  .relative > .flex > .flex > .bg-emerald-50
  selected text: "Rented"
sources:
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: lib/data/db/properties.ts
    sha: 091d5f6ef310175bce8e679d5006607b4965508d
  - path: lib/data/properties.ts
    sha: 4f231bfe5ffcd4192bd038e4d044ea0fd2fea807
  - path: app/(shell)/property/[id]/overview/page.tsx
    sha: 8672e2f36bdd9c8ca4832fbde629fa9978250e61
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: c8a424f4ee41979a94966b4126ecc8b379e0be90
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
  - path: lib/property-helpers.ts
    sha: 95e1491b34329be1e4c98b92d421b7eb537a62c0
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm PROP-0001 status in seed
node -e "
const c=require('./public/data/users/demo-user/properties/PROP-0001/core.json');
console.log('status:', c.status);
// Expected: status: Rented
"

# List all properties that are NOT Rented/Vacant (to check For Sale / Sold / Archived paths)
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
fs.readdirSync(dir,{withFileTypes:true})
  .filter(e=>e.isDirectory())
  .forEach(d=>{
    const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d.name}/core.json\`,'utf8'));
    if(!['Rented','Vacant'].includes(c.status)) console.log(d.name, c.status);
  });
// Expected: none (all current seed records are Rented or Vacant)
"

# Check fields used by PropertyOverviewPage + PropertyLayout vs full Property shape
node -e "
const used = ['status','province','buyNumeric','name','code','type','health'];
const all  = require('./public/data/users/demo-user/properties/PROP-0001/core.json');
const fin  = require('./public/data/users/demo-user/properties/PROP-0001/finance.json');
const loc  = require('./public/data/users/demo-user/properties/PROP-0001/location.json');
const med  = require('./public/data/users/demo-user/properties/PROP-0001/media.json');
const merged = {...all,...fin,...loc,...med};
const unused = Object.keys(merged).filter(k => !used.includes(k));
console.log('unused fields shipped to browser:', unused);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_rental_status_overview
business_meaning: >
  Per-property operational state displayed in the property detail hero.
  "Rented" = property has an active tenant / lease.
  Semantically identical to rental_status on /portfolio — same field, different render location.
formula: direct read of PropertyCore.status
values:
  Rented:   property has an active tenant / lease (green badge)
  Vacant:   property is empty and available (amber badge)
  For Sale: listed on market, not yet sold (blue badge)
  Sold:     ownership transferred (grey badge)
  Archived: removed from active tracking (light grey badge)
canonical_home: server  # per data-audit/03 §B1
unit: enum
edge_cases:
  - isArchived:true flag is independent of status:"Archived" (Q4.D)
  - invalid status throws ZodError at FS boundary (propertiesDb.get → validateProperty)
related_metrics:
  - see audit: portfolio--rental-status (same field, portfolio render)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 2 findings (1 P1, 1 P2).
- Golden-value check verified ✅ against PROP-0001 seed: `core.json status: "Rented"` = displayed badge.
- F1: full `Property` (incl. finance fields) sent to Client Component — `queries.ts` narrowing layer missing.
- F2: hero badge hardcodes emerald CSS — `statusBadgeClasses()` helper from `lib/property-helpers.ts` not used here but exists and handles all 5 values.
- No new open questions filed — both findings are clear code improvements, not architectural ambiguities.

</details>
