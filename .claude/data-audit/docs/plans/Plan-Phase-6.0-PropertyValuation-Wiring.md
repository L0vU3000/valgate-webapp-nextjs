# Plan — Phase 6.0: PropertyValuation wiring (Rank 0 quick win)

## Context

PropertyValuation is the only entity in the build order that **already exists in the codebase** but isn't wired to its UI consumers. Verified just now:

- Type: `lib/data/types/property-valuation.ts` (8 lines, real)
- DB layer: `lib/data/db/property-valuations.ts` (51 lines, full CRUD)
- Seed: `public/data/users/demo-user/property-valuations/VAL-0001`, `VAL-0002`, `VAL-0003` (3 records for PROP-0001 — Jan/Feb/Mar 2026, $1.278M–$1.310M)
- Query: `app/(shell)/property/[id]/valuation/queries.ts` already calls `db.propertyValuations.list(userId)` and passes `{ valuations }` to the component via spread in `page.tsx:17`

**What's missing:** the consuming components don't read from the prop. `PropertyValuationPage.tsx` KPI cards still use inline hardcoded literals; `PropertyOverviewPage.tsx` row 7 ("Property Valuation $24.85M") reads from the `metrics[0]` constant; `PortfolioPage.tsx:143` reads from `kpis.yoyGrowth` which is currently hardcoded as `{ kind: "unknown" }` in `computeKpis`.

This is a **pure wiring task with no schema work** — the highest immediate ROI in the entire entity sprint per the cross-page audit summary. 7 surfaces unlocked across 3 pages (`/property/[id]/valuation`, `/property/[id]/overview`, `/portfolio`) in ~half a day. Also acts as the **dress rehearsal** for the audit-dedup machinery (Task #6) — the first batched `/audit-datapoint` runs against newly-wired surfaces happen here, so any bug in the SKILL.md coupling surfaces here cheaply rather than 4 entity-PRs deep.

The intended outcome: 7 hardcoded surfaces become real-data reads; PropertyValuation status updates from "shipped, partial wiring" → "shipped, fully wired"; the Phase 6 entity-wiring sprint has a successful first run; the dedup machinery is validated end-to-end.

## Prerequisites

- **Phases 1–5 complete.** All 8 page audits exist, `pages/INDEX.md` is current, `pages/SUMMARY.md` commits the build order.
- **`lib/data/types/property-valuation.ts` and `lib/data/db/property-valuations.ts` are real implementations**, not stubs (verified).
- **Seed records exist for PROP-0001** (verified — VAL-0001/0002/0003).
- **Q3.C (YoY base-value formula) is open** — not strictly blocking, but the YoY badge wiring should use the simplest defensible formula: "latest valuation vs valuation closest to 12 months prior; NULL if no prior record exists." This is a Phase 6.0 design call to flag for review.

## Scope of this change

**Files to MODIFY (6 source files + 2 corpus files):**

1. **`app/(shell)/property/[id]/_components/PropertyValuationPage.tsx`** — replace hardcoded literals with `valuations` prop reads on rows 8 (Current Market Value), 9 (QoQ change), 12 (Total Appreciation), 13 (Appreciation gain % + purchase date sub-label), 25 (comparables footer "Your estimate"). Row 15 (Value History chart) is already wired; just add an empty-state guard.
2. **`app/(shell)/property/[id]/overview/page.tsx` + `queries.ts`** (likely needs creating queries.ts or adding to it) — fetch valuations for the property, pass to component.
3. **`app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx`** — replace `metrics[0]` hardcoded "$24,850,000" with `latestValuation?.price ?? null` from a new `valuations` prop.
4. **`app/(shell)/portfolio/queries.ts`** — additionally fetch valuations across the user's properties (not just one) to support YoY computation.
5. **`lib/data/derivations/portfolio.ts`** — update `computeKpis` to accept valuations and derive `yoyGrowth` from them. Use the simple "latest vs ~12 months ago" formula.
6. **`app/(shell)/portfolio/_components/PortfolioPage.tsx`** — no changes needed if `kpis.yoyGrowth` shape stays the same; the 3-branch render at lines 143–157 already handles positive/negative/unknown.

**Files to CREATE:**

- 7 per-datapoint audit reports under `.claude/data-audit/` (one per wired surface, full template per audit roadmap recommendation):
  - `property-id-valuation--current-market-value.md` (row 8)
  - `property-id-valuation--qoq-change.md` (row 9)
  - `property-id-valuation--total-appreciation.md` (row 12)
  - `property-id-valuation--appreciation-gain.md` (row 13)
  - `property-id-valuation--your-estimate.md` (row 25)
  - `property-id-overview--property-valuation.md` (overview row 7)
  - `portfolio--yoy-growth.md` (portfolio YoY badge)

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 7 new per-datapoint audit rows; update `pages/INDEX.md` `Status` column for PropertyValuation: `shipped, partial wiring` → `shipped, fully wired`.
- `.claude/data-audit/pages/INDEX.md` — regenerate (skill should do this on the audit batch run, but verify).
- `.claude/data-audit/pages/SUMMARY.md` — update Rank 0 row's `Status` field to `shipped, fully wired`.
- `.claude/data-audit/pages/property-id-valuation/plan.md` §5 Fix Log — append row noting PropertyValuation wiring landed.
- `.claude/data-audit/pages/property-id-overview/plan.md` §5 Fix Log — append row noting row 7 wired.
- `.claude/data-audit/pages/portfolio/plan.md` §5 Fix Log — append row noting YoY badge wired (with Q3.C resolution note).

**Files NOT touched:**

- No other entities (Lease, Tenant, Payment, Document, etc.) — they have their own future phases.
- No other constants on the affected pages (PropertyValuationPage's `comparables[]`, PropertyOverviewPage's `metrics[1]`/`metrics[2]`/`alerts[]`/etc., PortfolioPage's other KPIs).
- No reference corpus changes (`ref/00`, `ref/03`, `ref/05`) — unless Q3.C resolution gets formally documented (recommend filing as a comment on Q3.C, not a new entry).

## Single-execution approach with one mid-point pause

This is small enough to run as one focused execution (~half-day). Splitting into 6 separate prompts adds ceremony for no gain. ONE pause in the middle for visual verification — that's the only gate.

### Step A — Wiring (one execution, ~2 hours)

1. Read `pages/SUMMARY.md` Rank 0 row + `pages/property-id-valuation/plan.md` §3 PropertyValuation entity row.
2. Read `lib/data/types/property-valuation.ts` to confirm field shape (`price`, `recordedAt`, `propertyId`, etc.).
3. Read all 6 source files listed above (their current state).
4. Make all 6 source-file edits in one pass.
5. Run `npm run typecheck` (or equivalent) to confirm the edits compile.

**STOP. Hand back to user for visual verification.**

### Step B — Human dev-server check (~5 min, you do this)

1. Start the dev server.
2. Open `/property/PROP-0001/valuation` — confirm the 5 KPI cards show real values from VAL-0001/0002/0003 seed (not the hardcoded $24.85M).
3. Open `/property/PROP-0001/overview` — confirm row 7 shows the latest valuation, not the hardcoded constant.
4. Open `/portfolio` — confirm the YoY badge shows a derived value (positive/negative/unknown), not the previous hardcoded "—".
5. If anything looks wrong, hand back with notes; if everything looks right, say "go" for Step C.

### Step C — Audit batch + dedup validation + index updates (one execution, ~3 hours)

1. Run `/audit-datapoint` on the **first** newly-wired surface — e.g. valuation page row 8 (Current Market Value).
2. **Validate Task #6 dedup checklist on this report:**
   - ☐ Cites `Page-wide: see PFn in pages/property-id-valuation/audit.md` for systemic concerns (queries.ts narrowing, auth shim, etc.) — does NOT restate
   - ☐ Renders the **full** template (not lite — this is a derivation: latest-of-N)
   - ☐ TL;DR contains the `📄 Page audit: see [pages/property-id-valuation/audit.md]` back-link as the 4th bullet
3. **If any check fails:** STOP. Fix `.claude/skills/audit-datapoint/SKILL.md` coupling. Re-run the first audit. Validate again. Only proceed once all 3 ✓.
4. **If all checks pass:** continue with the remaining 6 audits (5 valuation rows + overview row 7 + portfolio YoY badge). Each follows the same pattern.
5. Update `INDEX.md` (per-datapoint table) with 7 new rows.
6. Update `pages/INDEX.md` PropertyValuation row: `shipped, partial wiring` → `shipped, fully wired`.
7. Update `pages/SUMMARY.md` Rank 0 row: same status change.
8. Append fix-log entries to the 3 affected `plan.md` files.

## Verification

After Phase 6.0 lands:

1. **Type check passes:** `npm run typecheck` (or equivalent) — zero errors.
2. **Dev server visual check:** valuation page shows real $1.31M-ish (latest VAL record), overview page shows the same, portfolio YoY badge is colored (not grey "—").
3. **7 new per-datapoint audits exist** under `.claude/data-audit/` — confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~22 now, up from 15).
4. **Dedup machinery proven:** the first audit produced cites PFn instead of restating, uses the right template, and back-links to the page audit. Task #6 marked `completed`.
5. **Status fields synced:** PropertyValuation reads `shipped, fully wired` in BOTH `pages/INDEX.md` (auto-regenerated by skill) AND `pages/SUMMARY.md` (manually edited).
6. **Fix logs appended:** 3 `plan.md` files have new entries in §5 Fix Log noting what wired.
7. **No surprise file changes:** `git status` shows only the 6 source files, the 7 new audit reports, and the 6 corpus files (3 INDEX/SUMMARY + 3 plan.md). No other source-code changes.

## What unblocks after Phase 6.0

- **Phase 6.1 — Lease + Tenant entity wiring** — the next entity in the build order. Now that the dedup machinery is proven, the chunked per-entity template (6.x.0 through 6.x.4) can be applied with confidence.
- **The dress rehearsal value:** any bug in the audit-datapoint skill's precheck/dedup logic surfaces here cheaply (7 audits to potentially re-do) rather than later in Lease+Tenant (~13+ audits).
- **First piece of "real data" landed:** the property-tab family is no longer 100% mock data on its primary KPI surfaces. Visible win, motivating the rest of the sprint.

## Time estimate

~5–6 hours total:

- **Step A (wiring):** ~2 hours
- **Step B (visual check):** ~5 min you, ~5 min me confirming the handback signal
- **Step C (audit batch + dedup validation + index updates):** ~3 hours (7 audits × ~20 min for full template + 30 min for dedup verification + 10 min for index updates)

## Out of scope (deliberate)

- Building, modifying, or designing any OTHER entity (Lease, Tenant, Payment, Document, etc.) — those are their own phases.
- Wiring any OTHER constant on the affected pages (alerts, tenants, activityItems, comparables, MarketSnapshot fields, etc.) — they belong to other entities not yet wired.
- Resolving Q3.C formally — use the "latest vs ~12 months ago" formula as a reasonable default; document the choice in the YoY-badge audit report so it can be re-litigated when Q3.C is decided.
- Touching `.context/todo-ui.md` or `deferred-database-migration.md` — wiring done is wiring done; routing to those destinations is a separate Phase 7 concern.
- Re-running any `/audit-page-datapoints` against the affected routes — the source code changes are confined to a few files; the page-level audits don't need refresh until other entities land too.
