---
slug: portfolio--province
data_point: "Province (table column)"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "⚠️ F1+F2+F3 resolved · F4 deferred"
---

# Audit — Province (table column) on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ Seed data correct — all 16 province values display accurately and match the canonical list
- ✅ F1 + F2 + F3 resolved in Revision 2 · F4 deferred (moot after F1)
- 🔧 Remaining: F4 (case-sensitive filter) — low priority, deferred
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this value, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the value reach the screen without distortion? | ✅ |
| 4 | Render | How does the value get to the user? | ✅ |
| 5 | Consistency | Do related province surfaces agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap remaining |
| 7 | Meaning | Does the label promise what the data delivers? | ✅ |
| 8 | Findings | What to fix | 3 resolved · 1 deferred |
| 9 | Fix Log | What has been fixed since the initial audit? | Rev 2 |

## Glossary
- **Canonical list** — the 25 Cambodian province names defined in `lib/constants/cambodia-provinces.ts`, shared by the portfolio filter dropdown and the add-property wizard `<select>`.
- **SSOT** — Single Source of Truth: one place that defines a metric or value.
- **Dead field** — a field present in the type and written to storage but never read or displayed.
- **Zod** — the validation library the project uses to enforce data shape at boundaries.

---

## 1. Snapshot

> Each row in the property table shows the Cambodian province where the property is located, read directly from `location.json` with no calculation — it's a stored label, not a derived value.

| | |
|---|---|
| Where | /portfolio, PropertyTable "Province" column |
| Label | "Province" (column header) |
| Formula | Pass-through: `p.province` |
| Reads from | `public/data/users/demo-user/properties/PROP-*/location.json` |
| Canonical home | server _(per `data-audit/03 §B`)_ |
| Edge cases | empty string → blank cell (guarded by Zod min(1)) · wizard now enforces canonical values via `<select>` |

## 2. Entity — ✅

> The data is clean: `province` is the single canonical field, the dead `stateProv` overlap has been removed, and the wizard now enforces a valid value before anything reaches storage.

| Field | Type | Notes |
|---|---|---|
| `province` | `string` (required) | Canonical — the value rendered in the table and used for filtering |
| `city` | `string` (optional) | Sibling address field |

_`stateProv?: string` removed in Revision 2 (F3). `FormData.state` renamed to `FormData.province` and backed by Zod `min(1)` (F1, F2)._

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> There is no calculation — the province is stored as a string and passed through unchanged. No math to get wrong.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/queries.ts` |
| Function | `getPortfolioPageData()` |
| Output field | `listItems[*].province` |

**Formula** (verbatim):
```ts
province: p.province,  // queries.ts:37 — direct passthrough from PropertyListItem pick
```

**Golden-value check**

| Source | Value |
|---|---|
| Seed: PROP-0001 | "Phnom Penh" |
| Seed: PROP-0005 | "Siem Reap" |
| Displayed in table | Matches seed ✅ |
| Distribution (16 props) | 5 Phnom Penh · 5 Siem Reap · 4 Prey Veng · 1 Kampot · 1 Kampong Chhnang |
| All in canonical list? | ✅ |
| Any blank? | ✅ None in seed |

**Robustness notes**
- ✅ Empty array — `listItems` would be empty; column renders nothing (no crash)
- ✅ Blank province — guarded by `z.string().min(1)` in `step2Schema`; wizard rejects submission without a province selected
- ✅ No numeric/date math — no rounding concerns

## 4. Render — ✅

> The value goes from the server to the browser cleanly. The wizard now uses a `<select>` backed by the same canonical list as the filter, so stored values will always match.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `data.properties[*].province` → `pageRows[*].province` → `{p.province}` |
| Server vs Client | `PropertyListItem` built server-side; `PortfolioPage` is Client Component (uses `useRouter`/`useState`) |
| Loading / empty state | No skeleton for province cell; if blank, cell is silently empty |
| Formatting | None — raw string |
| A11y | Plain `<td>` with no `aria-label`; acceptable for tabular data |

**Filter logic** (`PortfolioPage.tsx:64`):
```ts
const matchesProvince = provinceFilter === "All" || p.province === provinceFilter;
```

This is a case-sensitive exact match (F4, deferred). Safe in practice: the wizard `<select>` and the filter dropdown both import from `lib/constants/cambodia-provinces.ts`, so stored values are always exactly canonical.

**PII / IDOR**
- `province` is not sensitive — it is a geographic label. No PII concern.
- Auth path goes through `getCurrentUserId()` shim (hardcoded `"demo-user"`); ownership enforced at the `list(userId)` boundary.

## 5. Consistency — ✅

> Province is consistent across all three surfaces. The wizard, filter dropdown, and canonical list all share the same source file, eliminating the mismatch risk.

| Identity | Verification | Holds? |
|---|---|---|
| Table cell shows same value as stored in location.json | Verified for 16 seed records | ✅ |
| Search matches province (case-insensitive) | `p.province.toLowerCase().includes(q)` (PortfolioPage.tsx:61) | ✅ |
| Filter matches province (case-sensitive exact) | `p.province === provinceFilter` (PortfolioPage.tsx:64) | ✅ Safe — wizard `<select>` enforces canonical values |
| Filter dropdown and wizard share the same province list | Both import `CAMBODIA_PROVINCES` from `lib/constants/cambodia-provinces.ts` | ✅ |
| `province` values in seed all title-cased consistently | ✅ confirmed across 16 records | ✅ |

## 6. Missing safeties (1 gap remaining)

> Two of three gaps are now closed. One remains: runtime validation at the file-system read boundary.

| Gap | Status | Link |
|---|---|---|
| Province input is a `<select>` from the canonical list | ✅ Resolved (Rev 2) | F1 |
| Zod validation requiring non-empty province | ✅ Resolved (Rev 2) | F2 |
| FS schema validation at `listMergedRecords` boundary | ❌ No runtime check | Q5.J |

## 7. Meaning — ✅

> The column label "Province" accurately describes the data: each cell shows the Cambodian administrative province where the property is located. No ambiguity.

```
Label rendered:           "Province" (column header)
Formula chosen:           p.province — stored string, no transformation
User's likely inference:  the province of Cambodia where the property sits
Match?                    ✅
```

**Counterexample considered:**
> If `province` stored a two-letter code ("PP") instead of the full name ("Phnom Penh"), the label "Province" would still technically match but users would see cryptic abbreviations. Current data uses full names — no mismatch.

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[render]` · `[consistency]` · `[negative-space]`

---

### ~~🔴 F1 — Wizard stores free-text "State" as `province`, breaking the filter for user-added properties~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]` `[schema]`**

**Where:** `app/(shell)/add-property/_components/Step2BasicInfo.tsx:104–105` · `app/(shell)/add-property/actions.ts:53` · `app/(shell)/add-property/_components/types.ts:21`

**Problem:** The add-property wizard's Step 2 renders a free-text `<input placeholder="State">` bound to `form.state`. On submit, `actions.ts:53` maps `province: form.state`. The portfolio page filter compares this stored value against a hardcoded 25-item canonical list with exact string matching (`p.province === provinceFilter`). Any user who types a partial name ("Phnom"), an abbreviation ("PP"), an alternate spelling, or leaves it blank will produce a property with a province value that can never be selected in the filter dropdown.

**Why it matters:** Every property added via the UI (rather than seed data) is potentially unfiltterable by province — a core table feature. The bug is silent: no error, no warning, the province cell just shows whatever the user typed and the filter never matches it.

**Fix:** Replace the `<input type="text">` in `Step2BasicInfo.tsx:104–105` with a `<select>` populated from the same `provinces` array defined in `PortfolioPage.tsx:30-36`. Move that array to a shared location (e.g. `lib/constants/cambodia-provinces.ts`) so both the filter dropdown and the wizard `<select>` import from the same SSOT. Rename `FormData.state` → `FormData.province` in `types.ts` and update all references. Add Q5.N to open questions.

**Resolved:** pending commit — `Step2BasicInfo.tsx` now renders a `<select>` from `CAMBODIA_PROVINCES`; `FormData.state` renamed to `province` across all wizard files; provinces list extracted to `lib/constants/cambodia-provinces.ts` shared by wizard and portfolio filter.

---

### ~~🟡 F2 — `province` is required in the type but can be silently stored as empty string~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]` `[negative-space]`**

**Where:** `lib/data/types/property.ts:38` · `app/(shell)/add-property/_components/types.ts:58` · `app/(shell)/add-property/_components/schemas.ts`

**Problem:** `PropertyLocation.province: string` is typed as required (not `province?: string`), but `FormData.state` defaults to `""` and there is no Zod validation enforcing non-empty before the value reaches storage. A submitted property with no province entered stores `province: ""` — rendering a blank cell in the table and matching no filter entry.

**Why it matters:** Silent blank values corrupt the table display and break filtering without any visible error. The type contract (`province: string`) implies a non-empty value but does not enforce it.

**Fix:** Add `province: z.string().min(1, "Province is required")` to the relevant step schema in `app/(shell)/add-property/_components/schemas.ts`. Once F1 is resolved (using a `<select>`), this validation becomes easier to enforce — a required dropdown with no default selection is rejected automatically.

**Resolved:** pending commit — `schemas.ts` step2Schema now has `province: z.string().min(1, "Please select a province")`.

---

### ~~🟡 F3 — `stateProv?: string` is a dead field that overlaps semantically with `province`~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:35` · `lib/data/db/properties.ts:99`

**Problem:** `PropertyLocation` declares two fields representing state/province/region: `province: string` (required, rendered in table, used for filtering) and `stateProv?: string` (optional, written to `location.json` via `splitProperty()` but never read or displayed in any UI surface). No documentation explains the difference. The `splitProperty` function writes `stateProv: p.stateProv` when the field is present, so stale data can accumulate in storage silently.

**Why it matters:** Two fields for the same concept with no reconciliation rule create confusion about which is canonical. When migrating to a real DB schema, this ambiguity must be resolved — retaining both risks divergence.

**Fix:** Remove `stateProv?: string` from `PropertyLocation` and from `splitProperty()` in `lib/data/db/properties.ts:99`. If a US-style state field is ever needed alongside a Cambodian province, add it as a distinct field with a clear semantic distinction. Existing `location.json` files that contain `stateProv` will simply ignore the field after the type is updated (the merge reads only declared fields).

**Resolved:** pending commit — `stateProv` removed from `lib/data/types/property.ts` and `lib/data/db/properties.ts`.

---

### 🔵 F4 — Province filter uses case-sensitive exact match while search is case-insensitive
**Deferred:** moot after F1. The filter dropdown and the wizard `<select>` now share the same canonical list — stored province values will always match exactly. Revisit only if a free-text province write path is introduced in future.
**P3 nit · confidence: medium · `[consistency]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:61–64`

**Problem:** The province text search (`p.province.toLowerCase().includes(q)`) is case-insensitive, but the province filter dropdown comparison (`p.province === provinceFilter`) is case-sensitive. If province values ever arrive in different casing from the canonical list, the filter silently misfires while the search still works. Currently safe with seed data (all title-cased) but becomes a footgun once F1's free-text input is in play.

**Why it matters:** The inconsistency creates a confusing experience: searching for "phnom" finds a property, but selecting "Phnom Penh" from the dropdown does not filter it — despite the data existing.

**Fix:** Change the filter comparison to case-insensitive: `p.province.toLowerCase() === provinceFilter.toLowerCase()`. Longer term, F1's fix (canonical `<select>`) eliminates the need for this defensiveness.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | `Step2BasicInfo` province input → `<select>` from `CAMBODIA_PROVINCES`; `FormData.state` → `province` across all wizard files; list extracted to `lib/constants/cambodia-provinces.ts` | pending |
| 2 | 2026-05-04 | F2 | `step2Schema` now has `province: z.string().min(1, "Please select a province")` | pending |
| 2 | 2026-05-04 | F3 | `stateProv` removed from `PropertyLocation` type and `splitProperty()` | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable>
  .w-full > tbody > .border-t > .py-3
  Province column td
sources:
  - path: lib/data/types/property.ts
    sha: ec88034f1b2f84725766335ade8ec70d5d4676f7
  - path: lib/data/db/properties.ts
    sha: f5d26b066c5a183b6304c8d0715a4dd4bee03633
  - path: lib/data/derivations/portfolio.ts
    sha: 867469266c68a5e09f431e32a0aaa3c1490d302f
  - path: app/(shell)/portfolio/queries.ts
    sha: 563d151453a93f453871b3197fe3b59a4280d604
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: b952b34a9e5094125f25d6a34c0f2c21b3773040
  - path: components/portfolio/PropertyTable.tsx
    sha: a7d7aee0b16353e8e13004067cafc45e4b047295
  - path: app/(shell)/add-property/actions.ts
    sha: 49ed4835e6b8e12195a1cdb99424e6bcfcb99667
  - path: app/(shell)/add-property/_components/types.ts
    sha: 41d67a55b4ab6355cfb377649e326ff415c002ae
  - path: app/(shell)/add-property/_components/Step2BasicInfo.tsx
    sha: 284eded5cfe3a68adadaaca113969e3f7d8204a4
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# List province values across all seed properties
for f in public/data/users/demo-user/properties/PROP-*/location.json; do cat "$f"; done \
  | grep -o '"province": "[^"]*"' | sort | uniq -c | sort -rn

# Check for blank province values
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const blank=dirs.filter(d=>{
  try{const loc=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/location.json\`,'utf8'));return !loc.province;}
  catch{return true;}
});
console.log('blank province:', blank.length, blank);
"

# Check canonical list coverage (values NOT in the PortfolioPage provinces array)
node -e "
const fs=require('fs');
const canonical=['Banteay Meanchey','Battambang','Kampong Cham','Kampong Chhnang',
  'Kampong Speu','Kampong Thom','Kampot','Kandal','Kep','Koh Kong',
  'Kratie','Mondulkiri','Oddar Meanchey','Pailin','Phnom Penh',
  'Preah Vihear','Prey Veng','Pursat','Ratanakiri','Siem Reap',
  'Sihanoukville','Stung Treng','Svay Rieng','Takeo','Tbong Khmum'];
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const outside=dirs.filter(d=>{
  try{const loc=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/location.json\`,'utf8'));
  return loc.province && !canonical.includes(loc.province);}catch{return false;}
});
console.log('props with non-canonical province:', outside.length, outside);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_province
business_meaning: >
  The Cambodian administrative province where the property is located.
  Stored as a full title-case name string (e.g. "Phnom Penh") from a
  canonical list of 25 provinces. Used for table display and client-side
  filtering.
formula: p.province  # direct field read — no derivation
canonical_home: server  # per data-audit/03 §B
unit: string (enum of 25 Cambodian province names)
edge_cases:
  - blank string → blocked by Zod min(1) in step2Schema (F2 resolved)
  - out-of-canonical value → blocked by wizard <select> (F1 resolved)
  - case mismatch → safe; wizard enforces canonical casing (F4 deferred as moot)
related_fields:
  - city (sibling address field)
  # stateProv removed in Rev 2 (F3 resolved)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Golden-value check: all 16 seed provinces correct and canonical.
- F1 confirmed: `form.state` free-text → `province` mismatch with exact-match filter.
- F3 confirmed: `stateProv` written by `splitProperty()` but never read in any UI.
- Q5.N filed in `ref/05-open-questions.md`.

### Revision 2 — 2026-05-04
- F1 resolved: wizard province input is now a `<select>` from `CAMBODIA_PROVINCES`; `FormData.state` renamed to `province`; list extracted to `lib/constants/cambodia-provinces.ts`.
- F2 resolved: `step2Schema` province field now `z.string().min(1, …)`.
- F3 resolved: `stateProv` removed from `PropertyLocation` and `splitProperty()`.
- F4 deferred: moot now that wizard uses a canonical `<select>`.
- Files changed: `lib/data/types/property.ts` (917377 → ec88034), `lib/data/db/properties.ts` (539f52 → f5d26b), `app/(shell)/portfolio/_components/PortfolioPage.tsx` (689903 → b952b3), `app/(shell)/add-property/actions.ts` (97ccc4 → 49ed48), `app/(shell)/add-property/_components/types.ts` (2e34a2 → 41d67a), `app/(shell)/add-property/_components/Step2BasicInfo.tsx` (046ece → 284ede).

</details>
