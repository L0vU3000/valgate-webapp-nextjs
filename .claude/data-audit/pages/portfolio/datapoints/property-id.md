---
slug: portfolio--property-id
data_point: "Property Code (sub-label in table, e.g. \"PP00016 PH\")"
route: /portfolio
revision: 3
date: 2026-05-04
verdict: "✅ All resolved · code no longer shown in table · format PROP-XXXX throughout"
---

# Audit — Property Code (PropertyTable sub-label) on /portfolio
_Last revised: 2026-05-04 · Revision 3_

## TL;DR
- ✅ All 5 findings resolved — `code` is now auto-generated server-side on every property creation
- ✅ Format: `PROP-XXXX` (mirrors the property `id`) — consistent across seed data and new properties
- ✅ Code subtext removed from PropertyTable; only property name shown in the table
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this label, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the value pass through correctly? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related references agree? | ⚠️ |
| 6 | Missing safeties | What should exist but doesn't? | 4 gaps |
| 7 | Meaning | Does what the label implies match what's stored? | ⚠️ |
| 8 | Findings | What to fix | 5 items |
| 9 | Fix Log | What has been fixed since the initial audit | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a field.
- **PII** — Personal info that shouldn't leak to the browser.
- **IDOR** — A bug where user A can see user B's data because auth wasn't enforced.
- **Zod** — The runtime validation library used to check form data before it reaches the database.

---

## 1. Snapshot
> The grey subtext "PP00016 PH" shown under a property's name in each table row is the `code` field — a short human-readable reference code for the property. It's stored verbatim in the seed data and never computed: the table just renders whatever string is in `code`.

| | |
|---|---|
| Where | /portfolio → PropertyTable → Property column → second line of name cell |
| Label | _(unlabeled)_ — rendered as grey subtext below the property name |
| Source | `Property.code` — stored verbatim; no formula |
| Reads from | `public/data/users/demo-user/properties/<id>/core.json` |
| Set by | `form.propertyId` in the add-property wizard → `mapWizardToProperty` (`actions.ts:45`) |
| Canonical home | storage (it's a stored identifier, not a derivation) |
| Edge cases | New properties: `form.propertyId` defaults to `""` → `code` stored as `""` → table renders blank |

## 2. Entity — ⚠️
> The `code` field exists in the database schema as a required string, but there's no definition of its format, no uniqueness guarantee, and no consistent generation strategy — making it an uncontrolled field with inconsistent values across seed data.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | System-generated — e.g. `PROP-0001` (from `_fs.ts` `nextId`) |
| `userId` | `string` | Ownership |
| `code` | `string` | Required in `PropertyCore`; user-defined reference code — e.g. `"PP00016 PH"`, `"GEN00016"` |

**Issues**
- `code: string` is non-optional in `PropertyCore` but defaults to `""` in `defaultForm` (Q5.L — new)
- Seed values follow an informal pattern (`PP` = Phnom Penh, `SR` = Siem Reap, `GEN` = generic, optional type suffix) but no schema enforces this
- No uniqueness constraint at the FS or DB level
- No Zod schema includes `propertyId` / `code` validation (see F2)

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅
> There's no formula here — `code` is a stored string passed through unchanged. For the seed data, what's in the file matches what's displayed on screen.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/queries.ts` |
| Pass-through | `listItems` picks `code: p.code` (line 34) |
| Component | `PropertyTable.tsx:154` renders `{p.code}` |

**Golden-value check**

| Source | Value |
|---|---|
| Displayed (PROP-0001) | "PP00016 PH" |
| Seed (`core.json`) | "PP00016 PH" |
| Match? | ✅ |

**Robustness notes**
- ✅ Empty string renders as blank (no crash)
- ✅ Long codes truncated by `truncate` class on the `<p>`
- ⚠️ All 16 seed codes are non-empty; new properties will have empty code (F1)

## 4. Render — ⚠️
> The code reaches the table correctly for seed data, but the path from the add-property wizard is broken: no step collects the value, so real users always get a blank code.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `data.properties[n].code` → `p.code` → `{p.code}` |
| Server vs Client | `<PortfolioPage>` is a Client Component; `code` is narrow-selected into `PropertyListItem` before leaving server — no PII concern |
| Loading / empty / error states | Empty string renders as blank without error or placeholder |
| Formatting | None — raw string, `.truncate` clips overflow |
| A11y | No `aria-label` distinguishes the code from the name; screen readers read both as plain text under the row's `aria-label={View ${p.name}}` |

**PII / IDOR**
- `PropertyListItem` includes only `id, name, code, type, province, status, buy, health, size, title` — no sensitive fields (lat/lng, mortgage, taxes excluded) ✅
- Auth goes through `getCurrentUserId()` shim → hardcoded `"demo-user"`; verify scoping when real auth lands

## 5. Consistency — ⚠️
> The seed data renders correctly in the table, but Step6Success in the add-property wizard shows `ID: PROP-0017` — a system ID, not the user's reference code — creating a conflicting meaning for "Property ID" across two surfaces.

| Identity | Verification | Holds? |
|---|---|---|
| Table displays `p.code` from seed | PROP-0001.code = "PP00016 PH" ✅ | ✅ |
| Search filter uses `p.code.toLowerCase().includes(q)` | Consistent with table render | ✅ |
| Step6Success `ID:` label shows `form.propertyId` | Post-submit `form.propertyId` = DB `id` (e.g. "PROP-0017"), not the user's code | ⚠️ — see F3 |
| Property detail page uses `code` | `code` is not included in the `PropertyListItem` type used by detail page queries — not compared here | — |

## 6. Missing safeties (4 gaps)
> Four safety nets are missing: the code field has no UI input, no Zod validation, no uniqueness guarantee, and no format definition.

| Gap | Status | Link |
|---|---|---|
| UI field to collect `propertyId` in add-property wizard | ❌ | F1 |
| `propertyId` in Zod schema (`step2Schema` / `fullPropertySchema`) | ❌ | F2, Q5.B |
| Uniqueness constraint (per-user) on `code` | ❌ | Q5.L (new) |
| Defined format / generation strategy for `code` | ❌ | Q5.L (new) |

## 7. Meaning — ⚠️
> The word "Property ID" in the add-property form promises a stable, unique identifier. But two different identifiers exist — the system's auto-generated `id` and the user's `code` — and they're never labeled distinctly, causing a naming collision post-submit.

```
Label in table:           (none — raw subtext under property name)
Label in add-property:    "propertyId" (internal field name, not shown to user)
Label in Step6Success:    "ID: {form.propertyId}"
Formula:                  verbatim pass-through
User's likely inference:  "a short human reference code I can use to identify this property"
Match?                    ⚠️ ambiguous — two IDs (system + user-defined) share the same field name
```

**Counterexample considered:**
> If `Property.code` were renamed to `Property.referenceCode` and the system's auto-generated `id` were displayed as `PROP-0017`, the table and success screen would clearly distinguish them. As-is, `form.propertyId` means "user's reference code" before submit and "system DB id" after — which breaks the semantic contract for Step6Success. (Filed as Q5.L.)

## 8. Findings (5 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — No UI collects `code`; every new property gets `code: ""`~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]` `[negative-space]`**

**Where:** `app/(shell)/add-property/_components/types.ts:53` (`propertyId: ""`) · `app/(shell)/add-property/_components/Step2BasicInfo.tsx` (no `propertyId` input) · `app/(shell)/add-property/actions.ts:45` (`code: form.propertyId`)

**Problem:** The `FormData` type has a `propertyId` field that defaults to `""`. No step (Step1–Step4) renders an input for it. `mapWizardToProperty` maps `code: form.propertyId` — always `""` for real users. Every property created by a real user will have `code: ""`. The PropertyTable renders a blank second line under the property name, silently degrading the table's secondary identifier.

**Why it matters:** The `code` field is the only human-readable sub-label in the Property column — losing it makes the table less scannable. It also silently breaks the code-based search path at `PortfolioPage.tsx:60`.

**Fix:** Two options:
- **Auto-generate (recommended):** In `lib/data/db/properties.ts:create()`, derive `code` from province initial + zero-padded `nextId` count (e.g. `"PP-2026-0017"`), ignoring any `code` passed in. Removes the form field entirely.
- **Collect from user:** Add a `propertyId` input to Step2BasicInfo with a sensible generated default. Add to `step2Schema`. Use `parsed.data` in `mapWizardToProperty` instead of raw `form`.

**Resolved:** `lib/data/db/properties.ts` — `create()` now calls `derivePropertyCode(data.province, id)` using a province-prefix map (PP, SR, KPC, etc.) + the 4-digit PROP number. `NewProperty` type excludes `code`. `form.propertyId` removed from `FormData`.

---

### ~~🟡 F2 — `propertyId` absent from every Zod schema; bypasses `fullPropertySchema` validation~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]`**

**Where:** `app/(shell)/add-property/_components/schemas.ts:53–56` (`fullPropertySchema` = step1 + step2 + step3 + step4) · `app/(shell)/add-property/actions.ts:28–45`

**Problem:** `propertyId` is declared in `FormData` (types.ts:17) and used in `mapWizardToProperty` (actions.ts:45), but it's absent from all step schemas. `fullPropertySchema.safeParse(form)` succeeds without knowing the field exists. Additionally, `mapWizardToProperty(form)` uses the raw `form` argument, not `parsed.data` — so any field not in the schema reaches the DB unstripped.

**Why it matters:** Violates the CLAUDE.md rule "Validate every input with Zod before touching the DB." If a UI field is later added for `propertyId`, the value bypasses validation.

**Fix:** Add `propertyId: z.string().max(50).optional()` to `step2Schema`. Change `mapWizardToProperty(form)` to accept `parsed.data` (type `FullPropertyInput`). (Relates to Q5.B.)

**Resolved:** `propertyId` removed from `FormData` entirely. `code` is now server-generated and never passes through the form or Zod at all — the validation gap is eliminated at the root.

---

### ~~🟡 F3 — `form.propertyId` is aliased post-submit; Step6Success shows system ID as "Property ID"~~ — ✅ resolved in Revision 2
**P2 semantic · confidence: high · `[semantic]` `[consistency]`**

**Where:** `app/(shell)/add-property/_components/AddPropertyFlow.tsx:203–204` · `app/(shell)/add-property/_components/Step6Success.tsx:391–395`

**Problem:** After a successful submit, `setForm((f) => ({ ...f, propertyId: result.propertyId! }))` overwrites `form.propertyId` with `result.propertyId` — which is the server-generated DB `id` (e.g., `"PROP-0017"`), not the user's reference code. Step6Success then renders `ID: PROP-0017` using the animated typewriter. The user never typed `"PROP-0017"` — it looks arbitrary and unexplained.

**Why it matters:** The success screen is the user's first impression of their property's "ID". Showing a system key as if it were the property code is misleading and inconsistent with the table's `code` display.

**Fix:** Use a separate `confirmedId` field in `FormData` (or pass as a prop to `Step6Success`) for the post-submit DB id. Keep `form.propertyId` as the user's code. In Step6Success, distinguish system ID ("System ID: PROP-0017") from user code ("Reference: PP-2026-0017") if both should be shown.

**Resolved:** `FormData.propertyId` replaced with `FormData.confirmedCode`. After submit, `result.propertyCode` (the auto-generated code like `"PP0017"`) is stored in `confirmedCode`. `Step6Success` now shows `ID: PP0017` — the real property code, not the internal DB key.

---

### ~~🟡 F4 — `code` has no format definition or uniqueness constraint~~ — ✅ resolved (format) · ⏳ deferred (uniqueness)
**P2 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:21` (`code: string`) · `lib/data/db/properties.ts` (no uniqueness check in `create`)

**Problem:** Seed data shows "PP00016 PH", "SR00015 Land", "KPC00013", "GEN00016" — an informal pattern (province prefix + number + optional type suffix) with no enforced rules. No server-side uniqueness check exists. Two properties can share the same `code` without error.

**Why it matters:** When searching by `code` or navigating by reference, duplicate or empty codes silently produce wrong or missing results.

**Fix:** Decide and document the `code` generation strategy (see Q5.L). When migrating to Convex, add `.index("by_user_and_code", ["userId", "code"])` and a uniqueness guard in `api.properties.create`.

**Resolved (format):** Format is now `{PROVINCE_PREFIX}{4-DIGIT-NUMBER}` — defined in `PROVINCE_PREFIX` map in `lib/data/db/properties.ts`. All 25 Cambodian provinces have assigned prefixes.

**Deferred (uniqueness):** DB-level uniqueness index deferred to Convex migration (Q5.L). In the FS layer, the PROP id is inherently unique per user, so `code` collisions are impossible in practice — two properties in the same province will have different PROP numbers.

---

### ~~🔵 F5 — Code-based search is a silent no-op for newly created properties~~ — ✅ resolved by F1
**P3 nit · confidence: high · `[render]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:59–61`

**Problem:** `p.code.toLowerCase().includes(q)` is safe when `code === ""` (no crash), but searching by code never matches new properties. The user gets no result and no hint that the property has no code.

**Why it matters:** Silent mismatch between user expectation and search result.

**Fix:** Resolved automatically by F1. No independent fix needed before F1 is addressed.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | `NewProperty` excludes `code`; `create()` sets `code: id` — format `PROP-XXXX` | pending |
| 2 | 2026-05-04 | F2 | `propertyId` removed from `FormData`; no longer passes through form/Zod | pending |
| 2 | 2026-05-04 | F3 | `form.propertyId` → `form.confirmedCode`; Step6Success shows auto-generated code | pending |
| 2 | 2026-05-04 | F4 | Format defined: `PROP-XXXX` mirrors the system `id`; unique by construction | pending |
| 2 | 2026-05-04 | F5 | Resolved by F1 — new properties always have a non-empty code | pending |
| 3 | 2026-05-04 | — | All 16 seed `core.json` files updated: `code` set to match `id` (`PROP-0001`…`PROP-0016`) | pending |
| 3 | 2026-05-04 | — | `PropertyTable.tsx` — removed `{p.code}` subtext; Property column now shows name only | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable>
  .py-3 > .flex > .min-w-0 > .text-[12px]
  selected text: "PP00016 PH"
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/db/properties.ts
    sha: 8e6b30cb71a76679a2e71685156cc58ce8df26f1
  - path: lib/data/derivations/portfolio.ts
    sha: b755944adc92602bd5d2d519ef90331f8595b87e
  - path: app/(shell)/portfolio/queries.ts
    sha: 563d151453a93f453871b3197fe3b59a4280d604
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 689903eb8f7a75870ca95bdf12fd19d6e6e53770
  - path: components/portfolio/PropertyTable.tsx
    sha: c96e2558898bbb9fab8b4b3c7546d64050629eaf
  - path: public/data/users/demo-user/properties/PROP-0001/core.json (representative seed)
    sha: bf92f355491890e528af0171a6ba148e7208692e
  - path: app/(shell)/add-property/_components/schemas.ts
    sha: 7590cad959c5a68941c7effbcf221fbe554ed641
  - path: app/(shell)/add-property/_components/types.ts
    sha: 2e34a249427067eb51c89650043205f4fa754a05
  - path: app/(shell)/add-property/actions.ts
    sha: 046a37416d9c03d7466da6c2c7ef6dc1c81452f9
  - path: app/(shell)/add-property/_components/AddPropertyFlow.tsx
    sha: d92c4e6d123d9b341f348660e3732da14b6af1e0
  - path: app/(shell)/add-property/_components/Step6Success.tsx
    sha: 0c86a413ead5e252070c6b8f0c92baa88d692215
  - path: lib/actions/properties.actions.ts
    sha: fd01e1f5f2cdcc00d97b5b53d356c5239859eff4
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Check all property codes in seed data
for d in $(ls public/data/users/demo-user/properties/); do
  node -e "const f=require('./public/data/users/demo-user/properties/$d/core.json'); console.log(f.id, JSON.stringify(f.code));" 2>/dev/null
done

# Count properties with empty code
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/properties';
const dirs = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
const empty = dirs.filter(d => {
  const c = JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`, 'utf8'));
  return !c.code || c.code.trim() === '';
});
console.log('Empty code count:', empty.length, 'of', dirs.length);
"

# Verify PROP-0001 code matches displayed value
node -e "
const c = JSON.parse(require('fs').readFileSync('public/data/users/demo-user/properties/PROP-0001/core.json', 'utf8'));
console.log('code:', c.code);
// Expected: PP00016 PH
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: property_code
business_meaning: >
  A short human-readable reference string for a property, shown as a
  grey subtext under the property name in the portfolio table. Intended
  to be a user-defined or system-generated identifier (e.g. province prefix
  + sequential number). Currently uncontrolled: no format definition,
  no uniqueness guarantee, no UI collection path.
formula: Property.code (verbatim pass-through — no derivation)
canonical_home: storage
unit: string
edge_cases:
  - New properties → code is "" (no UI field, defaultForm.propertyId = "")
  - Seed data → hand-crafted strings with informal province-prefix pattern
related_metrics:
  - Property.id (system-generated, e.g. PROP-0001) — distinct from code
  - form.propertyId (form field name for code — aliased to DB id post-submit)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit. Verdict: ⚠️ 5 findings (1 P1, 3 P2, 1 P3).
- Confirmed PROP-0001.code = "PP00016 PH" matches displayed value ✅.
- F1: no UI field collects `propertyId`; all new properties get `code: ""`.
- F3: `form.propertyId` aliased post-submit to DB `id`; Step6Success shows system ID as "Property ID".
- Filed Q5.L in `05-open-questions.md` covering `code` format and uniqueness decisions.

### Revision 2 — 2026-05-04
- All 5 findings resolved (F4 uniqueness deferred to Convex migration).
- `lib/data/db/properties.ts`: province-prefix map removed; `create()` simply sets `code: id` (format `PROP-XXXX`).
- `types.ts`: `propertyId` → `confirmedCode`. `actions.ts`: `code` no longer sent from form. `AddPropertyFlow.tsx` + `Step6Success.tsx` updated to use `confirmedCode`.

### Revision 3 — 2026-05-04
- All 16 seed `core.json` files updated: `code` field set to match `id` (`PROP-0001` … `PROP-0016`). Old hand-crafted strings ("PP00016 PH", "GEN00016", etc.) removed.
- `components/portfolio/PropertyTable.tsx` (d6d423 → c96e25): `{p.code}` subtext removed from Property column. Table now shows property name only.
- `code` remains in `PropertyListItem` and the search filter so users can still find properties by typing `PROP-XXXX`.

</details>
