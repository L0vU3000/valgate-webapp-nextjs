---
revision: 2
date: 2026-05-07
status: "wiring complete · post-wiring audit pending"
route: /directory
slug: directory
---

# Page Plan — `/directory`

> **Sub-phase 2 (Wiring) complete.** Sub-phase 3 (Post-Wiring audit reports) pending.
>
> See `audit.md` for full surface inventory and PFn findings.

---

## 1. Summary

| | |
|---|---|
| **Route** | `/directory` |
| **Audit date** | 2026-05-07 |
| **Total surfaces** | 109 (79 WIRED · 22 HARDCODED · 8 CHROME) |
| **Findings** | 6 PFn |
| **Key blocker** | Q5.V — `Professional.email` + `Professional.phone` schema gap |
| **Wiring estimate** | ~2–3 hours (schema add + seed update + button wiring + sort + pagination fix + empty-state) |

---

## 2. Q-Resolution Gate

Before Phase 8.4-Wiring can begin, the following Q-numbers need product/engineering input:

| Q | Question | Default if unresolved | Blocks |
|---|---|---|---|
| **Q5.V** | Add `email` + `phone` to `ProfessionalSchema`? Option (a): two optional string fields; (b): `contacts` sub-object; (c): defer. **Recommend (a).** | Defer PF1 fix | PF1 |
| **Q1.I** | Sort dropdown: wire (1-line comparator, trivial) or remove? **Recommend wire.** | Mark CHROME permanently | PF2 |
| **Q1.C** | Pagination: replace "142" with `professionals.length` + remove fake page buttons (dataset is ~3–6 records), OR client-side slice, OR remove pagination? **Recommend** simplest path: `professionals.length` + drop fake buttons. | Leave PF3 deferred | PF3 |
| **Q1.J** | VIEW PROFILE: build `/directory/[id]` profile page, or remove button? | Mark CHROME permanently | PF4 |
| **Q4.U** | HARDCODED_PROFESSIONALS fallback: replace with empty-state UI ("No professionals yet — Add your first") or keep as demo aid? **Recommend** empty-state (mirrors Q4.I analytics resolution). | Leave PF5 deferred | PF5 |

---

## 3. Entity Backlog

Gaps the page renders or implies — inputs to cross-page `pages/INDEX.md`.

| Entity / Gap | Type | Surfaces | Status | Blocks |
|---|---|---|---|---|
| `Professional` | existing entity | 79 WIRED (60 card direct-reads + 6 copy + 9 pills + 2 toolbar + 1 filtered count + 1 empty state) | **shipped, fully wired** (direct reads) | — |
| `Professional.email` + `Professional.phone` | **new fields** on existing entity | 12 HARDCODED (Email × 6 + Phone × 6) | **schema gap** — absent from `ProfessionalSchema` and all seed records | PF1 · Q5.V |
| `/directory/[id]` profile route | **new route** (not an entity) | 6 HARDCODED (VIEW PROFILE × 6) | not built | PF4 · Q1.J |
| Pagination: `professionals.length` as total | **client-state gap** (not an entity) | 4 HARDCODED ("142" + [1][2][3] buttons) | not implemented | PF3 · Q1.C |
| Sort comparator (`sortBy` state) | **derivation gap** (not an entity) | 1 CHROME (sort dropdown) | not implemented | PF2 · Q1.I |

---

## 4. Audit Roadmap

6 bundled audit reports to run during Phase 8.4-Post-Wiring (after wiring ships). Template selection follows WIRING-PLAYBOOK bundling rules.

| Audit file | Template | Surfaces | Finding |
|---|---|---|---|
| `directory--professional-card-direct-reads.md` | bundled lite | 60 (10 fields × 6 cards) | None systemic — verify all 10 fields render from DB |
| `directory--contact-buttons.md` | full | 12 (Email × 6 + Phone × 6) | PF1 — schema gap; cite Q5.V |
| `directory--filter-controls.md` | bundled lite | 11 (search input + 9 category pills + grid/list toggle) | None systemic — verify filter chain |
| `directory--pagination.md` | full | 7 (1 WIRED + 4 HARDCODED + 2 CHROME) | PF3 — "142" hardcoded; cite Q1.C |
| `directory--card-actions-stubs.md` | bundled lite | 12 (COPY INFO × 6 + VIEW PROFILE × 6) | PF4 for VIEW PROFILE half; cite Q1.J |
| `directory--sort-and-empty-state.md` | full | 4 (sort dropdown options + empty state) | PF2 (cite Q1.I) + PF5 (cite Q4.U) |

**Total: 6 audit reports covering 106 surfaces.**

---

## 5. Fix Log

| Finding | Status | Phase | Notes |
|---|---|---|---|
| PF1 — Email/Phone schema gap | ✅ Resolved | 8.4-Wiring | Added `email`/`phone`/`verified` to `ProfessionalSchema`; all 9 seeds updated; buttons wired with mailto/tel + disabled state |
| PF2 — Sort dropdown CHROME | ✅ Resolved | 8.4-Wiring | `sortBy` state + `<select>` onChange; comparator applied before pagination; resets `currentPage` |
| PF3 — Pagination hardcoded | ✅ Resolved | 8.4-Wiring | `ITEMS_PER_PAGE = 12`; client-side slice; "of X" uses `professionals.length`; dynamic page buttons |
| PF4 — VIEW PROFILE no route | ✅ Resolved | 8.4-Wiring | Built `/directory/[id]` route (queries.ts + page.tsx + ProfessionalProfilePage.tsx); VIEW PROFILE → `<Link href={/directory/${pro.id}}>` |
| PF5 — HARDCODED_PROFESSIONALS | ✅ Resolved | 8.4-Wiring | Reframed: 6 HARDCODED entries → Valgate-verified seeds (PROF-0004–0009, `verified: true`); fallback removed from queries.ts; `verified` badge wired |
| PF6 — linkedProperties scalar | 🔵 Deferred | Future | Entity-design decision; no wiring blocker for Phase 8.4 |
