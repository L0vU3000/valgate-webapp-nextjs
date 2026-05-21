# Plan — Phase 10: Home/Map (`/`) Audit (audit-only)

## Context

`/` is one of the three routes still flagged as "not yet audited" in `.claude/data-audit/ref/09-page-wiring-status.md`. The audit corpus describes it as "map + dashboard composite" — the route that loads when a user opens the app.

From exploration: the route is at `app/(shell)/page.tsx` and renders an interactive Mapbox map with Property pins (clustered via Supercluster), a property-detail drawer, a `PortfolioLegend` stats pill, a `CommandPalette` (⌘K) with quick-action buttons, and the same `PropertyTable` that `/portfolio` uses as an accordion at the bottom. The wiring quality is already high — `~45 of ~52` surfaces are bound to real `Property` entities via `computeStats` and direct reads.

**Phase 10 is audit-only.** Two decisions resolved upfront in plan review:

1. **PF1 (drawer hero image) is deferred** — every property today shares one hardcoded Unsplash URL, but per user direction we will not introduce a `Property.imageUrl` schema field in this phase. The hero image will be addressed jointly with Q5.C (storage provider) so the wizard's photo upload and the drawer's hero land together. Phase 10's `audit.md` files PF1 with **deferred upfront**.
2. **No wiring in Phase 10** — once `audit.md` + `plan.md` are produced and Q-codes are filed, this phase closes. Wiring becomes **Phase 10.1**, planned separately after the user reviews the audit findings and resolves the Q-codes.

After Phase 10 lands, `ref/09-page-wiring-status.md` row count moves from `16 + 2 unaudited → 17 + 1 unaudited`. Auth flows (`/login`, `/register`, `/auth/*`) stay deferred until Clerk integration.

Phase 9 (`/add-property`) immediately precedes this. Phase 11 candidate (rental wiring on `/property/[id]/rental`, per `ref/10-input-data-map.md` § Build Order) is unaffected by Phase 10 timing.

---

## Scope

| Item | Count / Note |
|---|---|
| Route audited | `/` |
| Files to walk | 7 — `page.tsx`, `queries.ts`, `HomePage.tsx`, `PortfolioLegend.tsx`, `MapView.tsx`, `MapControls.tsx`, `CommandPalette.tsx` (plus `PropertyTable.tsx` by reference only) |
| Estimated surfaces | ~52–58 (legend 6 · drawer 13 · map pins 30+ · command palette 5 · table 16 cited) |
| Estimated WIRED already | ~45 |
| Estimated HARDCODED / candidates for PF | 3–5 (hero image; rotating-search placeholders; possible Progress drift) |
| New entities required | 0 |
| New schema fields | 0 (PF1 imageUrl deferred to Phase 10.1 / Q5.C) |
| Code changes | **0** (audit-only) |
| Expected PFn | ~4–6 (1 deferred-upfront, 2 cited as cross-page, 1–3 actionable) |
| Q-numbers expected | 1–2 (image source decision deferred; Progress/health verification needed) |

---

## Source Files

| File | Role |
|---|---|
| `app/(shell)/page.tsx` | Server Component entry; calls `getHomePageData()` |
| `app/(shell)/queries.ts` | Data fetching layer — returns `initialProperties` + `portfolioStats` |
| `app/(shell)/_components/HomePage.tsx` | Client shell — map + drawer + legend + table + command palette |
| `app/(shell)/_components/PortfolioLegend.tsx` | Stats pill (totalValue, count, rented/vacant, avgProgress) |
| `components/map/MapView.tsx` | Mapbox + Supercluster cluster visualization |
| `components/map/MapControls.tsx` | Zoom in / out / reset buttons |
| `components/home/CommandPalette.tsx` | ⌘K search + 4 quick-action buttons |
| `components/portfolio/PropertyTable.tsx` | Reused from `/portfolio` — audit by reference, do not re-walk |
| `lib/data/derivations/portfolio.ts` | Owns `computeStats` (consumed by both `/portfolio` and `/`) |
| `lib/data/types/property.ts` | `PropertyCoreSchema` — referenced for narrowing decision (HomeListItem) |

---

## Sub-phase 1 — Audit (`/audit-page-datapoints` skill) — the entire Phase 10

**No code changes.** Produce two files under `.claude/data-audit/pages/home/`:

- `audit.md` — Surface Inventory (all ~52 rows classified WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE) + Page-wide findings (PFn) + source SHAs + verification commands
- `plan.md` — Entity Backlog (likely empty — no missing entities) + Audit Roadmap + Fix Log seed (empty until Phase 10.1)

### Expected surface tally

| Class | Approx count | Notes |
|---|---|---|
| WIRED | ~40–45 | Legend stats (5), drawer fields (10–11), map pins (~30 cluster + individual), table rows cited from `pages/portfolio/audit.md` |
| HARDCODED | 3–5 | Hero image URL (PF1 deferred) · search placeholders array · possible Progress drift |
| PARTIAL | 0–1 | TBD on drawer status badge styling — same pattern as `/portfolio` |
| CHROME | ~10 | Section labels, "View Property" CTA, quick-action button labels, close X |
| DECORATIVE | ~3 | Cluster ring animation, gradient scrim on hero, command-palette flourishes |

### Page-wide findings (PFn) to file

- **PF1 — Drawer hero image is a single hardcoded Unsplash URL (DEFERRED UPFRONT).** Every property shares the same photo. No `Property.imageUrl` field; `Property.photoStorageIds[]` exists but storage upload is unimplemented. Per Phase 10 scope decision, this PF lands marked **`deferred-upfront`** with the resolution tied to Q5.C (storage provider). No fix in Phase 10 or 10.1 until storage is chosen. **Tag this as the headline finding in the audit's TL;DR with the deferred annotation.**
- **PF2 — Multi-tenant auth shim (`getCurrentUserId()` returns `"demo-user"`).** Same systemic concern as `pages/portfolio/audit.md` PF1 and `pages/property-id-overview/audit.md` PF2. Cite, don't re-explain. Q4.M.
- **PF3 — No `HomeListItem` narrowing.** Verify whether `getHomePageData()` returns the full `Property` object to the Client Component or a narrowed shape (à la `PortfolioListItem` at `lib/data/types/property.ts:76-87`). If full object, file as PII / over-serialization concern — same shape as portfolio PF1 was before narrowing landed. Actionable in Phase 10.1.
- **PF4 — Command-palette rotating placeholders are hardcoded examples.** 5 strings that read like real data ("Find tenants in District 1", "Show vacant units"). Decide: intentional UX (CHROME) or a wiring gap → tie to seeded data + use real-property names? Likely classified as CHROME with a P3 follow-up flag.
- **PF5 — `stats.avgProgress` may still use legacy `Property.health` field.** Per memory `project_property_progress_stat`, the "health" stat was renamed to weighted "Progress" (Location 15% · Financials 20% · Rental 20% · Ownership 15% · Valuation 10% · Safety 10% · Estate 5% · Docs 5%) in commit `a468a9a`. Verify whether `computeStats` reads `p.health` (drift) or the new weighted score (consistent). If drift: file as P2 schema/render bug. Actionable in Phase 10.1.
- **PF6 — No audit log of property mutations.** Mirrors `pages/portfolio/audit.md` PF2 / Q4.P. Cite, don't re-explain.

### Q-codes to file

- **Q5.X (new) — `Property.imageUrl` field, or use `photoStorageIds[0]`?** **Provisional resolution: defer entirely to Q5.C** (storage provider decision). Phase 10 files the question + marks it gated on Q5.C; no Phase 10.1 work is unblocked until Q5.C lands.
- **Q3.X (new) — Should `stats.avgProgress` use the legacy `Property.health` field or the new weighted Progress derivation?** **No provisional resolution.** Phase 10 audit reports the actual current state (`p.health` direct read vs centralized Progress); user decides during the Q-gate (between Phase 10 and Phase 10.1).
- **Q4.M / Q4.P / Q5.C** — cite existing Q-codes; no new resolution required here.

### Audit Roadmap citations (don't re-audit)

The `/portfolio` `PropertyTable` surfaces are already audited in `pages/portfolio/datapoints/*.md`. The home audit's Audit Roadmap explicitly directs: *"Per-datapoint follow-ups for table rows cite the corresponding `/portfolio` audit; do not re-run."* This keeps the home audit lean and avoids drift between the two routes' deep-dives.

### Outputs of Sub-phase 1

- `.claude/data-audit/pages/home/audit.md` (~150–200 lines)
- `.claude/data-audit/pages/home/plan.md` (~80–100 lines; Fix Log seeded empty)
- New Q-codes appended to `.claude/data-audit/ref/05-open-questions.md` (Q5.X + Q3.X or next-free letters)

---

## Out of scope for Phase 10 (handed to Phase 10.1)

Phase 10 deliberately ships the docs + Q-codes only. The following land in **Phase 10.1 — Home/Map Wiring** after Q-gate:

- Resolving Q3.X (Progress vs `health` for `computeStats.avgProgress`)
- Building the `HomeListItem` narrowed type if PF3 confirms over-serialization
- Closing PF5 (Progress drift) if confirmed
- Running per-datapoint audits on the post-wiring surfaces

The following stay deferred beyond Phase 10.1 as well:

- **PF1 / Q5.X** — hero image, gated on Q5.C storage provider decision
- **PF2 / Q4.M** — multi-tenant auth shim, cross-page, awaits Clerk integration
- **PF6 / Q4.P** — no audit log of property mutations, cross-page concern
- **PF4** — rotating placeholders treated as CHROME unless user reports confusion

---

## Files to create / modify

**New (Sub-phase 1):**
- `.claude/data-audit/pages/home/audit.md`
- `.claude/data-audit/pages/home/plan.md`
- `.claude/data-audit/phases/plans/Plan-Phase-10-Home-Audit.md` (archive copy of this plan, per archive convention)

**Update (Sub-phase 1):**
- `.claude/data-audit/INDEX.md` — append page-level row for `home` (verdict reflects the 5–6 PFn split: 1 deferred-upfront, 2 cited, 1–3 actionable in 10.1)
- `.claude/data-audit/ref/09-page-wiring-status.md` — move `/` out of "Pages NOT yet audited"; append row 17 to status table; update TL;DR (`16 → 17 audited`)
- `.claude/data-audit/ref/05-open-questions.md` — append Q5.X (deferred to Q5.C) + Q3.X (open)

**Not touched in Phase 10:**
- No app code (`app/**`, `lib/**`, `components/**`) — wiring lives in Phase 10.1
- No seed data — backfills (if any) live in Phase 10.1

---

## Verification (Phase 10 — audit-only)

1. **Surface tally check** — `audit.md` row count reconciles with a manual walk of all 7 files; tally matches inventory; source SHAs recorded in the `<details>` block.
2. **PFn count check** — every HARDCODED row in §1 maps to a PFn citation in §2 (or is explicitly chrome-classified); every PFn is either filed, cited (cross-page), or marked deferred-upfront.
3. **Q-code idempotency** — Q5.X and Q3.X appended to `ref/05-open-questions.md` use the next free letters (no collision with existing Q-codes; section letter sequencing preserved).
4. **Cross-ref consistency** — `pages/home/plan.md` § Audit Roadmap explicitly directs per-datapoint follow-ups for table rows to cite `pages/portfolio/datapoints/*.md`; PF1 in `audit.md` carries the `deferred-upfront` marker tied to Q5.C; PF2/PF6 cite the existing portfolio PFs rather than restating.
5. **No regressions** — no code, schema, or seed files touched; `git diff` confines changes to `.claude/data-audit/` and `~/.claude/plans/`.
6. **Status update** — `ref/09-page-wiring-status.md` shows `17 routes audited` with the new row including a note that this is the second input/composite route audited (after `/add-property`) and listing the 5–6 PFn deferred / actionable split.

---

## Phase 10.1 preview (for context — not part of this plan)

After Phase 10 audit lands and the user resolves Q3.X (Progress derivation choice), Phase 10.1 will:

1. Land the chosen Progress derivation in `computeStats.avgProgress` (and possibly elsewhere)
2. Introduce `HomeListItem` narrowing in `app/(shell)/queries.ts` if PF3 confirms over-serialization
3. Close the actionable PFs (PF3, PF5) in `pages/home/plan.md` Fix Log
4. Run per-datapoint audits: 1 derivation bundle (legend stats), 1 narrowing bundle (drawer direct reads), 1 map-cluster derivation. Table rows continue to cite portfolio audits.

Phase 10.1 will be re-planned at that time using the same workflow.

---

## Resolved decisions (during plan review)

1. **PF1 hero image** → deferred upfront. No `Property.imageUrl` schema field in Phase 10. Joint fix with Q5.C in a later phase.
2. **Execution flow** → split. Phase 10 = audit only. Phase 10.1 = wiring + post-wiring audits, planned separately after Q-gate.
