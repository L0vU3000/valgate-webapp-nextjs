---
revision: 3
date: 2026-05-07
status: "post-wiring complete · Phase 8.4 closed"
route: /directory
slug: directory
---

# Page Plan — `/directory`

> **Phase 8.4 complete.** All wiring and post-wiring audit reports done. PF1–PF5 resolved; PF6 deferred. `/directory/[id]` route audited in Phase 8.4b — see `pages/directory-id/`.
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
| `Professional` | existing entity | 99 WIRED (11 fields × 9 cards) — verified badge added; 3 additional seed records (PROF-0007–0009) | **shipped, fully wired** (direct reads) | — |
| `Professional.email` + `Professional.phone` | **new fields** on existing entity | **shipped, fully wired** — Q5.V resolved Phase 8.4-Wiring: two optional fields added to `ProfessionalSchema` + seeds; buttons wired with mailto/tel + disabled state | — | — |
| `/directory/[id]` profile route | **new route** (not an entity) | **shipped** — Q1.J resolved Phase 8.4-Wiring: route built at `app/(shell)/directory/[id]/`; VIEW PROFILE → `<Link href={/directory/${pro.id}}>` | audit complete — Phase 8.4b; see `pages/directory-id/` | — |
| Pagination: `professionals.length` as total | **client-state gap** (not an entity) | 4 HARDCODED ("142" + [1][2][3] buttons) | not implemented | PF3 · Q1.C |
| Sort comparator (`sortBy` state) | **derivation gap** (not an entity) | 1 CHROME (sort dropdown) | not implemented | PF2 · Q1.I |

---

## 4. Audit Roadmap

All 6 reports written during Phase 8.4-Post-Wiring (2026-05-07).

| File | Verdict |
|---|---|
| [directory--professional-card-direct-reads](../../directory--professional-card-direct-reads.md) | ✅ 99 WIRED (11 fields × 9 cards) · PF6 deferred |
| [directory--contact-buttons](../../directory--contact-buttons.md) | ✅ PF1 resolved — 18 WIRED |
| [directory--filter-controls](../../directory--filter-controls.md) | ✅ 11 WIRED · 0 findings |
| [directory--pagination](../../directory--pagination.md) | ✅ PF3 resolved — 7 WIRED · 1 P3 nit |
| [directory--card-actions-stubs](../../directory--card-actions-stubs.md) | ✅ PF4 resolved — 18 WIRED |
| [directory--sort-and-empty-state](../../directory--sort-and-empty-state.md) | ✅ PF2 + PF5 resolved |

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

---

## 6. Revision History

### Revision 3 — 2026-05-07
- Post-wiring close-out. All 6 audit reports confirmed written.
- Entity Backlog updated: Professional (99 WIRED), email/phone (shipped), /directory/[id] route (shipped, audit complete Phase 8.4b).
- Audit Roadmap: all 6 rows marked written with links.

### Revision 2 — 2026-05-07
- Wiring complete. PF1–PF5 resolved; PF6 deferred. Post-wiring audit reports pending.

### Revision 1 — 2026-05-07
- Initial plan written. Q-resolution gate documented. 6 audit reports planned.
