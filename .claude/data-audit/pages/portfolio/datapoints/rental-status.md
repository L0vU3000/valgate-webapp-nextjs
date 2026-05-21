---
slug: portfolio--rental-status
data_point: "Rental Status (table column)"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ All 3 findings resolved"
---

# Audit — Rental Status (table column) on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ Values are correct — 7 "Rented" and 9 "Vacant" displayed match seed exactly
- ✅ All 3 findings resolved · status enum expanded to 5 values · Zod validation added · filter sentinel fixed
- 🔧 Remaining gaps: audit log (Q4.P) and multi-tenant isolation (Q4.M) — deferred to backend phase
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this column, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the display match the stored value? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the value delivers? | ✅ |
| 8 | Findings | What to fix | 3 items (all resolved) |
| 9 | Fix Log | What has been fixed since the initial audit? | 3 fixes |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a piece of data.
- **FS boundary** — the point where raw JSON files are read from disk and cast to TypeScript types.
- **Sentinel** — a special value used as a stand-in flag (e.g. `null` meaning "no filter selected").

---

## 1. Snapshot

> The Rental Status column shows the current state of each property. Each row reads the `status` field directly from the property record and renders a coloured badge.

| | |
|---|---|
| Where | /portfolio, PropertyTable "Status" column |
| Label | "Status" (column header) |
| Values | `"Rented"` (emerald) · `"Vacant"` (amber) · `"For Sale"` (blue) · `"Sold"` (grey) · `"Archived"` (light grey) |
| Formula | Direct read — `p.status` passed through unchanged |
| Reads from | `public/data/users/demo-user/properties/<id>/core.json` |
| Canonical home | server _(per `data-audit/03 §B1`)_ |
| Edge cases | `"Sold"` and `"Archived"` excluded from KPI counts · `isArchived: true` also excluded |

## 2. Entity — ✅

> The `status` field is typed as a five-value union and validated with Zod at read time — any invalid value in a JSON file now throws immediately rather than silently corrupting counts.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | row identity |
| `userId` | `string` | ownership |
| `status` | `PropertyStatus` | `"Rented" \| "Vacant" \| "For Sale" \| "Sold" \| "Archived"` — stored in `core.json` |

**Issues**
- _No outstanding issues._

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> No calculation is needed — the status value is stored directly and displayed as-is. The badge colour is the only derived output.

| | |
|---|---|
| Source file | `lib/property-helpers.ts` |
| Function | `statusBadgeClasses(status: PropertyStatus)` |
| Output | Tailwind class string for badge colour |

**Formula** (verbatim):
```ts
case "Rented":   return "bg-emerald-50 text-emerald-700 border border-emerald-200";
case "Vacant":   return "bg-amber-50 text-amber-700 border border-amber-200";
case "For Sale": return "bg-blue-50 text-blue-700 border border-blue-200";
case "Sold":     return "bg-slate-50 text-slate-500 border border-slate-200";
case "Archived": return "bg-slate-100 text-slate-400 border border-slate-200";
```

**Golden-value check**

| Source | Rented | Vacant | Total |
|---|---|---|---|
| Displayed | 7 | 9 | 16 |
| Counted from seed | 7 | 9 | 16 |
| Match? | ✅ | ✅ | ✅ |

**Robustness notes**
- ✅ No arithmetic — direct read, no math to go wrong
- ✅ Invalid values now throw a Zod error at the FS boundary (F1 resolved)
- ✅ No TZ or currency concerns

## 4. Render — ✅

> The status badge travels cleanly from server to client. The helper is now typed to `PropertyStatus`, and the filter uses `null` for "no filter selected" instead of a fragile string sentinel.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `p.status` in `pageRows` (a `PropertyListItem[]`) |
| Server vs Client | `status` narrowed to `PropertyListItem` on server; rendered inside `<PortfolioPage>` which is a Client Component |
| Loading / empty / error states | Empty filtered-results state exists (`"No properties match your filters."`); no per-badge error state |
| Formatting | None — raw string displayed verbatim |
| A11y | Screen reader reads badge text (`"Rented"` / `"Vacant"` etc.), which is adequate |

**PII / IDOR**
- `status` carries no PII and is appropriate to render in the browser.
- `PropertyListItem` correctly narrows the server object — financial fields (`buyNumeric`, `lat`, `lng`, `outstandingMortgage`) are not included.

## 5. Consistency — ✅

> Status string literals are used identically across the type definition, stored JSON, badge renderer, filter control, Zod schema, and KPI derivation — no casing drift.

| Identity | Verification | Holds? |
|---|---|---|
| `rentedCount + vacantCount === totalProperties` | seed: 7 + 9 = 16 (Sold/Archived excluded from total) | ✅ |
| Filter option strings match stored `status` values | All 5 values exact-match in `PropertyFilters.tsx` `STATUS_OPTIONS` | ✅ |
| `computeStats` comparisons use same casing | `p.status === "Rented"` · `p.status === "Vacant"` | ✅ |
| `statusBadgeClasses` cases match stored values | All 5 cases covered, no default fallback | ✅ |
| Zod schema matches type union | `z.enum(["Rented","Vacant","For Sale","Sold","Archived"])` mirrors `PropertyStatus` | ✅ |

## 6. Missing safeties (2 gaps)

> Two protection mechanisms are still missing — both deferred to the backend phase.

| Gap | Status | Link |
|---|---|---|
| Zod validation at FS read boundary for `status` | ✅ resolved in Rev 2 | Q5.J |
| Audit log for status mutations (who changed Rented → Vacant and when) | ❌ | Q4.P |
| Soft-delete / archived — `isArchived` flag + `"Sold"`/`"Archived"` status both excluded from KPIs; no write path yet | ⚠️ partial | Q4.D |
| Multi-tenant isolation | ⚠️ shim — `getCurrentUserId()` returns `"demo-user"` | Q4.M |

## 7. Meaning — ✅

> "Status" and its values accurately describe the property's current state. Each label is self-explanatory and the badge colour reinforces the meaning.

```
Label rendered:           "Status" (column header)
Values rendered:          "Rented" · "Vacant" · "For Sale" · "Sold" · "Archived"
Formula chosen:           direct read of PropertyCore.status
User's likely inference:  what is the current operational state of this property?
Match?                    ✅
```

**Counterexample considered:**
> "If the formula added payment-health logic — e.g. 'Rented but overdue' — the simple 'Rented' label would NOT match, because users read 'Rented' as 'occupied and paying', not as a lease-exists-but-arrears state."

The current formula is a direct read; no such mismatch exists today.

## 8. Findings (3 items — all resolved)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🟡 F1 — No runtime validation of `status` at FS read boundary~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]` `[negative-space]`**

**Where:** `lib/data/db/_fs.ts` → `listMergedRecords<Property>()`

**Problem:** `listMergedRecords` casts merged JSON directly to `Property` via TypeScript generics with no Zod parse. A `core.json` with `"status": "Sold"` or `"status": "rented"` (wrong casing) passes through undetected. In `computeStats` (`derivations/portfolio.ts:34,40`) it misses both `"Rented"` and `"Vacant"` checks — `rentedCount + vacantCount` falls below `totalProperties`, silently breaking the cross-card occupancy identity. In the table, `statusBadgeClasses` falls through to `default`, rendering a grey badge displaying the corrupted string with no error raised anywhere.

**Why it matters:** silent data corruption breaks KPI card counts (rentedCount, vacantCount, occupancyRate) and renders misleading per-row badges. This is the same pattern flagged in Q5.J.

**Fix:** add a Zod parse inside `list()` / `get()` in `lib/data/db/properties.ts` before returning.

**Resolved:** `lib/data/db/properties.ts` — added `propertyStatusSchema = z.enum([...])` and `validateStatus()` called in both `list()` and `get()`. Invalid values now throw a `ZodError` immediately at read time.

---

### ~~🔵 F2 — `statusBadgeClasses` accepts `string` instead of `PropertyStatus`~~ — ✅ resolved in Revision 2
**P3 nit · confidence: high · `[render]`**

**Where:** `lib/property-helpers.ts:59`

**Problem:** `function statusBadgeClasses(status: string)` — the parameter is typed as `string`, not `PropertyStatus`. TypeScript cannot warn if a future refactor adds a new status variant to the union but forgets to update this switch statement.

**Why it matters:** low risk today with only two values, but the loose signature breaks the exhaustiveness guarantee that makes the `default` case truly unreachable.

**Fix:** narrow the signature to `PropertyStatus` and remove the `default` case.

**Resolved:** `lib/property-helpers.ts` — signature changed to `statusBadgeClasses(status: PropertyStatus): string`. Default case removed. Status enum simultaneously expanded from 2 to 5 values with a case for each.

---

### ~~🔵 F3 — `statusFilter` uses the string `"Status"` as a no-filter sentinel~~ — ✅ resolved in Revision 2
**P3 nit · confidence: high · `[render]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:45,63`

**Problem:** `useState("Status")` — the literal string `"Status"` doubles as the "all statuses selected" state. The filter comparison `p.status === statusFilter` accidentally works because no property has `status === "Status"`, but this is coincidental correctness.

**Why it matters:** a UI label rename or a new status value named `"Status"` silently breaks filtering with no TypeScript or runtime warning.

**Fix:** use `null` to represent "no filter selected".

**Resolved:** `PortfolioPage.tsx` and `PropertyFilters.tsx` — state type changed to `PropertyStatus | null`, initial value changed to `null`, filter condition changed to `!statusFilter || p.status === statusFilter`, all `setStatusFilter("Status")` calls replaced with `setStatusFilter(null)`.

---

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | Added `propertyStatusSchema` Zod enum + `validateStatus()` to `list()` and `get()` in `lib/data/db/properties.ts` | pending |
| 2 | 2026-05-04 | F2 | `statusBadgeClasses` signature narrowed to `PropertyStatus`; default case removed; enum expanded to 5 values in `lib/property-helpers.ts` | pending |
| 2 | 2026-05-04 | F3 | `statusFilter` state type changed to `PropertyStatus \| null`; sentinel `"Status"` replaced with `null` throughout `PortfolioPage.tsx` and `PropertyFilters.tsx` | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable> td
  .w-full > tbody > .border-t > .py-3
  selected text: rental status badge
sources:
  - path: lib/data/types/property.ts
    sha: a6e627d0c286937ea3a78a56d87a9f24ec1fdeba
  - path: lib/data/db/properties.ts
    sha: 04a136af80cef6665518ce55e8f1f94ee6a8ae75
  - path: lib/data/derivations/portfolio.ts
    sha: a43e7bb5c9ab9a828d42262a4aa7c6ddb17be628
  - path: app/(shell)/portfolio/queries.ts
    sha: b8369bb445563dbb4f5d279931cfe78028c1423c
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 9124a3abbadb2fccabb4cc033c2c9fd177faab11
  - path: components/portfolio/PropertyTable.tsx
    sha: a7d7aee0b16353e8e13004067cafc45e4b047295
  - path: lib/property-helpers.ts
    sha: 202e60ef6e5e7cc47a717b51a4556761d899fddc
  - path: components/portfolio/PropertyFilters.tsx
    sha: 42f0fcda8a480b51076aaa73f32c0c9d730e0d6a
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Count by status across all seed properties
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const r={total:dirs.length,rented:0,vacant:0,other:0};
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`,'utf8'));
  if(c.status==='Rented') r.rented++;
  else if(c.status==='Vacant') r.vacant++;
  else{r.other++;console.log('UNEXPECTED status:',d,c.status);}
}
console.log(r);
// Expected: {total:16,rented:7,vacant:9,other:0}
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: rental_status
business_meaning: >
  Per-property operational state. "Rented" and "Vacant" drive occupancy KPIs.
  "Sold" and "Archived" are excluded from active portfolio counts.
formula: direct read of PropertyCore.status
values:
  Rented: property has an active tenant / lease
  Vacant: property is empty and available
  For Sale: listed on market, not yet sold
  Sold: ownership transferred, excluded from KPI counts
  Archived: removed from active tracking, excluded from KPI counts
canonical_home: server  # per data-audit/03 §B1
unit: enum
edge_cases:
  - Sold and Archived excluded from active pool in computeStats and queries.ts
  - isArchived:true also excludes from active pool (independent flag)
  - invalid status → ZodError thrown at FS read boundary (F1 resolved)
related_metrics:
  - rentedCount = active.filter(p => p.status === "Rented").length
  - vacantCount = active.filter(p => p.status === "Vacant").length
  - occupancyRate = Math.round(rentedCount / totalProperties * 100)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 2 — 2026-05-04
- All 3 findings resolved. Verdict: ✅ All 3 findings resolved.
- F1 resolved: `propertyStatusSchema` Zod enum + `validateStatus()` added to `lib/data/db/properties.ts`. Invalid status now throws immediately.
- F2 resolved: `statusBadgeClasses` signature narrowed to `PropertyStatus`; `default` case removed; switch exhaustive across all 5 values.
- F3 resolved: `statusFilter` state changed from `string` sentinel `"Status"` to `PropertyStatus | null`.
- Status enum expanded from 2 → 5 values: added `"For Sale"`, `"Sold"`, `"Archived"`.
- `computeStats` and `queries.ts` updated to exclude `"Sold"` and `"Archived"` from active portfolio pool.
- Files changed: `lib/data/types/property.ts` (917377e → a6e627d), `lib/data/db/properties.ts` (539f52f → 04a136a), `lib/data/derivations/portfolio.ts` (8674692 → a43e7bb), `app/(shell)/portfolio/queries.ts` (563d151 → b8369bb), `PortfolioPage.tsx` (689903e → 9124a3a), `lib/property-helpers.ts` (021fa66 → 202e60e), `PropertyFilters.tsx` (240a393 → 42f0fcd).

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 3 findings (1 P2, 2 P3).
- Golden-value check verified ✅ against current seed: 7 Rented + 9 Vacant = 16.
- Cross-card identity confirmed ✅.
- Q5.J cited for F1 (no Zod validation at FS boundary).
- Filter values verified: `"Rented"` / `"Vacant"` exact-match across stored values, filter control, badge renderer, and KPI derivation.

</details>
