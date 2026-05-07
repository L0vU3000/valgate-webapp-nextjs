# Plan — Phase 8.4-audit: Audit `/directory` (professional services network)

> **Sub-phase 1 (Audit) only.** Sub-phases 2 (Wiring) and 3 (Post-Wiring) get separate plans after the Q-resolution gate. Output is `pages/directory/{audit.md, plan.md}` plus index + Q-number updates. **No code changes** — analysis only.
>
> Workflow reference: `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` § Sub-phase 1 — Page Audit.

---

## Context

`/directory` is the **professional services network manager** — a grid/card UI for browsing, filtering, and managing saved professionals (Agent / Lawyer / Notary / Maintenance / Electrician / Plumber / Inspector / Accountant) tied to the user's properties. Single-entity-source page: `Professional` is fetched once and rendered as cards with category/search/sort filters.

This is **the smallest and cleanest audit target left in Phase 8**, by an order of magnitude. The Explore briefing on 2026-05-06 measured ~153 surface elements but ~105 of those are trivially WIRED (1:1 entity projection across 12 cards × ~8 fields). Zero derivations, no cross-portfolio aggregations, no time-window math. Two genuine findings, both small:

1. **Email + Phone buttons are HARDCODED stubs** — `Professional` schema lacks `email` and `phone` fields; UI has buttons but no backing data. Most consequential finding; needs schema additions before wiring (small Q-letter).
2. **Pagination is HARDCODED** — "Showing X of 142 professionals" string + 3 hardcoded page-number buttons; no `currentPage` state, no cursor.

Plus 3 chrome-style decisions:
- Sort dropdown rendered but has no `onChange` handler → CHROME (decide: wire or remove)
- "View Profile" button has no target route → functional stub (decide: build `/directory/[id]` or remove)
- `HARDCODED_PROFESSIONALS` 6-entry fallback in `queries.ts` when DB returns empty — intentional seed-fallback. Decide: replace with proper empty-state UI (mirror `/analytics` PF6 pattern: "No professionals yet")

`Professional` does NOT appear in any other audited route — this is its only consumer. Q4.A (`linkedProperties` as count vs `propertyIds: string[]` array) is already filed in `00-entity-catalog.md`; this audit cross-references it but doesn't refile.

**Why pick `/directory` for Phase 8.4 (rather than 8.3 home / 8.5 estate-planning):** small surface, fast turnaround (~1.5 hours), and the schema-gap question (Email + Phone) is a clean independent decision that doesn't entangle with `Unit` (Phase 8.2 Q4.X) or any other open Q-letter. Good "drainage" task while bigger Q-numbers wait for product input.

---

## Prerequisites

Read before Step 0:

- `.claude/data-audit/CLAUDE.md` — folder structure + how to record findings
- `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` — three-sub-phase framework (this plan is sub-phase 1)
- `.claude/data-audit/WIRING-PLAYBOOK.md` — Step C bundling rules
- `.claude/skills/audit-page-datapoints/SKILL.md` — the skill that drives this phase
- `.claude/data-audit/pages/SUMMARY.md` — current build order (no rerank expected from this audit; `Professional` enrichment is small)
- `.claude/data-audit/pages/INDEX.md` — cross-page entity backlog (will get a `Professional` row contributing 12 surfaces, plus Email/Phone gap rows)
- `.claude/data-audit/ref/05-open-questions.md` — Q-numbers; will append 3–4 small Q-letters
- `.claude/data-audit/ref/00-entity-catalog.md` §13 — `Professional` row (verify Q4.A still open)
- **Pattern reference page audit:** `.claude/data-audit/pages/portfolio/audit.md` — the closest single-entity list-style precedent

**Critical source files to be inventoried:**
- `app/(shell)/directory/page.tsx`
- `app/(shell)/directory/queries.ts` (note: contains `HARDCODED_PROFESSIONALS[6]` fallback constant)
- `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx`
- `lib/data/types/professional.ts` (Zod schema — confirms email/phone gap)
- `lib/data/db/professionals.ts`
- A couple of records under `public/data/users/demo-user/professionals/` (seed sanity)

---

## Step 0 — Pre-flight

1. **Re-verify briefing assumptions.** Spot-check the smoking-gun line numbers from the briefing: `queries.ts:23` (CATEGORY_BADGE) + `queries.ts:34–107` (HARDCODED_PROFESSIONALS[6]); ProfessionalDirectoryPage.tsx Email/Phone button JSX + Sort dropdown without onChange + pagination "142" string. If line numbers drifted, note in `audit.md` §Source files.
2. **Confirm Professional schema gap.** Read `lib/data/types/professional.ts`; verify `email` and `phone` are not present. If they were added since the briefing, update PF1 from "schema gap" to "wiring gap only."
3. **Scan `ref/05-open-questions.md` for collisions.** Look for any letter already filed under `Q5` for Professional, `Q1` for directory pagination/sort, or `Q4` for Professional schema enrichments. Bump letters as needed.
4. **Check Q4.A status** in `00-entity-catalog.md` §13 — is `linkedProperties` still scoped as count, or has it been resolved? If unresolved, this audit cross-references it (does NOT refile).
5. **Slug decision:** `pages/directory/` (no collision risk).
6. **Light dev-server peek** (~3 min): `pnpm dev` → `http://localhost:3000/directory`. Click Email + Phone buttons (confirm non-functional), click Sort dropdown (confirm no effect), click pagination buttons (confirm no effect). This validates the briefing's CHROME-vs-WIRED classifications before the skill runs.

---

## Step A — Run `/audit-page-datapoints` against `/directory`

**Skill invocation:** `/audit-page-datapoints /directory`

**Expected outputs (skill-managed):**
- `.claude/data-audit/pages/directory/audit.md` — surface inventory + page-wide findings (PFn). Stable analysis.
- `.claude/data-audit/pages/directory/plan.md` — Entity Backlog + Audit Roadmap + Fix Log scaffold.

**Audit content checklist** — verify the skill produced all of this; supplement in Step B if missed.

1. **Surface inventory** — classify all ~153 surfaces. Briefing-derived split:

   | Section | Total | WIRED | HARDCODED | PARTIAL | CHROME | Notes |
   |---|---|---|---|---|---|---|
   | Page header (breadcrumb · h1 · subtitle · Export · Add) | 5 | 0 | 0 | 0 | 5 | All chrome |
   | Toolbar (search · grid/list toggle · sort dropdown) | 4 | 2 | 0 | 0 | 2 | Sort dropdown CHROME (no onChange) |
   | Category pills (9) | 9 | 9 | 0 | 0 | 0 | All wired via `activeCategory` filter |
   | Card layout (× 12 cards × 3 layout slots) | 36 | 27 | 0 | 9 | 0 | Conditional (visibility on filter) |
   | Card data (× 12 cards × 8 fields: name, company, category, rating, reviews, initials, avatarBg, linkedProperties) | 96 | 96 | 0 | 0 | 0 | All wired direct-reads |
   | Email + Phone buttons (× 12 cards × 2) | 24 | 0 | 24 | 0 | 0 | **PF1** — schema gap |
   | Copy Info button (× 12) | 12 | 12 | 0 | 0 | 0 | Client-side clipboard, wired |
   | View Profile button (× 12) | 12 | 0 | 12 | 0 | 0 | **PF4** — no target route |
   | Pagination ("Showing X of 142" + 3 page buttons + ← →) | 8 | 1 | 1 | 0 | 6 | **PF3** — "142" hardcoded; page buttons inert |
   | Empty state | 1 | 1 | 0 | 0 | 0 | Conditional render works |
   | **TOTAL** | **~207** | **~148** | **~37** | **~9** | **~13** | (split of compound surfaces vs briefing's ~153) |

2. **Page-wide findings (PFn)** — file once at page level:
   - **PF1 — Email + Phone buttons are HARDCODED stubs.** `Professional` Zod schema (`lib/data/types/professional.ts`) has no `email` or `phone` fields. UI has 24 buttons (12 cards × 2) with no backing data. **Files Q5.X** for schema enrichment. Highest-priority finding for this page.
   - **PF2 — Sort dropdown is CHROME.** `<select>` renders 3 options (Rating / Name / Properties) but no `onChange` handler. **Files Q1.X** — wire OR remove. (Bias: wire it; the data is already in memory and sort is a 1-line update.)
   - **PF3 — Pagination is HARDCODED.** "Showing X of 142 professionals" — the "142" is a hardcoded literal; should be `professionals.length`. Three page-number buttons [1] [2] [3] are static; no `currentPage` state, no cursor. **Files Q1.Y** — real pagination (cursor-based) OR client-side slice (the dataset is small) OR remove pagination entirely (only ~6 demo records).
   - **PF4 — View Profile button has no target route.** `<button>VIEW PROFILE</button>` × 12 with no `onClick`. **Files Q1.Z** — build `/directory/[id]` profile page OR remove the button.
   - **PF5 — `HARDCODED_PROFESSIONALS[6]` fallback is intentional seed.** `queries.ts:34–107` injects 6 mock professionals when `db.professionals.list(userId)` returns empty. Mirrors `/analytics` PF6 (savedReports empty-state). Decide: replace fallback with proper empty-state UI ("No professionals yet — Add your first") and remove the seed-fallback logic. **Files Q4.M** (or next free Q4 letter) — empty-state UX vs seed-fallback.
   - **PF6 — `linkedProperties` is a scalar count, not a navigable relationship.** Cards show "Linked Properties: N" but provide no way to see WHICH properties. Cross-reference Q4.A (already in `00-entity-catalog.md` §13). Do NOT refile — cite Q4.A.

3. **Entity Backlog (plan.md)** — gaps the page renders or implies:
   - **`Professional.email` + `Professional.phone`** (NEW FIELDS, not entity) — for PF1 Email/Phone buttons. Surface count: 24. Small Zod additions: `email: z.string().email().optional()` + `phone: z.string().optional()`. Seed-data updates required for ~6 records.
   - **`Professional.propertyIds: string[]` upgrade** (Q4.A) — for PF6 navigable linked-properties. Surface count: 12 cards. Cross-references entity catalog Q4.A (already filed); not refiled.
   - **`/directory/[id]` profile route** (NEW ROUTE, not entity) — for PF4 View Profile button. Surface count: 12 cards' button targets. Out of scope this audit; gated on Q1.Z resolution.
   - **Pagination state machine** (NEW DERIVATION-LIKE) — for PF3. Trivial client-side slice if dataset stays small; cursor-based if it grows. Out of scope this audit; gated on Q1.Y.
   - **Sort comparator** (NEW DERIVATION) — for PF2. Trivial 3-option comparator; out of scope this audit; gated on Q1.X.

4. **Audit Roadmap** — apply Step C bundling (WIRING-PLAYBOOK Win 1 + Win 2 + Win 3). Most surfaces are bulk direct-reads from a single entity, so bundling savings are large.

   | Audit file | Type | Surfaces | Finding |
   |---|---|---|---|
   | `directory--professional-card-direct-reads.md` | bundled lite | 96 (12 cards × 8 fields) | none systemic — verify all fields render |
   | `directory--contact-buttons.md` | full | 24 (Email + Phone) | Cite PF1; cross-ref Q5.X |
   | `directory--filter-controls.md` | bundled lite | 11 (search input + 9 category pills + grid/list toggle) | none systemic — verify filter chain |
   | `directory--pagination.md` | full | 8 | Cite PF3; cross-ref Q1.Y |
   | `directory--card-actions-stubs.md` | bundled lite | 24 (Copy + View Profile) | Cite PF4 for View Profile half |
   | `directory--sort-and-empty-state.md` | full | 4 (sort dropdown options + empty-state) | Cite PF2 + PF5 |

   **Total: 6 audit reports covering ~167 surfaces.** (Without bundling: ~150 individual files. Saves ~6 hours.) CHROME page-header surfaces NOT individually audited.

---

## Step B — Findings supplement (manual)

After the skill runs, supplement any gaps:
- Confirm all 6 PFn rows above are filed in §8 Findings; if skill missed any (especially PF5 + PF6 since they're cross-referencing rather than net-new), add them
- Confirm Entity Backlog has 5 rows in `plan.md`
- Confirm Audit Roadmap has 6 reports with the bundling above
- Bump `audit.md` revision to 1; set `plan.md` status: `"audit complete · no wiring yet"`

If the skill's output already contains everything above, this step is a no-op verification.

---

## Step C — Q-number filings

Append to `.claude/data-audit/ref/05-open-questions.md`. Letter assignment is "next free letter under the right Q-section" — verify against current state of the file before claiming a letter.

- **Q5.X (Q5 — data semantics / schema enrichment)** — **Add `email` + `phone` fields to `Professional` schema.** Currently absent; UI has 24 non-functional buttons. Candidates: (a) two optional string fields with email regex on `email`; (b) one combined `contacts: {email?, phone?, secondary?}` object; (c) defer to a separate Contact entity (over-engineered for ~12 records). Recommend (a). **Blocks PF1 fix.**
- **Q1.X (Q1 — UX / page scope)** — Sort dropdown: should "Rating / Name / Properties" actually sort the cards, OR is the dropdown decorative? Bias: wire it. Trivial implementation; data is already in memory. **Blocks PF2 fix.**
- **Q1.Y** — Pagination scope: real cursor-based pagination (hardcoded "142" → `professionals.length`; replace 3 fake page buttons with computed buttons), OR client-side slice (acceptable while dataset is small), OR remove pagination entirely. **Blocks PF3 fix.**
- **Q1.Z** — `View Profile` button target: build a `/directory/[id]` profile page route, OR remove the button until that page exists? **Blocks PF4 fix.**
- **Q4.M (or next free Q4 letter)** — `HARDCODED_PROFESSIONALS[6]` empty-state UX: replace seed-fallback with proper empty-state UI ("No professionals yet — [Add Your First]") and remove the fallback logic in `queries.ts:34–107`? Mirrors `/analytics` PF6 / Q4.I pattern. **Blocks PF5 fix.**

If letter clashes, bump to the next free letter. Cross-link from PFn rows in audit.md. **Q4.A is NOT refiled** — PF6 cross-references the existing entry in `00-entity-catalog.md` §13.

---

## Step D — Index updates

1. **`.claude/data-audit/INDEX.md`** — append a row for `/directory` (slug `directory`, audit date, finding count: 6 PFn).
2. **`.claude/data-audit/pages/INDEX.md`** — append `/directory` rows to cross-page entity backlog. New entries:
   - `Professional` — 96 WIRED surfaces (card direct-reads) + 24 HARDCODED surfaces (Email/Phone buttons). Net-new entity row in INDEX (first audit citing this entity).
   - `Professional.email` / `Professional.phone` schema gap — 24 surfaces (PF1 entity backlog row).
   - `/directory/[id]` route gap — 12 surfaces (PF4 backlog row, route-level not entity-level).
3. **`.claude/data-audit/pages/SUMMARY.md`** — re-run sort `(pages_touched DESC, surfaces DESC)`. **No rerank expected** — `Professional` shows up at 1 page · 96 surfaces, comparable to other single-page entities like CoOwner (1 page · 10) but bigger; doesn't displace any top-3 ranks. Add a "Last updated 2026-05-06" footer note.
4. **`.claude/data-audit/docs/PHASES.md`** — flip Phase 8.4-audit row to ✅; add this plan to "Archived plan files" as `Plan-Phase-8.4-Directory-audit.md`. Update "Last updated" footer.

---

## Verification

- [ ] `.claude/data-audit/pages/directory/audit.md` exists with ~150–207 surfaces classified and 6 PFn findings filed
- [ ] `.claude/data-audit/pages/directory/plan.md` exists with Entity Backlog (5 rows) + Audit Roadmap (6 reports planned)
- [ ] `pages/INDEX.md` updated with `Professional` (net-new entity row) + email/phone gap + route gap
- [ ] `INDEX.md` (root) has new directory page-audit row
- [ ] `SUMMARY.md` reflects Professional addition (no rerank expected)
- [ ] `PHASES.md` Phase 8.4-audit row flipped to ✅; archived plan list updated
- [ ] `ref/05-open-questions.md` has 5 new Q-letters appended (Q5.X, Q1.X, Q1.Y, Q1.Z, Q4.M)
- [ ] PF6 cites Q4.A; Q4.A is **not** refiled
- [ ] No code in `app/`, `components/`, or `lib/` is modified — audit-only phase

---

## What this unblocks

- **Q-resolution gate** — Q5.X (Email + Phone schema fields) is small and unblocked-by-default (recommend option a). Q1.X / Q1.Y / Q1.Z / Q4.M are UX scope decisions; need product input. Async to agent work.
- **Phase 8.4-Wiring** (sub-phase 2) — drafted after Q-resolution. Likely scope: add Email + Phone to schema + seed data; wire buttons; wire sort dropdown; replace pagination with client-side slice (or remove); replace HARDCODED_PROFESSIONALS fallback with empty-state. Small wiring (~2–3 hours).
- **Phase 8.4-Post-Wiring** (sub-phase 3) — same shape as `Plan-Phase-8.1-Analytics-Post-Wiring.md`. ~1.5 hours.
- **Phase 8.4-route** (NEW conditional sub-phase) — only if Q1.Z resolves to "build profile route." Then `/directory/[id]` audit + wiring becomes its own pair of plans. Out of scope here.
- **Entity Catalog Refresh** — already-archived plan should pick up `Professional.email` + `Professional.phone` additions when it runs.

---

## Time estimate

| Step | Effort |
|---|---|
| Step 0 (re-read 6 source files + light dev-server peek) | 10 min |
| Step A (run skill + verify outputs) | 30–40 min |
| Step B (manual findings supplement, mostly verification) | included in Step A |
| Step C (Q-number filings — 5 small letters) | 15 min |
| Step D (index updates, no rerank) | 10 min |
| **Total** | **~1–1.5 hours** |

Significantly faster than `/analytics` (~2h) and `/rental` (~2h) because:
- Single entity, no derivations
- Pure 1:1 projection — most surfaces trivially WIRED
- Only 5 small Q-letters vs 5+ big ones for analytics/rental
- No SUMMARY rerank
- Heavy bundling savings (6 reports for 150+ surfaces)

---

## Out of scope

- **Sub-phase 2 (Wiring) and sub-phase 3 (Post-Wiring) for `/directory`.** Separate plans after Q-resolution gate; see PAGE-AUDIT-WORKFLOW.md.
- **Building the `/directory/[id]` profile page.** Gated on Q1.Z; would be its own audit+wiring pair.
- **Adding `Professional.email` / `Professional.phone` to schema and seed data.** Findings only; build waits for Q5.X resolution and Phase 8.4-Wiring plan.
- **Wiring sort dropdown / replacing pagination / removing HARDCODED_PROFESSIONALS.** Filed as PF2/PF3/PF5; gated on Q1.X / Q1.Y / Q4.M.
- **Audits of `/`, `/settings`, `/profile`, `/estate-planning`, `/add-property`, `/auth/*`** — separate Phase 8.x plans.
- **Refiling Q4.A (linkedProperties as array of property IDs).** Already in `00-entity-catalog.md` §13; this audit cross-references it via PF6.
- **Any code changes anywhere.** Audit-only phase.

---

## Critical files (reference)

**To be inventoried (read-only this phase):**
- `app/(shell)/directory/page.tsx`
- `app/(shell)/directory/queries.ts` (note: `HARDCODED_PROFESSIONALS[6]` fallback constant at lines 34–107)
- `app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx`
- `lib/data/types/professional.ts` (Zod schema — confirm Email/Phone gap)
- `lib/data/db/professionals.ts`
- 2–3 records under `public/data/users/demo-user/professionals/`

**To be created:**
- `.claude/data-audit/pages/directory/audit.md`
- `.claude/data-audit/pages/directory/plan.md`
- `.claude/data-audit/docs/plans/Plan-Phase-8.4-Directory-audit.md` (archive of this plan — to be created at execution start, since plan mode blocked the dual-write)

**To be appended:**
- `.claude/data-audit/INDEX.md`
- `.claude/data-audit/pages/INDEX.md`
- `.claude/data-audit/ref/05-open-questions.md`

**To be updated in-place:**
- `.claude/data-audit/pages/SUMMARY.md`
- `.claude/data-audit/docs/PHASES.md`

---

## Plan-mode caveats

- The refined `Phase 8.2-audit` plan content (from earlier in this session) is overwritten by this 8.4 plan in the active slot. The 8.2 archive (`Plan-Phase-8.2-Rental-Dashboard-audit.md`) is the OLDER pre-restructure version. Refined 8.2 content recoverable from this conversation history.
- Dual-write to archive (`Plan-Phase-8.4-Directory-audit.md`) is blocked by plan mode; first action upon exit will be to copy this plan to the archive AND sync the 8.2 archive.
