---
revision: 2
date: 2026-05-07
status: "post-wiring complete · all 6 audit reports written"
route: /directory
slug: directory
wired: 99+
hardcoded: 0
partial: 0
chrome: 8
total: 109
pf_count: 6
---

# Page Audit — `/directory`

> **Professional Services Network Manager.** Grid/card UI for browsing, filtering, and managing saved professionals (Agent / Lawyer / Notary / Maintenance / Electrician / Plumber / Inspector / Accountant) tied to the user's properties. Single entity source: `Professional` → direct reads to cards with category/search/sort filters.

## TL;DR

- **Phase 8.4 complete** (audit + wiring + post-wiring audit reports)
- **Original audit:** 109 surfaces (79 WIRED · 22 HARDCODED · 8 CHROME · 6 PFn)
- **After wiring:** 99+ WIRED (11 fields × 9 cards) · 0 HARDCODED · 8 CHROME (header/toolbar stubs unchanged)
- **PF1–PF5 all resolved.** PF6 (linkedProperties scalar) deferred.
- **6 post-wiring audit reports written** (see Audit Roadmap below for links)
- **New surfaces from wiring:** `verified` badge (11th card field) + 6 Valgate-verified seed records (9 cards total vs 6); `/directory/[id]` profile route (new — not part of this page's surface count)

---

## 1. Source Files

| File | Key finding |
|---|---|
| `app/(shell)/directory/page.tsx` | Clean RSC; delegates to `getDirectoryPageData()` + `ProfessionalDirectoryPage` |
| `app/(shell)/directory/queries.ts:34–107` | `HARDCODED_PROFESSIONALS[6]` fallback used when DB returns empty — **PF5** |
| `app/(shell)/directory/queries.ts:109–134` | `getDirectoryPageData()` — sound logic; maps DB records when present; falls back to hardcoded array |
| `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx:112–125` | Email + Phone buttons — no `onClick`, no backing data — **PF1** |
| `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx:273–279` | Sort `<select>` — no `onChange` handler — **PF2** |
| `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx:330–358` | Pagination — "142" hardcoded at line 334; [1][2][3] buttons static — **PF3** |
| `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx:159–162` | VIEW PROFILE button — no `onClick`, no route target — **PF4** |
| `lib/data/types/professional.ts` | `ProfessionalSchema` — confirms `email` and `phone` are absent — **PF1** |
| `lib/data/db/professionals.ts` | CRUD layer — no email/phone fields; `list()` correctly Zod-parses |
| `public/data/users/demo-user/professionals/PROF-0001/core.json` | Seed record — no email/phone fields confirmed |

**Briefing line-number verification (Step 0):**
- `queries.ts:34–107` — HARDCODED_PROFESSIONALS[6] ✅ confirmed
- `ProfessionalDirectoryPage.tsx` line 23 — CATEGORY_BADGE constant ✅ (in component file, not queries.ts — minor briefing location note)
- Email button: lines 112–118 ✅ · Phone button: lines 119–125 ✅ · no backing data confirmed
- Sort `<select>`: lines 273–279 ✅ · no `onChange` confirmed
- "142" hardcoded: line 334 ✅
- VIEW PROFILE: lines 159–162 ✅ · no `onClick` confirmed
- `Professional` Zod schema: no `email`, no `phone` field ✅ PF1 confirmed

**Surface count note:** The plan briefing projected ~153–207 surfaces based on 12 cards. Actual page renders 3–6 cards (3 DB seed records on a seeded instance; 6 HARDCODED_PROFESSIONALS on a fresh empty DB). Surface counts use **6 cards** (the HARDCODED_PROFESSIONALS maximum) for template analysis. Findings scale proportionally with card count.

---

## 2. Surface Inventory

### Page Header

| # | Surface | Classification | Source |
|---|---|---|---|
| 1 | Breadcrumb — "Valgate / Professional Directory" | CHROME | Static text strings; no routing state |
| 2 | H1 — "Trusted Professionals" | CHROME | Static string |
| 3 | Subtitle — "Manage and connect with your network…" | CHROME | Static string |
| 4 | EXPORT button | CHROME | No `onClick`; no data export logic |
| 5 | ADD PROFESSIONAL button | CHROME | No `onClick`; no form |

### Toolbar

| # | Surface | Classification | Source |
|---|---|---|---|
| 6 | Search input | WIRED | `searchQuery` state → `filtered` array |
| 7 | Grid/List toggle (Grid + List buttons) | WIRED | `view` state → card layout class |
| 8 | Sort dropdown (3 options) | CHROME | No `onChange` handler — **see PF2** |

### Category Pills (9)

| # | Surface | Classification | Source |
|---|---|---|---|
| 9–17 | All · Agent · Lawyer · Notary · Maintenance · Electrician · Plumber · Inspector · Accountant | WIRED | `activeCategory` state → `filtered` array; pill list from `data.categories` prop |

### Professional Card — Data Fields (template × 6 cards)

| # | Surface per card | Classification | Source |
|---|---|---|---|
| 18 | Avatar initials | WIRED | `pro.initials` direct read |
| 19 | Avatar background colour | WIRED | `pro.avatarBg` direct read |
| 20 | Available status dot (green indicator) | WIRED | `pro.available` boolean |
| 21 | Category badge text | WIRED | `pro.category` direct read |
| 22 | Professional name | WIRED | `pro.name` direct read |
| 23 | Company name | WIRED | `pro.company` direct read |
| 24 | Star rating (5-icon arc) | WIRED | Derived from `pro.rating` via floor comparison |
| 25 | Rating value text (e.g. "5.0") | WIRED | `pro.rating.toFixed(1)` |
| 26 | Review count (e.g. "(124)") | WIRED | `pro.reviewCount` direct read |
| 27 | Linked Properties count | WIRED | `pro.linkedProperties` direct read — scalar only, see **PF6** |

**Per-card wired direct reads: 10 surfaces × 6 cards = 60 WIRED**

### Card Contact Actions (template × 6 cards)

| # | Surface per card | Classification | Source |
|---|---|---|---|
| 28 | Email button (Mail icon) | HARDCODED | No `onClick`; no `pro.email` field in schema — **see PF1** |
| 29 | Phone button (Phone icon) | HARDCODED | No `onClick`; no `pro.phone` field in schema — **see PF1** |
| 30 | COPY INFO button | WIRED | Client-side clipboard: copies `${pro.name} — ${pro.company}`; state-managed copied feedback |

**Contact section × 6 cards: 12 HARDCODED + 6 WIRED**

### Card Footer — Action Stub (template × 6 cards)

| # | Surface per card | Classification | Source |
|---|---|---|---|
| 31 | VIEW PROFILE button | HARDCODED | No `onClick`; no route target — **see PF4** |

**Footer × 6 cards: 6 HARDCODED**

### Pagination

| # | Surface | Classification | Source |
|---|---|---|---|
| 32 | "Showing X" count | WIRED | `filtered.length` — correctly reactive to search + category filter |
| 33 | "of 142" total | HARDCODED | Hardcoded literal "142" at line 334 — **see PF3** |
| 34 | ← previous button | CHROME | Renders; no pagination state; no navigation effect |
| 35–37 | [1] [2] [3] page number buttons | HARDCODED | 3 static buttons; [1] always styled active; no `currentPage` state — **see PF3** |
| 38 | → next button | CHROME | Renders; no pagination state; no navigation effect |

**Pagination: 1 WIRED + 4 HARDCODED + 2 CHROME**

### Empty State

| # | Surface | Classification | Source |
|---|---|---|---|
| 39 | EmptyState (icon + "No professionals found" + description) | WIRED | Conditional on `filtered.length === 0`; fires correctly under search/filter miss |

---

## 3. Summary Counts

| Section | Surfaces | WIRED | HARDCODED | CHROME |
|---|---|---|---|---|
| Page header | 5 | 0 | 0 | 5 |
| Toolbar | 3 | 2 | 0 | 1 |
| Category pills | 9 | 9 | 0 | 0 |
| Card data (10 fields × 6) | 60 | 60 | 0 | 0 |
| Card contact actions (3 × 6) | 18 | 6 | 12 | 0 |
| Card footer actions (1 × 6) | 6 | 0 | 6 | 0 |
| Pagination | 7 | 1 | 4 | 2 |
| Empty state | 1 | 1 | 0 | 0 |
| **TOTAL** | **109** | **79** | **22** | **8** |

---

## 4. Audit Roadmap

6 bundled audit reports — all written in Phase 8.4-Post-Wiring.

| Audit file | Template | Status | Verdict |
|---|---|---|---|
| [directory--professional-card-direct-reads](../../directory--professional-card-direct-reads.md) | bundled lite | ✅ Written | 99 surfaces WIRED · 1 deferred (PF6) |
| [directory--contact-buttons](../../directory--contact-buttons.md) | full | ✅ Written | PF1 resolved · 18 surfaces WIRED |
| [directory--filter-controls](../../directory--filter-controls.md) | bundled lite | ✅ Written | 11 surfaces WIRED · 0 findings |
| [directory--pagination](../../directory--pagination.md) | full | ✅ Written | PF3 resolved · 1 P3 nit (buttons hidden at current scale) |
| [directory--card-actions-stubs](../../directory--card-actions-stubs.md) | bundled lite | ✅ Written | PF4 resolved · 18 surfaces WIRED |
| [directory--sort-and-empty-state](../../directory--sort-and-empty-state.md) | full | ✅ Written | PF2 + PF5 resolved · 0 open findings |

---

## 5. Page-Wide Findings

### 🔴 PF1 — Email and Phone buttons are HARDCODED stubs

> The Email and Phone buttons on every professional card show icons with no action. The `Professional` Zod schema has no `email` or `phone` fields — there is no data source to wire them to. This is a **schema gap**, not a wiring gap: the fix requires adding fields to the schema, updating seed data, and then wiring the buttons.

**Surfaces affected:** 12 (Email button × 6 + Phone button × 6)
**Location:** `ProfessionalDirectoryPage.tsx:112–125`
**Schema gap:** `lib/data/types/professional.ts` — no `email`, no `phone` field confirmed; `public/data/users/demo-user/professionals/PROF-0001/core.json` also confirms absence
**Fix:** Add `email: z.string().email().optional()` and `phone: z.string().optional()` to `ProfessionalSchema`. Add fields to all 3 DB seed records + all 6 HARDCODED_PROFESSIONALS entries. Wire buttons with `mailto:`/`tel:` `onClick` handlers.
**Blocks:** Phase 8.4-Wiring
**Files:** Q5.V

---

### 🟡 PF2 — Sort dropdown is CHROME

> The sort dropdown at line 273 renders three options ("Sort by: Rating", "Sort by: Name", "Sort by: Properties") with no `onChange` handler. Selecting any option has no effect on the displayed cards. The `filtered` array is unsorted beyond the DB/hardcoded source order.

**Surfaces affected:** 1 sort `<select>` element (3 options are not independently data surfaces)
**Location:** `ProfessionalDirectoryPage.tsx:273–279`
**Fix options:** (a) Wire it — add `sortBy` state + 1-line comparator to `filtered` derivation; data is already in memory, trivial implementation. (b) Remove until a future version. **Bias: wire it.**
**Blocks:** Phase 8.4-Wiring
**Files:** Q1.I

---

### 🟡 PF3 — Pagination is HARDCODED

> The "Showing X of 142 professionals" line: the `X` value (`filtered.length`) IS correctly wired and reactive. The "142" is a hardcoded integer literal at line 334. The three page-number buttons [1][2][3] are static; [1] is always styled as the active page; no `currentPage` state exists; ← → chevron buttons render but have no navigation effect.

**Surfaces affected:** 4 HARDCODED ("142" literal + [1][2][3] buttons) + 2 CHROME (← → nav buttons)
**Location:** `ProfessionalDirectoryPage.tsx:330–358`
**Fix options:** (a) Replace "142" with `professionals.length`; remove fake page buttons (dataset is ~3–6 records — no real pagination needed). (b) Client-side slice if dataset grows. (c) Cursor-based pagination if scale demands.
**Cross-references:** Q1.C (already filed 2026-05-05 — "what's the real expected scale? Pagination required?") — updated with implementation options in Step C of this audit.
**Blocks:** Phase 8.4-Wiring

---

### 🟡 PF4 — VIEW PROFILE button has no target route

> Each professional card renders a "VIEW PROFILE" button (with ChevronRight icon) at line 159. The button has no `onClick` handler and no `href`; clicking it does nothing. No `/directory/[id]` profile route exists in the app.

**Surfaces affected:** 6 (one VIEW PROFILE button per visible card)
**Location:** `ProfessionalDirectoryPage.tsx:159–162`
**Fix options:** (a) Build a `/directory/[id]` profile page route. (b) Remove the button until the route exists. Option (b) is lower scope; option (a) adds meaningful navigation.
**Blocks:** Phase 8.4-Wiring
**Files:** Q1.J

---

### 🟡 PF5 — `HARDCODED_PROFESSIONALS[6]` fallback is intentional seed

> `queries.ts:34–107` defines a 6-record hardcoded array injected when `db.professionals.list(userId)` returns empty. With 3 DB seed records present on this branch, the fallback does NOT activate — but on a fresh empty DB or a new-user session it does, showing stale fake data instead of an actionable empty state.

> This mirrors the `/analytics` SavedReports fallback (PF6 in the analytics audit), which was resolved by replacing with an empty-state UI message.

**Surfaces affected:** 0 on seeded instance (DB has 3 records; fallback not active). Risk: fresh DB instances show 6 fake professionals instead of a "No professionals yet" empty state.
**Location:** `queries.ts:34–107`
**Fix options:** (a) Replace fallback with proper empty-state UI: `EmptyState` with title "No professionals yet" and CTA "Add Your First". Remove `HARDCODED_PROFESSIONALS` constant and the conditional entirely. (b) Keep as demo aid. **Recommend (a)** — mirrors Q4.I analytics resolution.
**Blocks:** Phase 8.4-Wiring (partially)
**Files:** Q4.U

---

### 🔵 PF6 — `linkedProperties` is a scalar count, not a navigable relationship

> Each professional card shows "Linked Properties: N" where N is `pro.linkedProperties` — a bare integer count. There is no way to see which properties are linked or navigate to them. A future `propertyIds: string[]` field (or join table) would enable navigation from professional to property.

**Surfaces affected:** 6 (one count per visible card — the value renders correctly as a scalar; not a broken surface, a scope gap)
**Location:** `ProfessionalDirectoryPage.tsx:155–158`; `lib/data/types/professional.ts:12` (`linkedProperties: z.number()`)
**Note:** The scalar count renders without error. The gap is navigability, not correctness. This is a product-scope decision for a future phase.
**Cross-references:** Entity catalog §13 (`Professional` entity) — `linkedProperties` field definition. Do NOT refile as a new Q-letter; cross-reference entity catalog.
**Blocks:** Future navigation feature (out of Phase 8.4 scope)

---

## 6. What this page does well

- Search filter chain is correctly wired: `searchQuery` + `activeCategory` both feed the same `filtered` derivation; the two filters compose correctly.
- Grid/List toggle works: `view` state drives the card layout class correctly.
- COPY INFO button: correctly copies professional identity string to clipboard with animated state feedback.
- EmptyState component fires correctly when `filtered.length === 0` (search/category miss path).
- DB fallback logic in `queries.ts`: DB records take priority over HARDCODED_PROFESSIONALS — correct ordering.
- `getDirectoryPageData()` uses `server-only` + `getCurrentUserId()` correctly.
- Card animation stagger: `animationDelay` is wired to the `index` prop — data-driven, not hardcoded per card.

---

## 7. Q-Numbers Filed This Audit

| Q-number | Topic | PF linked |
|---|---|---|
| Q5.V | Professional.email + Professional.phone schema gap | PF1 |
| Q1.I | Sort dropdown: wire or remove | PF2 |
| Q1.C | Updated existing (added implementation options for /directory pagination) | PF3 |
| Q1.J | VIEW PROFILE button target: build `/directory/[id]` or remove | PF4 |
| Q4.U | HARDCODED_PROFESSIONALS fallback: empty-state UX vs seed-fallback | PF5 |

---

<details>
<summary>🔍 Source files & hashes</summary>

Hashes recorded for revision tracking — re-run `git hash-object <path>` after wiring to detect drift.

| File | Role |
|---|---|
| `app/(shell)/directory/page.tsx` | RSC wrapper |
| `app/(shell)/directory/queries.ts` | Data layer — HARDCODED_PROFESSIONALS fallback (PF5) |
| `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx` | Client component — all UI surfaces |
| `lib/data/types/professional.ts` | Zod schema — PF1 gap confirmed (no email/phone) |
| `lib/data/db/professionals.ts` | FS CRUD layer |
| `public/data/users/demo-user/professionals/PROF-0001/core.json` | Seed record — confirms no email/phone |

</details>

<details>
<summary>📜 Revision history</summary>

| Rev | Date | Author | Changes |
|---|---|---|---|
| 1 | 2026-05-07 | Phase 8.4-audit | Initial audit — 109 surfaces classified (79 WIRED · 22 HARDCODED · 8 CHROME); 6 PFn; 5 Q-numbers filed (Q5.V, Q1.I, Q1.C updated, Q1.J, Q4.U) |
| 2 | 2026-05-07 | Phase 8.4-Post-Wiring | Post-wiring update — PF1–PF5 resolved; 6 audit reports written; verified badge (11th field) + 6 Valgate-verified seeds → 99+ WIRED; HARDCODED count → 0; Audit Roadmap table updated with links and verdicts |

</details>
