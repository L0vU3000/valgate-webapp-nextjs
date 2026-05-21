---
slug: portfolio--property-type
data_point: "Property Type badge (e.g. \"Residential\")"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ F1+F2+F3 resolved · F4 deferred"
---

# Audit — Property Type badge on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ All 8 wizard choices flow directly to the table badge — no translation layer, no information loss
- ✅ F1, F2, F3 resolved in Revision 2; F4 deferred to Convex migration
- 🔧 Remaining: F4 (Zod read-boundary validation) deferred — see `deferred-database-migration.md`
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this label, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the displayed value match the stored value? | ✅ |
| 4 | Render | How does the badge reach the user? | ✅ |
| 5 | Consistency | Do related elements agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the badge accurately represent the chosen type? | ✅ |
| 8 | Findings | What to fix | 4 items (3 resolved, 1 deferred) |
| 9 | Fix Log | What has been fixed since the initial audit? | Rev 2 |

## Glossary
- **PropertyTypeChoice** — the 8-value enum used for both storage and display: `"residential" | "commercial" | "multi-unit" | "retail" | "land" | "industrial" | "construction" | "other"`.
- **TYPE_LABEL** — display map from `PropertyTypeChoice` key to human-readable label (e.g. `"multi-unit"` → `"Multi-Unit"`).
- **Exhaustiveness check** — a TypeScript pattern that produces a compile error when a union type gains a new member that wasn't handled in a switch/map.
- **PII** — Personal info that shouldn't leak to the browser.

---

## 1. Snapshot

> The "Type" column in the portfolio table shows a coloured pill badge — "Residential", "Commercial", "Land", etc. — taken from the `type` field stored on each property, then mapped to a human-readable label before render.

| | |
|---|---|
| Where | /portfolio, PropertyTable "Type" column, every row |
| Possible labels | Residential · Commercial · Multi-Unit · Retail · Land · Industrial · Construction · Other |
| Rendered value | `{TYPE_LABEL[p.type]}` — one lookup, no other logic |
| Reads from | `PropertyListItem.type: PropertyTypeChoice` (prop chain: `data.properties[n].type`) |
| Source of truth | `PropertyCore.type: PropertyTypeChoice` in `core.json` per property |
| Canonical home | server — projected into `PropertyListItem` in `queries.ts:36` |
| Edge cases | empty portfolio → no rows rendered · no unknown-type fallback needed (TypeScript enforces exhaustiveness) |

## 2. Entity — ✅

> Each property stores exactly one type field — the same 8-value enum the wizard collects. There are no redundant fields and no translation layer.

| Field | Type | Notes |
|---|---|---|
| `type` | `PropertyTypeChoice` (`"residential"…"other"`) | stored in `core.json`, displayed in table |

**No issues.** `PropertyTypeCode` (the old 3-value coarse type) and `PropertyMedia.propertyType` (the redundant fine-grained copy) were both removed in Revision 2. The wizard's internal `form.propertyType` state field remains — that is the source of `type` at submit time, not a separate stored field.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> The badge renders a human-readable label looked up from `TYPE_LABEL` using the stored `type` key. It is correct for all 16 seed records.

| | |
|---|---|
| Source file | `components/portfolio/PropertyTable.tsx` |
| JSX | `{TYPE_LABEL[p.type]}` (type badge cell) |
| Badge classes | `typeBadgeClasses(p.type)` in `lib/property-helpers.ts:46–57` |
| Prop chain | `getPortfolioPageData()` → `listItems[n].type` → `<PropertyTable pageRows>` → `TYPE_LABEL[p.type]` |

**Golden-value check**

| Source | residential | commercial | land | Total |
|---|---|---|---|---|
| Displayed label | "Residential" ×3 | "Commercial" ×2 | "Land" ×11 | 16 |
| Seed `core.json` | 3 | 2 | 11 | 16 |
| Match? | ✅ | ✅ | ✅ | ✅ |

**Robustness notes**
- ✅ Empty array — `pageRows.length === 0` shows "No properties match your filters."
- ✅ No unknown-type fallback needed — `TYPE_LABEL`, `TYPE_ICON`, `TYPE_COLOR`, and `typeBadgeClasses` are all typed `Record<PropertyTypeChoice, …>` with no `default` branch. TypeScript errors at compile time if a value is missing.
- ✅ No date math or currency involved.

## 4. Render — ✅

> The badge is a coloured pill. The label is human-readable ("Residential", not "residential"). All helper maps are typed to `PropertyTypeChoice` so no unknown value can slip through silently.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component path | `<PortfolioPage>` (client) → `<PropertyTable>` → `TYPE_LABEL[p.type]` badge |
| Prop chain | `data.properties` (PropertyListItem[]) → `pageRows` → `TYPE_LABEL[p.type]` |
| Server vs Client | Projected server-side; rendered client-side inside `<PortfolioPage>` |
| Loading / empty state | Empty-filter state ✅ (`"No properties match your filters."`); no loading skeleton for the table |
| Formatting | `TYPE_LABEL` lookup — e.g. `"multi-unit"` → `"Multi-Unit"` |
| A11y | Screen reader reads the formatted label string — acceptable |

**PII / IDOR**
- `PropertyListItem` is a narrow projection (10 fields). `lat`, `lng`, `mortgage`, `taxes`, and other sensitive fields are excluded from the browser payload. ✅
- Auth path goes through `getCurrentUserId()` shim → hardcoded `"demo-user"`. Ownership check must be verified when real auth lands.

## 5. Consistency — ✅

> The badge values, filter pills, icon map, and colour map are all derived from the same `PropertyTypeChoice` enum. They cannot drift independently.

| Identity | Verification | Holds? |
|---|---|---|
| Badge values ⊆ filter pill options | Both derived from `TYPE_LABEL` keys | ✅ by construction |
| `TYPE_ICON` covers all badge values | `Record<PropertyTypeChoice, LucideIcon>` — TypeScript enforces | ✅ |
| `TYPE_COLOR` covers all badge values | `Record<PropertyTypeChoice, string>` — TypeScript enforces | ✅ |
| Filter pills derived (not hardcoded) | `Object.entries(TYPE_LABEL)` in `PropertyFilters.tsx` | ✅ |
| Seed `type` values are valid enum members | `{ residential:3, commercial:2, land:11 }` — all in `PropertyTypeChoice` | ✅ |

## 6. Missing safeties (1 gap)

> One safety net is missing: the file-system read boundary does not validate the shape of records it loads.

| Gap | Status | Link |
|---|---|---|
| Zod validation of `type` at FS read boundary | ❌ deferred | Q5.J · [deferred-database-migration.md](deferred-database-migration.md) |

## 7. Meaning — ✅

> The badge shows exactly what the user chose in Step 1 of the add-property wizard. The label is the display name of that choice.

```
Label rendered:           "Construction"  (for a property whose type is "construction")
Formula chosen:           TYPE_LABEL["construction"] → "Construction"
User's likely inference:  "My construction project is shown as Construction"
Match?                    ✅
```

**Confirmed for all 8 choices:** each `PropertyTypeChoice` key maps to its display label without lossy coercion. The old problem — "construction" and "other" silently becoming "Land" — is resolved.

## 8. Findings (4 — 3 resolved, 1 deferred)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — "construction" and "other" silently map to "Land"~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[logic]` `[semantic]`**

**Where:** `app/(shell)/add-property/actions.ts:88–94` _(Revision 1 location, function deleted)_

**Problem:** `derivePropertyTypeCode` had a catch-all `return "Land"` that swallowed `"construction"` and `"other"`. A construction site was stored and displayed as "Land".

**Why it matters:** The type badge is the primary classification signal in the table. Silently misclassifying two of eight selectable types undermined the user's ability to filter and understand their portfolio.

**Fix:** `derivePropertyTypeCode` deleted entirely. `PropertyCore.type` changed to `PropertyTypeChoice` (8 values). Wizard choice stored directly as `type` with no translation.

**Resolved:** Revision 2 — `derivePropertyTypeCode` deleted. `PropertyCore.type: PropertyTypeChoice`. Seed data migrated: "House"→"residential", "Building"→"commercial", "Land"→"land".

---

### ~~🟡 F2 — Dual type system with no reconciliation path~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts` and `lib/data/db/properties.ts` _(Revision 1 location, fields removed)_

**Problem:** `Property` carried two type fields: `PropertyCore.type: PropertyTypeCode` (3 values, shown) and `PropertyMedia.propertyType?: PropertyTypeChoice` (8 values, stored but never displayed). The finer-grained user choice was permanently invisible after submission.

**Why it matters:** Users selected one of 8 types and saw one of 3. The distinction between "industrial", "commercial", and "retail" was discarded. Tracked as Q5.M.

**Fix:** Consolidated to one field.

**Resolved:** Revision 2 — `PropertyTypeCode` removed. `PropertyMedia.propertyType` removed from type definition and db split. `PropertyCore.type: PropertyTypeChoice` is the single canonical classification. All 8 values flow end-to-end.

---

### ~~🟡 F3 — Type helpers and filter pills used `string` instead of `PropertyTypeCode`~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]` `[negative-space]`**

**Where:** `lib/property-helpers.ts` and `components/portfolio/PropertyFilters.tsx` _(Revision 1 locations)_

**Problem:** `typeBadgeClasses`, `TYPE_ICON`, `TYPE_COLOR` were all `Record<string, …>` and the filter pill array was hardcoded as `["All", "House", "Building", "Land"]`. Adding a new type produced no TypeScript error — it silently rendered as a grey badge and was absent from the filter.

**Why it matters:** Four files needed manual updates on every enum change with no compiler guidance.

**Fix:** All helpers typed to `Record<PropertyTypeChoice, …>`. `typeBadgeClasses` signature is `(type: PropertyTypeChoice)`. Filter pills derived from `Object.entries(TYPE_LABEL)`. The `switch` in `typeBadgeClasses` has no `default` branch — TypeScript errors immediately if a 9th `PropertyTypeChoice` is added without a matching case.

**Resolved:** Revision 2 — exhaustiveness enforced across all four sites.

---

### 🔵 F4 — No Zod validation of `type` at the FS read boundary
**P3 nit · confidence: high · `[negative-space]`**

**Where:** `lib/data/db/_fs.ts` — `listMergedRecords<T>` casts merged JSON without validation

**Problem:** A stale or corrupted `type` value in `core.json` (e.g. `"House"` leftover from before the Revision 2 migration) would pass through `listMergedRecords` undetected. The TypeScript helpers would receive an unexpected string and TypeScript's exhaustiveness would not help at runtime.

**Why it matters:** Already tracked as Q5.J — part of the broader FS schema validation gap.

**Fix:** Add a Zod schema at the `listMergedRecords` boundary for `PropertyCore`.

**Deferred:** The FS layer is a temporary stand-in for Convex. Convex's `v.*` table schemas enforce shape at the query/mutation boundary automatically — adding Zod now means writing and discarding it. See [`deferred-database-migration.md`](deferred-database-migration.md).

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1, F2, F3 | Removed `PropertyTypeCode` + `derivePropertyTypeCode`; `PropertyCore.type` → `PropertyTypeChoice`; removed `PropertyMedia.propertyType` from types + db split; expanded all helpers to 8 values with `Record<PropertyTypeChoice, …>`; filter pills derived from `Object.entries(TYPE_LABEL)`; seed `core.json` migrated (House→residential, Building→commercial, Land→land); `lib/mock-data.ts` updated | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable>
  tbody > .border-t > .py-3 > .inline-flex
  selected text: "Residential"
sources:
  - path: lib/data/types/property.ts
    sha: 917377e3c458b5be8b903b926a832c9f46d88bc0
  - path: lib/data/db/properties.ts
    sha: 539f52f2a52201f38c55931c3aad18a9c83c0bed
  - path: lib/data/derivations/portfolio.ts
    sha: 867469266c68a5e09f431e32a0aaa3c1490d302f
  - path: app/(shell)/portfolio/queries.ts
    sha: 563d151453a93f453871b3197fe3b59a4280d604
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 689903eb8f7a75870ca95bdf12fd19d6e6e53770
  - path: components/portfolio/PropertyTable.tsx
    sha: a7d7aee0b16353e8e13004067cafc45e4b047295
  - path: lib/property-helpers.ts
    sha: 021fa667c0b2b2cdc6cbe73726e294620b152aa7
  - path: app/(shell)/add-property/actions.ts
    sha: 97ccc41f072eab863f9ee1dc3ed0529cddf02fbf
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Type distribution across seed (should be residential:3, commercial:2, land:11)
node -e "
const fs=require('fs');
const base='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const counts={};
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(base+'/'+d+'/core.json','utf8'));
  counts[c.type]=(counts[c.type]??0)+1;
}
console.log(counts);
"

# Confirm no legacy PropertyTypeCode values remain in seed
node -e "
const fs=require('fs');
const base='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const legacy=new Set(['House','Building','Land']);
const bad=dirs.filter(d=>{
  const c=JSON.parse(fs.readFileSync(base+'/'+d+'/core.json','utf8'));
  return legacy.has(c.type);
});
console.log(bad.length===0?'✅ No legacy values':'❌ Legacy values found:',bad);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_type_badge
business_meaning: >
  Classification of a property shown as a coloured pill in the portfolio table.
  Eight possible values, matching the choices in the add-property wizard Step 1.
  Displayed as a human-readable label via TYPE_LABEL (e.g. "multi-unit" → "Multi-Unit").
formula: TYPE_LABEL[p.type]  # one lookup, no derivation
canonical_home: server  # projected into PropertyListItem in queries.ts
unit: enum (PropertyTypeChoice — 8 values)
edge_cases:
  - empty portfolio → no rows rendered
  - TypeScript enforces exhaustiveness — unknown type values produce a compile error
related_metrics:
  - type filter pills in PropertyFilters derive from TYPE_LABEL keys
  - TYPE_ICON and TYPE_COLOR use same PropertyTypeChoice keys for icon/colour decoration
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Golden-value check ✅: all 16 seed badges matched stored `type` (House ×3, Building ×2, Land ×11).
- Dual type system documented (F2); Q5.M filed in 05-open-questions.md.
- F1 (construction/other → Land) confirmed via manual `derivePropertyTypeCode` simulation.
- F4 cross-linked to existing Q5.J.

### Revision 2 — 2026-05-04
- F1 resolved: `derivePropertyTypeCode` deleted; wizard choice stored directly as `PropertyCore.type`.
- F2 resolved: `PropertyTypeCode` removed; `PropertyMedia.propertyType` removed; single `type: PropertyTypeChoice` field.
- F3 resolved: all helpers typed to `Record<PropertyTypeChoice, …>`; `typeBadgeClasses` switch has no `default`; filter pills derived from `Object.entries(TYPE_LABEL)`.
- F4 deferred: added to `deferred-database-migration.md`.
- Seed data migrated: House→residential, Building→commercial, Land→land (16 files).
- `lib/mock-data.ts` type annotation and values updated to match.
- Golden-value check updated: residential ×3, commercial ×2, land ×11.
- All stale section content (§1–§7, SSOT YAML, verification commands, SHAs) rewritten to reflect current state.

</details>
