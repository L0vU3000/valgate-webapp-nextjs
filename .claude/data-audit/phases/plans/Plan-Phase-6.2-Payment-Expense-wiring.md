# Plan — Phase 6.2: Payment + Expense wiring (Rank 2, multi-page entity)

## Context

Payment + Expense is **rank 2 in the build order** (`pages/SUMMARY.md`) with 13 surfaces unlocked across 2 pages (overview + rental). Phase 6.1 (Lease+Tenant) shipped on 2026-05-05 — overview and rental pages are now half-wired; this phase fills the financial half.

**Critical scope difference from 6.1:** Payment exists with full Zod (Batch 3, 10 seeds, 3 for PROP-0001) but **`Expense` does NOT exist** — no type, no Zod, no db layer, no seeds, no `db/index.ts` export. Sub-phase 6.2.1 (schema PR) is **NOT skipped** for Expense, contrary to the post-Zod-sweep default. This phase therefore has a schema-build half (Expense, ~30-40 min) followed by the wiring half (both entities, the bulk of the work). The two halves ship together — splitting them produces orphan partial-wired states (e.g. wiring `Gross Income` while leaving NOI hardcoded would create a Rule-1 stale-claim violation between adjacent KPIs).

**PF4 trap on rental page** (called out in `pages/property-id-rental/audit.md`): two module-level constants — `chartData` (lines 16-23) and `payments` (lines 27-34) — must be **explicitly deleted** during wiring, not left as fallback defaults. The plan.md flagged this as the highest-risk wiring mistake on this page.

**Q3.B note:** The Q3.B question (Monthly Income formula: expected vs received) becomes technically resolvable once Payment lands. **Phase 6.2 does not re-litigate it** — the surfaces in this phase (NOI, Gross Income, YTD Net Income, Total Rent subtotal, etc.) are all separate Payment-aggregation surfaces, not the Monthly Income KPI on overview row 8 (which 6.1 already wired with the "expected" formula). Q3.B can be revisited as a discrete schema/business decision after 6.2 ships, when the trade-offs are visible side-by-side. Documented in fix log as "now resolvable, defer to dedicated decision."

The intended outcome: Expense entity flips from "doesn't exist" → "Zod-validated entity"; 13 hardcoded surfaces become real-data reads; 13 new per-datapoint audit reports land; Payment+Expense flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; the rental page's PF4 trap is sprung cleanly.

## Prerequisites

- **Phase 6.0 complete.** PropertyValuation wired across 3 pages.
- **Phase 6.1 complete.** Lease+Tenant wired across overview + rental; rental `queries.ts` exists; both component files accept lease/tenant props.
- **All 4 Zod batches complete.** `PaymentSchema` validates at FS boundary.
- **`WIRING-PLAYBOOK.md` rules read.** Rule 1 (adjacent-hardcode sweep) is critical here — the rental Financial Overview chart bars + the 3 financial subtotals all claim relationships to each other.
- **Verified during exploration:**
  - `lib/data/types/payment.ts` — full Zod with `kind` enum (Rent/Fee/Deposit/Refund), `status` enum (Paid/Pending/Failed/Overdue), optional leaseId/tenantId
  - `lib/data/db/payments.ts` — full CRUD with Zod parse on reads
  - 10 payment seeds (PMT-0001..0010), 3 for PROP-0001 (rent payments dated late 2025–early 2026, all `kind=Rent`, `status=Paid`)
  - `lib/data/types/expense.ts` does **NOT exist** — must CREATE
  - `lib/data/db/expenses.ts` does **NOT exist** — must CREATE
  - No expense seeds — must CREATE
  - `db/index.ts` does NOT export expenses — must UPDATE
  - `overview/queries.ts` exists; fetches valuations/leases/tenants. Extend to also fetch payments + expenses
  - `rental/queries.ts` exists post-6.1; fetches leases/tenants. Extend to also fetch payments + expenses

## Step 0 — Pre-flight (~5 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog rows.** `pages/property-id-overview/plan.md` §3 (Payment+Expense covers rows 10-12: NOI, Expenses, Gross Income) and `pages/property-id-rental/plan.md` §3 (Payment+Expense covers rows 11-17, 27, 32, 33: 10 surfaces).
2. **Scan blocking Q-numbers.** Three relevant:
   - **Q3.B** (Monthly Income formula) — defer; not a Phase 6.2 surface. Document in fix log.
   - **PF4 on rental** (chartData + payments constants must be deleted) — Rule 1 territory; explicit pre-commitment in Step A.4.
   - **No new Q-numbers** introduced by Expense schema; using a pragmatic 6-field shape (id, userId, propertyId, date, category enum, amount, note?).
3. **Define Expense Zod shape now (commit to it before Step A.1):**
   ```
   ExpenseSchema = z.object({
     id, userId, propertyId,
     date: timestampSchema,
     category: z.enum(["Maintenance", "Utilities", "Insurance", "Tax", "Management", "Other"]),
     amount: z.number().nonnegative(),
     note: z.string().optional(),
   })
   ```
   - Mirrors Payment's atom usage (`idSchema`, `userIdSchema`, `propertyIdSchema`, `timestampSchema` from `_common.ts`).
   - 6-value `category` enum chosen to cover the rental page's `Expenses` subtotal grouping without forcing a new Q-number. If the future requires more granularity (e.g. "Property Tax" vs "Local Tax"), that's a future schema PR.
   - `note` optional for expenses where receipt detail isn't entered.
4. **Plan Expense seed shape:** 6-8 seeds for PROP-0001 covering 3-4 categories spread across recent months. Realistic amounts ($120-$2,500). This gives multi-record coverage for **Rule 3** mental walks on every aggregation in Step A.

## Scope of this change

**Files to CREATE (4 source files + Expense seeds):**

1. **`lib/data/types/expense.ts`** — type + Zod, ~17 lines mirroring `payment.ts` pattern.
2. **`lib/data/db/expenses.ts`** — db layer, ~40 lines mirroring `payments.ts` (collection name `expenses`, ID prefix `EXP`).
3. **`public/data/users/demo-user/expenses/EXP-0001..00NN/core.json`** — 6-8 seed records for PROP-0001 across recent months (Jan-Jun 2025 for chart parity).
4. **13 per-datapoint audit reports** under `.claude/data-audit/`:
   - `property-id-overview--noi.md`, `property-id-overview--expenses.md`, `property-id-overview--gross-income.md`
   - `property-id-rental--ytd-net-income.md`, `property-id-rental--balance-due.md`, `property-id-rental--financial-overview-chart.md`, `property-id-rental--period-label.md`, `property-id-rental--total-rent.md`, `property-id-rental--expenses-subtotal.md`, `property-id-rental--net-income-subtotal.md`, `property-id-rental--on-time-pct.md`, `property-id-rental--payment-history.md`, `property-id-rental--pagination.md`

**Files to MODIFY (5 source files):**

1. **`lib/data/db/index.ts`** — add `export * as expenses from "./expenses"` line.
2. **`app/(shell)/property/[id]/overview/queries.ts`** — extend `OverviewPageData` with `payments: Payment[]` and `expenses: Expense[]`; extend `Promise.all` and filter by propertyId.
3. **`app/(shell)/property/[id]/rental/queries.ts`** — same extension.
4. **`app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx`** — accept `payments` + `expenses` props; replace 3 hardcoded financial values (lines 297, 308, 312).
5. **`app/(shell)/property/[id]/_components/PropertyRentalPage.tsx`** — accept `payments` + `expenses` props; **delete `chartData` (lines 16-23) and `payments` (lines 27-34) module constants**; replace 10 surfaces (lines 174-175, 185-186 period label, 189 chart `data` prop, 203, 207, 211-212, 274, payment history table block, pagination block).

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 13 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — Payment+Expense row: `not built` → `shipped, fully wired`.
- `.claude/data-audit/pages/SUMMARY.md` — Rank 2 row: same status change; flip status emoji on Phase 6.2 in PHASES.md too.
- `pages/property-id-overview/plan.md` §5 Fix Log — append entry noting rows 10-12 wired; document Q3.B "now resolvable, deferred."
- `pages/property-id-rental/plan.md` §5 Fix Log — append entry noting rows 11-17, 27, 32, 33 wired and PF4 successfully sprung (chartData + payments constants deleted).
- `.claude/data-audit/docs/PHASES.md` — flip 6.2 status emoji 🔜 → ✅; add `Plan-Phase-6.2-Payment-Expense-wiring.md` to archived plan files; bump "Last updated."

**Files NOT touched:**

- No other entity types (Lease, Tenant, etc.) — they're settled post-6.1.
- No PropertyLayout or other component files — header/tabs already wired.
- No `_common.ts` — Expense reuses existing atoms.
- No new Q-numbers added to `ref/05-open-questions.md`.

## Step A — Wiring (~110 min) with per-surface rule annotations

Broken into 4 sub-steps. Run the ★ self-review pass at the end.

### A.1 — Expense schema build (~30 min)

1. **Create `lib/data/types/expense.ts`** with the schema committed in Step 0. Follow the Payment pattern exactly.
2. **Create `lib/data/db/expenses.ts`** mirroring `payments.ts`: `list`, `get`, `create`, `remove`. Collection `"expenses"`, prefix `"EXP"`.
3. **Update `lib/data/db/index.ts`** with the export.
4. **Create 6-8 seed records** under `public/data/users/demo-user/expenses/EXP-0001..00NN/core.json`:
   - 4-5 for PROP-0001 dated Jan-Jun 2025 (covers chart period, gives ~$3,000-$3,500 to match the existing hardcoded $3,250 expenses subtotal)
   - 1-2 for other properties (so the propertyId filter in queries.ts is exercised)
   - Categories: Maintenance, Utilities, Insurance, Tax (gives Rule-3-friendly variety)
5. **Smoke test** — `tsc --noEmit` passes; manually parse one seed via `ExpenseSchema.parse()` mentally to confirm shape.

### A.2 — Query layer extension (~10 min)

1. **Extend `overview/queries.ts`:**
   - Add `Payment` and `Expense` imports
   - Extend `OverviewPageData` type: `payments: Payment[]; expenses: Expense[]`
   - Extend `Promise.all` to include `db.payments.list(userId)` and `db.expenses.list(userId)`
   - Filter both by propertyId
2. **Extend `rental/queries.ts`:** same pattern.
3. **Update `overview/page.tsx` and `rental/page.tsx`** to spread the new props into their respective component calls.

### A.3 — Overview wiring (3 surfaces, ~15 min)

- **Row 10 — NOI ($184.2k):**
  - **Wire:** `formatCurrency(grossIncome - totalExpenses)` for the YTD window.
  - **Rule 1 trigger:** the 72% progress bar (`width: "72%"`) claims a ratio. Either remove or compute as `noi / target` where `target` is hardcoded today (defer real target to a future ops phase). Document choice in audit.
  - **Rule 3 trigger:** both sums must use the same date window. Walk: 1 expense in window + 1 outside → only the in-window counts on both sides.
- **Row 11 — Expenses ($42.5k):**
  - **Wire:** `formatCurrency(sum(expenses, e => e.amount))` for the YTD window (or `Jan 1 of current year → today`).
  - **Rule 2 trigger:** if no expenses, render the file's existing empty-state convention (check overview's prior wiring — Phase 6.1 used `"—"`).
- **Row 12 — Gross Income ($226.7k):**
  - **Wire:** `formatCurrency(sum(payments where kind="Rent" AND status="Paid", p => p.amount))` for YTD.
  - **Rule 1 sweep:** the section heading ("Financials") doesn't claim a number; safe.
  - **Rule 3 trigger:** must use same YTD window as Expenses (row 11) and NOI (row 10) so they're consistent. Walk: 1 paid + 1 pending payment → only paid counts.

### A.4 — Rental wiring (10 surfaces, ~55 min)

**Step A.4.0 — Delete the PF4 trap (FIRST, before any wiring):**
   - Delete `chartData` constant (lines 16-23).
   - Delete `payments` constant (lines 27-34).
   - This forces compile errors that point at every site needing replacement — that's the goal. Use the errors as a wiring checklist; do not satisfy them with prop-fallback defaults.

- **Row 11 — YTD Net Income KPI ($21,875):**
  - **Wire:** `formatCurrency(rentReceivedYTD - expensesYTD)`. The "↑ +8.2% vs last year" accent is **Rule 1** territory: the prior-year comparison requires PriorYear payments + expenses, which exist in seeds (some payments dated 2024). Wire if data supports; otherwise remove the accent.
  - **Rule 3 trigger:** both halves of the diff use same YTD window.
- **Row 12 — Balance Due ($0.00):**
  - **Wire:** `sum(payments where status in ("Pending", "Overdue"), p => p.amount)`. The "Current" accent is Rule-1 — depends on whether any pending/overdue exist. If 0, accent stays "Current" (green); else "X overdue."
  - **Rule 2 trigger:** $0 is the natural empty state; format consistently.
- **Row 13 — Financial Overview chart (6 monthly rent bars):**
  - **Wire:** group `payments where kind="Rent"` by month over the period, sum amounts. Pass to `<BarChart data={...}>` (line 189).
  - **Rule 3 trigger:** group-by loop. Walk with 2 rent payments in same month → both contribute to that bar.
  - **Rule 1 sweep:** the period button label ("Jan – Jun 2025") claims the chart range; wire it from the same window.
- **Row 14 — Period label ("Jan – Jun 2025"):**
  - **Wire:** computed from chart window — earliest month → latest month from filtered payments. Today, hardcode the window to "last 6 calendar months."
- **Row 15 — Total Rent subtotal ($14,700):**
  - **Wire:** `formatCurrency(sum(payments where kind="Rent" AND status="Paid" AND in window, p => p.amount))`.
  - **Rule 1:** must equal the chart total (sum of bar heights). Mental verify in Step B.
- **Row 16 — Expenses subtotal ($3,250):**
  - **Wire:** `formatCurrency(sum(expenses where in window, e => e.amount))`.
  - **Rule 1:** must align with the existing hardcoded $3,250 if seeds total to that — confirms seed amounts in A.1 add up to a similar figure.
- **Row 17 — Net Income subtotal ($11,450, "↑ vs prior period"):**
  - **Wire:** `formatCurrency(totalRent - expensesSubtotal)`.
  - **Rule 1:** the "↑ vs prior period" accent claims a comparison; either compute prior-period or remove. Defer to remove for now (prior period requires another query window); document choice.
  - **Rule 3 trigger:** same window for both sides.
- **Row 27 — On-time payments % ("98%"):**
  - **Wire:** `formatPct(count(payments where kind="Rent" AND status="Paid") / count(payments where kind="Rent"))`.
  - **Rule 3 trigger:** numerator and denominator must agree on filter (kind="Rent"). Walk with 1 Paid Rent + 1 Late Fee (Failed) → 100% on-time, not 50%.
- **Row 32 — Payment History (6 hardcoded rows):**
  - **Wire:** `payments` (sorted by date desc, take first 6) → render rows. Direct-read fields: `date` (formatted), `kind`, `formatCurrency(amount)`, `method`, `status`. **Rule 2:** for status badges, ensure variant mapping handles Pending/Failed/Overdue without falling back to "neutral" silently.
  - This is **lite-template** material per audit (direct field reads).
- **Row 33 — Pagination ("Showing 1–6 of 24 payments / Page 1 of 4"):**
  - **Wire:** total = `payments.length`; current page hardcoded to 1; page size = 6; total pages = `Math.ceil(total / 6)`.
  - Note: "of 24" today is fictitious; with seed data total may be 3-10 — the count will look smaller and that's correct.

### ★ Self-review pass (~10 min)

After A.1-A.4 done:

1. **Rule 1 sweep across both files:** look at every wired surface; check adjacent claim-strings (progress bars, "+/- vs" accents, period labels, sub-counts). Three known: NOI 72% bar, YTD Net Income "+8.2% vs last year", Net Income "↑ vs prior period." Each must be wired, removed, or guarded.
2. **Rule 2 grep:** in both component files, grep for `"$0"`, `"—"`, `"None"`. Confirm new empty states match the most-used existing convention.
3. **Rule 3 mental walks:** run multi-record example for NOI, Gross Income, Total Rent, Net Income subtotal, Financial Overview chart, On-time %. Six aggregation loops; ~12 min of mental walks but each catches a silent class-of-bug.
4. **PF4 verification:** grep both component files for `chartData` and `payments` (as identifiers); ensure no remnants of the deleted module constants. Especially check that no fallback `?? chartData` or `?? payments` was added.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~15 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/overview` — confirm:
   - NOI shows real value (Gross Income − Expenses YTD)
   - Expenses shows real value (sum of EXP-* for PROP-0001 in YTD window)
   - Gross Income shows real value (sum of PMT-* Rent payments YTD)
   - All three numbers are internally consistent (NOI = Gross − Expenses)
3. Open `/property/PROP-0001/rental` — confirm:
   - YTD Net Income shows real value
   - Balance Due reflects pending/overdue rent (likely $0 for PROP-0001 seeds)
   - Financial Overview chart shows monthly rent bars from real payments
   - Period label matches chart range
   - 3 subtotals (Total Rent / Expenses / Net Income) are internally consistent
   - On-time payments % is correct
   - Payment History table shows real PMT-* records (likely 3 for PROP-0001)
   - Pagination reflects actual count
   - **No `chartData` or `payments` constants in source** (open file, scroll lines 16-34, confirm gone)
4. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~2.5 hours)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend overview row 10 — NOI, since it exercises both Payment + Expense aggregations and the cross-card identity check).
2. **Spot-check dedup machinery** (carryover from Phase 6.0 pattern):
   - ☐ Cites `Page-wide: see PFn in pages/property-id-overview/audit.md` instead of restating
   - ☐ Renders **full** template (NOI is a derivation)
   - ☐ TL;DR has the `📄 Page audit:` back-link
   - ☐ §3 Formula explicitly notes the YTD window + the Paid/in-window filters
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **No bundling opportunity here** — only 2 lite surfaces (Payment History, Pagination), and they don't share entity + source files cleanly. Below the 4-surface bundle threshold per WIRING-PLAYBOOK Win 1.
   - **Full template:** NOI, Gross Income, Expenses (overview), YTD Net Income, Balance Due, Financial Overview chart, period label, Total Rent, Expenses subtotal, Net Income subtotal, On-time % (rental) — **11 audits**.
   - **Compressed lite (Win 3):** Payment History (direct field reads), Pagination (simple count math) — **2 audits**.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1) renders as a one-liner stub in every audit (saves ~3 min × 13 audits ≈ 40 min cumulatively vs naive prose restating).
   - **Total reports:** 13 (no bundling for this phase).
5. Update `INDEX.md` (per-datapoint table) with 13 new rows.
6. Update `pages/INDEX.md` Payment+Expense row.
7. Update `pages/SUMMARY.md` Rank 2 row.
8. Update `docs/PHASES.md`: flip 6.2 status, add archived plan path, bump "Last updated."
9. Append fix-log entries to both affected `plan.md` files. Include Q3.B note.

## Verification

After Phase 6.2 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on both pages.** All 13 surfaces show real data; cross-surface identities hold (NOI = Gross − Expenses; Net Income subtotal = Total Rent − Expenses; chart sum = Total Rent).
4. **Expense entity exists** with 6-8 seeds, exported from `db/index.ts`, parses cleanly.
5. **PF4 trap sprung.** No `chartData` or `payments` module constants in `PropertyRentalPage.tsx` (`grep -n "^const \(chartData\|payments\) =" PropertyRentalPage.tsx` returns nothing).
6. **13 new per-datapoint audit reports** under `.claude/data-audit/`. Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~52, up from ~39 after Phase 6.1).
7. **Status fields synced.** Payment+Expense reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.2 reads ✅.
8. **Fix logs appended** to both plan.md files with Q3.B note.
9. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings (Rule 1: NOI 72% bar, YoY accents, period label all addressed). No "$0" placeholder findings (Rule 2). No conditional-sum bugs (Rule 3 — six aggregations walked).
10. **No surprise file changes.** `git status` shows: 4 source files created (expense.ts type, expense.ts db, possibly _common touch, queries extensions), 5 source files modified (db/index, 2 queries.ts, 2 component files), 6-8 seed JSONs, 13 audit reports, ~6 corpus files updated.

## What unblocks after Phase 6.2

- **Phase 6.3 — Document wiring.** Rank 3 in build order; 10 surfaces across rental + documents. Document already has Zod (Batch 3), so 6.3 is wire-only.
- **Q3.B can now be revisited** — both formulas (expected via Lease, received via Payment) are real. A short discrete decision converts overview row 8 + portfolio Monthly Income to whichever the business prefers. No longer blocking.
- **Three-quarters of rental page is real data** — combined with 6.1, only Document, MaintenanceItem, and a few activity items remain hardcoded.
- **Overview Financials card is fully real** — NOI / Expenses / Gross Income all wired, internally consistent.
- **Playbook gets stress-tested on schema-build + wiring combo** — first phase since the Zod sweep that creates a new entity inline. Lessons feed back into the per-entity sub-phase template.

## Time estimate

~5 hours total (similar to 6.1; extra ~30 min schema build offset by 4 fewer surfaces):

- Step 0 (pre-flight): ~5 min
- Step A.1 (Expense schema + seeds + db export): ~30 min
- Step A.2 (query layer): ~10 min
- Step A.3 (overview wiring, 3 surfaces): ~15 min
- Step A.4 (rental wiring, 10 surfaces + PF4 deletion): ~55 min
- ★ self-review: ~10 min
- Step B (visual check, 2 pages with cross-identity verification): ~15 min
- Step C (13-report batch + dedup spot-check + 6 corpus updates): ~2 hours
  - 11 full (~7 min each with Win 2 systemic-finding stub citation) + 2 compressed lite (~3 min each) = ~80 min audits
  - Index + SUMMARY + PHASES + plan.md updates: ~15 min
- Buffer (Expense seed amount tuning to make subtotals plausible, PF4 spillover, Q3.B fix-log wording): ~30 min

**Realistic: 5 hours. Conservative: 5.5 hours.**

## Out of scope (deliberate)

- **Re-litigating Q3.B** — the question becomes resolvable but is **explicitly deferred** to a separate decision after 6.2. Don't re-wire overview row 8 Monthly Income or portfolio Monthly Income in this phase.
- **Building or modifying any OTHER entity** (Document, MaintenanceItem, etc.) — those are their own phases.
- **Wiring any OTHER constant on the affected pages** (alerts strip, activity feed, lease summary already wired in 6.1, tenant profile already wired) — owned by other entities or already done.
- **Adding a "real target" for the NOI 72% progress bar** — defer; that's an ops/projection feature requiring a separate design.
- **Building prior-year/prior-period comparisons** for "↑ +8.2% vs last year" or "↑ vs prior period" accents — defer; mathematically possible with seeds spanning 2024-2026 but the period definition (calendar year vs trailing 12 months) is its own decision. Remove the accents in 6.2 rather than fake them.
- **Modifying any Zod schema except adding Expense** — Payment is settled.
- **Adding a `units` count to Property for rental occupancy denominator** — Q5 follow-up from 6.1; not Phase 6.2's lane.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against either page — source code changes confined to wiring.
- DDL or ERD generation updates — separate workstreams; Expense will land in a future ERD refresh.
