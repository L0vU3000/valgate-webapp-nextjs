---
slug: portfolio--filtered-count
data_point: "Showing X of Y properties (filter footer)"
route: /portfolio
revision: 3
date: 2026-05-04
verdict: "✅ F1+F2+F4 resolved · F3 partial (Sold shown; Archived visible via filter)"
---

# Audit — Filtered / Total Count on /portfolio
_Last revised: 2026-05-04 · Revision 3_

## TL;DR
- ✅ Numbers are arithmetically correct against seed data (16 of 16 with no filters)
- ✅ F1+F2+F4 resolved · F3 partial — Sold properties now visible in table; Archived surfaced via filter
- 🔧 Remaining: F3 full resolution deferred to Q4.D (soft-delete/sold-state design)
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What are these numbers and where do they come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How do the values reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ⚠️ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ⚠️ |
| 8 | Findings | What to fix | 4 items |
| 9 | Fix Log | What has been fixed since the initial audit | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **Active properties** — For KPI purposes: `status ∉ {Sold, Archived}` and `!isArchived`. For table purposes (post-Rev 2): all non-`isArchived` rows, including Sold; `status:"Archived"` hidden by default but visible via filter.
- **aria-live** — An HTML attribute that tells screen readers to announce dynamic content changes automatically.

---

## 1. Snapshot

> This is the text "Showing **16** of **16** properties" in the bottom-left corner of the property table. The first number updates live as you search or apply filters; the second is your total active portfolio size loaded from the server.

| | |
|---|---|
| Where | /portfolio, PropertyTable pagination footer |
| Label | single-page: `"{n} properties"` / `"{n} of {total} properties"` · multi-page: `"Showing {start}–{end} of {n} properties"` |
| Filtered formula | `initialProperties.filter(hideArchivedByDefault + search + type + status + province)` |
| Total formula | `initialProperties.length` — all non-`isArchived` `PropertyListItem[]` from server (includes Sold) |
| Reads from | `public/data/users/demo-user/properties/` (16 records, all active in seed) |
| Canonical home | total: server · filtered: client (as per `data-audit/03 §B`) |
| Edge cases | Archived hidden by default; visible via "Archived" status filter (F3 partial) · table Y and KPI card diverge once Sold properties exist (§5) |

---

## 2. Entity — ✅

> The data slice sent to the browser for this display is minimal and PII-safe — no financial details, coordinates, or sensitive fields are included.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | row identity |
| `name` | `string` | used in search match |
| `code` | `string` | used in search match |
| `type` | `PropertyTypeChoice` | type filter dimension |
| `province` | `string` | province filter dimension |
| `status` | `PropertyStatus` | status filter dimension |

`PropertyListItem` deliberately excludes `lat`, `lng`, `buyNumeric`, `purchasePrice`, `outstandingMortgage`, `annualPropertyTax`, and all other financial/location fields. No PII leakage in the filtered-count display.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

---

## 3. Formula — ✅

> The arithmetic is correct and the label now accurately reflects what's on screen — single-page shows a plain count, multi-page shows a row range.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/_components/PortfolioPage.tsx` |
| Filtered | `initialProperties.filter(...)` (lines 52–64) |
| Total | `initialProperties` passed as `properties` prop |
| Page slice | `filtered.slice(pageStart, pageStart + PAGE_SIZE)` — rows only, not the count |

**Formula** (verbatim, post-Rev 2, lines 52–64):
```ts
const filtered = initialProperties.filter((p) => {
  // Archived hidden by default; visible only when explicitly selected
  if (!statusFilter && p.status === "Archived") return false;
  const matchesSearch = !q || p.name.toLowerCase().includes(q)
    || p.code.toLowerCase().includes(q) || p.province.toLowerCase().includes(q);
  const matchesType = typeFilter === "Property Type" || p.type === typeFilter;
  const matchesStatus = !statusFilter || p.status === statusFilter;
  const matchesProvince = provinceFilter === "All" || p.province === provinceFilter;
  return matchesSearch && matchesType && matchesStatus && matchesProvince;
});
```

**Golden-value check**

| Source | Filtered | Total |
|---|---|---|
| Displayed (no filters) | 16 | 16 |
| Computed from seed | 16 | 16 |
| Match? | ✅ | ✅ |

**Robustness notes**
- ✅ Empty array → renders "**0** properties"
- ✅ Search is case-insensitive (`.toLowerCase()` on both sides)
- ✅ All four filter dimensions applied independently and combined with AND semantics
- ✅ Archived hidden by default; "Archived" filter explicitly exposes them
- ✅ Single-page unfiltered: `"{n} properties"` · filtered: `"{n} of {total} properties"`
- ✅ Multi-page: `"Showing {start}–{end} of {n} properties"` (F1 resolved)

---

## 4. Render — ✅

> Numbers flow server → browser cleanly, the label now matches what's visible on screen, and screen readers are notified when the count changes.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` pagination footer |
| Prop chain (total) | `data.properties` → `initialProperties` → `properties={initialProperties}` |
| Prop chain (filtered) | `PortfolioPage.filtered` (client state) → `filtered={filtered}` |
| Server vs Client | total built server-side; filtered computed client-side in `"use client"` component |
| Loading state | none needed — count derives from already-hydrated `initialProperties` |
| Formatting | plain integers; multi-page uses `{start}–{end}` range notation |
| A11y | ✅ `aria-live="polite" aria-atomic="true"` on count `<p>` (F2 resolved) |

**PII / IDOR**
- `PropertyListItem` excludes all sensitive fields — no PII in the count display ✅
- Ownership enforced at `getProperties()` level; `getCurrentUserId()` shim is a placeholder for real Clerk auth

---

## 5. Consistency — ⚠️

> With the current all-active seed data everything agrees, but a new divergence was introduced in Rev 2: the table's total (Y) now includes Sold properties, while the KPI card still counts only active ones. They will disagree as soon as any property is marked Sold.

| Identity | Verification | Holds? |
|---|---|---|
| `properties.length` (table Y) === `stats.totalProperties` (KPI card) | seed: both 16 ✅ · diverges when Sold exist: table Y includes Sold, KPI does not | ⚠️ seed-only |
| Seed: active=16, sold=0, archived=0 | `node -e` script confirmed | ✅ |
| `filtered.length ≤ properties.length` | subset invariant of `Array.filter` | ✅ (by construction) |

**New divergence (Rev 2):** `queries.ts` now ships all non-`isArchived` properties (including `status:"Sold"`) to the browser. `computeStats` still filters to active only. With 3 sold properties: table Y = 19, KPI card = 16. This is intentional — the KPI card measures the active portfolio, the table shows everything — but the two numbers on the same page without explanation may confuse users. Resolution deferred to Q4.D.

---

## 6. Missing safeties (2 gaps)

> Two protective measures are absent from this specific display; the rest are shared gaps tracked elsewhere.

| Gap | Status | Link |
|---|---|---|
| `aria-live` on result count | ✅ resolved Rev 2 | F2 |
| Filter logic unit tests | ❌ | — |
| Zod validation at FS boundary | ❌ (shared gap) | Q5.J |
| Multi-tenant isolation | ⚠️ shim | Q4.M |
| KPI card vs table Y diverge with Sold properties | ⚠️ new in Rev 2 | §5 · Q4.D |

---

## 7. Meaning — ⚠️

> The single-page and multi-page labels now match what's on screen. One residual ambiguity: the denominator "of Y" includes Sold but not Archived, with no in-UI explanation of that distinction.

```
Label rendered (no filter, 1 page):  "16 properties"
Label rendered (filtered, 1 page):   "4 of 16 properties"
Label rendered (paginated):          "Showing 1–16 of 32 properties"
Formula chosen:                      page-aware range / filtered count / initialProperties.length
User's likely inference:             rows visible / matching / total portfolio
Match?                               ✅ for F1+F4 · ⚠️ for F3 (Archived not in denominator without disclosure)
```

**Resolved — "Showing" vs page range (F1):**
Single-page now shows a plain count; multi-page shows the `{start}–{end}` row range. The word "Showing" only appears when there are multiple pages and a true range can be stated. ✅

**Residual — "of Y" excludes Archived silently (F3 partial):**
Sold properties are now in Y ✅. Archived properties are excluded from Y even when the "Archived" filter is selected — when you filter to Archived, you see `"3 of 16 properties"` where 16 is the non-archived total. This is the remaining semantic gap deferred to Q4.D.

---

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — "Showing" uses cross-page total, not current-page row count~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]` `[semantic]`**

**Where:** `components/portfolio/PropertyTable.tsx:224–230`

**Problem:** `filtered.length` is the count of ALL properties matching the filters across every page. The word "Showing" conventionally means "what is visible on screen right now." With `PAGE_SIZE = 16`, as soon as a user has 17+ active properties, page 1 renders 16 rows but the footer reads "Showing 32 of 40 properties." The number itself is not wrong (32 did match), but "Showing" makes it read as a row count.

**Why it matters:** This is invisible today because all 16 seed properties fit on one page. The moment a real user adds a 17th property, the footer becomes misleading. Standard data-table convention is "Showing {start}–{end} of {total}" when paginated. Relates to pagination semantics in Q1.A.

**Fix:** Replace the `filtered.length` display with a page-aware range in `PropertyTable.tsx:224–230`. `pageRows` and `pageStart` are already available as props.

**Resolved:** pending commit — `PropertyTable.tsx` pagination footer replaced with conditional: single-page shows `"{n} properties"` or `"{n} of {total} properties"` (filtered); multi-page shows `"Showing {start}–{end} of {filtered} properties"` or `"... filtered, {total} total"`.

---

### ~~🟡 F2 — No `aria-live` region; filter count changes invisible to screen readers~~ — ✅ resolved in Revision 2
**P2 render · confidence: high · `[render]` `[negative-space]`**

**Where:** `components/portfolio/PropertyTable.tsx:223–230`

**Problem:** The `<p>` element displaying "Showing X of Y properties" has no `aria-live` attribute. When a user applies a filter, the DOM updates silently — assistive technologies do not announce the new count. A keyboard-only or screen-reader user has no feedback that their filter action produced results.

**Why it matters:** WCAG 2.1 SC 4.1.3 (Status Messages) requires that status updates be programmatically determinable without the element receiving focus. A filter-result count is a textbook status message.

**Fix:** Add `aria-live="polite"` and `aria-atomic="true"` to the paragraph in `PropertyTable.tsx:224`.

**Resolved:** pending commit — `aria-live="polite" aria-atomic="true"` added to the count `<p>` in `PropertyTable.tsx`.

---

### 🟡 F3 — "of Y properties" silently excludes Sold/Archived items — ⚠️ partial in Revision 2
**P2 semantic · confidence: medium · `[semantic]`**

**Where:** `app/(shell)/portfolio/queries.ts:31` (list filter) and `PropertyTable.tsx` footer

**Problem:** `properties.length` (the "Y") counted only active properties — those where `status ≠ "Sold"|"Archived"` and `!isArchived`. Properties in sold or archived state were silently dropped from the denominator. A user with 20 active + 3 sold would see "Showing 20 of 20 properties" with no indication that 3 records exist but are excluded.

**Why it matters:** As users accumulate sold/archived properties over time, the gap grows. "20 of 20 active" vs "20 of 23 total" are meaningfully different statements for portfolio management.

**Partial fix (Revision 2):** `queries.ts` now ships all non-`isArchived` properties to the client (Sold included). `PortfolioPage.tsx` client filter hides `status === "Archived"` by default — Archived surfaces only when the "Archived" status filter is explicitly selected. Sold properties appear in the table at all times. The denominator Y now includes Sold, matching user expectation. Full label disambiguation (e.g. a note about archived count) deferred to Q4.D.

**Deferred:** Full resolution (label or separate section for Archived/Achieved) waits on Q4.D (Property soft-delete vs sold-state).

---

### ~~🔵 F4 — Redundant display when no filters are active~~ — ✅ resolved in Revision 2
**P3 nit · confidence: high · `[semantic]`**

**Where:** `components/portfolio/PropertyTable.tsx:224–230`

**Problem:** With no filters applied the footer reads "Showing **16** of **16** properties" — the same number appears twice. Standard practice is to render "16 properties" (plain count) when unfiltered, and "Showing 16 of 20 properties" only when a filter is active and reduces the set.

**Why it matters:** Minor polish — the display is not wrong, but the repetition adds visual noise. A user might wonder if the two numbers are supposed to differ.

**Fix:** Conditionally suppress the "of {total}" clause when `filtered.length === properties.length`.

**Resolved:** pending commit — fell out of the F1 fix. Single-page unfiltered view now renders `"{n} properties"` without repeating the number.

---

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 + F4 | `PropertyTable.tsx` footer replaced with page-aware range; unfiltered single-page shows `"{n} properties"` | uncommitted |
| 2 | 2026-05-04 | F2 | `aria-live="polite" aria-atomic="true"` added to count `<p>` in `PropertyTable.tsx` | uncommitted |
| 2 | 2026-05-04 | F3 (partial) | `queries.ts` now ships all non-`isArchived` properties (Sold included); `PortfolioPage.tsx` hides Archived by default, exposes via "Archived" status filter | uncommitted |
| 3 | 2026-05-04 | — | SHA audit: `types/property.ts` updated (7b55c6→cbae0e, titleVariant removed); `PropertyFilters.tsx` updated (42f0fc→17ecc0, unrelated change) | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyTable> pagination footer
  text: "Showing X of Y properties"
  components/portfolio/PropertyTable.tsx:224–230
sources:
  - path: components/portfolio/PropertyTable.tsx
    sha: 8bbe025e9564f97023bb85909ad2dfe5b5eff5a8
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 449ea7abea164169ae6b2344e07885097c3fad53
  - path: app/(shell)/portfolio/queries.ts
    sha: dc1d5b66f4f716463a734e633b48b1b568a8e4a7
  - path: lib/data/derivations/portfolio.ts
    sha: a43e7bb5c9ab9a828d42262a4aa7c6ddb17be628
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: components/portfolio/PropertyFilters.tsx
    sha: 17ecc0976f991d4e7928ffe732da34691141b364
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Count seed properties by active/sold/archived
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
let active=0,sold=0,archived=0;
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(dir+'/'+d+'/core.json','utf8'));
  if(c.isArchived||c.status==='Archived') archived++;
  else if(c.status==='Sold') sold++;
  else active++;
}
console.log({total:dirs.length,active,sold,archived});
"
# Expected: { total: 16, active: 16, sold: 0, archived: 0 }

# Verify KPI totalProperties === table Y (same active filter in two places)
# Both should return 'active' count from the command above
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: portfolio_filtered_count
business_meaning: >
  Number of active properties matching the current combination of search query,
  type filter, status filter, and province filter. Denominator is the total active
  portfolio (Sold/Archived excluded). Both values reset when filters are cleared.
filtered_formula: initialProperties.filter(search + type + status + province).length
total_formula: initialProperties.length  # active only; Sold/Archived excluded silently
canonical_home: filtered → client; total → server
unit: count
edge_cases:
  - totalPages > 1: filtered.length ≠ visible row count (F1)
  - no filters active: filtered === total, redundant "16 of 16" display (F4)
  - sold/archived properties: excluded from denominator without disclosure (F3)
related_metrics:
  - stats.totalProperties (KPI card) === properties.length (table Y) ✅ verified
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 3 — 2026-05-04
- SHA-only update: no verdict change. Two source files changed since Revision 2 due to unrelated work on the same branch.
- `lib/data/types/property.ts` 7b55c6→cbae0e (`titleVariant` field removed — title/deed status audit).
- `components/portfolio/PropertyFilters.tsx` 42f0fc→17ecc0 (unrelated change).
- All F1/F2/F4 fixes confirmed in code; F3 remains partial pending Q4.D.

### Revision 2 — 2026-05-04
- F1 resolved: `PropertyTable.tsx` pagination footer now shows `"{start}–{end} of {total}"` when paginated and `"{n} properties"` (or `"{n} of {total}"` filtered) on single page.
- F2 resolved: `aria-live="polite" aria-atomic="true"` added to count `<p>`.
- F3 partial: `queries.ts` active filter loosened — Sold now ships to browser; `isArchived:true` still excluded. `PortfolioPage.tsx` client filter hides `status:"Archived"` by default; visible when "Archived" filter selected.
- F4 resolved: fell out of F1 fix — unfiltered single-page no longer shows redundant "16 of 16".
- Files changed: `PropertyTable.tsx` (550aa5→8bbe02), `PortfolioPage.tsx` (9124a3→449ea7), `queries.ts` (2e6866→dc1d5b).

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Golden-value check: 16 of 16 ✅ against current seed (all 16 properties active, 0 sold, 0 archived).
- Consistency check: `stats.totalProperties` === `properties.length` ✅ (same active filter applied in two separate locations).
- F1 identified: "Showing" label misleads once pagination activates (PAGE_SIZE=16; invisible with current 16 seed properties, latent bug).
- F2 identified: no `aria-live` on result count paragraph.
- F3 identified: Sold/Archived excluded from denominator without UI disclosure; deferred to Q4.D.
- F4 identified: redundant "16 of 16" display when no filters active.

</details>
