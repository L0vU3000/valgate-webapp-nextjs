---
slug: portfolio--size
data_point: "Size (m²) column"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ F1+F2+F3 resolved · F4 deferred (sorting not yet built)"
---

# Audit — Size (m²) on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ All three substantive findings resolved: seed normalised, renderer fixed, `size` field replaced by `totalArea`
- ✅ F1 + F2 + F3 resolved · F4 deferred (sorting not yet built)
- 🔧 Remaining: F4 (lexicographic sort) deferred until column sorting is implemented
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this value and where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the pass-through match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 4 items (3 resolved, 1 deferred) |
| 9 | Fix Log | What has been fixed since the initial audit? | Rev 2 |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **Pass-through** — no formula; the stored value is rendered directly without transformation.
- **Lexicographic sort** — string-order sorting where "9" > "10" because "9" > "1".

---

## 1. Snapshot

> Each row in the property table shows a "Size" column — the square-metre area of that property, read from `media.json` as a plain numeric string and displayed with a thousands separator and "m²" appended. A dash is shown when no value is stored.

| | |
|---|---|
| Where | /portfolio, PropertyTable "Size" column (header line 84) |
| Label | `"Size"` |
| Render | `{p.totalArea ? `${Number(p.totalArea).toLocaleString()} m²` : "—"}` (line 176–178) |
| Reads from | `public/data/users/demo-user/properties/<id>/media.json` → `totalArea` |
| Canonical home | materialized field on `PropertyMedia` — no derivation |
| Edge cases | empty/missing → `"—"` · `totalArea` typed `string` so numeric sort needs a parse step (F4, deferred) |

## 2. Entity — ✅

> The area is stored as a single required field `totalArea` on `PropertyMedia`. The duplicate `size` field was removed in Revision 2.

| Field | Type | Notes |
|---|---|---|
| `totalArea` | `string` | Required in `PropertyMedia` — collected by the "Total Area (m²)" input in Step 2 |

**Notes**
- `totalArea` remains typed as `string` (not `number`) — sufficient for display; numeric sort needs a parse step at the sort site (F4, deferred, see Q5.B)
- Q5.O resolved by user decision: `totalArea` is the canonical field; `size` dropped

**Catalog reference:** [`ref/00-entity-catalog.md`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> There is no formula — the stored string is passed straight through to the render layer. Seed values are now plain numeric strings with no embedded commas.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/queries.ts` |
| Mapping | `totalArea: p.totalArea` (line 42) — plain pass-through |
| Output field | `PropertyListItem.totalArea` |

**Formula** (verbatim):
```ts
totalArea: p.totalArea,
```

**Golden-value check**

| Property | Stored value | Rendered |
|---|---|---|
| PROP-0001 | `"850"` | `850 m²` |
| PROP-0002 | `"1200"` | `1,200 m²` |
| PROP-0007 | `"450"` | `450 m²` |
| PROP-0008 | `"5000"` | `5,000 m²` |

All 16 seed records now store plain numeric strings. Formatting (thousands separator) is applied by `Number(p.totalArea).toLocaleString()` in the renderer.

**Robustness notes**
- ✅ Empty string — renderer shows `"—"` when `totalArea` is falsy
- ✅ New properties — wizard collects `totalArea` via the Step 2 input; `actions.ts` writes `totalArea: form.totalArea || ""`
- ✅ No date/TZ math
- ✅ No currency rounding

## 4. Render — ✅

> The value is formatted by `toLocaleString()` before being displayed with "m²". Missing values show a dash. The field is correctly narrowed in `PropertyListItem` — no sensitive data is over-sent.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `data.properties[*].totalArea` → `{p.totalArea ? `${Number(p.totalArea).toLocaleString()} m²` : "—"}` |
| Server vs Client | `PropertyTable` is a Client Component |
| Formatting | `Number(p.totalArea).toLocaleString()` — locale-aware thousands separator |
| Empty/missing fallback | `"—"` when `totalArea` is falsy |
| A11y | No `aria-label`; column header "Size" is the only context (unchanged) |

**PII / IDOR**
- `totalArea` is not sensitive data and is correctly included in the narrowed `PropertyListItem` (no over-send)

## 5. Consistency — ✅

> Size does not feed into any KPI or cross-card calculation — it is a standalone display field — so there is nothing to be inconsistent with.

| Identity | Verification | Holds? |
|---|---|---|
| `totalArea` not used in any KPI derivation in `portfolio.ts` | confirmed — not read by `computeStats` or `computeKpis` | ✅ |
| `totalArea` is the single canonical field (no `size` duplicate) | confirmed — `size` removed from `PropertyMedia` in Rev 2 | ✅ |

## 6. Missing safeties (1 gap)

> Two of the three original gaps are closed. One remains: the FS layer still casts JSON to the entity type without runtime validation.

| Gap | Status | Link |
|---|---|---|
| Numeric validation in add-property form | ✅ `totalArea` in `schemas.ts`; Step 2 has a `type="number"` input | Q5.B (partial) |
| Empty/null display fallback in renderer | ✅ shows `"—"` when `totalArea` is falsy | F2 resolved |
| FS schema validation (Zod) at read boundary | ❌ JSON cast without runtime check | Q5.J |

## 7. Meaning — ✅

> The column is labelled "Size" and displays the total area in m². The single canonical field is `totalArea`, collected from the user in Step 2 of the wizard. The label and the data match.

```
Label rendered:           "Size"
Formula chosen:           p.totalArea (raw string pass-through, formatted at render)
User's likely inference:  total area of the property in square metres
Match?                    ✅
```

**Note:** Q5.O (size vs totalArea duplication) is resolved — `totalArea` was chosen as the canonical field and `size` was dropped. The column label remains "Size" (short, idiomatic); the field is named `totalArea` (explicit). No mismatch.

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — Seed data has inconsistent size formatting (commas vs no commas)~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]`**

**Where:** `public/data/users/demo-user/properties/*/media.json` (all 16 files)

**Problem:** 10 of 16 seed records store commas in the size string (`"1,200"`, `"5,000"`) while 6 do not (`"850"`, `"900"`, `"750"`, `"480"`, `"600"`, `"450"`). The renderer does zero formatting — `{p.size} m²` outputs the raw stored value. The table shows `850 m²` next to `1,200 m²` with no consistent presentation.

**Why it matters:** Inconsistent rendering erodes trust in the data. A user who adds a property with size `"1500"` will see `1500 m²` alongside seed rows showing `1,500 m²` — indistinguishable from a data entry error.

**Fix:** Normalise all seed `media.json` files to plain numeric strings without embedded commas (`"1200"`, not `"1,200"`). Apply formatting at the render layer: `{Number(p.size.replace(/,/g, "")).toLocaleString()} m²`. Long-term: change `size` type to `number` (see F3) and format numerically.

**Resolved:** pending commit — all 16 `media.json` files renamed `size` → `totalArea` with commas stripped; renderer updated to `{p.totalArea ? `${Number(p.totalArea).toLocaleString()} m²` : "—"}`.

---

### ~~🔴 F2 — New properties from the add-property wizard get `size: ""`, rendering as ` m²`~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/add-property/actions.ts:70` · `components/portfolio/PropertyTable.tsx:177`

**Problem:** `actions.ts` writes `size: form.totalArea || ""`. Since `totalArea` is an optional field in the form schema (`z.string().optional()` in `schemas.ts`) and has no dedicated input in any wizard step, every newly-created property gets `size: ""`. In the table this renders as ` m²` — a floating unit with no number, which is visually broken.

**Why it matters:** Every real user action (adding a property) produces a broken size cell immediately. This is observable in production from day one.

**Fix:** Immediate patch — add a null guard in the renderer: `{p.size ? `${Number(p.size.replace(/,/g, "")).toLocaleString()} m²` : "—"}`. Correct fix — add a labelled "Size (m²)" input to Step 2 of the add-property wizard, wire it to a dedicated `size` field in `step2Schema` with `z.coerce.number().int().positive()`.

**Resolved:** pending commit — renderer has null guard + `toLocaleString()` formatter; "Total Area (m²)" `type="number"` input added to `Step2BasicInfo.tsx` below Property Name; `actions.ts` now writes `totalArea: form.totalArea || ""` only (duplicate `size` write removed).

---

### ~~🟡 F3 — `size` and `totalArea` are aliases of the same form field with no documented distinction~~ — ✅ resolved in Revision 2
**P2 schema smell · confidence: high · `[schema]` `[semantic]`**

**Where:** `app/(shell)/add-property/actions.ts:70–72` · `lib/data/types/property.ts:63–65`

**Problem:** Both fields are written from `form.totalArea`: `size: form.totalArea || ""` and `totalArea: form.totalArea || undefined`. In all 16 seed records `totalArea` is absent from `media.json` while `size` is always present. No code reads `totalArea` for any display purpose. The two fields have different optionality and different fallback values despite sharing an identical source.

**Why it matters:** Any future developer is likely to use one and silently ignore the other, creating a split source. If they are the same thing, `totalArea` is dead weight. If they differ (e.g., built area vs lot area), neither field name nor any documentation captures the distinction.

**Fix:** Resolve Q5.O first. Once semantics are clear: (a) if identical — drop `totalArea` from the type, form schema, and `actions.ts`; (b) if distinct — rename to `builtArea` / `lotArea`, add a dedicated form input for each, and update the table column label accordingly.

**Resolved:** pending commit — user chose to keep `totalArea` as the canonical field. `size: string` removed from `PropertyMedia`; `totalArea: string` promoted to required. `PropertyListItem` Pick updated from `"size"` to `"totalArea"`. All downstream references updated (`queries.ts`, `PropertyTable.tsx`, `layout.tsx`, `HomePage.tsx`, `db/properties.ts`, `scripts/fixtures/properties.ts`, `mock-data.ts`). All 16 seed `media.json` files migrated from `size` key to `totalArea` key.

---

### 🔵 F4 — Table would sort `totalArea` lexicographically, not numerically
**P3 nit · confidence: medium · `[logic]`**

**Where:** `components/portfolio/PropertyTable.tsx` (sort behaviour when implemented)

**Problem:** `totalArea` is typed as `string`. When the table gains column sorting, sorting by size will use lexicographic order — `"9"` sorts after `"5000"` because `"9" > "5"` character-by-character.

**Why it matters:** Sorting by area is a natural portfolio management action. Wrong sort order makes it impossible to reliably find smallest or largest properties.

**Fix:** Parse before comparing: `(a, b) => Number(a.totalArea || 0) - Number(b.totalArea || 0)`. Long-term: change `totalArea` type to `number` at the Convex migration boundary.

**Deferred:** sorting not yet built in the table — revisit when column sorting is added.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | 16 seed `media.json` files: `size` key renamed → `totalArea`; commas stripped from 10 values | pending |
| 2 | 2026-05-04 | F2 | Renderer: null guard + `toLocaleString()` formatter; "Total Area (m²)" input added to `Step2BasicInfo.tsx` | pending |
| 2 | 2026-05-04 | F3 | `PropertyMedia.size` removed; `totalArea` promoted to required; all downstream references updated across 7 files | pending |
| 2 | 2026-05-04 | F4 | Deferred — revisit when column sorting is built | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable> td
  .w-full > tbody > .border-t > .py-3
  feedback: size
sources:
  - path: lib/data/types/property.ts
    sha: 7b55c6184e1275908c5e9040eb57f0769a8d8093
  - path: lib/data/db/properties.ts
    sha: 3135dea9ef13be98a7a9fb448a451b6a0a8fee5e
  - path: app/(shell)/portfolio/queries.ts
    sha: 2e6866303cc684b993715ccf115429b7b9c4641a
  - path: components/portfolio/PropertyTable.tsx
    sha: 550aa5e6f907e6815fee793186a7e16c3d350d02
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 9124a3abbadb2fccabb4cc033c2c9fd177faab11
  - path: app/(shell)/add-property/actions.ts
    sha: 92c8ac9c92849439884e434db3e4562bca3c7c76
  - path: app/(shell)/add-property/_components/schemas.ts
    sha: c0d38db5e81f29a58193198e215d242343b0c4e1
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Show all totalArea values from seed (verify plain numeric, no commas)
for d in public/data/users/demo-user/properties/*/; do
  f="$d/media.json"
  [ -f "$f" ] && echo "$(basename $d): $(python3 -c "import sys,json; d=json.load(open('$f')); print(d.get('totalArea','—'))")"
done

# Confirm no size key remains in any seed file
python3 -c "
import json, os, glob
hits = [p for p in glob.glob('public/data/users/demo-user/properties/*/media.json')
        if 'size' in json.load(open(p))]
print('size key found in:', hits or 'none')
"

# Confirm all totalArea values are plain integers (no commas)
python3 -c "
import json, glob
for p in sorted(glob.glob('public/data/users/demo-user/properties/*/media.json')):
    d = json.load(open(p)); v = d.get('totalArea','')
    ok = v.isdigit()
    print(f'{p}: {v!r} {\"✅\" if ok else \"❌ not plain int\"}')"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_total_area
business_meaning: >
  Total area of the property in square metres (m²).
  Stored as a plain numeric string in PropertyMedia.totalArea.
  Collected from the user in the Step 2 "Total Area (m²)" input.
  Rendered in the portfolio table as "{toLocaleString()} m²" or "—" if empty.
formula: p.totalArea  # raw pass-through, no derivation
canonical_home: materialized  # stored in media.json, not derived
unit: m² (appended at render, not stored)
edge_cases:
  - empty/missing → "—" (null guard in renderer)
  - string type → numeric sort requires Number(p.totalArea) parse at sort site (F4, deferred)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (2 P1, 1 P2, 1 P3).
- F1: 10/16 seed records store commas in size string; 6 do not. Mixed formatting visible in rendered table.
- F2: `actions.ts:70` writes `size: form.totalArea || ""` — every new property renders as ` m²`.
- F3: `size` and `totalArea` always identical in form mapping; no documented distinction between fields.
- F4: String type would produce wrong sort order when column sorting is added.
- Q5.O filed in `ref/05-open-questions.md`.

### Revision 2 — 2026-05-04
- F1 resolved: seed files renamed `size` → `totalArea`, commas stripped from 10 values (e.g. `"1,200"` → `"1200"`). Renderer now formats via `Number(p.totalArea).toLocaleString()`.
- F2 resolved: null guard added to renderer (`"—"` for empty); "Total Area (m²)" `type="number"` input added to `Step2BasicInfo.tsx`.
- F3 resolved: user chose `totalArea` as canonical field. `PropertyMedia.size` removed; `totalArea: string` made required. 7 files updated (`queries.ts`, `PropertyTable.tsx`, `layout.tsx`, `HomePage.tsx`, `db/properties.ts`, `fixtures/properties.ts`, `mock-data.ts`).
- F4 deferred: sorting not yet built.
- Files changed vs Rev 1: `lib/data/types/property.ts` (`a6e627` → `7b55c6`), `lib/data/db/properties.ts` (`f5d26b` → `3135de`), `app/(shell)/portfolio/queries.ts` (`b8369b` → `2e6866`), `components/portfolio/PropertyTable.tsx` (`a7d7ae` → `550aa5`), `app/(shell)/add-property/actions.ts` (`49ed48` → `92c8ac`), all 16 seed `media.json` files.

</details>
