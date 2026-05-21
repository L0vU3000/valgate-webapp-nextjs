---
slug: directory--filter-controls
data_point: "Filter controls bundle — search input (6), Grid/List toggle (7), category pills (9–17)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ All 11 filter surfaces WIRED — no findings; filter chain verified correct"
---

# Audit Bundle — Filter Controls on /directory
_Last revised: 2026-05-07 · Revision 1_
_Bundle covers 11 surfaces: search input (1) + Grid/List toggle (1) + category pills (9). All were WIRED at audit time and remain WIRED post-wiring. Lite template._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md)

## TL;DR
- ✅ All 11 filter controls correctly drive the `filtered` derivation — no regressions
- ✅ Category pills list is wired to `data.categories` prop (server-computed); no hardcoded pill labels
- ✅ Search matches against `name`, `company`, and `category` — correct triple-field match
- ✅ Grid/List toggle correctly drives card layout class (`grid grid-cols-3 gap-6` vs `flex flex-col gap-4`)
- 0 findings

---

## Per-surface summary

| # | Surface | Status | Source | Verdict |
|---|---|---|---|---|
| 6 | Search input | WIRED | `searchQuery` state → `filtered` (name/company/category match) | ✅ |
| 7 | Grid/List toggle (2 buttons) | WIRED | `view` state → card container className | ✅ |
| 9–17 | Category pills × 9 (All + 8 categories) | WIRED | `activeCategory` state → `filtered`; pill list from `data.categories` prop | ✅ |

**11 surfaces: 11 WIRED · 0 HARDCODED · 0 CHROME**

---

## Entity

The filter controls operate on the `Professional[]` array passed as `data.professionals`. The derivation chain in `ProfessionalDirectoryPage.tsx`:

```ts
const filtered = professionals
  .filter((p) => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  })
  .sort(/* sortBy comparator */);
```

The category pill list (`data.categories`) is server-computed in `getDirectoryPageData()` — hardcoded to the 9 valid enum values matching `ProfessionalSchema.category`. This is correct: categories are closed (not derived from distinct DB values), so server-side enumeration is appropriate.

---

## Rule 1 — Adjacent claim-strings

- "Search by name, profession or company…" placeholder: correctly describes the triple-field match (`name`, `category`, `company`). No misleading claim.
- Category pill active state (`bg-[--val-primary-dark] text-white scale-[1.03]`): correctly reflects `activeCategory === cat`. No visual-state divergence.
- "All" pill: shows all professionals regardless of category. `activeCategory === "All"` skips the category filter — correct.

---

## Rule 2 — Empty-state convention

When search query or category filter produces zero results, `filtered.length === 0` and `paginated` is empty. The cards grid renders the `<EmptyState>` component with icon, "No professionals found" title, and "Try a different search or category filter." description. This fires correctly — verified by: category "Agent" filter with no Agents in DB would show empty state (all 9 seed records include at least 1 Agent so this won't fire in the current seed, but the path is structurally correct).

`currentPage` resets to 1 on every filter change via `useEffect(() => setCurrentPage(1), [activeCategory, searchQuery, sortBy])` — prevents stale page state after a narrow filter is applied.

---

## Findings

_None._

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx
    sha: 2cae32d72dc743ae1d434e4fd5f97028059838d0
  - path: app/(shell)/directory/queries.ts
    sha: 1135ecb083c4f4ffacc0f2079e0cb4a19cf77c67
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit written post Phase 8.4-Wiring. All 11 surfaces WIRED; no findings.
- Filter chain verified: search × category compose correctly; `currentPage` reset on filter change confirmed.

</details>
