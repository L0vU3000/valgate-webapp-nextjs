---
slug: portfolio--title-deed-status
data_point: "Title/deed status badge (e.g. \"Hard title\")"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ All 4 findings resolved"
---

# Audit — Title/Deed Status badge on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ Displayed values are correct — all 16 seed properties show the right badge matching their stored title
- ✅ All 4 findings resolved in Revision 2
- ✅ `titleVariant` dropped from schema; `titleToVariant()` helper added; Zod validation extended
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this badge and where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the value reach the screen unchanged? | ✅ |
| 4 | Render | How does the badge reach the user? | ⚠️ |
| 5 | Consistency | Do related values agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the badge delivers? | ✅ |
| 8 | Findings | What to fix | 4 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a field.
- **Type widening** — when TypeScript accepts a broader type (e.g. `string`) where a narrower one (e.g. `PropertyTitle`) would be safer; the compiler can't catch invalid values.
- **IDOR** — A bug where user A can see user B's data because auth wasn't enforced.
- **FS boundary** — the point where raw JSON is read from disk and cast to a typed object; the only place where runtime shape validation can catch bad seed data.

---

## 1. Snapshot
> **Plain English:** Each row in the property table shows a coloured badge — sky-blue for "Hard title", amber for "Soft title", or a plain dash — that tells you whether the property has a fully registered deed, an informal one, or an unknown status. This value is read directly from the stored property record; no formula transforms it.

| | |
|---|---|
| Where | /portfolio, "Title" column of the property table |
| Label | "Title" (column header, `PropertyTable.tsx:90`) |
| Possible values | `"Hard title"` · `"Soft title"` · `"—"` |
| Source field | `Property.title: PropertyTitle` (stored in `media.json`) |
| No derivation | Raw passthrough — `title: p.title` in `queries.ts:43` |
| Reads from | `public/data/users/demo-user/properties/*/media.json` (16 records) |
| Canonical home | server (per `data-audit/ref/03`) |
| Edge cases | `"—"` is the unknown/no-title sentinel; rendered as a plain dash without a badge |

---

## 2. Entity — ⚠️
> **Plain English:** The property stores two copies of the same information — a display string and a shorthand code — with nothing enforcing that they stay in sync. The display string is what the table uses; the shorthand exists as a holdover from the home-page drawer but adds storage surface without benefit on this path.

| Field | Type | Location | Notes |
|---|---|---|---|
| `title` | `PropertyTitle` | `PropertyMedia` (line 69) | display label — "Hard title" / "Soft title" / "—" |
| `titleVariant` | `TitleVariant` | `PropertyMedia` (line 70) | CSS enum — "hard" / "soft" / "none" |
| `title` in list | `PropertyTitle` | `PropertyListItem` (line 89) | ✅ narrowed — only this field sent to browser |
| `titleVariant` in list | — | not in `PropertyListItem` | ✅ not sent to browser from portfolio |

**Issues**
- `title` and `titleVariant` encode the same concept at two granularities with no enforcement of alignment — flagged as Q5.A. The home page (`HomePage.tsx:37–41`) uses `titleVariant` for colour lookups; the portfolio table uses `title` via `titleBadgeClasses`. Two parallel representations, no invariant check.
- `PropertyListItem` correctly omits `titleVariant` (line 89–90), so the variant never reaches the browser on this page path. ✅

**Catalog reference:** [`ref/00-entity-catalog.md §1`](ref/00-entity-catalog.md)

---

## 3. Formula — ✅
> **Plain English:** There is no calculation here — the value stored on disk is the value shown on screen. The query copies `title` from the full property record into the slimmer list object, and the table renders it directly.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/queries.ts` |
| Passthrough | `title: p.title` (line 43) |
| Output field | `PropertyListItem.title` |

**Passthrough (verbatim):**
```ts
// queries.ts:33–44
const listItems: PropertyListItem[] = active.map((p) => ({
  id: p.id,
  name: p.name,
  ...
  title: p.title,
}));
```

**Golden-value check**

| Property | Seed (`media.json`) | Displayed |
|---|---|---|
| PROP-0001 | "Hard title" | "Hard title" ✅ |
| PROP-0009 | "—" | "—" (dash sentinel) ✅ |
| Distribution | 8 hard · 5 soft · 3 none | 16 total ✅ |

**Robustness notes**
- ✅ Empty/undefined title — `PropertyMedia.title` is required; cannot be absent in a well-formed record
- ⚠️ Corrupt value (e.g. `"Leasehold"`) — passes through unvalidated, falls to `default: return ""` in `titleBadgeClasses`, renders an unstyled badge silently (see F3)
- ✅ No date math or currency — not applicable

---

## 4. Render — ⚠️
> **Plain English:** The badge reaches the screen cleanly: a guard checks for the "no title" case and renders a plain dash, and all other values get a coloured badge. The one weakness is that the helper function that picks badge colours accepts any string instead of only the three valid title values, so TypeScript won't warn if a different string is accidentally passed.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `data.properties[i].title` → `p.title` |
| Server vs Client | `queries.ts` is server-only; `PropertyTable` is a Client Component receiving `PropertyListItem[]` |
| Empty state | "No properties match your filters." + Clear button (`PropertyTable.tsx:101–107`) |
| Formatting | Badge styled via `titleBadgeClasses(p.title)` (`lib/property-helpers.ts:69–75`) |
| A11y | No `aria-label` on the badge; screen readers read the text content "Hard title" directly ✅ |

**Badge render (verbatim, `PropertyTable.tsx:185–194`):**
```tsx
<td className="py-3 px-3 text-center">
  {p.title === "—" ? (
    <span className="text-slate-400">&mdash;</span>
  ) : (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${titleBadgeClasses(p.title)}`}>
      {p.title}
    </span>
  )}
</td>
```

**PII / IDOR**
- `title` is non-sensitive legal metadata — no PII concern.
- Auth flows through `getCurrentUserId()` shim (`auth-shim.ts`) hardcoded to `"demo-user"`. IDOR risk is latent; verify ownership check when real auth lands.

---

## 5. Consistency — ✅
> **Plain English:** The title value is the same wherever it appears in the app — the portfolio table badge and the home-page drawer label both show the same string for the same property. There are no cross-card identities for this field to break.

| Identity | Verification | Holds? |
|---|---|---|
| `title` matches `titleVariant` in all seed records | checked all 16: hard/soft/none correctly paired | ✅ |
| Portfolio table badge ↔ home-page drawer colour | both read from the same `Property.title` / `.titleVariant` root; same source, different render paths | ✅ |
| Same metric on /analytics | not rendered there | — |

---

## 6. Missing safeties (3 gaps)
> **Plain English:** Three safety nets that should protect this field don't exist yet: runtime validation to catch bad data before it reaches the UI, a soft-delete mechanism that would exclude archived properties, and real user isolation beyond the current placeholder.

| Gap | Status | Link |
|---|---|---|
| Zod validation for `title`/`titleVariant` at FS boundary | ❌ | Q5.J |
| Soft-delete / archived state (exclude from list) | ⚠️ partial — `isArchived` flag exists but `validateStatus` doesn't validate title | Q4.D |
| Multi-tenant isolation | ⚠️ shim — `getCurrentUserId()` hardcoded | Q4.M |

---

## 7. Meaning — ✅
> **Plain English:** The column header "Title" accurately describes legal deed status, which is exactly what the badges show. A user who owns properties in Cambodia will correctly read "Hard title" as a fully registered deed and "Soft title" as an informal one.

```
Label rendered:           "Title"
Field stored:             Property.title: PropertyTitle
User's likely inference:  Legal deed type (Hard = registered freehold, Soft = informal/possessory)
Match?                    ✅ — standard Cambodian property terminology
```

**Counterexample considered:**
> "If the label were 'Status' instead of 'Title', users might conflate it with the rental status column already in the table — the distinct header is load-bearing here."

---

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🟡 F1 — `titleBadgeClasses` accepts `string` instead of `PropertyTitle`~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]` `[render]`**

**Where:** `lib/property-helpers.ts:69`

**Problem:** The function signature is `titleBadgeClasses(title: string)` but the only valid inputs are `"Hard title"`, `"Soft title"`, and `"—"`. The widened `string` parameter means TypeScript will not warn if a caller passes an arbitrary string — the function silently returns `""` and renders an unstyled badge.

**Why it matters:** `statusBadgeClasses` on the same file (line 59) accepts the narrower `PropertyStatus` enum — title should be consistent. A future refactor that renames a `PropertyTitle` literal would compile without error but break the badge silently.

**Fix:** Narrow the parameter to `PropertyTitle`:
```ts
// lib/property-helpers.ts:69
export function titleBadgeClasses(title: PropertyTitle): string {
```
Also add `"—"` as an explicit branch returning `""` instead of relying on `default`, to make the exhaustive handling visible.

**Resolved:** pending — narrowed to `PropertyTitle`; `"—"` made an explicit case; `PropertyTitle` and `TitleVariant` added to import.

---

### ~~🟡 F2 — `titleVariant` is stored and typed but unused on this render path~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:70`, `lib/data/db/properties.ts:143`

**Problem:** `PropertyMedia.titleVariant` is stored in `media.json` for every property and included in the full `Property` type, but `PropertyListItem` (the type sent to the browser on this page) excludes it — and rightly so. The portfolio table derives badge colour from the `title` string via `titleBadgeClasses`, not from `titleVariant`. The home page (`HomePage.tsx:37–41`) reads `titleVariant` directly for a different colour map. This means two parallel lookup paths exist for the same semantic concept with no single canonical transform.

**Why it matters:** Flagged as Q5.A. If `titleVariant` were dropped server-side and derived client-side from `title` (e.g. a small `titleToVariant` helper), there would be one source of truth instead of two. As-is, a future edit to `PropertyTitle` values must be reflected in both `titleBadgeClasses` and the `titleClasses` map in `HomePage.tsx`.

**Fix:** Resolve Q5.A: drop `titleVariant` from `PropertyMedia` / storage / `Property`. Add a client-side `titleToVariant(title: PropertyTitle): TitleVariant` helper in `lib/property-helpers.ts`. Update `HomePage.tsx` to call this helper instead of accessing `drawerProperty.titleVariant` directly.

**Resolved:** pending — `titleVariant` removed from `PropertyMedia`, `splitProperty`, `actions.ts`, `mock-data.ts`, `scripts/fixtures/properties.ts`, and all 16 seed `media.json` files. `titleToVariant()` added to `lib/property-helpers.ts`. `HomePage.tsx` updated to use `titleToVariant(drawerProperty.title)`.

---

### ~~🟡 F3 — No runtime validation of `title` / `titleVariant` at the FS boundary~~ — ✅ resolved in Revision 2
**P2 negative-space · confidence: high · `[negative-space]`**

**Where:** `lib/data/db/properties.ts:36–38` (`list()` / `validateStatus()`)

**Problem:** `validateStatus` runs a Zod parse only on `p.status`. The `title` and `titleVariant` fields are cast from raw JSON without any runtime check. A `media.json` with `"title": "Leasehold"` (a string not in `PropertyTitle`) would pass through, render with no badge styling, and produce no error.

**Why it matters:** Relates to Q5.J. `status` is validated; `title` is not — inconsistent treatment of the same class of enum field. Corrupt seed data or a typo in a future migration would produce silent visual regression.

**Fix:** Extend `validateStatus` (or rename it to `validateProperty`) to also validate `title` and `titleVariant`:
```ts
// lib/data/db/properties.ts
const propertyTitleSchema = z.enum(["Hard title", "Soft title", "—"]);
const titleVariantSchema = z.enum(["hard", "soft", "none"]);

function validateProperty(p: Property): Property {
  propertyStatusSchema.parse(p.status);
  propertyTitleSchema.parse(p.title);
  titleVariantSchema.parse(p.titleVariant);
  return p;
}
```

**Resolved:** pending — `validateStatus` renamed to `validateProperty`; `propertyTitleSchema` added and parsed in `validateProperty`; both `list()` and `get()` updated.

---

### ~~🔵 F4 — `"—"` guard is correct but less readable than the literal `"—"`~~ — ✅ resolved in Revision 2
**P3 nit · confidence: high · `[render]`**

**Where:** `components/portfolio/PropertyTable.tsx:187`

**Problem:** The guard `p.title === "—"` works correctly (`"—"` is the em-dash and equals the `"—"` literal in `PropertyTitle`), but the Unicode escape is harder to read and scan than the literal character. Other columns (e.g. Size at line 177) use `"—"` directly.

**Why it matters:** Readability only — no functional impact.

**Fix:** Replace with the literal:
```ts
// PropertyTable.tsx:187
{p.title === "—" ? (
```

**Resolved:** pending — `"—"` replaced with literal `"—"` in `PropertyTable.tsx:187`.

---

## 9. Fix Log

> A chronological record of fixes applied after the initial audit.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | `titleBadgeClasses` narrowed to `PropertyTitle`; explicit `"—"` case added | pending |
| 2 | 2026-05-04 | F2 | `titleVariant` dropped from `PropertyMedia`, all seed files, `mock-data.ts`, `actions.ts`, `fixtures`; `titleToVariant()` added to `property-helpers.ts`; `HomePage.tsx` updated | pending |
| 2 | 2026-05-04 | F3 | `validateStatus` → `validateProperty`; `propertyTitleSchema` added; `list()` + `get()` updated | pending |
| 2 | 2026-05-04 | F4 | `"—"` → `"—"` literal in `PropertyTable.tsx:187` | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable>
  tbody > .border-t > .py-3 > .inline-flex
  selected text: "Hard title"
sources:
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: lib/property-helpers.ts
    sha: 95e1491b34329be1e4c98b92d421b7eb537a62c0
  - path: lib/data/db/properties.ts
    sha: 091d5f6ef310175bce8e679d5006607b4965508d
  - path: app/(shell)/portfolio/queries.ts
    sha: 6adb22b2c5fafa2e65eb8f4885e02e38b44de5c2
  - path: components/portfolio/PropertyTable.tsx
    sha: f082c24131884000b235c0da5a9e9286a29e55a3
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Distribution of title values across all seed properties
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const entries=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const counts={hard:0,soft:0,none:0,missing:0};
for(const d of entries){
  const m=JSON.parse(fs.readFileSync(dir+'/'+d+'/media.json','utf8'));
  const v=m.titleVariant||'missing';
  counts[v]=(counts[v]||0)+1;
}
console.log(counts);
"
# Expected: { hard: 8, soft: 5, none: 3, missing: 0 }

# Cross-check: title string matches titleVariant for all records
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const map={'Hard title':'hard','Soft title':'soft','—':'none'};
const entries=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
let mismatches=0;
for(const d of entries){
  const m=JSON.parse(fs.readFileSync(dir+'/'+d+'/media.json','utf8'));
  if(map[m.title]!==m.titleVariant){console.log('MISMATCH',d,m.title,m.titleVariant);mismatches++;}
}
console.log(mismatches===0?'All consistent':'Mismatches:'+mismatches);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: title_deed_status
business_meaning: >
  Legal deed type for a property in Cambodia.
  "Hard title" (Strey Chan) = fully registered freehold deed at the Land Ministry.
  "Soft title" = informal/possessory title, not yet formally registered.
  "—" = unknown or unregistered.
field: Property.title
type: PropertyTitle  # "Hard title" | "Soft title" | "—"
companion_field: Property.titleVariant  # "hard" | "soft" | "none" — redundant, see Q5.A
canonical_home: server  # raw field, no derivation; per data-audit/ref/03
sent_to_browser: title only (via PropertyListItem); titleVariant excluded from list items
render: badge — sky-blue for Hard, amber for Soft, plain dash for unknown
edge_cases:
  - "—" sentinel rendered without badge styling (plain dash)
  - unknown string value → silent empty badge (no Zod guard — F3)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (3 P2, 1 P3).
- Golden-value check: all 16 seed properties have correct title values (8 hard · 5 soft · 3 none).
- Q5.A cited in F2 (redundant `titleVariant` field).
- Q5.J cited in F3 (no validation at FS boundary).

### Revision 2 — 2026-05-04
- All 4 findings resolved same session. Verdict: ✅ All 4 findings resolved.
- F1: `titleBadgeClasses` narrowed to `PropertyTitle`; exhaustive `"—"` case added.
- F2: `titleVariant` fully removed — `PropertyMedia`, 16 seed files, `mock-data.ts`, `actions.ts`, `scripts/fixtures/properties.ts`; `titleToVariant()` helper added; `HomePage.tsx` migrated to use it.
- F3: `validateProperty` replaces `validateStatus`; `propertyTitleSchema` added.
- F4: `"—"` escape replaced with literal `"—"` in `PropertyTable.tsx`.
- Source file SHAs updated (all 5 files changed).

</details>
