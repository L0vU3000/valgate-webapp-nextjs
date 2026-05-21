---
slug: portfolio--property-name
data_point: "Property Name (table column)"
route: /portfolio
revision: 4
date: 2026-05-04
verdict: "✅ All 4 findings resolved"
---

# Audit — Property Name on /portfolio
_Last revised: 2026-05-04 · Revision 4_

## TL;DR
- ✅ Names are stored and displayed correctly across all 16 seed properties
- ✅ All 4 findings resolved
- ✅ Top remaining concern: none — this data point is clean
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this label, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the value reach the screen correctly? | ✅ |
| 4 | Render | How does the name get to the user? | ⚠️ |
| 5 | Consistency | Do related uses of the name agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the column header match what's shown? | ✅ |
| 8 | Findings | What to fix | 4 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **PropertyListItem** — a browser-safe slice of the full `Property` type, used in the table to avoid sending sensitive fields (lat/lng, financials) to the client.
- **IDOR** — A bug where user A can see user B's data because ownership wasn't enforced.
- **a11y** — Accessibility: making sure screen readers and keyboard users can use the UI.
- **`isArchived`** — An optional flag on `PropertyCore` that marks a property as inactive; currently unused in seed data but handled in `computeStats`.

---

## 1. Snapshot

> **Plain English:** Each row of the property table shows the user-given name of a property, like "Land near river" or "BKK1 Prime Land". This name is typed in when the property is created and stored exactly as-is in a `core.json` file on the server.

| | |
|---|---|
| Where | /portfolio, "Property" column in PropertyTable |
| Column header | "Property" |
| Value type | Free-text string |
| Source field | `PropertyCore.name` — stored in `public/data/users/<userId>/properties/<id>/core.json` |
| Pass-through path | `core.json → listMergedRecords → getProperties() → PropertyListItem.name → pageRows → {p.name}` |
| No derivation | Name is stored, never computed |
| Edge cases | empty string → blank cell · whitespace-only → visually blank · long names → CSS-truncated |

## 2. Entity — ⚠️

> **Plain English:** The name field is defined correctly as a required string. The main issue is that the type used to pass data to the browser (`PropertyListItem`) doesn't carry the archived flag — so the table can't tell which properties should be hidden.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | required, used as row key and nav target |
| `name` | `string` | required, non-optional in TypeScript — but no runtime length constraint |
| `code` | `string` | paired display identifier below the name |
| `isArchived` | `boolean?` | in `PropertyCore` but **absent from `PropertyListItem`** — see F1 |

**Issues**
- `isArchived` is present on `PropertyCore` (optional, defaults to `undefined`) and is filtered by `computeStats`, but `PropertyListItem` does not include it. The table therefore has no way to exclude archived properties, producing a mismatch with KPI counts once archiving is used.
- `name` is `string` in TypeScript with no minimum length — a blank or whitespace-only name can be created programmatically (Q5.J).
- The entity catalog at [`ref/00 §1`](ref/00-entity-catalog.md) mentions `statusVariant` as a `Property` field, but the current `lib/data/types/property.ts` does not include it — that catalog entry is stale and `statusVariant` appears to have been cleaned up.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> **Plain English:** There is no calculation here — the name you see in the table is exactly what was saved. It passes through three layers unchanged: the JSON file on disk → the data loader → the browser component.

| | |
|---|---|
| Source file | `public/data/users/demo-user/properties/<id>/core.json` |
| Storage field | `name: string` |
| DB read | `lib/data/db/_fs.ts:listMergedRecords` (merges all `*.json` slices per record) |
| Server wrapper | `lib/data/properties.ts:getProperties()` |
| Narrow to list item | `app/(shell)/portfolio/queries.ts:31` — `name: p.name` |
| Render | `components/portfolio/PropertyTable.tsx:152` — `{p.name}` |

**Pass-through check** (all 16 seed properties):

| Observation | Value |
|---|---|
| Properties with non-empty `name` in seed | 16 / 16 |
| Properties with whitespace-only `name` | 0 / 16 |
| Names that would be truncated at ~200px column width | several (heuristic) |
| Match stored → displayed | ✅ |

**Robustness notes**
- ✅ Empty properties array → no rows rendered, empty state shown
- ⚠️ Blank `name: ""` → renders as visually empty cell (no guard at storage layer — see F2)
- ✅ HTML-special characters (e.g. `<`, `&`) → React escapes them automatically
- ✅ Unicode / Khmer script → passes through unchanged (no ASCII filter)

## 4. Render — ⚠️

> **Plain English:** The name travels from the server to a Client Component as part of the filtered/paginated rows, then renders as plain text. The main gap is accessibility: the table row acts as a navigation link but doesn't tell screen readers which property it goes to.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Outer component | `<PortfolioPage>` (Client Component — `"use client"`) |
| Inner component | `<PropertyTable>` (no `"use client"` directive; rendered inside a Client Component) |
| Prop chain | `data.properties → initialProperties → filtered → pageRows → p.name` |
| Server vs Client | `PropertyListItem[]` assembled server-side in `queries.ts`; client-side filter + pagination in `PortfolioPage` |
| Loading state | mount animation (opacity/translate) hides content until `mounted=true`; no skeleton for the name cells |
| Formatting | none — raw string, no trim, no case normalization |
| Truncation | `<p className="… truncate">` — CSS `text-overflow: ellipsis`; no `title` tooltip — see F3 |

**PII / IDOR**
- `PropertyListItem` correctly excludes `lat`, `lng`, `outstandingMortgage`, `monthlyPayment`, and all other finance fields — name is safe to expose.
- Auth flows through `getCurrentUserId()` shim (hardcoded `"demo-user"`); ownership isolation must be verified when real auth lands.

**A11y**
- Checkbox `aria-label={`Select ${p.name}`}` ✅ — correctly names the checkbox per property.
- `<tr role="link" tabIndex={0}>` — F4: no `aria-label` on the row itself; screen readers announce it as "link" with no destination context.

## 5. Consistency — ✅

> **Plain English:** Every place on this page that uses the property name reads the same field — there are no duplicate sources that could get out of sync. Across the whole app, the schema never changes; only the rendering differs per surface.

| Identity | Verification | Holds? |
|---|---|---|
| Checkbox aria-label uses `p.name` | `aria-label={`Select ${p.name}`}` at `PropertyTable.tsx:134` | ✅ |
| Client-side search filters on `p.name` | `p.name.toLowerCase().includes(q)` at `PortfolioPage.tsx:59` | ✅ |
| `navigate(\`/property/${p.id}\`)` uses `p.id` not `p.name` | row click navigates by id, not by name slug — no stale-name routing issue | ✅ |
| Row aria-label uses `p.name` | `aria-label={\`View ${p.name}\`}` at `PropertyTable.tsx:118` | ✅ |

**Cross-surface note:** `PropertyCore.name` is the single schema field across every surface that shows a property name. The schema never changes per surface — only the rendering does:

| Surface | Rendering |
|---|---|
| `/portfolio` table | Primary text cell, client-side searchable, CSS-truncated with tooltip |
| `/property/[id]` detail | Page heading / breadcrumb |
| Add-property form | The input that writes the value |
| Checkbox | `Select ${p.name}` aria-label |
| Row navigation | `View ${p.name}` aria-label |

No surface re-derives or transforms the name. What is stored is what is shown everywhere.

## 6. Missing safeties (3 gaps)

> **Plain English:** Three safety nets that should exist around this field don't yet.

| Gap | Status | Link |
|---|---|---|
| DB-layer name validation (non-empty, trimmed) | ❌ | Q5.J |
| `isArchived` on `PropertyListItem` (table filter parity) | ❌ | Q4.D |
| Overflow `title` attribute on truncated name cell | ❌ | — |

## 7. Meaning — ✅

> **Plain English:** The column is labelled "Property" and shows the property's name — that's exactly what users expect. No mismatch.

```
Column header rendered:   "Property"
Value shown:              user-given property name (e.g. "Land near river")
User's likely inference:  the name they entered when creating the property
Match?                    ✅
```

**Counterexample considered:**
> "If the column showed an auto-generated code like 'PP00016 PH', the header 'Property' would still fit — but users would wonder where their chosen name went. The current implementation shows the user name as the primary line and the code as a secondary line below it, which is the right visual hierarchy."

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — Archived properties appear in the table but not in KPI counts~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[logic]` `[consistency]`**

**Where:** `app/(shell)/portfolio/queries.ts:30–41` vs `lib/data/derivations/portfolio.ts:30`

**Problem:** `computeStats` filters `properties.filter((p) => !p.isArchived)` before counting — so KPI cards exclude archived properties. But the `listItems` mapping at `queries.ts:30` calls `.map()` on the full unfiltered `properties` array. Additionally, `PropertyListItem` (the type used by the table) does not include `isArchived`, so the client component has no way to filter it out either.

**Why it matters:** Once a user archives a property, it will vanish from "Properties: N" on the KPI card but continue to show up as a named row in the table — a silent data inconsistency that erodes trust. This CLAUDE.md rule is violated: "Never pass full DB objects as props — `select` only what the UI renders" — the complement is that the select must also carry the fields needed to do correct filtering.

**Fix:** In `app/(shell)/portfolio/queries.ts`, filter before mapping:
```ts
const active = properties.filter((p) => !p.isArchived);
const listItems: PropertyListItem[] = active.map((p) => ({ ... }));
```
No need to add `isArchived` to `PropertyListItem` — the filter happens server-side before the prop is assembled.

**Resolved:** `queries.ts` — added `active` filter before `listItems` mapping (pending commit)

---

### ~~🟡 F2 — No DB-layer validation on `name`~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]` `[negative-space]`**

**Where:** `lib/data/db/properties.ts:36–50` (`create` function)

**Problem:** `PropertyCore.name` is typed as `string` with no minimum length. The `create` function accepts any `NewProperty` and persists it without runtime validation. An empty string or whitespace-only name (e.g. `"   "`) would be stored and rendered as a visually blank cell in the table.

**Why it matters:** Form-level Zod validation (in the add-property wizard) guards the happy path, but any future server action, test fixture, or migration that bypasses the form can create invalid records. The CLAUDE.md rule is: "Validate every input with Zod before touching the DB."

**Fix:** Add a Zod parse in `lib/data/db/properties.ts:create()` before writing:
```ts
const nameSchema = z.string().min(1, "Name is required").trim();
nameSchema.parse(data.name);
```
See also Q5.J for the broader FS schema validation gap.

**Resolved:** `lib/data/db/properties.ts` — added `nameSchema` (`z.string().min(1).trim()`) parsed at the top of `create()` (pending commit)

---

### ~~🔵 F3 — Truncated names have no overflow tooltip~~ — ✅ resolved in Revision 3
**P3 nit · confidence: high · `[render]`**

**Where:** `components/portfolio/PropertyTable.tsx:152`

**Problem:** The name cell uses `className="… truncate"` which clips long names with an ellipsis. There is no `title` attribute on the `<p>` tag, so hovering over a clipped name gives no way to read the full text.

**Why it matters:** Names like "Angkor Heritage Plot — Phase 2 Development Site" would be silently cut off with no affordance to see the full value.

**Fix:** Add `title={p.name}` to the `<p>` element at `PropertyTable.tsx:152`:
```tsx
<p className="text-[14px] text-val-heading font-medium leading-tight truncate" title={p.name}>{p.name}</p>
```

**Resolved:** `components/portfolio/PropertyTable.tsx` — added `title={p.name}` (pending commit)

---

### ~~🔵 F4 — Table row `role="link"` missing `aria-label`~~ — ✅ resolved in Revision 3
**P3 nit · confidence: high · `[render]`**

**Where:** `components/portfolio/PropertyTable.tsx:118`

**Problem:** The `<tr>` has `role="link"` and `tabIndex={0}` but no `aria-label`. A screen reader announces it as "link" with no context about which property it navigates to or where it leads.

**Why it matters:** Keyboard and screen-reader users navigating a table of 16 rows would hear "link, link, link…" with no way to distinguish rows without manually reading into each cell.

**Fix:** Add `aria-label={`View ${p.name}`}` to the `<tr>` at `PropertyTable.tsx:118`:
```tsx
<tr
  key={p.id}
  role="link"
  aria-label={`View ${p.name}`}
  tabIndex={0}
  ...
>
```

**Resolved:** `components/portfolio/PropertyTable.tsx` — added `aria-label` to `<tr>` (pending commit)

## 9. Fix Log

> A chronological record of fixes applied after the initial audit.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | `queries.ts`: filter archived before mapping `listItems` | pending |
| 2 | 2026-05-04 | F2 | `db/properties.ts`: `nameSchema` Zod validation in `create()` | pending |
| 3 | 2026-05-04 | F3 | `PropertyTable.tsx`: added `title={p.name}` to name `<p>` | pending |
| 3 | 2026-05-04 | F4 | `PropertyTable.tsx`: added `aria-label` to `<tr>` | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable> td
  .w-full > tbody > .border-t > .py-3
  selected text: property name cell
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/db/properties.ts
    sha: a81fb8a7b7ba89980e08d5362c42b16e6260554e
  - path: lib/data/db/_fs.ts
    sha: 39dba5d99ffe00bc13eaadc6d83ed70522c39fd8
  - path: lib/data/properties.ts
    sha: 4f231bfe5ffcd4192bd038e4d044ea0fd2fea807
  - path: lib/data/derivations/portfolio.ts
    sha: b755944adc92602bd5d2d519ef90331f8595b87e
  - path: app/(shell)/portfolio/queries.ts
    sha: 563d151453a93f453871b3197fe3b59a4280d604
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 689903eb8f7a75870ca95bdf12fd19d6e6e53770
  - path: components/portfolio/PropertyTable.tsx
    sha: d6d423a8e7e289f122bda629d827014d6c451af2
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Count properties and print names
for d in public/data/users/demo-user/properties/*/; do
  python3 -c "import json; d=json.load(open('${d}core.json')); print(repr(d.get('name','<missing>')), d.get('id',''))"
done

# Check for blank or whitespace-only names
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`,'utf8'));
  if(!c.name||!c.name.trim()) console.log('BLANK NAME:', d);
}
console.log('checked', dirs.length, 'properties');
"

# Check for archived properties (isArchived flag in core.json)
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const archived=dirs.filter(d=>{
  const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`,'utf8'));
  return c.isArchived===true;
});
console.log('archived:', archived.length, archived);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_name
business_meaning: >
  The user-given display name of a property, entered at creation time.
  Shown as the primary identifier in each PropertyTable row, paired with
  the property code as a secondary sub-label.
formula: p.name  # identity — stored value, no derivation
canonical_home: server  # read from core.json, narrowed to PropertyListItem before client
unit: string (free text)
edge_cases:
  - empty string → blank cell (no DB guard yet — F2)
  - whitespace-only → visually blank (same gap)
  - long names → CSS truncation, no tooltip (F3)
  - archived properties → should not appear in table (F1)
related_fields:
  - p.code (secondary sub-label below p.name)
  - p.id (used for row navigation target)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 4 — 2026-05-04
- §5 Consistency: added cross-surface table documenting that `PropertyCore.name` is the single schema field across all surfaces; rendering varies per surface, schema does not.

### Revision 3 — 2026-05-04
- F3 resolved: `title={p.name}` added to name `<p>` in `PropertyTable.tsx`.
- F4 resolved: `aria-label={\`View ${p.name}\`}` added to `<tr>` in `PropertyTable.tsx`.
- All 4 findings resolved. Verdict: ✅ clean.

### Revision 2 — 2026-05-04
- F1 resolved: `queries.ts` filters archived properties before building `listItems`.
- F2 resolved: `db/properties.ts` validates `name` with `z.string().min(1).trim()` in `create()`.
- 2 findings remaining (F3, F4 — both P3 nits).

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 1 P2, 2 P3).
- F1: archived properties would appear in table but not KPI counts — server-side filter gap.
- F2: no DB-layer validation on `name` — blank names can be stored (Q5.J).
- F3: CSS-truncated names have no `title` tooltip.
- F4: `<tr role="link">` lacks `aria-label` for screen readers.
- All 16 seed property names verified non-empty.
- Entity catalog note: `statusVariant` referenced in `ref/00 §1` is stale — field not present in current `PropertyCore` type.

</details>
