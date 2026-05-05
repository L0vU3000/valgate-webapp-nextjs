---
slug: portfolio--attention-count
data_point: "Attention → 6"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ Card removed · F1+F2+F3+F4 resolved by removal · revisit when health/alert system defined"
---

# Audit — Attention (count) on /portfolio
_Last revised: 2026-05-04 · Revision 1_

## TL;DR
- ✅ Card removed from /portfolio — all 4 findings resolved by removal
- ⚠️ `Property.health` field remains in storage and types; semantics still undefined (Q5.K)
- 🔧 Revisit when `health` is defined (Q5.K) or an alert/task system is built (Q3.I)
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 4 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ❌ |
| 8 | Findings | What to fix | 4 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **health** — A 0–100 number stored on each property; currently undefined — no one has written down what 0 or 100 means. See Q5.K.
- **attention threshold** — The number 30, below which a property is counted as needing attention. Hard-coded with no explanation.
- **PII** — Personal info that shouldn't leak to the browser (email, phone, financials).
- **IDOR** — A bug where user A can see user B's data because auth wasn't enforced.

---

## 1. Snapshot

> **Plain English:** The "Attention" KPI card shows how many of your properties have a health score below 30. The health score is a 0–100 number stored on each property, but nobody has defined what 0 or 100 actually means — the values in the demo data were typed in by hand with no documented reasoning.

| | |
|---|---|
| Where | /portfolio, rightmost KPI card (index 4) |
| Label | "Attention" / "Critical tasks pending" |
| Formula | `active.filter(p => (p.health ?? 0) < 30).length` |
| Reads from | `public/data/users/demo-user/properties/` (16 records, 0 archived) |
| Canonical home | server (per `ref/03 §B1`) |
| Edge cases | archived properties excluded by `!p.isArchived` · `health` missing → defaults to 0 → counted as attention |

## 2. Entity — ⚠️

> **Plain English:** The `Property` type has a health field — a number from 0 to 100 — but nothing in the codebase explains what it measures, who sets it, or what the scale means. The demo data values (10, 12, 19, 22, 24, 28) were written in by hand.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | required |
| `userId` | `string` | ownership |
| `health` | `number` | 0–100 intended, no range enforcement, no write path |
| `isArchived` | `boolean?` | optional; defaults to `false` in formula via `!p.isArchived` |

**Issues**
- `health` has no documentation, no range guard (can be −1 or 200), and no write path — the add-property wizard has no step for setting it.
- Seed values are hand-crafted; the 6 "attention" properties were selected arbitrarily to produce a non-zero display.
- Q5.K tracks this gap in full.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> **Plain English:** The arithmetic is correct and simple — count every active property whose health score is below 30. The formula matches the seed data exactly.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeStats(properties)` (line 30) |
| Output field | `stats.attentionCount` |

**Formula** (verbatim):
```ts
attentionCount: active.filter((p) => (p.health ?? 0) < 30).length,
```

**Golden-value check**

| Source | Value |
|---|---|
| Displayed | 6 |
| Computed from seed (health < 30, isArchived=false) | 6 (PROP-0002:28, PROP-0009:22, PROP-0012:12, PROP-0013:19, PROP-0014:10, PROP-0016:24) |
| Match? | ✅ |

**Robustness notes**
- ✅ empty array → `0`
- ✅ `health` missing/undefined → defaults to `0` via `?? 0`, counted as attention (conservative)
- ✅ no date math or currency rounding
- ⚠️ no range guard — `health: -5` or `health: 150` passes through silently without error

## 4. Render — ⚠️

> **Plain English:** The number travels from the server to the screen correctly, and no sensitive data leaks alongside it. However, PortfolioPage has no loading state and no error state if the server query fails — the page would blank rather than show a fallback.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<KpiCard index={4} accent>` |
| Prop chain | `data.stats.attentionCount` → `{stats.attentionCount}` |
| Server vs Client | `getPortfolioPageData()` runs server-only (`"server-only"` import); `PortfolioPage` is `"use client"` |
| Loading / empty / error states | none — no `loading.tsx`, no 0-state message, no error boundary |
| Formatting | plain integer, no formatting wrapper |
| A11y | no `aria-label` on the KpiCard value; screen reader reads "6" with no context |

**PII / IDOR**
- `PortfolioPageData.stats` is a derived summary (`PortfolioStats`) containing only aggregated counts — no raw PII fields. ✅
- `PortfolioPageData.properties` is narrowed to `PropertyListItem[]` which excludes finance fields (`buyNumeric`, `lat`, `lng`, mortgage, taxes). ✅
- Auth runs through `getCurrentUserId()` shim → hardcoded `"demo-user"`. No IDOR surface in the current demo; ownership enforcement needed when real auth lands.

## 5. Consistency — ✅

> **Plain English:** The "Attention" count doesn't have a direct counterpart elsewhere on the page. Users can cross-check it visually by counting property rows in the table below with a low (red) health bar — those should match.

| Identity | Verification | Holds? |
|---|---|---|
| `stats.attentionCount` === rows in table with health < 30 | seed: 6 low-health rows visible | ✅ (same formula, same dataset) |
| No duplicate aggregation path | `attentionCount` computed once in `computeStats`, not recomputed in queries | ✅ |
| Not rendered on /analytics or other routes | n/a | — |

## 6. Missing safeties (4 gaps)

> **Plain English:** Four protections are missing: a way for users to set the health score, enforcement that health stays in the 0–100 range, schema validation when reading seed files, and a real task system to justify the sub-label.

| Gap | Status | Link |
|---|---|---|
| `health` write path (add/edit property wizard) | ❌ | Q5.K |
| `health` range validation (0–100 guard) | ❌ | Q5.B |
| FS schema validation (Zod at `listMergedRecords` boundary) | ❌ | Q5.J |
| Task system backing "Critical tasks pending" sub-label | ❌ | Q3.I (new) |

## 7. Meaning — ❌

> **Plain English:** The card says "Critical tasks pending" — but the formula counts properties whose health score is below 30. These are not the same thing. A user reading "6 Critical tasks pending" will expect to find 6 open action items somewhere; instead they find 6 properties with an undefined health score below an arbitrary threshold.

```
Label rendered:           "Attention" / "Critical tasks pending"
Formula chosen:           count of active properties with health < 30
User's likely inference:  "6 open tasks or issues requiring my immediate action"
Match?                    ❌
```

**Counterexample:**
> A property with `health: 15` but fully paid rent, no maintenance backlog, and no expiring certificates still appears in the count. Conversely, a property with `health: 45` could have overdue rent and an expired safety certificate but would not appear. The sub-label "Critical tasks pending" implies actionability that `health < 30` does not guarantee.

This semantic gap is filed as Q3.I in `ref/05-open-questions.md`.

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — Sub-label "Critical tasks pending" misrepresents the formula~~ — ✅ resolved in Revision 2
**P1 semantic · confidence: high · `[semantic]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:201`

**Problem:** The sub-label promised "Critical tasks pending" but there was no task system in this codebase. The formula counted properties with a health score below 30, not open tasks.

**Why it matters:** Users act on KPI cards. A user who sees "6 Critical tasks pending" will search for a tasks view and find nothing. Trust-breaking mismatch. See Q3.I.

**Fix:** Replace "Critical tasks pending" with a description that matches the formula, e.g. `"properties below health threshold"` or `"health score < 30"`. Revisit once Q5.K and Q3.I are resolved.

**Resolved:** Card removed entirely. `attentionCount` removed from `PortfolioStats` and `computeStats`. Revisit when health/alert system is defined (Q5.K, Q3.I).

---

### ~~🔴 F2 — `Property.health` has no definition and no write path~~ — ✅ resolved in Revision 2 (by removal)
**P1 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:24` · `public/data/users/demo-user/properties/*/core.json`

**Problem:** `health` is a bare `number` in `PropertyCore` with no docstring, no min/max enforcement, and no write path. Every new property would default to `health: 0` and immediately appear in the attention count.

**Why it matters:** `attentionCount` was the only portfolio-level safety signal. Without a defined `health` scale, the metric was decorative and broken by default.

**Fix:** Resolve Q5.K first. Then either (a) derive at query time from real signals, or (b) add as operator-set field in the property edit form.

**Resolved:** `attentionCount` removed from `PortfolioStats` and `computeStats`. `health` field remains on `Property` type (used by the per-row health bar in the property table) — definition deferred to Q5.K.

---

### ~~🟡 F3 — Magic threshold `30` is unexplained~~ — ✅ resolved in Revision 2 (by removal)
**P2 logic · confidence: high · `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:42`

**Problem:** The value `30` was embedded directly in the formula with no named constant or documented rationale.

**Resolved:** Formula and threshold removed along with the card. Re-introduce as `ATTENTION_HEALTH_THRESHOLD` when the metric is rebuilt with a defined `health` scale.

---

### ~~🔵 F4 — Amber accent border conflicts with red urgent coloring inside the card~~ — ✅ resolved in Revision 2 (by removal)
**P3 render · confidence: medium · `[render]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:193, 251`

**Problem:** The `accent` prop applied `border-l-amber-400` while the card interior used red — mixed caution/critical signals.

**Resolved:** Card removed. Note for future rebuild: if a critical-alert card is added back, use `border-l-red-400` not the generic `accent` prop.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1, F2, F3, F4 | Removed KpiCard from PortfolioPage; removed `attentionCount` from `PortfolioStats` type and `computeStats`; removed `AlertTriangle` import; grid adjusted from `lg:grid-cols-5` to `lg:grid-cols-4` | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard index={4} accent>
  label: "Attention" / sub-label: "Critical tasks pending"
  value: {stats.attentionCount}
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/derivations/portfolio.ts
    sha: b755944adc92602bd5d2d519ef90331f8595b87e
  - path: app/(shell)/portfolio/queries.ts
    sha: d5420811677c54394a45d2fa407d6ad65f42c64a
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 689903eb8f7a75870ca95bdf12fd19d6e6e53770
  - path: app/(shell)/portfolio/page.tsx
    sha: 490da8542d8d654acf73f854aeff39b9cbfce3f6
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Total attention count (health < 30, not archived)
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const attention=dirs.filter(d=>{
  const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`,'utf8'));
  return !c.isArchived && (c.health??0)<30;
});
console.log('attention count:',attention.length);
console.log('properties:',attention);
"

# Full health breakdown for all 16 properties
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(\`\${dir}/\${d}/core.json\`,'utf8'));
  console.log(d,'health:',c.health,'archived:',!!c.isArchived,'attention:',!c.isArchived&&(c.health??0)<30);
}
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: attention_count
business_meaning: >
  Number of active (non-archived) properties whose health score is below 30.
  "health" is currently an undefined 0–100 field with hand-coded seed values
  and no write path. See Q5.K for the decision on what health should measure.
  Sub-label "Critical tasks pending" is semantically inaccurate (see F1, Q3.I).
formula: active.filter(p => (p.health ?? 0) < 30).length
threshold: 30  # ATTENTION_HEALTH_THRESHOLD — see F3 for extraction recommendation
canonical_home: server  # per ref/03 §B1
unit: count
edge_cases:
  - health missing/undefined → defaults to 0 → always counted as attention (see F2)
  - no archived property can appear (isArchived filter applied in computeStats:31)
  - health out of range (< 0 or > 100) → no guard; formula still applies
related_metrics:
  - property table rows with health bar in the low range should visually match this count
  - no other KPI card directly depends on attentionCount
open_questions:
  - Q5.K: what does health actually measure and how is it authored?
  - Q3.I: should attentionCount be derived from tasks/issues rather than health < 30?
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (2 P1, 1 P2, 1 P3).
- Golden value confirmed: 6 seed properties with health < 30 (PROP-0002:28, PROP-0009:22, PROP-0012:12, PROP-0013:19, PROP-0014:10, PROP-0016:24).
- F1: "Critical tasks pending" sub-label semantically inaccurate — no task system exists in codebase. Filed Q3.I.
- F2: `health` field undefined and has no write path; Q5.K is the blocking open question.
- F3: Magic threshold 30 recommended for extraction as a named constant.
- F4: Visual inconsistency — amber `accent` border vs red interior coloring.

### Revision 2 — 2026-05-04
- All 4 findings resolved by removing the card entirely.
- Files changed: `lib/data/derivations/portfolio.ts` (00b4d1 → b75594), `app/(shell)/portfolio/_components/PortfolioPage.tsx` (85c4ef → 689903).
- `attentionCount` removed from `PortfolioStats` type and `computeStats` return.
- `AlertTriangle` import removed. Grid adjusted from `lg:grid-cols-5` to `lg:grid-cols-4`.
- `health` field intentionally kept on `Property` type — still used by per-row health bar in property table.
- Q5.K and Q3.I remain open; card should be rebuilt when one of those resolves.

</details>
