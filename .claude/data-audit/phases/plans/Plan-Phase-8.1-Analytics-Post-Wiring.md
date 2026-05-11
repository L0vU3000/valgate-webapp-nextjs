# Plan — Phase 8.1 Post-Wiring: Verify, audit-batch, and close out `/analytics`

> The `/analytics` wiring landed in working tree (per `Plan-Phase-8.1-Analytics-Wiring.md`). This phase processes everything that comes AFTER the wiring lands: visual verification, the 8 per-surface `/audit-datapoint` deep-dives, Q-number close-out, audit.md / plan.md fix-log updates, and INDEX/SUMMARY/PHASES sync. **No further code changes** — verification + record-keeping only.

---

## Context

The /analytics page audit (Phase 8.1, 2026-05-06) filed 6 PFn findings + 1 row-38 sub-finding and 5 blocking Q-numbers. The wiring plan (`Plan-Phase-8.1-Analytics-Wiring.md`) executed and the working tree now has the full fix.

**Key architectural choice the wiring made:** rather than splitting operating expenses across `MaintenanceItem.cost + Property.annualPropertyTax + Property.annualInsurance` (Q3.K's original resolution candidate), the wiring uses the existing **`Expense` entity** (shipped Phase 6.2; categories: Maintenance / Utilities / Insurance / Tax / Management / Other) as the canonical source. This is cleaner than the Q3.K candidate path: one entity vs three sources, extensible categories, and `Expense.date` already supports per-period filtering. The original Q3.K candidate-formula split remains valid for any future page that prefers it; this is an implementation refinement, not a deviation.

**Working-tree changes (`git diff`):**
- `app/(shell)/analytics/queries.ts` — adds `expensesDb.list(userId)`; threads `period` → `periodToWindow(window)` through derivations; returns `expenseBreakdownTotal` + `period`
- `app/(shell)/analytics/page.tsx` — reads `searchParams.period` (default `12M`), passes to queries + component (PF1 wired)
- `app/(shell)/analytics/_components/AnalyticsPage.tsx` — period buttons → `router.push(?period=X)`; occupancy `91.4%` + sparkline replaced with live KPI scalar + "Point-in-time" label (PF4); donut center `$48k` replaced with formatted `expenseBreakdownTotal` (Row 38); empty saved-reports gets `"No saved reports yet."` copy (PF6 partial)
- `lib/data/derivations/analytics.ts` — adds `periodToWindow()` + `monthsInWindow()` helpers; `computeRevenueSeries` consumes `Expense.amount` per-month (PF2); `computeKpiCards` now computes NOI = `totalRevenue − windowExpenses` (PF3); `computeExpenseBreakdown` returns `{items, total}` driven by `Expense.category` (PF5); `computeMaintenanceSpend` switched to `Expense.amount` where `category="Maintenance"` (PF5-sub)

**Q-number alignment:**

| Q # | State | What this phase does |
|---|---|---|
| Q3.K | ✅ already resolved (option c, both) | Add **implementation-note addendum** explaining Expense entity supersedes the candidate-formula path |
| Q3.L | ✅ already resolved (same) | Same addendum |
| Q1.F | ❓ filed, no Resolved block | Append Resolved block (option a — wire it via URL searchParam) |
| Q4.S | ❓ filed, no Resolved block | Append Resolved block (option a — point-in-time only, drop sparkline) |
| Q5.U | ❓ filed, no Resolved block | Append Resolved block (option b extended — real categories from Expense entity) |
| Q4.I | ⏸️ deferred | Append partial-mitigation note (PF6 empty-state copy added; entity decision deferred) |

**Seed-data sanity (already verified during planning):** `public/data/users/demo-user/expenses/` contains 22 records covering all 6 categories (5 Maintenance · 6 Utilities · 3 Insurance · 3 Tax · 3 Management · 2 Other). Full coverage to drive every derivation.

**Scope guardrail:** This phase processes ONLY the `/analytics` slice. `git status` shows ~30 other modified files (broader branch work — db files, other page components, ref docs); those are **out of scope** for Phase 8.1 post-wiring. Touch only the analytics-specific audit/plan/index/Q-number/PHASES updates listed below.

---

## Prerequisites

Read before Step 0:

- `.claude/data-audit/CLAUDE.md` — fix-recording protocol (the 9-step in-place update flow for resolved findings)
- `.claude/data-audit/pages/analytics/audit.md` — current findings (rev 1) — the source of truth this phase strikes through
- `.claude/data-audit/pages/analytics/plan.md` — Audit Roadmap §4 (the 8 reports to write) + Fix Log §5 (the rows to fill in)
- `.claude/data-audit/WIRING-PLAYBOOK.md` — Step C bundling rules (Win 1 / Win 2 / Win 3)
- `.claude/data-audit/ref/05-open-questions.md` — bodies of Q1.F / Q3.K / Q3.L / Q4.S / Q5.U (for resolution drafts)
- `.claude/data-audit/docs/plans/Plan-Phase-8.1-Analytics-Wiring.md` — the wiring plan that just executed (for cross-reference)

**Files under verification (read-only this phase — must NOT change):**
- `app/(shell)/analytics/page.tsx`
- `app/(shell)/analytics/queries.ts`
- `app/(shell)/analytics/_components/AnalyticsPage.tsx`
- `lib/data/derivations/analytics.ts`
- `lib/data/types/expense.ts`
- `lib/data/db/expenses.ts`
- `public/data/users/demo-user/expenses/EXP-000{1..22}/core.json`

---

## Step 0 — Pre-flight

1. **Type check:** `pnpm tsc --noEmit` — confirm clean.
2. **Diff scope check:** `git diff --stat` should show exactly 4 analytics-specific files changed for this slice. If other files surface, decide split.
3. **Lint pass on the eslint-disable:** confirm `_window: DateWindow` in `computeMaintenanceSpend` is intentional (the function ignores the period window — always trailing 6M because the card is labelled "6M"). Document that decision in the maintenance-spend audit report.
4. **Seed sanity:** confirm 22 expense records still present across 6 categories (already verified during planning).

> Both pending plans (Entity Catalog Refresh + Phase 8.2 Rental Dashboard audit) have already been archived to `.claude/data-audit/docs/plans/` so that work isn't lost.

---

## Step A — Visual / dev-server verification

Run `pnpm dev`, navigate to `http://localhost:3000/analytics`. For each finding, verify the fix landed before any audit reports go in.

| Finding | Expected post-wiring behavior | Pass criteria |
|---|---|---|
| **PF1** — period filter wired | Click MTD / QTD / YTD / 12M / Custom in turn | URL changes to `?period=X`; chart data + KPI values shift; `Custom` falls through to 12M |
| **PF2** — expense series non-zero | Look at revenue chart | Blue "Expenses" line shows real per-month values from `Expense.amount`; non-zero where seed has records |
| **PF3** — NOI ≠ Total Revenue | Compare NOI value to Total Revenue | Different values; NOI badge `positive` reflects `noi >= 0` (red if negative) |
| **PF4** — occupancy scalar wired | Inspect Occupancy card | Same value as KPI strip; sparkline absent; subtitle "Point-in-time" not "Trend: Downward" |
| **PF5** — Expense breakdown by category | Inspect donut + legend | Slices for whichever categories present in window; colors from `EXPENSE_COLORS`; donut center shows formatted total |
| **PF5-sub** — maintenance spend in dollars | Inspect "Maintenance Spend (6M)" bars | Dollar values from `Expense.amount` where `category="Maintenance"`, not item counts |
| **PF6** — empty-state copy | Inspect Saved Reports section | Shows "No saved reports yet." (since `savedReports: []` still ships empty) |
| **Row 38** — donut center wired | Inspect donut center text | Formatted `expenseBreakdownTotal` (e.g. `$2.6k`), not hardcoded `$48k` |

If any verification fails: stop, report, do NOT proceed to Step B with broken wiring.

---

## Step B — Per-surface audit batch (`/audit-datapoint` runs)

Run the 8 reports from `pages/analytics/plan.md` §4 Audit Roadmap. Apply WIRING-PLAYBOOK Step C bundling: 4 lite-bundled + 4 full. Each report records source-file SHAs, confirms live values, captures any new findings (most should be ≤1 P3 each post-wiring), and auto-appends a row to root `INDEX.md`.

| File | Template | Surfaces | Wiring under test | PFn cite |
|---|---|---|---|---|
| `analytics--kpi-strip-direct-reads.md` | lite (bundle) | 5 | KPI direct reads (Total Revenue · Occupancy · Rent Collection · Maintenance · change badges) | none |
| `analytics--noi-kpi.md` | full | 1 | NOI = Revenue − windowExpenses; positive flag | PF3 (resolved) |
| `analytics--revenue-chart.md` | full | 3 | Per-month revenue + expense aggregation; Expense.amount source | PF2 (resolved) |
| `analytics--occupancy-card.md` | full | 1 | Scalar wired to KPI; sparkline removed; "Point-in-time" label | PF4 (resolved option a) |
| `analytics--lease-pipeline-direct-reads.md` | lite (bundle) | 3 | (no wiring change — was already WIRED) | none |
| `analytics--capital-growth-direct-reads.md` | lite (bundle) | 4 | (no wiring change — was already WIRED) | none |
| `analytics--expense-breakdown.md` | full | 4 | `Expense.category` groups; donut center wired to total | PF5 (resolved option b strong); Row 38 sub |
| `analytics--maintenance-spend.md` | lite | 2 | Switched from MaintenanceItem.count → Expense.amount where category=Maintenance; trailing 6M | PF5-sub |

**Total: 8 reports covering 23 surfaces.** ~52 min of audit work (4 lite × 3 min + 4 full × 10 min) + ~10 min for any new finding drafting = **~60–70 min total**.

For each report, follow CLAUDE.md §"How to record a fix" — strikethrough resolved findings, append `**Resolved:**` lines with commit SHA, refresh source-file SHAs (`git hash-object <path>`).

---

## Step C — Q-number resolution close-out

In `.claude/data-audit/ref/05-open-questions.md`, append blocks under each Q-letter:

### Q1.F — period filter
> **Resolved 2026-05-06 (Phase 8.1 Post-Wiring): Option (a) — wire it.** Period buttons now drive `?period=X` URL searchParam → `getAnalyticsPageData(period)` → `periodToWindow()` → all derivations filter to window. `Custom` falls through to 12M default; future enhancement could add a date-range picker. **Unblocks PF1.**

### Q3.K + Q3.L — implementation-note addendum (below existing Resolved blocks)
> **Implementation note 2026-05-06 (Phase 8.1 Post-Wiring):** rather than splitting the operating-expense pool between `MaintenanceItem.cost` and pro-rated `Property.annualPropertyTax + annualInsurance`, the wiring uses the existing **Expense entity** (shipped Phase 6.2; categories Maintenance / Utilities / Insurance / Tax / Management / Other) as the canonical source. Equivalent under current seed data; cleaner because (a) one entity vs three sources, (b) extensible to future categories without schema changes, (c) `Expense.date` already supports per-period filtering. The `MaintenanceItem.cost` + Property tax/insurance fields path remains valid for any future page that prefers it.

### Q4.S — occupancy time-series
> **Resolved 2026-05-06 (Phase 8.1 Post-Wiring): Option (a) — point-in-time only, drop sparkline.** The 6-point hardcoded sparkline at the original `AnalyticsPage.tsx:270` is removed. Card now shows live `kpiCards.find(k => k.label === "Occupancy").value` with subtitle "Point-in-time". Stored snapshots (option b) deferred to Phase 9 backend migration; if reintroduced, the new data source feeds back into this same card. **Unblocks PF4.**

### Q5.U — Utilities label
> **Resolved 2026-05-06 (Phase 8.1 Post-Wiring): Option (b) extended — real categories from Expense entity.** Stronger than Q5.U's original option (b): rather than just adding a `Property.annualUtilities` field, the wiring uses the full `Expense.category` enum (6 values) as donut slice categories. Each slice's `pct` is computed from `Expense.amount` aggregations within the window. The "Utilities" slice now shows real utilities cost (6 seed records). **Unblocks PF5.**

### Q4.I — SavedReports (leave deferred; add note)
> **Partial mitigation 2026-05-06 (Phase 8.1 Post-Wiring):** PF6 empty-state copy added ("No saved reports yet.") to handle the always-empty `savedReports: []` array gracefully. Entity decision (real SavedReport entity vs remove the card vs empty-only) remains deferred. No other surface impact at this time.

---

## Step D — audit.md + plan.md fix-log update

### `.claude/data-audit/pages/analytics/audit.md`
Per CLAUDE.md §"How to record a fix":
1. Front-matter: bump `revision: 1 → 2`, `date: 2026-05-06`, set `verdict: "✅ 6 of 7 findings resolved · PF6 partial · Q4.I deferred"`
2. TL;DR — refresh to post-wiring state (note Expense-entity reframe)
3. §8 Findings — strikethrough headers for PF1, PF2, PF3, PF4, PF5, Row 38 (`~~PF1 — ...~~ — ✅ resolved in Revision 2`); append `**Resolved:**` line under each Fix block citing commit SHA + 1-line summary; PF6 keeps open-status with `**Partial:**` line
4. `<details>` Source files & hashes — bump SHAs for the 4 modified files (`git hash-object <path>`)
5. `<details>` Revision history — append: "Revision 2 (2026-05-06): PF1+PF2+PF3+PF4+PF5+Row38 resolved via Expense-entity reframe + period-filter URL wiring; PF6 partial; Q1.F/Q4.S/Q5.U closed; Q3.K/Q3.L addendum filed; Q4.I deferred."

### `.claude/data-audit/pages/analytics/plan.md`
1. Front-matter: `status: "audit complete · no wiring yet"` → `"shipped, fully wired (PF6 partial, Q4.I deferred)"`
2. §1 Summary table — flip WIRED / PARTIAL / HARDCODED counts to post-wiring numbers (most HARDCODED rows → WIRED)
3. §2 Blocking Q-numbers table — flip Q1.F / Q3.K / Q3.L / Q4.S / Q5.U status cells to ✅; Q4.I row remains "🔜 deferred"
4. §5 Fix Log — fill in commit SHA + status (Resolved/Partial) + brief note for each PFn row + Row-38

---

## Step E — Index + cross-page sync

1. **`.claude/data-audit/INDEX.md`** — bump `analytics` page-audit row revision count `1 → 2`, refresh verdict cell. Append 8 new per-datapoint rows from Step B.
2. **`.claude/data-audit/pages/INDEX.md`** — Expense entity gains 12 surfaces on `/analytics` (revenue chart × 3, NOI × 1, expense breakdown × 4, maintenance spend × 2, KPI Maintenance card × 1, donut center × 1). Re-run sort `(pages_touched DESC, surfaces DESC)`. Expense was already top-3 from Phase 6.2; analytics surfaces just reinforce.
3. **`.claude/data-audit/pages/SUMMARY.md`** — minor update only (Expense already in build order). Add "Last updated 2026-05-06" footer note: "Phase 8.1 Post-Wiring landed; /analytics now ✅ fully wired."
4. **`.claude/data-audit/docs/PHASES.md`** — flip the analytics row in side-workstreams; add new **Phase 8.1 Post-Wiring** row with status ✅; in "Archived plan files" add `Plan-Phase-8.1-Analytics-Post-Wiring.md` AND the two pre-archived plans (`Plan-Entity-Catalog-Refresh.md`, `Plan-Phase-8.2-Rental-Dashboard-audit.md`). Update "Last updated" footer.

---

## Verification (end-of-phase checklist)

- [ ] `/analytics` renders correctly across MTD / QTD / YTD / 12M / Custom periods
- [ ] All 6 PFn findings have status updates (5 ✅ + 1 partial) with commit SHAs in `pages/analytics/plan.md` §5 Fix Log
- [ ] 8 new per-surface audit reports exist in `.claude/data-audit/` and root `INDEX.md` per-datapoint table
- [ ] Q1.F / Q4.S / Q5.U have Resolved blocks; Q3.K + Q3.L have implementation-note addenda
- [ ] Q4.I remains deferred; PF6 partial mitigation documented
- [ ] `audit.md` revision bumped to 2; `plan.md` status updated; source-file SHAs refreshed
- [ ] `pages/INDEX.md` Expense surface counts updated
- [ ] `PHASES.md` Phase 8.1 Post-Wiring row added; three archived plans listed
- [ ] `pnpm tsc --noEmit` clean
- [ ] No code in `app/`, `lib/`, or `components/` modified during this phase (audit-only, record-keeping-only)

---

## What this unblocks

- **Phase 8.2** — `/rental` (top-level) audit. Plan already drafted (archived as `Plan-Phase-8.2-Rental-Dashboard-audit.md`). Largest finding is multi-unit `Unit` entity question (Q4.X).
- **Phase 6.9** — PropertyComparable / MarketSnapshot derivations. Q4.Q already resolved; the analytics page-header subtitle "Comparative analysis across all assets" gives the wiring a UI consumer once 6.9 builds.
- **Entity Catalog Refresh** — pending plan archived as `Plan-Entity-Catalog-Refresh.md`. Now blocked only on the user picking when to run it.
- **Optional follow-ups (not blocking):** Q4.I SavedReport decision; Q4.S option (b) sparkline reintroduction post-Convex.

---

## Time estimate

| Step | Effort |
|---|---|
| Step 0 (pre-flight, type check, diff scope) | 10 min |
| Step A (visual verification — 8 PFn checks) | 25 min |
| Step B (8 per-surface audits, bundled) | 60–75 min |
| Step C (Q-number close-out — 5 letters) | 20 min |
| Step D (audit.md + plan.md updates) | 25 min |
| Step E (index + PHASES + cross-page sync) | 15 min |
| **Total** | **~2.5–3 hours** |

---

## Out of scope

- **Q4.I (SavedReport entity decision).** Deferred; PF6 partial mitigation only.
- **Sparkline reintroduction (Q4.S option b — stored snapshots).** Deferred to Phase 9 backend migration.
- **PropertyComparable / MarketSnapshot wiring** for the "Comparative analysis" subtitle. Phase 6.9 — separate plan.
- **Fixing the ~30 other modified files in `git status`.** Unrelated branch work (broader db layer + other page components); separate phases own them.
- **Re-running `/audit-page-datapoints`.** Page-level surface inventory hasn't changed shape (same surfaces, same sections); only finding statuses updated. CLAUDE.md says re-run the skill when surfaces gain/lose, not when wiring lands behind unchanged surfaces.

---

## Critical files

**Read-only (the wiring under verification):**
- `app/(shell)/analytics/page.tsx`
- `app/(shell)/analytics/queries.ts`
- `app/(shell)/analytics/_components/AnalyticsPage.tsx`
- `lib/data/derivations/analytics.ts`
- `lib/data/types/expense.ts`
- `lib/data/db/expenses.ts`
- `public/data/users/demo-user/expenses/EXP-000{1..22}/core.json`

**To be created (8 audit reports):**
- `.claude/data-audit/analytics--kpi-strip-direct-reads.md`
- `.claude/data-audit/analytics--noi-kpi.md`
- `.claude/data-audit/analytics--revenue-chart.md`
- `.claude/data-audit/analytics--occupancy-card.md`
- `.claude/data-audit/analytics--lease-pipeline-direct-reads.md`
- `.claude/data-audit/analytics--capital-growth-direct-reads.md`
- `.claude/data-audit/analytics--expense-breakdown.md`
- `.claude/data-audit/analytics--maintenance-spend.md`

**To be appended:**
- `.claude/data-audit/INDEX.md` (8 per-datapoint rows + analytics page row update)
- `.claude/data-audit/ref/05-open-questions.md` (5 Resolved blocks / addenda)

**To be updated in-place:**
- `.claude/data-audit/pages/analytics/audit.md` (revision bump + finding strikethroughs + SHAs)
- `.claude/data-audit/pages/analytics/plan.md` (status flip + Fix Log fill)
- `.claude/data-audit/pages/INDEX.md` (Expense surface count adjustment)
- `.claude/data-audit/pages/SUMMARY.md` (footer note)
- `.claude/data-audit/docs/PHASES.md` (Phase 8.1 Post-Wiring row + archived plans list)
