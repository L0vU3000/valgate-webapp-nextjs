---
slug: directory--sort-and-empty-state
data_point: "Sort dropdown (row 8) + empty state (row 39) + HARDCODED_PROFESSIONALS fallback architecture (PF5)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ PF2 + PF5 resolved — sort wired with comparator; HARDCODED_PROFESSIONALS removed; Valgate-verified tier introduced"
---

# Audit — Sort Dropdown and Empty State on /directory
_Last revised: 2026-05-07 · Revision 1_
_Full template — PF2 (sort CHROME) and PF5 (HARDCODED_PROFESSIONALS fallback architecture) are the two findings tracked here._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md) — **PF2 and PF5 resolved in Phase 8.4-Wiring.**

## TL;DR
- ✅ PF2 resolved: sort dropdown wired — `sortBy` state + `onChange` + in-memory comparator; 3 options all functional
- ✅ PF5 resolved: `HARDCODED_PROFESSIONALS` constant removed from `queries.ts`; reframed as 6 Valgate-verified seed records (PROF-0004–0009, `verified: true`) alongside 3 user-added records (PROF-0001/0002/0003, `verified: false`)
- ✅ Empty state: fires correctly when `filtered.length === 0` (search/category miss)
- 0 findings — all resolved

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED — PF2 + PF5 resolved |
| 2 | Entity | ✅ sort is a client derivation; verified tier is a schema field |
| 3 | Formula | ✅ comparator verified for all 3 sort modes |
| 4 | Render | ✅ select value + onChange; empty state conditional |
| 5 | Consistency | ✅ sort + filter compose correctly |
| 6 | Missing safeties | 0 gaps |
| 7 | Meaning | ✅ |
| 8 | Findings | None |
| 9 | Fix Log | PF2 + PF5 resolved |

## Glossary
- **PF2** — Sort dropdown was CHROME (no `onChange` handler). Resolved Phase 8.4-Wiring.
- **PF5** — `HARDCODED_PROFESSIONALS` fallback injected when DB returned empty. Resolved Phase 8.4-Wiring via architectural reframe.
- **Q1.I** — Sort Q-number. Resolved: option (a) wire it.
- **Q4.U** — HARDCODED_PROFESSIONALS Q-number. Resolved: keep + reframe as Valgate-verified seed tier.
- **sortBy** — Client state: `"Rating" | "Name" | "Properties"`. Default: `"Rating"`.
- **verified tier** — `Professional.verified: boolean`. `true` = Valgate-curated base directory. `false` = user-added (unverified).

---

## 1. Snapshot — ✅ PF2 + PF5 RESOLVED

> **Plain opener:** Before wiring, the sort dropdown was decorative — you could click "Sort by: Name" and nothing would change. The HARDCODED_PROFESSIONALS array was a silent fallback that would show 6 fake professionals on a fresh empty database instead of an honest "nothing here yet" message.
>
> After wiring: the sort dropdown actually sorts the cards (by rating, name, or number of linked properties). The fake fallback array is gone, replaced by a proper set of 6 Valgate-verified seed records that represent the platform's curated professional directory — separate from the 3 user-added records that exist from the previous seed phase.

**PF2 — Sort dropdown:**

| | Before | After |
|---|---|---|
| `<select>` `value` | None (uncontrolled) | `value={sortBy}` |
| `<select>` `onChange` | None | `onChange={(e) => setSortBy(e.target.value as SortOption)}` |
| Sort applied | Never | `.sort()` comparator applied to `filtered` before pagination |
| Page reset on sort | N/A | `useEffect(() => setCurrentPage(1), [..., sortBy])` |

**PF5 — HARDCODED_PROFESSIONALS architecture:**

| | Before | After |
|---|---|---|
| Fallback source | `HARDCODED_PROFESSIONALS` array (6 entries, injected when DB empty) | Removed entirely |
| Verified-tier | No concept | `verified: boolean` field on `ProfessionalSchema` distinguishes tiers |
| User-added records | PROF-0001/0002/0003 (`verified: false`) | Unchanged |
| Valgate-verified records | HARDCODED (never reached DB) | PROF-0004–0009 (`verified: true`) in DB |

---

## 2. Entity — ✅

> **Plain opener:** Sorting is a pure client-side operation — it reads the `Professional[]` array that's already loaded, and reorders it without any new database calls. The `verified` field is a schema field on the Professional entity — it lives in the database, not in the component.

**Sort entity:** No DB entity — client derivation over `Professional[]`.

**Verified field entity:**

| Field | Schema | Default | Seed values |
|---|---|---|---|
| `verified` | `z.boolean().default(false)` | `false` | PROF-0001/0002/0003: `false` · PROF-0004–0009: `true` |

---

## 3. Formula — ✅

> **Plain opener:** The sort comparator is a 3-branch function: one branch for each sort option. It runs on the already-filtered list, so the category filter and search query are applied first, then the result is sorted.

```ts
// ProfessionalDirectoryPage.tsx
const filtered = professionals
  .filter(/* category + search */)
  .sort((a, b) => {
    if (sortBy === "Name")       return a.name.localeCompare(b.name);
    if (sortBy === "Properties") return b.linkedProperties - a.linkedProperties;
    return b.rating - a.rating; // Default: "Rating" desc
  });
```

**Multi-record walk:**
- `sortBy = "Rating"` (default): PROF-0002 (5.0) → PROF-0004 (5.0) → PROF-0005 (5.0) → PROF-0003 (4.8) → ... Rating descending. Ties are unstable (JS sort); no secondary key needed for demo data. ✅
- `sortBy = "Name"`: alphabetical ascending — "Chan Piseth", "Chea Sophal", "Heng Virak", ... ✅
- `sortBy = "Properties"`: descending by `linkedProperties` — PROF-0005 (31) → PROF-0003 (21) → PROF-0004 (12) → ... ✅
- Filter applied before sort: if category = "Agent", filtered = [Sarah Mitchell]; sort has nothing to do. ✅

---

## 4. Render — ✅

> **Plain opener:** The `<select>` element is now a controlled input — it reads `sortBy` state as its value and updates the state when the user changes the option. The empty state fires when the filtered list is empty, regardless of sort order.

**Sort dropdown:**
```tsx
<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value as SortOption)}
  className="..."
>
  <option value="Rating">Sort by: Rating</option>
  <option value="Name">Sort by: Name</option>
  <option value="Properties">Sort by: Properties</option>
</select>
```

- `value={sortBy}` — makes the select controlled; selected option reflects current state
- `onChange` — updates `sortBy` state; triggers re-render; `filtered` re-sorts; `useEffect` resets `currentPage` to 1

**Empty state:**
```tsx
{filtered.length === 0 && (
  <div className="col-span-3 ...">
    <EmptyState
      icon={<UsersRound className="size-6" />}
      title="No professionals found"
      description="Try a different search or category filter."
    />
  </div>
)}
```

The empty state fires when `filtered.length === 0`. This covers both:
1. Filter miss (search/category produces no results) — correct description
2. Empty DB (no professionals seeded) — description "Try a different search" is slightly off (there's nothing to search), but the visual state is appropriate; no broken UI

---

## 5. Consistency — ✅

| Identity | Holds? |
|---|---|
| Sort applies after filter (not before) | ✅ — `.filter().sort()` chain |
| Sort resets currentPage | ✅ — `useEffect([activeCategory, searchQuery, sortBy])` |
| Empty state and paginated are mutually exclusive | ✅ — `paginated.map()` renders nothing when `paginated = []`; empty state guard covers `filtered.length === 0` |
| Verified badge is data-driven, not sort-driven | ✅ — `pro.verified` is a DB field, unaffected by sort order |

---

## 6. Missing safeties — 0 gaps

| Scenario | Handled? |
|---|---|
| `sortBy` with identical values (tie) | ✅ — JS sort is stable in V8/Node ≥ 11; tie order follows input array order from DB |
| Empty DB (no professionals) | ✅ — `professionals.length = 0`; `filtered = []`; empty state shows |
| Unknown `sortBy` value from stale URL param | N/A — `sortBy` is internal state, not from URL; TypeScript `SortOption` union enforces valid values at compile time |

---

## 7. Meaning — ✅

**Sort dropdown:**
```
Option:         "Sort by: Rating" / "Sort by: Name" / "Sort by: Properties"
Effect:         Cards reorder immediately on selection
User reads:     "I can find the highest-rated or most-used professional quickly"
Match?          ✅ — all three options produce correct ordering
```

**Empty state:**
```
Title:          "No professionals found"
Description:    "Try a different search or category filter."
Icon:           UsersRound (group of people icon)
Context:        Shows on filter miss; also shows on empty DB
Match?          ✅ for filter miss. Slightly off for empty DB (no search to try), but not misleading.
```

**Verified tier:**
```
Concept:        Valgate-curated professionals (verified:true) vs user-added (verified:false)
UI signal:      BadgeCheck icon on avatar
User reads:     "This professional has been vetted by Valgate"
Match?          ✅ — seed data correctly assigns verified:true only to PROF-0004–0009
```

---

## 8. Findings — None

_PF2 and PF5 fully resolved. No open findings._

---

## 9. Fix Log

| Rev | Date | Finding | What changed |
|---|---|---|---|
| 1 | 2026-05-07 | PF2 — sort dropdown CHROME | Added `sortBy` state + `<select>` `value` + `onChange` + `.sort()` comparator. `useEffect` resets page on sort change. |
| 1 | 2026-05-07 | PF5 — HARDCODED_PROFESSIONALS fallback | Removed `HARDCODED_PROFESSIONALS` array + conditional from `queries.ts`. Converted 6 entries to Valgate-verified DB seed records (PROF-0004–0009, `verified: true`). Added `verified: boolean` field to schema. Verified badge wired to `pro.verified` in card avatar. |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx
    sha: 2cae32d72dc743ae1d434e4fd5f97028059838d0
  - path: app/(shell)/directory/queries.ts
    sha: 1135ecb083c4f4ffacc0f2079e0cb4a19cf77c67
  - path: lib/data/types/professional.ts
    sha: efe238179884db0eb205059f9f5f9d80d4e9574b
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit written post Phase 8.4-Wiring.
- PF2 resolved: sort dropdown wired with `sortBy` state + `.sort()` comparator (3 modes).
- PF5 resolved: HARDCODED_PROFESSIONALS removed; architectural reframe as Valgate-verified tier (verified:boolean field; 6 new seed records PROF-0004–0009).
- 0 open findings.

</details>
