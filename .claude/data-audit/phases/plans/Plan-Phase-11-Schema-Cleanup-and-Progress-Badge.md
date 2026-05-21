# Plan — Phase 11: Schema Cleanup & Progress Badge

_Phase 11 · Created 2026-05-19_

---

## Overview

Phase 11 addresses one body of work: five Q-gate schema cleanups decided in Phase 10, recorded in `ref/05-open-questions.md` but not yet applied to the codebase. Task A (PropertyLayout progress badge) has been **deferred to the backend migration phase** — see `ref/deferred-database-migration.md` §PropertyLayout-Progress. B tasks are independent of each other and can be done in any order.

---

## Task A — PropertyLayout Progress Badge ⏸️ DEFERRED

**Deferred to backend migration phase.** See `ref/deferred-database-migration.md` §PropertyLayout-Progress for the full spec and implementation plan.

**Why deferred:** The fix requires fetching all 13 ProgressContext entity arrays in every property sub-page. On the FS layer this is 13 × N JSON file reads per page load — acceptable for a demo but the wrong pattern to establish before Convex lands. Once Convex is in place, a single query with server-side joins replaces all 13 parallel fetches, making the correct implementation straightforward and cheap. Doing it now would mean writing and then discarding the 13-fetch pattern across 7 page files.

**Current state:** `PropertyLayout` shows `— % progress` on all property sub-pages. This is a known, accepted degraded state until migration.

---

## Task B — Q-gate Schema Cleanups

### B1 — Q5.O: `totalArea` → `size`

**Decision:** Drop `totalArea`, keep `size`.

**Current state:**
- `lib/data/types/property.ts:76` — `PropertyMediaSchema` has `totalArea: z.string()`
- `lib/data/types/property.ts:100` — `PropertyListItemSchema.pick({ totalArea: true, ... })`
- `app/(shell)/portfolio/queries.ts:52` — `toListItem` returns `totalArea: p.totalArea`
- 20 seed files under `public/data/users/demo-user/properties/PROP-*/media.json` — all have `"totalArea"` key
- UI references: `app/(shell)/property/[id]/edit/EditPropertyForm.tsx:269`, `app/(shell)/add-property/_components/Step2BasicInfo.tsx:76-77`, `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx:487`, `app/(shell)/_components/HomePage.tsx:301`, `app/(shell)/layout.tsx:30`, `app/(shell)/portfolio/_components/PortfolioPage.tsx:78`, `components/portfolio/PropertyTable.tsx:256`, `app/(shell)/property/[id]/edit/page.tsx:27`

**Fix steps:**
1. `lib/data/types/property.ts` — rename `totalArea` to `size` in `PropertyMediaSchema` (line 76) and `PropertyListItemSchema.pick` (line 100)
2. `app/(shell)/portfolio/queries.ts:52` — change `totalArea: p.totalArea` to `size: p.size`
3. `lib/data/db/properties.ts:124` — in `splitProperty()`, rename `totalArea: p.totalArea` to `size: p.size`
4. All 20 `public/data/users/demo-user/properties/PROP-*/media.json` — rename key `"totalArea"` → `"size"`
5. All UI files above — global search-replace `p.totalArea` → `p.size`, `item.totalArea` → `item.size`, `form.totalArea` → `form.size`, `"totalArea"` → `"size"` in register/update calls
6. `app/(shell)/add-property/_components/types.ts` — rename field in the add-property form state type

**Risk:** `PropertyListItem` is used in many places. TypeScript will catch all call sites at compile time — do a `tsc --noEmit` check after the rename to confirm nothing is missed.

---

### B2 — Q5.A: Remove `titleVariantSchema` / `TitleVariant`

**Decision:** Delete the variant indirection; use `PropertyTitle` directly for CSS mapping.

**Current state:**
- `lib/data/types/property.ts:30-31` — declares `titleVariantSchema` and `TitleVariant`; not used in any entity schema field
- `lib/data/properties.ts:7` — re-exports `TitleVariant`
- `app/(shell)/queries.ts:25,29` — imports and re-exports `TitleVariant`
- `lib/property-helpers.ts:11,78-84` — imports `TitleVariant`, exports `titleToVariant(title: PropertyTitle): TitleVariant`
- `app/(shell)/_components/HomePage.tsx:24,38,303` — imports `TitleVariant` and `titleToVariant`; uses `titleClasses: Record<TitleVariant, string>` and `titleClasses[titleToVariant(drawerProperty.title)]`

**Fix steps:**
1. In `app/(shell)/_components/HomePage.tsx:38-41` — replace the `titleClasses: Record<TitleVariant, string>` map with a direct `titleClassFor(title: PropertyTitle): string` helper (inline or imported) using a `switch` on the three `PropertyTitle` values:
   - `"Hard title"` → `"text-interactive-primary"`
   - `"Soft title"` → `"text-status-warning-text"`
   - `"—"` → `"text-secondary"`
2. In `app/(shell)/_components/HomePage.tsx:303` — replace `titleClasses[titleToVariant(drawerProperty.title)]` with `titleClassFor(drawerProperty.title)`
3. Remove import of `titleToVariant` and `TitleVariant` from `HomePage.tsx` (lines 23-24)
4. Confirm no other files import `TitleVariant` or `titleToVariant` (grep confirms only the files listed above)
5. Delete `titleToVariant` from `lib/property-helpers.ts:78-84`; remove `TitleVariant` import on line 11
6. Delete `lib/data/types/property.ts:30-31` (`titleVariantSchema` and `TitleVariant`)
7. Remove `TitleVariant` re-export from `lib/data/properties.ts:7`
8. Remove `TitleVariant` re-export from `app/(shell)/queries.ts:25,29`

---

### B3 — Q5.R: Lock `Document.category` enum

**Decision:** Replace open/legacy enum with closed domain enum.

**Current state:**
- `lib/data/types/document.ts:15` — `category: z.enum(["Title", "Rental", "Photos", "Legal", "Financial", "Other"]).optional()`
- 20 property folders under `public/data/users/demo-user/properties/PROP-*/documents.json` (and possibly top-level documents) may contain `category` values that need to match the new enum

**New enum values:** `["Title", "Sales", "Tax", "Rental", "Photos", "Insurance", "Estate"]`

**Fix steps:**
1. `lib/data/types/document.ts:15` — update the enum:
   ```ts
   category: z.enum(["Title", "Sales", "Tax", "Rental", "Photos", "Insurance", "Estate"]).optional(),
   ```
2. Search for document seed files: `public/data/users/demo-user/properties/PROP-*/documents.json` and `public/data/users/demo-user/documents.json` (if it exists) — audit every `category` value and remap:
   - `"Legal"` → `"Title"` or `"Tax"` (context-dependent; prefer `"Title"` for ownership docs, `"Tax"` for financial docs)
   - `"Financial"` → `"Tax"` or `"Sales"`
   - `"Other"` → remove the field (make it `undefined`) or assign best-fit category
3. Search UI code for hardcoded category strings: `grep -rn '"Legal"\|"Financial"\|"Other"' app/ components/` — update any dropdowns, filter lists, or display labels to use the new enum values
4. Check `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` for category filter chips — update category list to match new enum

---

### B4 — Q5.N: Cambodia provinces dropdown

**Decision:** Rename form field label to "Province", drop `stateProv`, wire to `CAMBODIA_PROVINCES` dropdown.

**Current state (already partially done):**
- `lib/constants/cambodia-provinces.ts` — file exists with all 25 provinces as `const` array
- `app/(shell)/add-property/_components/Step2BasicInfo.tsx` — already imports `CAMBODIA_PROVINCES` (line 5) and already uses a `<select>` bound to `form.province` with the Cambodia provinces dropdown (lines 121-133). **This fix may already be done.**
- `PropertyLocationSchema` (`lib/data/types/property.ts:54`) — uses `province: z.string().min(1)` (correct field name, no `stateProv`)
- Seed files — use `"province"` key in `location.json` files

**Verification steps (no code change expected, just confirm):**
1. Confirm `stateProv` does not appear anywhere in the codebase: `grep -rn "stateProv" app/ lib/ components/ public/`
2. Confirm the edit form (`app/(shell)/property/[id]/edit/EditPropertyForm.tsx`) uses a `<select>` or at minimum uses `province` not `stateProv`
3. If the edit form still has a free-text input for province, replace it with a `<select>` bound to `CAMBODIA_PROVINCES` matching the pattern in `Step2BasicInfo.tsx:120-133`

**Files to check:**
| File | Expected state |
|---|---|
| `app/(shell)/add-property/_components/Step2BasicInfo.tsx` | Already uses Cambodia provinces dropdown |
| `app/(shell)/property/[id]/edit/EditPropertyForm.tsx` | Check — may still be free-text; replace with `<select>` if so |
| `lib/data/types/property.ts` | `province: z.string().min(1)` — no `stateProv` |

---

### B5 — Q5.L: Auto-generate `Property.code`

**Decision:** Auto-generate server-side using province prefix + sequential count; remove from wizard UI.

**Current state:**
- `lib/data/db/properties.ts:53` — `create()` already sets `code: id` (uses the PROP-XXXX auto-ID). The `code` field is in `NewProperty = Omit<Property, "id" | "userId" | "code" | ...>` (line 37), meaning `code` is already excluded from the create input.
- The wizard form in `add-property` does **not** appear to have a `code` input field (grepping `AddPropertyFlow.tsx` and step files found no `code` input).
- **This means the auto-generation of `code` from `id` is already implemented** in `db/properties.ts:53`. The code value is just the PROP-XXXX sequential ID.

**Confirmed:** `PROP-XXXX` format is acceptable. No province-prefix format required. The current implementation (`code: id`) is correct and complete.

**Verification:** `grep -rn '"code"\|register.*code\|update.*code' app/(shell)/add-property/` to confirm the wizard has no code field. If clean, close B5 as done.

---

## Suggested order of execution

1. **B2 first** (remove `TitleVariant`). Small, self-contained, zero seed-file changes, low blast radius. Good warm-up.

2. **B5 verify** (auto-generate `Property.code`). Run the grep check — if no `code` input in the wizard, close as done immediately.

3. **B4 verify** (Cambodia provinces dropdown). Run the `stateProv` grep — if clean and add-property already uses the dropdown, verify the edit form and close.

4. **B3 next** (lock `Document.category` enum). Touches types + seed files but no UI form fields. Lower blast radius than B1.

5. **B1 last** (`totalArea` → `size`). Highest blast radius — 20 seed files + ~9 UI files. Do after smaller cleanups. Run `tsc --noEmit` after the type rename to catch all missed call sites. Commit seed file changes separately from type/query changes for easier review.

**Task A:** Deferred — do not start until Convex migration is in place.

**Dependencies between B tasks:**
- B1 (`totalArea` rename) should happen **after** B3 (enum lock) so seed file edits don't collide
- B2, B4, B5 are fully independent of each other and of B1/B3

---

## Fix Log

| Task | Description | Status | Commit |
|---|---|---|---|
| A | PropertyLayout progress badge — deferred to backend migration | ⏸️ deferred | — |
| B1 | `totalArea` → `size` rename (types, queries, seeds, UI) | 🔲 open | — |
| B2 | Remove `titleVariantSchema` / `TitleVariant` / `titleToVariant` | 🔲 open | — |
| B3 | Lock `Document.category` enum to new 7-value set | 🔲 open | — |
| B4 | Cambodia provinces dropdown — verify / fix edit form | 🔲 open | — |
| B5 | Auto-generate `Property.code` — PROP-XXXX confirmed; verify wizard has no code field | 🔲 verify | — |
