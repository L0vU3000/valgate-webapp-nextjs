---
phase: 8.4-Wiring
title: Directory Wiring — Q5.V · Q1.I · Q1.C · Q1.J · Q4.U
date: 2026-05-07
status: executed
route: /directory
---

# Phase 8.4-Wiring — Directory

Wiring pass following the Phase 8.4-audit Q-resolution gate. All 5 Q-gate questions resolved before wiring began.

---

## Q-Resolutions

| Q | Resolution |
|---|---|
| **Q5.V** | Option (a) — two optional fields: `email: z.string().email().optional()` + `phone: z.string().optional()` + `verified: z.boolean().default(false)` added to `ProfessionalSchema` |
| **Q1.I** | Option (a) — wire the sort dropdown: `sortBy` state + comparator |
| **Q1.C** | Option (b) — client-side pagination with `ITEMS_PER_PAGE = 12`; "of X" reads `professionals.length` |
| **Q1.J** | Build route — `/directory/[id]` profile page route created |
| **Q4.U** | Architectural reframe — 6 HARDCODED entries → 6 Valgate-verified seeds (PROF-0004–0009); `verified: boolean` distinguishes tiers |

---

## Files Changed

### Schema
- `lib/data/types/professional.ts` — added `email`, `phone`, `verified` to `ProfessionalSchema`
- `scripts/fixtures/professionals.ts` — rewritten: 9 entries (3 user-added + 6 Valgate-verified) with all new fields

### Seed Data
- `public/data/users/demo-user/professionals/PROF-0001/core.json` — added email, phone, `verified: false`
- `public/data/users/demo-user/professionals/PROF-0002/core.json` — added email, phone, `verified: false`
- `public/data/users/demo-user/professionals/PROF-0003/core.json` — added email, phone, `verified: false`
- NEW: PROF-0004 through PROF-0009 — Valgate-verified professionals (`verified: true`)
  - PROF-0004: Sarah Mitchell, Agent, Luxe Realty Group
  - PROF-0005: Noun Sreymom, Inspector, Cambodia Property Inspections
  - PROF-0006: Ly Bopha, Accountant, ClearBooks Cambodia
  - PROF-0007: Chan Piseth, Plumber, Mekong Plumbing Services
  - PROF-0008: Pheng Sokha, Lawyer, Phnom Penh Legal Partners
  - PROF-0009: Kem Dara, Notary, Angkor Notary Services

### Directory Listing (`/directory`)
- `app/(shell)/directory/queries.ts` — removed `HARDCODED_PROFESSIONALS` constant; `Professional.id` changed to `string`; added `email`, `phone`, `verified` to view type; `getDirectoryPageData()` maps DB records directly
- `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx` — rewritten:
  - `ITEMS_PER_PAGE = 12`, `SortOption` type
  - `sortBy` state + sort comparator applied before pagination
  - `currentPage` state + `paginated` slice
  - `useEffect` resets `currentPage` on filter/sort change
  - Email button: disabled + `opacity-40 cursor-not-allowed` when no email; `mailto:` when present
  - Phone button: same with `tel:` protocol
  - Verified badge: `<BadgeCheck>` on avatar when `pro.verified`
  - VIEW PROFILE: `<Link href={/directory/${pro.id}}>` (was non-functional `<button>`)
  - Sort `<select>`: `value={sortBy}` + `onChange` handler
  - Pagination: dynamic page buttons, real total, prev/next disabled at boundaries

### Profile Route (`/directory/[id]`) — NEW
- `app/(shell)/directory/[id]/queries.ts` — `getProfessionalProfileData(id)` reads from `db.professionals.get(userId, id)`
- `app/(shell)/directory/[id]/page.tsx` — Server Component; `await params`; `notFound()` guard
- `app/(shell)/directory/[id]/_components/ProfessionalProfilePage.tsx` — full profile page with:
  - Header band gradient, avatar (verified badge + available dot)
  - Email / Call action buttons (disabled when no contact info)
  - `StarRating` component
  - 3-col stats grid (Status / Properties / Reviews)
  - Contact details section (mailto / tel links)
  - Back link to `/directory`
  - `CATEGORY_BADGE` record for category color chips

---

## Findings Closed

| Finding | Fix |
|---|---|
| PF1 — Email/Phone schema gap | Schema + seed + button wiring |
| PF2 — Sort dropdown CHROME | `sortBy` state + comparator |
| PF3 — Pagination "142" hardcoded | Client-side slice + real total |
| PF4 — VIEW PROFILE no route | `/directory/[id]` route built |
| PF5 — HARDCODED_PROFESSIONALS fallback | 6 Valgate-verified seeds + fallback removed |

PF6 (linkedProperties scalar) deferred — entity-design decision.

---

## Post-Wiring Audit Reports (pending)

6 bundled reports to run as Phase 8.4-Post-Wiring:

1. `directory--professional-card-direct-reads.md` (bundled lite, 60 surfaces)
2. `directory--contact-buttons.md` (full, 12 surfaces)
3. `directory--filter-controls.md` (bundled lite, 11 surfaces)
4. `directory--pagination.md` (full, 7 surfaces)
5. `directory--card-actions-stubs.md` (bundled lite, 12 surfaces)
6. `directory--sort-and-empty-state.md` (full, 4 surfaces)
