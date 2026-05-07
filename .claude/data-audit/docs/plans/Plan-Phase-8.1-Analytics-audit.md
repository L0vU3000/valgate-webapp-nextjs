# Plan — Phase 8.1: Audit `/analytics` route

> First non-property page audit. Begins **Phase 8** (audit non-property routes). Output is `pages/analytics/{audit.md, plan.md}` plus index + Q-number updates. **No code changes** — analysis only. Bugs surfaced during the audit are filed as findings, not fixed in this phase.

---

## Context

The entity sprint (Phase 6.0–6.8) is complete. Every property tab is ~95–100% wired. The next workstream is auditing the remaining unaudited routes; the handoff doc nominated `/analytics` and `/add-property`.

`/analytics` is the right starting point for three reasons:
1. **It's a pure read-side aggregator.** The `/audit-page-datapoints` classification taxonomy (WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE) fits cleanly. `/add-property` is form-heavy and would shoehorn the taxonomy.
2. **It's the heaviest cross-portfolio derivation page.** Findings are most likely to surface new Q-numbers for portfolio-level aggregation rules (NOI formula, occupancy time-series, period-filter scope, maintenance-spend basis), which then feed the deferred Phase 6.9 (PropertyComparable / MarketSnapshot derivations).
3. **Low entity-gap risk.** The page already consumes Property, Payment, Lease, MaintenanceItem, and PropertyValuation — entities wired in 6.0–6.2 + 6.8. The audit mostly *validates* the shipped entity model in a new context rather than introducing wholly new entities.

Pre-audit briefing (Explore agent, 2026-05-06) found three smoking-gun hardcoded scalars (`91.4%` occupancy + 6-point sparkline, `$48k` expense donut center, `MARCH 2024 - AUGUST 2024` timeline range), five non-functional filters (period buttons, three dropdowns, NET/GROSS toggle), and at least three derivation bugs (`expenses * 0` zeroing the revenue-chart expense series, NOI duplicating Total Revenue, "Utilities" slice computed from insurance only). These are the high-confidence finding seeds — the audit will inventory them rigorously.

---

## Prerequisites

Read before Step 0:

- `.claude/data-audit/CLAUDE.md` — folder structure + how to record fixes
- `.claude/data-audit/WIRING-PLAYBOOK.md` — Step C bundling rules (Win 1: bundle direct-read clusters; Win 2: cite PFn instead of restating; Win 3: lite template)
- `.claude/skills/audit-page-datapoints/SKILL.md` — the skill that drives this phase
- `.claude/data-audit/pages/SUMMARY.md` — current build order (no rerank expected from this audit)
- `.claude/data-audit/pages/INDEX.md` — cross-page entity backlog (will receive new `/analytics` row)
- `.claude/data-audit/ref/05-open-questions.md` — Q-numbers (new ones append here)
- One reference page audit: `.claude/data-audit/pages/portfolio/audit.md` (closest pattern — also a portfolio-aggregating route)

**Critical source files to be inventoried:**
- `app/(shell)/analytics/page.tsx` (server fetch entry)
- `app/(shell)/analytics/queries.ts` (data composition)
- `app/(shell)/analytics/_components/AnalyticsPage.tsx` (509 lines — the rendered surface)
- `app/(shell)/analytics/derivations.ts` *(verify exists — referenced by briefing)*

---

## Step 0 — Pre-flight

1. **Archive the plan first.** Plan mode prevented dual-write; the first action upon exit is `cp ~/.claude/plans/make-a-plan-for-idempotent-tiger.md .claude/data-audit/docs/plans/Plan-Phase-8.1-Analytics-audit.md`. Honors the `feedback_archive_plan_files` rule.
2. **Re-verify briefing assumptions** by re-reading `analytics/queries.ts` and `analytics/_components/AnalyticsPage.tsx`. Spot-check the three smoking-gun line numbers (251, 265, 270, 383) and confirm `derivations.ts` contains the `* 0` expression. If any line numbers drifted, note in audit.md §Source files block.
3. **Scan blocking Q-numbers.** Grep `ref/05-open-questions.md` for any of: `analytics`, `NOI`, `occupancy`, `MarketSnapshot`, `period filter`. If found, decide before Step A whether to resolve, accept default, or file a new sub-letter.
4. **No Zod check needed** — this is an audit phase, not a wiring phase. All consumed entities have Zod schemas from Batch 1–4.

---

## Step A — Run `/audit-page-datapoints` against `/analytics`

**Skill invocation:** `/audit-page-datapoints /analytics`

**Expected outputs (skill-managed):**
- `.claude/data-audit/pages/analytics/audit.md` — surface inventory + page-wide findings (PFn). Stable analysis.
- `.claude/data-audit/pages/analytics/plan.md` — Entity Backlog + Audit Roadmap (per-surface lite/full template recommendation) + Fix Log scaffold.

**Audit content checklist** (verify the skill produced these — supplement manually if missed):

1. **Surface inventory** classifies all ~60 surfaces. Estimated split from briefing:
   - WIRED: ~25 (5 KPI cards, revenue chart series, lease pipeline rows, capital-growth rows, expense-breakdown slices, maintenance-spend bars)
   - HARDCODED: 6+ (occupancy 91.4% scalar, occupancy 6-point sparkline data, "Trend: Downward" label, `MARCH 2024 - AUGUST 2024` range, `$48k` donut center, section titles)
   - PARTIAL: 5 (occupancy card overall, expense donut, maintenance spend if cost basis is wrong, saved reports, period filters that gate nothing)
   - CHROME: ~12 (header, action buttons, dropdowns, period buttons, NET/GROSS toggle, view-mode icons)
   - DECORATIVE: ~5 (gradients, dividers, icon placeholders)

2. **Page-wide findings (PFn)** — file these once at page level so per-surface audits cite instead of restate:
   - **PF1 — Filter chrome misclassification.** All five filter affordances (period buttons, 3 dropdowns, NET/GROSS toggle) render as functional UI but no downstream data is filtered. Decide: chrome-with-callout vs PARTIAL-pending-wire-up. Likely files Q-number for "should period filter actually filter?" (UX scoping).
   - **PF2 — Revenue-chart expense series is structurally zero.** `derivations.ts:61` (per briefing) computes `expenses: maintenance.filter(...).length * 0` — every data point's expense value is 0. Chart legend claims "Expenses" but the series is flatlined. **P1 correctness finding.** Files **new Q-number** for "what is the canonical expense aggregation source for the revenue chart?" (MaintenanceItem.cost? Property.annualPropertyTax + annualInsurance pro-rated? both?).
   - **PF3 — NOI KPI duplicates Total Revenue.** `derivations.ts:103` (per briefing) computes NOI identically to revenue (no expense deduction). **P1 correctness finding.** Files **new Q-number** for "NOI formula = revenue − operating expenses; what counts as an operating expense in the FS demo?" (probably the same answer as PF2's Q).
   - **PF4 — Occupancy time-series is hardcoded.** No historical Property.status snapshots exist; the 6-point sparkline (94 → 91.4) is fabricated. **P1 finding.** Files **new Q-number** for "do we want a daily/weekly Property.status snapshot table to enable occupancy trending, or compute occupancy point-in-time only?" — overlaps with Q4.K (RentalEvent / ActivityEvent — derive vs store).
   - **PF5 — Expense breakdown mislabeled.** "Utilities" pie slice is computed from insurance only (`derivations.ts:231` per briefing). **P2 finding** — relabel slice OR add utilities cost source. Likely resolves alongside PF2's Q.
   - **PF6 — `savedReports: []` always-empty.** `queries.ts:61` returns empty list; UI has no empty state. Either remove the card (CHROME) or stub a minimum row + add empty-state copy.

3. **Entity Backlog (plan.md)** — entities the page renders/implies but doesn't fetch:
   - **Tenant** — lease pipeline rows have no tenant name; fetch already resolves leases. Cheap fix; cross-references Phase 6.1.
   - **Loan / Mortgage** — `Property.monthlyPayment` / `outstandingMortgage` / `interestRate` exist on schema but never surfaced. Defer (no UI demand on this page yet — would be a `/analytics` v2 or a separate finance page).
   - **MarketSnapshot / PropertyComparable** — page header claims "Comparative analysis across all assets" but no benchmark data is rendered. Aligns with the deferred **Phase 6.9** entity. Backlog row should cite Q4.Q resolution (internal aggregation, no external API).
   - **Inspection / Risk / Document / OwnershipRecord** — not surfaced; do NOT add to backlog (different page concerns; would be `/portfolio-health` or similar).

4. **Audit Roadmap** — per-surface template recommendation. Apply Step C bundling rules from WIRING-PLAYBOOK:
   - **5 KPI cards** — WIRED via `kpiCards` array, same source files, same systemic finding (no PFn for them yet — or PF2/PF3 if NOI/Revenue formulas land on this group). **Bundle into ONE report**: `analytics--kpi-strip-direct-reads.md` (lite, table-row per surface). Saves ~30 min vs 5 separate files.
   - **Revenue chart series** (revenue + expenses) — **full** template; expenses=0 finding lives here, references PF2.
   - **Occupancy card** (value + sparkline + trend label) — **full** template; bundle the 3 sub-surfaces in one report; finding references PF4.
   - **Lease pipeline rows** — bundle into one lite report `analytics--lease-pipeline-direct-reads.md`.
   - **Capital growth rows** — bundle into one lite report `analytics--capital-growth-direct-reads.md`.
   - **Expense breakdown slices** — bundle into one lite report `analytics--expense-breakdown.md`; finding references PF5.
   - **Maintenance spend bars** — single bundled report `analytics--maintenance-spend.md`; finding references the cost-basis Q-number.
   - **Filter affordances** — do NOT individually audit. Covered by PF1.
   - **CHROME / DECORATIVE** — do NOT individually audit.

   Estimated audit-file count: **6 bundled reports + 2 full reports = 8 reports** covering ~25 audited surfaces. (Without bundling: ~25 individual reports. Saves ~3 hours.)

---

## Step B — Visual / dev-server check

Audit-only phase — no code changes — so visual sanity is light:
1. `pnpm dev`, navigate to `http://localhost:3000/analytics`. Confirm the rendered page matches the briefing's section enumeration. Note any drift in audit.md §Source files block.
2. Cross-check the three smoking-gun scalars (91.4%, $48k, March-Aug 2024 range) actually render as described.
3. Click each filter affordance. Confirm none of them change the chart data (validates PF1).

If visuals drift from the briefing, update `audit.md` Surface Inventory rows, then proceed to Step C.

---

## Step C — Index updates + cross-page sync

1. **`.claude/data-audit/INDEX.md`** — append a row in the page-level audits table for `/analytics` (slug `analytics`, audit date, finding count summary).
2. **`.claude/data-audit/pages/INDEX.md`** — append `/analytics` row(s) to the cross-page entity backlog. Each entity rendered-but-not-fetched gets a row contributing to its surface count.
3. **`.claude/data-audit/pages/SUMMARY.md`** — re-run the sort rule `(pages_touched DESC, surfaces DESC)` on entities. Tenant gains 1 surface, MarketSnapshot/PropertyComparable gain ~2 surfaces. Tweak the build-order table only if a rank changes; otherwise add a `# Last updated 2026-05-06` line noting the audit landed without rerank.
4. **`.claude/data-audit/docs/PHASES.md`** — flip Phase 8 status from `🔜 Not yet planned` to either `🟡 In flight (8.1 Analytics ✅)` or full `✅ 8.1 done` per the convention. Update "Last updated" footer.

---

## Step D — Q-number filings

Append to `.claude/data-audit/ref/05-open-questions.md`. Letter assignment is "next free letter under the right Q-section":

- **Q3.X (or next free letter under Q3 — KPI definitions)** — NOI formula in FS demo: revenue − {operating expenses}. What counts as operating expenses? (Likely: MaintenanceItem.cost + property tax pro-rated + insurance pro-rated + utilities placeholder.) **Blocks PF2 + PF3 fix.**
- **Q3.Y** — Revenue-chart expense series source: same answer as Q3.X, applied as a monthly time-series. **Blocks PF2 fix.**
- **Q4.X (or next free letter under Q4 — entity / schema design)** — Occupancy time-series: stored snapshot table or point-in-time only? Overlaps Q4.K (RentalEvent derive vs store). **Blocks PF4 fix.**
- **Q1.X (or next free letter under Q1 — UX / page scope)** — Period filter (MTD/QTD/YTD/12M/Custom) — should it actually filter the underlying data on `/analytics`, or stay chrome until v2? **Blocks PF1 fix decision.**
- **Q2.X (or next free letter under Q2 — copy / labels)** — Expense breakdown labels: rename "Utilities" to "Insurance" OR add real utilities source. **Blocks PF5 fix.**

If any of these Q-letters are already taken, bump to the next free letter and cite back from the audit's PFn rows.

---

## Verification

End-of-phase checklist:

- [ ] `.claude/data-audit/pages/analytics/audit.md` exists, with `~60 surfaces classified` and `≥6 PFn findings` filed
- [ ] `.claude/data-audit/pages/analytics/plan.md` exists, with Entity Backlog (3+ rows) + Audit Roadmap (8 reports planned)
- [ ] `pages/INDEX.md` contains an `/analytics` row contributing surface counts to Tenant + MarketSnapshot/PropertyComparable
- [ ] `INDEX.md` (root) has new analytics page-audit row
- [ ] `SUMMARY.md` either reranked or has a "no rerank" footer entry
- [ ] `PHASES.md` Phase 8 status flipped + "Last updated" updated
- [ ] `ref/05-open-questions.md` has 5 new Q-letters appended (NOI / expenses / occupancy time-series / period-filter scope / expense labels)
- [ ] `.claude/data-audit/docs/plans/Plan-Phase-8.1-Analytics-audit.md` exists (archive copy of this plan)
- [ ] No code in `app/` or `lib/` is modified — this is an audit-only phase

---

## What this unblocks

- **Phase 6.9** — PropertyComparable / MarketSnapshot derivations gain a concrete UI consumer ("Comparative analysis across all assets" header on `/analytics`). Q4.Q is already resolved (internal aggregation), so 6.9 only needs an entity build + wiring plan.
- **Cleanup phase for `derivations.ts` bugs** — once Q3.X / Q3.Y resolve, a small follow-up fixes PF2 + PF3 + PF5 in one PR (~1 hour).
- **Phase 8.2** — next non-property route audit. Likely `/rental` (top-level) or `/` (home) — both pure read-side, both small. `/add-property` waits for a dedicated form-completeness lens.

---

## Time estimate

| Step | Effort |
|---|---|
| Step 0 (archive + re-read source) | 10 min |
| Step A (run skill + supplement findings) | 60–75 min |
| Step B (dev-server visual check) | 15 min |
| Step C (index updates) | 15 min |
| Step D (Q-number filings) | 10 min |
| **Total** | **~2 hours** |

Lower-bound vs prior page audits because the page is single-component and most surfaces are already WIRED — the work is in correctness-bug findings + filter-chrome triage, not entity gap discovery.

---

## Out of scope

- **Fixing any of the bugs surfaced** (`expenses * 0`, NOI duplicate, "Utilities" mislabel, hardcoded occupancy). Findings only — fixes land in a follow-up cleanup phase after Q3.X/Q3.Y resolution.
- **Wiring filters** (period, dropdowns, NET/GROSS). Filed as PF1 + Q1.X; UX scoping decision required before any wiring.
- **PropertyComparable / MarketSnapshot work** — that's Phase 6.9, separate plan.
- **Audits of `/add-property` / `/rental` / `/settings` / `/profile` / `/auth`** — separate Phase 8.x plans per route.
- **Tenant fetch on lease-pipeline rows.** Filed as Entity Backlog row in `pages/analytics/plan.md`. Wiring is a 30-min follow-up that cross-references Phase 6.1.

---

## Critical files (reference, not exhaustive)

**To be inventoried (read-only this phase):**
- `app/(shell)/analytics/page.tsx`
- `app/(shell)/analytics/queries.ts`
- `app/(shell)/analytics/_components/AnalyticsPage.tsx`
- `app/(shell)/analytics/derivations.ts`

**To be created:**
- `.claude/data-audit/pages/analytics/audit.md`
- `.claude/data-audit/pages/analytics/plan.md`
- `.claude/data-audit/docs/plans/Plan-Phase-8.1-Analytics-audit.md` (archive of this plan)

**To be appended:**
- `.claude/data-audit/INDEX.md`
- `.claude/data-audit/pages/INDEX.md`
- `.claude/data-audit/ref/05-open-questions.md`

**To be updated in-place:**
- `.claude/data-audit/pages/SUMMARY.md`
- `.claude/data-audit/docs/PHASES.md`
