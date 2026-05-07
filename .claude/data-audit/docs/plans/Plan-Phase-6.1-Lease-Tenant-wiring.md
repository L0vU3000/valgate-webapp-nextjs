# Plan — Phase 6.1: Lease + Tenant wiring (Rank 1, multi-page entity)

## Context

Lease + Tenant is **rank 1 in the build order** (`pages/SUMMARY.md`) with 17 surfaces unlocked across 2 pages — the highest-leverage entity in the entire sprint. Both entities **already exist with full Zod** (Batch 3): `LeaseSchema` with 4-value `stage` enum (Approaching/Offered/Signed/Declined), `TenantSchema` with 3-value `status` enum (Paid/Overdue/Pending). 5 lease seeds (LEASE-0001..0005) and 3 tenant seeds (TEN-0001..0003) for PROP-0001 give **multi-record coverage** — Rule 3 (multi-record mental walk-through) will earn its keep here.

Phase 6.0 (PropertyValuation) proved the wiring + audit-dedup pipeline on a single-page, single-record entity. Phase 6.1 stresses it across two pages and multi-record aggregations. Two specific things this phase introduces:

1. **First multi-page wiring** — overview AND rental pages both consume Lease+Tenant. Two `queries.ts` files affected (overview already exists from Phase 6.0; rental needs to be CREATED).
2. **First playbook enforcement** — the WIRING-PLAYBOOK self-review pass lands as an explicit Step A sub-step. Three rules apply across these 17 surfaces in obvious places (see per-surface annotations below).

The intended outcome: 17 hardcoded surfaces become real-data reads; Lease+Tenant flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; 17 new per-datapoint audit reports land; the playbook proves it works on a real second-entity run.

## Prerequisites

- **Phase 6.0 complete.** PropertyValuation wired across 3 pages; audit-dedup machinery validated (Task #6 should be `completed`).
- **All 4 Zod batches complete.** `LeaseSchema` and `TenantSchema` validate at FS boundary.
- **`WIRING-PLAYBOOK.md` exists** at `.claude/data-audit/WIRING-PLAYBOOK.md`. Read it before Step A.
- **Verified during exploration:**
  - `lib/data/types/lease.ts` (19 lines, Zod'd): `Lease.tenantId` is **optional** (some leases may have no tenant assigned)
  - `lib/data/types/tenant.ts` (17 lines, Zod'd)
  - 5 lease seeds + 3 tenant seeds for PROP-0001
  - `app/(shell)/property/[id]/rental/queries.ts` does **NOT exist** — must be CREATED
  - `rental/page.tsx` currently only fetches `property` — doesn't fetch leases or tenants yet

## Step 0 — Pre-flight (~5 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog rows.** `pages/property-id-overview/plan.md` §3 (Lease entry — covers rows 8, 13, 14, 16) and `pages/property-id-rental/plan.md` §3 (Lease+Tenant entry — covers rows 5, 8–10, 18–26).
2. **Scan blocking Q-numbers.** Three found that affect this phase:
   - **Q3.B** — Monthly Income formula: "sum of `Lease.monthlyRent` where stage='Signed' AND date in current month" (expected) vs "sum of `Payment.amount`" (received). Defaulting to the **first** since Payment isn't built yet. Document the choice in the Q3.B finding when wiring overview row 8.
   - **Q4.B** — Tenant entity vs tenants embedded in Lease. Already implicitly resolved by the Zod schema (`Lease.tenantId` optional FK to Tenant; both are separate entities). No design action needed; cite Q4.B as resolved in the rental row 19 audit ("Lease.tenantId → Tenant.name").
   - **Q4.F** — Auto-create Notification rows on lease events (e.g. lease-expiring alert). This affects overview row 16 (the alert strip's "Lease Expiring" item). Defaulting to **derive at query time, no Notification rows stored** — the lease-expiring alert is computed by checking `Lease.endDate` against the current date. Document in the row 16 finding.
3. **Flag known schema gap (not a blocker, but noteworthy):** **Tenant Mix donut (overview row 13)** currently shows "Commercial (12) / Retail (4) / Vacant (2)" by unit type. The current Lease + Tenant schema has no `unitType` field — only `unit: string` ("Unit 1A"). Two options:
   - **(a)** Redefine the donut to show **lease stage breakdown** (Signed/Approaching/Offered/Declined) — wireable today
   - **(b)** Defer the donut until a `unitType` enum lands on Lease or a separate Unit entity
   Default to **(a)** — gives the donut a real-data shape today; the original commercial/retail categorization can return when the schema supports it. File as Q5.\<next\> if not already tracked.
4. **Verify Zod schemas match seed records.** Spot-check LEASE-0001 + TEN-0001 — both seeds parsed cleanly during Batch 3, so this should be a 30-second confirmation.

## Scope of this change

**Files to MODIFY (3 source files):**

1. **`app/(shell)/property/[id]/overview/page.tsx`** — extend the existing `getOverviewPageData(id)` call from Phase 6.0 to also fetch leases + tenants, OR call a new `getOverviewLeases(id)` query. Spread the additional props into `<PropertyOverviewPage>`.
2. **`app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx`** — accept `leases: Lease[]` and `tenants: Tenant[]` props. Replace 4 hardcoded constants:
   - `metrics[1]` Monthly Income → `formatCurrency(sum(activeLeases, l => l.monthlyRent))`
   - `tenants` const → real `Tenant[]` joined to lease unit/rent/status
   - `alerts` lease-expiring item → derived from `lease.endDate` within next 30 days
   - Tenant Mix donut → lease stage breakdown (per Step 0 default for the schema gap)
3. **`app/(shell)/property/[id]/_components/PropertyRentalPage.tsx`** — accept `leases: Lease[]` and `tenants: Tenant[]` props. Replace ~13 surfaces (rows 5, 8–10, 18–26) with derivations from the props. Specific surfaces called out per rule below.

**Files to CREATE (2 source files + 17 audit reports):**

1. **`app/(shell)/property/[id]/rental/queries.ts`** — new file mirroring `valuation/queries.ts` shape. Exports `getRentalPageData(id)` returning `{ leases, tenants }` filtered to the property.
2. **`app/(shell)/property/[id]/rental/page.tsx`** — extend to call `getRentalPageData(id)` and spread the result into `<PropertyRentalPage>`.
3. **17 per-datapoint audit reports** under `.claude/data-audit/` — one per wired surface. Slug pattern: `property-id-overview--<metric>.md` and `property-id-rental--<metric>.md`. Most use **full** template (derivations); a few (direct reads of tenant.name, tenant.email, tenant.phone) use **lite**.

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 17 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — Lease+Tenant row: `not built` → `shipped, fully wired` (skill regenerates; verify).
- `.claude/data-audit/pages/SUMMARY.md` — Rank 1 row: same status change.
- `pages/property-id-overview/plan.md` §5 Fix Log — append entry noting rows 8, 13, 14, 16 wired; document Q3.B + Q4.F default + Q5.\<next\> Tenant Mix decision.
- `pages/property-id-rental/plan.md` §5 Fix Log — append entry noting rows 5, 8–10, 18–26 wired.

**Files NOT touched:**

- No `lib/data/types/*.ts` or `lib/data/db/*.ts` — Zod schemas are settled; entities are complete.
- No other constants on either page (alerts maintenance item, activity feed, financial card, etc.) — owned by other entities not yet wired (Phase 6.2+).
- No PropertyLayout — header surfaces are already wired.

## Step A — Wiring (~75 min) with per-surface rule annotations

For each surface, the rule callout indicates which playbook rule will likely fire. Run the corresponding self-check during the ★ pass at the end of Step A.

### Overview page (4 surfaces, ~25 min)

- **Row 8 — Monthly Income KPI:**
  - **Wire:** `formatCurrency(activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0))` where `activeLeases = leases.filter(l => l.stage === "Signed" && now between startDate/endDate)`
  - **Rule 3 trigger** — multi-record sum loop with conditional filter. Walk through with 2 leases (one Signed-current, one Offered-future) and verify the sum only counts the first.
  - **Rule 1 adjacent check** — the "+12%" badge next to Monthly Income (`metrics[1].badge`) is hardcoded. Currently meaningless once Monthly Income is wired. Remove or guard.
- **Row 13 — Tenant Mix donut:**
  - **Wire:** group `leases` by `stage`; render counts per stage. Donut shows Signed/Approaching/Offered/Declined breakdown (per Step 0 default).
  - **Rule 1 adjacent check** — donut center text "85%" and "comm." labels are hardcoded; remove since the categorization changed.
  - **Rule 3 trigger** — group-by loop. Walk through with 5 leases (current seed) — confirm percentages sum to ~100%.
- **Row 14 — Active Leaseholders table:**
  - **Wire:** map `activeLeases` → join `Tenant.name` via `lease.tenantId`; render initials (first letter of name), unit, rent, status. Use Tenant.status for the badge color.
  - **Rule 1 adjacent check** — section header "3 Tenants" or similar count may be hardcoded; sweep.
  - **Rule 2 trigger** — empty-state convention. If no active leases, render — (matching the file's existing convention from Phase 6.0).
- **Row 16 — Lease-expiring alert:**
  - **Wire:** filter `leases` for `endDate within next 30 days`; render alert per match. If none, hide the alert (or show empty state per Rule 2).
  - **Rule 1 adjacent check** — adjacent alert items (HVAC fault) stay hardcoded; that's owned by MaintenanceItem (Phase 6.x). Don't touch.

### Rental page (13 surfaces, ~50 min)

- **Row 5 — Page subtitle:** "Currently leased to {tenant.name}, expires {endDate}". Wire from `activeLease.tenantId` join.
- **Row 8 — Unit occupancy pill:** count of currently-active leases vs total units. **Rule 3 trigger** — denominator (total units) doesn't exist on Property; use `leases.length` for now and document Q5.\<next\> for "Property.units field needed."
- **Row 9 — Monthly Rent KPI:** sum of activeLease.monthlyRent. **Rule 1** — the "below market" accent is hardcoded; remove until comp data lands. **Rule 3** — same sum loop as overview row 8; ensure the filter matches.
- **Row 10 — Occupancy KPI:** activeLease status + days since startDate. **Rule 3** — count stage="Signed" only; don't accidentally count Offered/Approaching.
- **Row 18 — Lease Summary duration badge:** "12 months" from `Lease.termMonths`. Direct read, **lite** template.
- **Row 19 — Tenant name:** join `Lease.tenantId → Tenant.name`. **Lite** template (single field via FK).
- **Row 20 — 5 lease fields (start, end, rent, deposit, auto-pay):** direct reads from Lease. Note: deposit isn't on the Zod schema — show "—" per Rule 2.
- **Row 21 — Expiry countdown** ("Expires in 47 days"): date arithmetic from `Lease.endDate`. **Rule 3 trigger** — verify the "X days" math handles negative (already-expired) cases. Walk through with `endDate = past date` and confirm output.
- **Row 22 — Tenant avatar initials:** first letter of `Tenant.name` (or first 2 letters). **Lite**.
- **Row 23 — Tenant name in profile:** direct read. **Lite**.
- **Row 24 — Tenant email:** direct read; **Rule 2** — show "—" if empty (Tenant.email is `.optional()`).
- **Row 25 — Tenant phone:** same as email.
- **Row 26 — Moved-in date:** `Lease.startDate` formatted. **Lite**.

### ★ Self-review pass (~10 min)

After all wiring is done:

1. **Rule 1 sweep:** scan PropertyOverviewPage.tsx and PropertyRentalPage.tsx for hardcoded values within ~10 lines of any wired surface. Check the accent badges, header counts, and adjacent claim-strings called out above.
2. **Rule 2 grep:** in each component file, grep for `"—"`, `"$0"`, `"0%"`, `"None"`, `"N/A"`. Confirm new empty states match the most-used existing convention.
3. **Rule 3 mental walks:** run the multi-record example for Monthly Income, Tenant Mix donut, Occupancy pill, and Expiry countdown. Verify each loop's filter is correct.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~10 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/overview` — confirm:
   - Monthly Income shows real value (sum of LEASE-0001..0005 active rents)
   - Tenant Mix donut shows lease stage breakdown
   - Active Leaseholders table shows real tenant names + units + statuses
   - Lease-expiring alert is correct (or absent if no expiring leases in next 30 days)
3. Open `/property/PROP-0001/rental` — confirm:
   - Page subtitle reflects real active lease
   - All 13 surfaces show real data
   - Tenant profile shows real Tenant fields with "—" for empty optional fields
   - Expiry countdown is correct
4. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~3 hours)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend overview row 8 — Monthly Income, since it's the canonical example of the Lease+Tenant entity in action).
2. **Re-run Task #6 dedup checklist** as a SECOND validation (it passed in Phase 6.0; this confirms it still passes after a more complex entity batch):
   - ☐ Cites `Page-wide: see PFn in pages/property-id-overview/audit.md` instead of restating
   - ☐ Renders **full** template
   - ☐ TL;DR has the `📄 Page audit:` back-link
   - ☐ §3 Formula explicitly notes the active-lease filter (per Rule 3 self-review)
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining 16 audits. Use lite template for direct reads (rows 18, 19, 22, 23, 24, 25, 26 ≈ 7 audits) and full template for derivations (≈ 10 audits).
5. Update `INDEX.md` (per-datapoint table) with 17 new rows.
6. Update `pages/INDEX.md` Lease+Tenant row.
7. Update `pages/SUMMARY.md` Rank 1 row.
8. Append fix-log entries to both affected `plan.md` files (overview + rental). Include Q3.B + Q4.F + Q5.\<next\> resolution notes.

## Verification

After Phase 6.1 lands:

1. **Type check passes.** Zero errors.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on both pages.** All 17 surfaces show real data; empty states use "—" consistently.
4. **17 new per-datapoint audit reports** under `.claude/data-audit/`. Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~39 now, up from 22 after Phase 6.0).
5. **Dedup machinery still works.** Spot-check 2 audits (one overview, one rental) — both cite PFn correctly.
6. **Status fields synced.** Lease+Tenant reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`.
7. **Fix logs appended** to both plan.md files with Q-number resolution notes.
8. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings in the 17 new audits (Rule 1 worked). No "$0" placeholder findings (Rule 2 worked). No conditional-sum bugs (Rule 3 worked). If any of these slip through, that's data for the next playbook iteration.
9. **No surprise file changes.** `git status` shows only the 3 source files modified, 2 source files created (queries.ts + page.tsx for rental), 17 audit reports created, ~5 corpus files updated.

## What unblocks after Phase 6.1

- **Phase 6.2 — Payment + Expense wiring.** Rank 2 in the build order; 13 surfaces across overview + rental + analytics. Pattern is now firmly established for multi-page entity wiring. Q-number Q3.B will be re-evaluated when Payment lands ("received" formula becomes possible).
- **Tenant Mix donut decision (Q5.\<next\>)** — the temporary lease-stage breakdown is in place; a future schema PR can introduce `unitType` and re-wire to the original commercial/retail categorization.
- **Q4.F (Notification table) decision** — the lease-expiring alert is now derived. If real Notification rows are needed later (e.g. for read/dismiss state), the entity comes in its own future phase (Phase 6.x — Notification + MaintenanceItem).
- **Half the rental page is real data** — combined with Phase 6.2 (Payment), the rental page becomes ~75% wired.
- **Playbook gets its first multi-rule, multi-surface stress test.** Rules that fire usefully here stay; rules that are awkward get refined.

## Time estimate

~5 hours total:

- Step 0 (pre-flight): ~5 min
- Step A (wiring + ★ self-review): ~85 min (75 min wiring + 10 min self-review)
- Step B (visual check): ~10 min
- Step C (17-audit batch + dedup re-validation + index updates): ~3.5 hours
  - 17 audits × ~10 min average (mix of lite + full) = ~170 min
  - Dedup re-validation: ~5 min
  - Index + SUMMARY + plan.md updates: ~15 min
- Buffer for surprises (schema gap discovery, Q-number disagreements, dedup re-fix): ~30 min

**Realistic: 5 hours. Conservative: 5.5 hours.**

## Out of scope (deliberate)

- Building, modifying, or designing any OTHER entity (Payment, Document, MaintenanceItem, etc.) — those are their own phases.
- Wiring any OTHER constant on the affected pages (alerts maintenance item, activity feed items, financial card, comparables footer, etc.) — owned by other entities not yet built.
- **Resolving Q3.B, Q4.B, Q4.F formally** — defaults are baked in and documented in fix-log entries; formal resolution can re-litigate when the relevant entity (Payment, Notification) lands.
- **Resolving the Tenant Mix schema gap (Q5.\<next\>)** — using lease-stage breakdown as the temporary categorization; original commercial/retail categorization deferred to a future schema PR.
- Modifying any Zod schema — they're settled. If a derivation needs a constraint not in the schema, file as a future improvement.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running any `/audit-page-datapoints` against the affected routes — source code changes are confined to wiring; page-level audits don't refresh until other entities land.
- Generating DDL or ERD updates — separate workstreams that benefit from this phase's completion (Lease+Tenant relationships will be richer in the diagram after this).
- Creating Notification table for the lease-expiring alert (Q4.F deferred).
- Adding `Property.units` field for the Occupancy denominator (Q5.\<next\> deferred).
