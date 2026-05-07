---
slug: directory--pagination
data_point: "Pagination — Showing X (32), of N total (33), prev/next buttons (34+38), page number buttons (35–37)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ PF3 resolved — all pagination surfaces WIRED; client-side slice with ITEMS_PER_PAGE=12; page buttons hidden for ≤12 professionals"
---

# Audit — Pagination on /directory
_Last revised: 2026-05-07 · Revision 1_
_Full template — PF3 was a HARDCODED finding ("142" literal + 3 inert page buttons). All surfaces now WIRED._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md) — **PF3 resolved in Phase 8.4-Wiring.**

## TL;DR
- ✅ PF3 resolved: "142" replaced with `professionals.length`; fake [1][2][3] buttons replaced with dynamic generation
- ✅ "Showing X" reads `filtered.length` (was already correct) — unchanged
- ✅ "of N" reads `professionals.length` (total DB count, unfiltered) — was hardcoded "142"
- ✅ Client-side slice: `ITEMS_PER_PAGE = 12`; `paginated = filtered.slice((page-1)*12, page*12)`
- ✅ Page buttons: `Array.from({length: totalPages})` — only rendered when `totalPages > 1` (with 9 records, 1 page = buttons hidden)
- ✅ Prev/Next: disabled at boundaries (`currentPage === 1` / `currentPage === totalPages`)
- 🔵 F1 (P3 nit) — page buttons hidden for current 9-record dataset; pagination can't be manually exercised in the demo

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED — PF3 resolved |
| 2 | Entity | N/A — pagination is client-side derivation |
| 3 | Formula | ✅ slice + totalPages verified |
| 4 | Render | ✅ dynamic buttons; hidden when totalPages ≤ 1 |
| 5 | Consistency | ✅ "Showing X of N" consistent with paginated result |
| 6 | Missing safeties | 1 gap (P3 nit) |
| 7 | Meaning | ✅ |
| 8 | Findings | F1 (P3 nit) |
| 9 | Fix Log | PF3 resolved |

## Glossary
- **PF3** — Page-wide finding: "142" hardcoded; [1][2][3] buttons inert. Resolved Phase 8.4-Wiring.
- **Q1.C** — Pagination question. Resolved: option (b) client-side slice with `ITEMS_PER_PAGE = 12`.
- **totalPages** — `Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))` — always ≥ 1 even when filtered is empty.
- **paginated** — `filtered.slice((currentPage-1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)`.

---

## 1. Snapshot — ✅ PF3 RESOLVED

> **Plain opener:** Before wiring, the directory footer said "Showing X of 142 professionals" (142 was a made-up number) and had three fake page-number buttons that never did anything. Now "of N" shows the real count of professionals from the database, and the page buttons are generated dynamically based on how many professionals there are. With the current 9 professionals (all fitting on one page of 12), the page navigation buttons don't appear at all — they only show up when there are more than 12 professionals.

| Surface | Before | After |
|---|---|---|
| "Showing X" | `filtered.length` ✅ (already correct) | unchanged |
| "of N total" | `"142"` hardcoded ❌ | `professionals.length` ✅ |
| Page buttons | [1][2][3] static, always shown ❌ | Dynamic `Array.from({length:totalPages})`; hidden when `totalPages ≤ 1` ✅ |
| Prev button | Rendered; no effect ❌ | `disabled={currentPage===1}` ✅ |
| Next button | Rendered; no effect ❌ | `disabled={currentPage===totalPages}` ✅ |

---

## 2. Entity — N/A

Pagination operates on the in-memory `professionals: Professional[]` array. It is a client-side derivation — no additional DB calls. The full list is fetched once in `getDirectoryPageData()` and passed as a prop.

---

## 3. Formula — ✅

> **Plain opener:** The pagination math is straightforward: divide the filtered list by 12 to get the number of pages, then take a slice of that page's items.

```ts
// ProfessionalDirectoryPage.tsx
const ITEMS_PER_PAGE = 12;

const filtered = professionals.filter(/* category + search */).sort(/* sortBy */);
const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
const paginated = filtered.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE,
);
```

**Multi-record walk:**
- 9 professionals, no filter: `filtered.length = 9`; `totalPages = Math.max(1, Math.ceil(9/12)) = 1`; `paginated = professionals[0..8]` (all 9). Page buttons hidden. ✅
- 13 professionals, no filter: `totalPages = 2`; page 1 shows [0..11], page 2 shows [12]. Prev disabled on page 1, Next disabled on page 2. ✅
- Filter produces 0 results: `filtered.length = 0`; `totalPages = Math.max(1, 0) = 1`; `paginated = []`; EmptyState renders. Page buttons hidden. ✅
- Filter produces 13, navigate to page 2, then add filter that leaves 3: `useEffect` resets `currentPage` to 1. ✅

---

## 4. Render — ✅

> **Plain opener:** The footer area shows the count text on the left. The page controls (prev/page numbers/next) only appear on the right side when there are more than 12 professionals. The current page button is highlighted in the brand color; others are muted.

```tsx
{/* Count text — always visible */}
<p>Showing <span>{filtered.length}</span> of <span>{professionals.length}</span> professionals</p>

{/* Pagination controls — only when needed */}
{totalPages > 1 && (
  <div className="flex gap-2">
    <button disabled={currentPage === 1}>←</button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
      <button
        key={n}
        onClick={() => setCurrentPage(n)}
        className={n === currentPage ? "bg-[--val-primary-dark] text-white" : "bg-val-bg-tint ..."}
      >{n}</button>
    ))}
    <button disabled={currentPage === totalPages}>→</button>
  </div>
)}
```

---

## 5. Consistency — ✅

> **Plain opener:** "Showing X of N" should always be self-consistent: X (filtered count) ≤ N (total count). And the number of cards visible should equal the number of items on the current page.

| Identity | Holds? |
|---|---|
| `filtered.length ≤ professionals.length` | ✅ — filter can only reduce |
| `paginated.length ≤ ITEMS_PER_PAGE` | ✅ — slice guarantees this |
| Cards rendered = `paginated.length` | ✅ — `paginated.map((pro, i) => <ProfessionalCard>)` |
| `currentPage` reset when filter changes | ✅ — `useEffect(() => setCurrentPage(1), [activeCategory, searchQuery, sortBy])` |

---

## 6. Missing safeties — 1 gap

| Scenario | Handled? |
|---|---|
| `filtered.length === 0` | ✅ `totalPages = Math.max(1, 0) = 1`; EmptyState shows; page buttons hidden |
| `currentPage` exceeds `totalPages` after filter | ✅ `useEffect` resets to 1 on filter change |
| Very large dataset (e.g. 200 professionals) | 🔵 P3 nit — `Array.from({length: totalPages})` renders all page buttons inline (16+ buttons). No ellipsis/"…" truncation. Acceptable for current scale; revisit if dataset grows beyond ~50. |

---

## 7. Meaning — ✅

> "Showing X of N professionals" — X is the count after filters; N is the full DB total. This correctly implies "you're seeing X out of N possible results." Page buttons provide direct page access. The fact that they hide when there's only one page is the right UX — no unnecessary chrome.

---

## 8. Findings

### 🔵 F1 — Page buttons hidden with current 9-record seed; pagination not exercisable in demo
_P3 nit · confidence: high_

**Where:** `totalPages > 1` guard — with 9 professionals and `ITEMS_PER_PAGE = 12`, `totalPages = 1`, so buttons never render.

**Problem:** A reviewer or QA engineer cannot exercise the pagination controls in the current demo because all 9 seed records fit on one page. The code path is correct — it just can't be visually verified without adding ≥4 more professional seed records (to reach 13).

**Fix (optional):** Add 3–4 more seed records to push the dataset past 12, or temporarily lower `ITEMS_PER_PAGE` during QA. Not a code bug; no user-facing impact.

---

## 9. Fix Log

| Rev | Date | Finding | What changed |
|---|---|---|---|
| 1 | 2026-05-07 | PF3 — pagination hardcoded | Added `ITEMS_PER_PAGE = 12`, `currentPage` state, `paginated` slice, dynamic `totalPages`, dynamic page buttons (`Array.from`), disabled prev/next at boundaries. `professionals.length` replaces "142" in "of N" text. |

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
- Initial audit written post Phase 8.4-Wiring.
- PF3 resolved: all 7 pagination surfaces now WIRED. "142" → `professionals.length`. Page buttons dynamic + hidden at `totalPages ≤ 1`. Prev/Next disabled at boundaries.
- F1 noted (P3 nit — pagination not exercisable in demo with 9 records).

</details>
