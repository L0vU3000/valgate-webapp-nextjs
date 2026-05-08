# 05 — Open Questions

> Every ambiguity surfaced during the audit. Resolve before implementation.
> Numbered Q1–Q9 by topic. Per-route entries at the bottom.

---

## Q1 — Pagination

**Q1.A** — `/portfolio` PropertyTable hardcodes `PAGE_SIZE = 16` (PortfolioPage.tsx:21). With Convex, switch to `paginate({ numItems, cursor })` or load all (current dataset is 16; will it stay small)? Note: "Showing X of Y properties" footer currently displays cross-page totals rather than a per-page range — needs fixing once pagination is real (see audit: `portfolio--filtered-count` F1).

**Q1.B** — `/property/[id]/documents`: how many documents per property is "a lot"? Does the tree need lazy-loading?

**Q1.C** — `/directory` shows "142" professionals (HARDCODED) but renders 6. What's the real expected scale? Pagination required?

> **Updated 2026-05-07 (Phase 8.4-audit):** Implementation options: (a) Replace "142" with `professionals.length` + remove fake [1][2][3] page buttons entirely (dataset is ~3–6 records — no real pagination needed; simplest path); (b) Client-side slice if dataset grows beyond ~20 records; (c) Cursor-based pagination if scale demands. The "Showing X" (`filtered.length`) is already correctly wired — only the total and page buttons need fixing. **Bias: option (a).** **Blocks PF3 fix** (see `pages/directory/audit.md` PF3).

> **Resolved 2026-05-07 (Phase 8.4-Wiring): OPTION (b) — client-side slice with `ITEMS_PER_PAGE = 12`.** Added `ITEMS_PER_PAGE = 12` constant; `paginated = filtered.slice((currentPage-1)*12, currentPage*12)`; `totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)`. "of X" in pagination footer now reads `professionals.length` (real total). Page buttons dynamically generated from `Array.from({length: totalPages})`; only shown when `totalPages > 1`. Prev/Next buttons disabled at boundaries. **PF3 closed.**

**Q1.D** — `/rental` upcoming-events list: bounded window or unbounded? Suggest "next 30 days" as default.

**Q1.E** — `/analytics` revenue chart shows 9 months. Is the time window fixed or user-selectable beyond the MTD/QTD/YTD toggle?

**Q1.F** — `/analytics` period filter (MTD/QTD/YTD/12M/Custom): should clicking these buttons actually filter the underlying chart data, or should they remain inert chrome until a future v2 wiring phase? Currently the `activePeriod` state value is never passed to `getAnalyticsPageData()` or any derivation function — the chart always shows the full entity history. Decision determines whether the fix is "wire it" (Server Action with period param) or "grey out with 'coming soon'" (cosmetic only). **Blocks PF1 fix decision** (see `pages/analytics/audit.md` PF1). Related: Q1.E (time window question). (Filed: Phase 8.1 Analytics audit, 2026-05-06.)

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): WIRE IT.**

**Q1.I** — `/directory` sort dropdown: should the "Rating / Name / Properties" options actually sort the displayed professional cards, OR is the dropdown decorative and should be removed? Currently `<select>` renders 3 options with no `onChange` handler — selecting any option has no effect. Trivial implementation: add `sortBy` state + 1-line comparator to the `filtered` derivation; all data is already in memory. **Bias: wire it.** **Blocks PF2 fix** (see `pages/directory/audit.md` PF2). (Filed: Phase 8.4-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.4-Wiring): WIRE IT — option (a).** Added `sortBy` state (`"Rating" | "Name" | "Properties"`), `<select>` now has `value={sortBy}` + `onChange` handler. Sort applied to `filtered` before pagination: Rating → desc by `rating`; Name → asc by `name`; Properties → desc by `linkedProperties`. Reset `currentPage` on sort change via `useEffect`. **PF2 closed.**

**Q1.J** — `/directory` VIEW PROFILE button: build a `/directory/[id]` profile page route and wire the button to `href="/directory/${pro.id}"`, OR remove the button until that route exists? Each professional card shows a VIEW PROFILE button (× 6) with no `onClick` and no `href`. If resolved to "build route," spawns a separate Phase 8.4-route audit+wiring pair. **Blocks PF4 fix** (see `pages/directory/audit.md` PF4). (Filed: Phase 8.4-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.4-Wiring): BUILD ROUTE — option (a).** Created `app/(shell)/directory/[id]/` route with 3 files: `queries.ts` (`getProfessionalProfileData` reads from `db.professionals.get`), `page.tsx` (Server Component, `await params`, `notFound()` guard), `_components/ProfessionalProfilePage.tsx` (full profile page: header band gradient, avatar with verified badge + available dot, Email/Call buttons, StarRating component, 3-col stats grid, contact section with mailto/tel). VIEW PROFILE button on directory card changed from `<button>` with no `onClick` to `<Link href={/directory/${pro.id}}>`. Professional `id` changed from sequential `number` to DB string (`"PROF-0001"`) to enable navigation. **PF4 closed.**

**Q1.G** — `/rental` nav tabs purpose: should the four tabs ("Portfolio / Units / Leases / Financials") filter the rendered content (each tab shows a different subset of the dashboard sections), OR should the cross-portfolio dashboard remain a single view and the tabs be removed entirely? Currently `activeNav` state is maintained but never consumed — all sections always render. **Blocks PF1 fix decision** (see `pages/rental-dashboard/audit.md` PF1). (Filed: Phase 8.2-audit, 2026-05-07.)

**Q1.H** — `/rental` global nav placement: is the `/rental` route reachable from the app shell navigation? If the route is not linked anywhere in the shell nav, decide whether to expose it (add a nav link) or deprecate the route entirely. Governs whether Phase 8.2 wiring is worth prioritizing. (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): ALREADY REACHABLE.** The `/rental` route is already linked in the ShellLayout Sidebar — confirmed by the user. No nav changes needed. Phase 8.2 wiring is confirmed worth prioritizing.

**Q1.K** — `/settings` Notification toggles: auto-save on each toggle click, or a "Save Changes" batch button? (Filed: Phase 8.7-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.7 Wiring): AUTO-SAVE.** `toggleNotif` fires `saveNotificationPreference(key, updatedChannels)` via `startTransition` immediately after updating local state. Matches the existing flash animation affordance.

**Q1.L** — `/settings` Profile section: add a read-only Profile section in Phase 8.7 wiring, or defer to a future `/profile` route phase? (Filed: Phase 8.7-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.7 Wiring): ADD NOW.** Read-only display of firstName, lastName, email, jobTitle, role from `UserProfile`. "Edit Profile" as a CHROME disabled stub. Zero schema work.

---

## Q2 — Real-time vs one-shot

**Q2.A** — Notifications panel: should new notifications appear live (Convex `useQuery` reactivity) or be polled? Pattern doc implies live.

**Q2.B** — `/portfolio` and `/` (home): live or one-shot? Live makes "newThisMonth" tick up when you add a property in another tab; one-shot is cheaper.

**Q2.C** — `/property/[id]/documents` upload progress: today simulated client-side. Should other tabs viewing the same property see it happen live?

**Q2.D** — `/rental` dashboard: live or refresh-on-action?

**Q2.E** — Multi-user (Q4.M): when CoOwners are added, do they see updates from each other live?

---

## Q3 — Hardcoded KPIs need real definitions

The four `TODO(backend):` markers in `app/(shell)/portfolio/queries.ts:17–20`:

**Q3.A** — `totalValueFormatted: "$42.8M"`. Is "total value" the sum of `buyNumeric` (purchase price) or `currentMarketValue`? They differ — purchase is historical, market is current.

**Q3.B** — `monthlyIncome: "$312,450"`. ~~Define: "sum of `monthlyRentCents` across all leases where `stage = 'Active'` and the current month is between `startDate` and `endDate`"? Or "sum of `payments.amountCents` where `kind='Rent'` and `status='Paid'` and `date in current month`"?~~

> **Resolved 2026-05-06: HYBRID — value is "expected" + adjacent status badge derived from "received".** Primary value: sum of `Lease.monthlyRent` where `stage='Signed'` and the current month is within the lease window (this is the "agreed upon" amount). Adjacent badge derived from Payment data: `"Collected"` (all expected received this month), `"Partial"` (some received but not all), `"Due"` (none received yet, current month not yet ended), `"Overdue"` (none received and current month past due-date). Show value + badge side-by-side. Affects overview row 8 Monthly Income KPI and portfolio Monthly Income KPI. Small follow-up phase: ~30 min wire-only change (Lease + Payment data already fetched). Files as a Phase 6.x.5 micro-phase or rolled into post-sprint cleanup.

**Q3.C** — `yoyGrowth: "4.2%"`. Define: "(this-month total `currentMarketValue` − same month last year) / last-year value × 100"? What if some properties didn't exist last year — exclude or include at purchase price?

**Q3.D** — `newThisMonth: 2`. Trivial: `count(properties WHERE _creationTime >= startOfMonth(now))`. Confirm.

**Q3.E** — `/rental` arrears bucketing: 0–30 / 31–60 / 61–90. Aged from due date or invoice date? What field carries that?

**Q3.F** — Estate-planning caption "Verified across 32 properties in Cambodia" — is that count of `properties` where `country = "Cambodia"` AND `successors` are linked? Or `successors.linkedPropertyIds` flattened and country-filtered?

> **Resolved 2026-05-07 (Phase 8.5 wiring): REMOVE.** User decision: remove this caption entirely. Replaced with neutral beneficiary coverage/verification copy derived from actual assignment data.

**Q3.G** — Successor share validation: should the sum of `Primary` successors' shares equal exactly 100? What about `Contingent`? Currently no validation.

> **Resolved 2026-05-07 (Phase 8.5 wiring): YES.** Rule: for each property, the sum of assigned `Primary` successor shares must not exceed 100%. Validation enforced in `addSuccessorAndAssign`; contingent shares remain informational and are not constrained to 100%.

**Q3.I** — Define "Attention Count": should it derive from `health < 30` (current) or from real operational signals — pending maintenance tasks, overdue rent, expiring leases, or expired certificates? The current sub-label "Critical tasks pending" implies a task system that does not exist. Until this is resolved, the label should describe the actual formula (`health < 30`), not implied task semantics. (See audit: `portfolio--attention-count` F1, F2.)

**Q3.J** — Define the "Compliance" KPI on `/property/[id]/safety`. The KPI card currently hardcodes "Compliant" and "All obligations met". What makes a property compliant vs. partially compliant vs. non-compliant? Options: (a) `all certifications have status === "Valid"` → binary Compliant/Non-compliant; (b) `count(valid) / count(all) >= threshold` → partial states like "Mostly Compliant" (75%+) and "At Risk" (<50%); (c) any expired certification (past `expiresAt`) immediately flags Non-compliant regardless of other certs. Pick a canonical definition before wiring — it determines whether the KPI card shows text, a percentage, or a color-coded status. (See audit: `pages/property-id-safety/audit.md` PF4.)

> **Resolved 2026-05-07 (Phase 8.6): THREE-STATE PRIORITY CASCADE (hybrid of a + c).** Expired wins → `"Non-Compliant"` (rose). Expiring wins if no Expired → `"At Risk"` (amber). All Valid → `"Compliant"` (emerald). No certs → `"—"` (slate). Sub-label: "All obligations met" / "N cert(s) expiring soon" / "N cert(s) expired" / "No certifications recorded". Percentage in donut = `valid / total × 100`. KPI card icon tint updates to match state. **Unblocks PF4 rows 10–11.**

**Q3.H** — Define the "Occupancy" KPI: should it be `Math.round(rentedCount / totalProperties * 100)` (standard occupancy rate) or `Math.round(average(health))` (portfolio health score)? Today the card uses the latter but is labelled with the former — they produce 44% vs 52% on current seed data. Pick one canonical formula and rename the card or field accordingly. (See audit: `portfolio--occupancy` F1.)

**Q3.K** — Define the NOI formula for the FS demo context: NOI = Revenue − Operating Expenses. What counts as "operating expenses"? Candidates: (a) sum of `MaintenanceItem.cost` across all properties (maintenance spend); (b) pro-rated `Property.annualPropertyTax + annualInsurance` per month × 12; (c) a combination of both. The answer is likely the same as Q3.L's expense aggregation source (they are the same cost pool, just applied as a total vs a time-series). **Blocks PF3 fix** (NOI KPI duplication, `analytics.ts:101–107`) and **PF2 fix** (expense series formula). See `pages/analytics/audit.md` PF3. (Filed: Phase 8.1, 2026-05-06.)

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): BOTH combined (option c).** NOI operating expenses = (1) `MaintenanceItem.cost` summed across all properties for the selected period + (2) `Property.annualPropertyTax + Property.annualInsurance` pro-rated to the period (÷ 12 × months in window). Same cost pool as Q3.L — Q3.K applies it as a single total; Q3.L applies it as a monthly time-series. **Unblocks PF3 fix.**

> **Implementation note 2026-05-06 (Phase 8.1 Post-Wiring):** The actual wiring chose a cleaner path than the Q3.K candidate formula: it uses the existing **`Expense` entity** (shipped Phase 6.2; categories: Maintenance / Utilities / Insurance / Tax / Management / Other) as the canonical source for operating expenses. Specifically: `windowExpenses = expenses.filter(date in window).reduce(sum, amount)` — all 6 categories, no property-field proxies. This supersedes the `MaintenanceItem.cost + annualPropertyTax/12 + annualInsurance/12` split from the Q3.K candidate path. The candidate-formula path remains valid for any future page or report that prefers field-level sources; this implementation note records the divergence so the two paths don't get confused. See `lib/data/derivations/analytics.ts:computeKpiCards`.

**Q3.M** — Billing Recovery formula for `/rental` Arrears section (formerly "Recovery Rate"). Candidates: (a) `sum(Rent payments where status="Paid") / sum(all Rent payments where due in period)` — collected-vs-billed; (b) `1 - (sum(overdue payments) / sum(billed))` — inverse of overdue rate; (c) post-arrears recovery — count of payments collected after their due date / total overdue that period. Candidate (a) is most straightforward given `Payment.status` and `Payment.kind="Rent"` fields already on the entity. **Blocks PF5 Recovery Rate fix** (see `pages/rental-dashboard/audit.md` PF5; `RentalDashboardPage.tsx:203`). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): CANDIDATE (a) — paid/all-billed.** Formula: `sum(Payment.amount where kind="Rent" and status="Paid") / sum(Payment.amount where kind="Rent")`. UI label renamed from "Recovery Rate" to "Billing Recovery". Implemented in `computeRecoveryRate(payments)` in `lib/data/derivations/rental.ts`. Wired via `getRentalDashboardData()`. **Unblocks PF5 fix.**

**Q3.N** — Eviction Risk formula for `/rental` Arrears section. Candidates: (a) count of Leases where the associated tenant has N+ consecutive overdue Payment records; (b) count of Leases where the most recent Payment is `status="Overdue"` and `ageDays > 60`; (c) count of Properties flagged with a `status="Eviction"` marker (not in current schema). Candidate (b) is simplest given existing `Payment.status` + date-age logic already in `computeArrears`. **Blocks PF5 Eviction Risk fix** (see `pages/rental-dashboard/audit.md` PF5; `RentalDashboardPage.tsx:207`). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): CANDIDATE (b) — leases with latest Rent payment overdue > 60 days.** Formula: count of Leases where the most recent `Payment` with `kind="Rent"` has `status="Overdue"` AND `ageDays > 60`. Result shown as "N Tenants" (or "None" when zero, coloured green). Implemented in `computeEvictionRisk(payments, leases)`. **Unblocks PF5 fix.**

**Q3.O** — Vacancy Cost formula for `/rental` KpiCards (one of 5 derivations). Candidates: (a) `sum(Lease.monthlyRent for properties where Property.status="Vacant")` — lost rent from vacant units; (b) `count(vacant properties) × avg(monthlyRent across all active leases)` — estimated loss; (c) vacancy-days × per-day rate derived from monthly rent. Candidate (a) is most semantically clean and only needs `Property.status + Lease.monthlyRent`. **Blocks PF2 Vacancy Cost KPI fix** (see `pages/rental-dashboard/audit.md` PF2). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): CANDIDATE (b) — avg × vacant count.** Formula: `count(Property.status="Vacant") × avg(Lease.monthlyRent where stage="Signed" and active today)`. Fallback when no active leases: avg of last 10 leases by `startDate` desc. KPI label renamed "Vacancy Loss", sub changed to "/ mo est." to communicate it is an estimate. Implemented in `computeVacancyCost(properties, leases)`. **Unblocks PF2 Vacancy Loss fix.**

**Q3.P** — Collection Rate formula for `/rental` KpiCards (one of 5 derivations). May overlap with resolved Q3.B (Monthly Income hybrid). Candidates: (a) `count(Rent payments where status="Paid" in current month) / count(expected Rent payments in current month)` — on-time count rate; (b) `sum(Paid Rent amounts in current month) / sum(expected Rent amounts in current month)` — dollar collection rate; (c) same as Q3.B's "Collected" badge threshold but surfaced as a scalar. If (c), this Q is resolved by referencing Q3.B and computing the badge's `"Collected"` state as a percentage. **Blocks PF2 Collection Rate KPI fix** (see `pages/rental-dashboard/audit.md` PF2). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): CANDIDATE (b) — dollar-based.** Formula: `sum(Payment.amount where kind="Rent" and status="Paid" and date in current calendar month) / sum(Lease.monthlyRent where stage="Signed" and active this month)`. Returns "—" if no active leases (division guard). Shows "N%" capped at 100. Sub-label updated from "On-time payment rate" to "of expected rent received". Implemented in `computeCollectionRate(payments, leases)`. **Unblocks PF2 Collection Rate fix.**

**Q3.R** — **Estate KPI formula definitions for `/estate-planning` stat cards.** All 4 KPI cards are hardcoded literals with no backing formula. Questions: (a) **Plan Completion (84.5%)** — is this computed per property or across the portfolio? Candidates: `count(estate-plan fields populated) / total fields × 100`; `count(successors assigned) / expected successors`; a weighted checklist across will, beneficiaries, documents, and legal review. (b) **Pending Reviews (12)** — reviews of what? Candidates: count of successors without `verified=true`; count of estate documents with status not "signed"; count of properties without an estate plan record. (c) **Named Beneficiaries (48)** — count of `Successor` records or count of unique `Successor × Property` assignments? Does it include contingent beneficiaries? (d) **Protected Documents (156)** — count of `Document` records with `category="estate"`? Or all documents across all properties? Each of the 4 answers gates a different part of the estate KPI wiring. **Blocks** `estate-planning--stats-kpis` per-datapoint audit. (Filed: Phase 8.5-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.5 wiring):** User kept completion KPI and requested better alternatives for the other cards. Implemented formulas:
> 1) **Plan Completion** = portfolio average of per-property checklist completion (assigned successor, primary share balance, estate doc present, estate activity present).
> 2) **Pending Reviews** = count of missing share-balance/doc checks + unverified assigned beneficiaries.
> 3) **Assigned Beneficiaries** = count of successors with at least one property assignment.
> 4) **Estate Documents** = count of `Document` records where `category="Estate"`.

**Q3.Q** — Top Spend Category derivation source for `/rental` Maintenance section (currently "HVAC / Systems $3,240 / 66.6%"). Candidates: (a) group `Expense.amount` by `Expense.category` across the portfolio, find the highest-sum category — gives a real dollar total but current Expense categories (Maintenance/Utilities/Insurance/Tax/Management/Other) don't include "HVAC / Systems"; (b) if the intent is maintenance-spend sub-categorization, a new `subcategory` field on `MaintenanceItem` (currently not in schema) would be needed; (c) simplest path — group all Expense records by `category`, return the max-sum category name and its percentage of total maintenance spend. Option (a/c) is immediately actionable if "HVAC / Systems" is dropped in favor of the existing Expense.category enum. **Blocks PF5 Top Spend fix** (see `pages/rental-dashboard/audit.md` PF5; `RentalDashboardPage.tsx:235, 240`). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): CANDIDATE (c) — group existing Expense.category, return highest-sum.** Formula: group `expenses` by `Expense.category`, find max-sum category, express its % of total expenses as the bar width. "HVAC / Systems" hardcode dropped in favour of real category names (Maintenance / Utilities / Insurance / Tax / Management / Other). Shows "No expense data" empty state when no records. Implemented in `computeTopSpendCategory(expenses)`. **Unblocks PF5 Top Spend fix.**

**Q3.L** — Revenue-chart expense series source: same answer as Q3.K, but applied as a monthly time-series. `computeRevenueSeries` currently returns `expenses: maintenance.filter(month).length * 0` — always zero. What is the canonical monthly expense figure? Same three candidates as Q3.K applied per-month. **Blocks PF2 fix** (expense area series structurally zero, `analytics.ts:59–62`). See `pages/analytics/audit.md` PF2. (Filed: Phase 8.1, 2026-05-06.)

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): BOTH combined — same cost pool as Q3.K, per-month.** Each month's expense value in `computeRevenueSeries` = `sum(MaintenanceItem.cost where date in that month)` + `(Property.annualPropertyTax + Property.annualInsurance) / 12`. The `expenses: maintenance.filter(month).length * 0` line is replaced with this two-source formula. **Unblocks PF2 fix.**

> **Implementation note 2026-05-06 (Phase 8.1 Post-Wiring):** Same divergence as Q3.K — the actual implementation uses the **`Expense` entity** rather than the Q3.L candidate-formula split. Per-month: `expenses.filter(date >= monthStart && date < monthEnd).reduce(sum, amount)` across all categories. This is cleaner than `MaintenanceItem.cost + annualTax/12 + annualInsurance/12` because: (a) one entity source vs. three, (b) `Expense.date` already carries real transaction timestamps enabling accurate month bucketing, (c) future expense categories (e.g. CapEx) flow into the chart automatically. The candidate-formula path remains an option for any future page that cannot import the Expense entity. See `lib/data/derivations/analytics.ts:computeRevenueSeries`.

---

## Q4 — Architecture / scope decisions

**Q4.A — Drafts: client-only vs Convex?** Today drafts are localStorage (`valgate:add-property:drafts:v1`, 500ms debounce). Tradeoffs:
- *Keep client-only*: zero backend cost; user loses drafts when switching devices.
- *Migrate to Convex*: cross-device drafts; need `api.drafts.upsert`/`delete` and `saveDraftAction`/`deleteDraftAction` (already stubbed in `actions.ts:16–17`).
- Recommendation: ship Convex variant. localStorage is a 30-min hack that costs sync support.

**Q4.B — Tenant entity vs tenants embedded in Lease**? Current UI suggests Tenant exists separately (`/property/[id]/overview` lists tenants) but Lease is the unit-of-rent record. Are Tenants the canonical "person" record, or just labels on Lease?

**Q4.C — EstateDocument vs Document**? Estate documents (Will & Testament, etc.) likely belong in `documents` with `category="estate"`, sharing storage and folder logic. Confirm vs separate table.

> **Resolved 2026-05-07 (Phase 8.5 wiring): USE `Document`.** Estate docs remain in the existing `documents` entity and are scoped by `category="Estate"` for estate-planning surfaces.

**Q4.D — Property soft-delete vs sold-state**? UI doesn't show archived/sold; future-proof now or wait?

**Q4.E — Equity, ROI, cap rate: stored or derived per render**? Stored avoids recompute but requires recalculation on every market value/mortgage change. Derived per render is simpler. Recommendation: derive (one multiply on read is cheap).

**Q4.F — Auto-create Notification rows on events?** E.g., document uploaded, lease expiring soon, certificate expiring. Cron-driven (Convex scheduled function) or event-driven (mutation side-effects)? Both?

> **Resolved 2026-05-06 in Phase 6.8: HYBRID per source.** Lease-expiring alerts derived at query time (Phase 6.1 pattern — no Notification rows stored for these). Manual/cross-cutting alerts read from stored Notification rows (Phase 6.8 — NOTIF-0001 etc., filtered via `linkTo` URL parse). Auto-creation of Notification rows from events (cron-driven or event-driven mutation hooks) deferred to backend phase when Convex/Neon infrastructure exists. The alerts strip on `/property/[id]/overview` is now a UNION of two sources: (1) derived lease-expiring alerts and (2) stored Notification rows.

**Q4.G — Map pin click on `/`**: today highlights only. Should it route to `/property/[id]/overview`?

**Q4.H — Expenses table**? Analytics shows "Expenses" line (NOI, maintenance spend) but no entity captures expenses today. Add `expenses` table with `category`, `amountCents`, `propertyId`, `date`? Maintenance has its own table — combine or keep separate?

**Q4.I — SavedReports**? Analytics page lists 3 saved reports (HARDCODED). Real entity? Out of scope for v1?

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): EMPTY STATE.** Keep the Saved Reports card. Replace the 3 hardcoded rows with an empty-state message ("No saved reports yet"). SavedReport entity deferred to a future product phase. **Unblocks PF6 fix.**

**Q4.J — Daily snapshots for sparklines/historical charts**? `propertyValuations` already snapshots monthly. Add a Convex cron job for daily occupancy/income snapshots, or compute on the fly from primary data?

**Q4.K — RentalEvent: a real table or pure derivation?** UI surfaces "upcoming events" mixing lease, maintenance, payment, inspection. Three options:
1. Pure derivation (server query unions across the four sources).
2. Real `rentalEvents` table populated by triggers (denormalized).
3. Hybrid: derive for "auto-generated", store user-authored events (e.g. manual reminders).
Recommendation: option 1 unless users need to author events.

**Q4.L — PDF/document parsing**? `PropertyDocumentsPage` shows extracted metadata (transfer tax, agent fee). Implies PDF parsing on upload. AI extraction (Convex action calling Anthropic), regex extraction, or user-entered metadata?

**Q4.M — Multi-user / sharing**? UI suggests CoOwners on `OwnershipRecord.coOwnerProfileIds` and Successor links. But there's no invite flow, no role assignment UI. v1 scope: single-user only? Future: per-property collaborator invites?

**Q4.N — Ownership tab visibility?** ~~Should Viewers see ownership/equity? Sensitive financial info; default to hide unless explicitly granted.~~

> **Resolved 2026-05-06 in Phase 6.5 (CoOwner wiring):** For the FS demo era (single-user, `getCurrentUserId()` shim returns `"demo-user"`), no role enforcement is implemented — all CoOwner data flows to the demo user. When Clerk + Convex auth lands, add a server-action precheck before `getOwnershipPageData()` returns CoOwner data, or expose a narrowed `CoOwnerListItem` shape (excluding `ssnMasked`/`taxEntity`) for non-Admin reads. The schema is forward-compatible. **PHASES.md description was "PII handling for SSN/tax data" — that was a miscategorisation; Q4.N is actually about Viewer RBAC, not storage strategy. PII storage strategy is documented separately in Q5.S.**

**Q4.O — File storage choice**? Convex storage (`v.id("_storage")`) is the simplest; S3 / Cloudinary / Supabase storage are alternatives. Tradeoffs: cost, CDN, image transforms (Cloudinary wins on transforms).

**Q4.P — Audit log**? Property edits, document deletes, ownership changes — log to a separate `auditLog` table? Required for an estate-planning use-case where chain-of-custody matters.

> **Resolved 2026-05-07 (Phase 8.5 wiring): YES.** Added `estate-activity-events` entity and wired estate timeline reads/writes to it as v1 chain-of-custody history for estate actions.

**Q4.Q — MarketSnapshot + MarketComparable: external data integration for the Valuation tab**? ~~The Market Insight panel and the Comparable Sales table need regional real-estate market data that Valgate does not own.~~

> **Resolved 2026-05-06: INTERNAL aggregation from the user's own portfolio.** No external API integration for v1. "Comparable" = other properties in the same area (same `Property.province`, optionally narrowed to same `Property.city` or by lat/lng proximity). MarketComparable becomes a derivation, not a stored entity — fetched at query time by filtering `db.properties.list(userId)` by area + property type. MarketSnapshot similarly derives from aggregated PropertyValuation data across nearby properties. **Eventual extension:** when the app has multiple users in the same neighborhood, broaden the filter beyond `userId` (still scoped to user-shareable subset). External AVM API option is deferred to a future product decision. **What this unblocks:** the formerly-deferred 6.x phase (PropertyComparable + MarketSnapshot wiring) becomes pure derivation work — no new entity, no external integration, no scheduler. Files as Phase 6.9 (~3 hours: derive area-comp logic + wire 7 location page surfaces + 5-7 valuation surfaces).

**Q4.R — LandParcel schema: denormalized on Property vs separate entity vs sub-document?** ~~Open~~

> **Resolved 2026-05-06 in Phase 6.4: Option 2 — separate `LandParcel` entity, 1→1 with Property for v1, 1→N-ready by removing the per-property uniqueness assumption when multi-parcel support lands.**

The location page's KPI cards (rows 12–18, 24–26, 30) needed physical land data. Three options were evaluated:

1. *Denormalised fields on Property*: add 9 land fields to `Property`. Simplest but concentrates domain weight in an already-large schema (4 sub-schemas merged) and breaks pattern consistency (every other entity follows `userId + propertyId + domain fields`).
2. *Separate `LandParcel` entity* (1→1 with Property for v1; 1→N for multi-parcel future). Cleaner separation; matches existing entity patterns; multi-parcel support requires no schema migration. **Chosen.**
3. *Sub-document on Property* (JSON field). Worst-of-both: no index benefit, breaks Zod strength.

Schema committed in Phase 6.4: `LandParcelSchema` with `sizeM2` required, 8 optional fields (`widthM`, `lengthM`, `zoningCode`, `zoningClass`, `developmentPotential`, `elevationM`, `slopeAngleDeg`, `terrainType`). `terrainType` is a closed 5-value enum (`Flat | Rolling | Hilly | Mountainous | Mixed`); zoning fields stay open strings pending country-specific taxonomy data (defer to a future Q-number if patterns emerge).

Note: `Property.totalArea` (string, coarse-grained) coexists with `LandParcel.sizeM2` (typed number) — they overlap but serve different surfaces. Migration to a single source-of-truth is a future concern.

**Q4.V** — **Successor-to-Property assignment model: which direction is the FK, and how is it stored?** `SuccessorSchema` has no `propertyId` field; `Property` has no `successorIds` field; `addSuccessorAndAssign` in `actions.ts` accepts `propertyIds[]` but the assignment loop is a stub. Two questions: (a) **FK direction** — `Successor.propertyId` (each successor belongs to one property), `Successor.propertyIds: string[]` (one successor can be assigned to many properties), or a separate join table `SuccessorPropertyAssignment { successorId, propertyId }`? Estate planning semantics suggest a person (Successor) can be named on multiple properties — the join-table option is cleanest. (b) **Scope** — are successors per-user (current FS-layer behavior: `db.successors.list(userId)`) or per-property? The current UI treats them as per-property (successor table changes when you select a different property card) but the data is per-user. Decision determines: (i) whether `db.successors.list()` needs a `propertyId` filter, (ii) how `addSuccessorAndAssign` is completed, (iii) how the Named Beneficiaries KPI (row 6) is aggregated. **Blocks** PF5 fix (per-property scoping) and PF4 fix (completing `addSuccessorAndAssign`). **Blocks** `estate-planning--property-cards` and `estate-planning--stats-kpis` audit reports. (Filed: Phase 8.5-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.5 wiring): JOIN TABLE + PER-USER SCOPE.** Implemented `SuccessorPropertyAssignment { successorId, propertyId }` in `successor-property-assignments` collection. Successors remain user-scoped (`db.successors.list(userId)`), and the page now scopes rows per selected property via assignments.

**Q4.W** — **Which estate actions should be wired in v1?** The `/estate-planning` page has 8 CHROME stub actions — none have `onClick` handlers or routes. (a) **"Add Beneficiary"** — wire to a modal that calls `addSuccessorAndAssign` (requires Q4.V resolved first); (b) **"Review All"** — navigates to a dedicated review flow or opens a modal; (c) **"Download Summary"** and **"Download all documents"** — generate a PDF or redirect to a document pack; (d) **"View full history"** — navigates to a chain-of-custody view (requires Q4.P resolved); (e) **"View Analytics"** — navigates to `/analytics` filtered to estate-related data; (f) **"Generate Portfolio Report"** — stub for a report generation feature; (g) **"Filter"** on the property list — client-side filter by status. Candidates: (a) none — leave all as CHROME until the estate-plan entity is wired; (b) wire only "Add Beneficiary" and "Filter" (simpler client-side features) in a first pass; (c) wire all that don't require Q-number resolution. **Bias: wire "Filter" (trivial client-side state) + defer all others until Q4.V resolves.** **Blocks** `estate-planning--action-stubs` bundle report. (Filed: Phase 8.5-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.5 post-wiring): PARTIAL wire accepted.** Wired actions: (1) `Filter` (client-side status filter), (2) `View Analytics` route push, (3) `Add Beneficiary` modal + server action (`addSuccessorAndAssign`) with assignment and validation flow. Deferred actions: `Generate Portfolio Report`, `Download Summary`, `Review All`, successor row menu action, footer `View full history`, footer `Download all documents`.

> **Resolved 2026-05-07 (Phase 8.5 wiring pass): FULL WIRE (except PDF-generation stubs).** All non-PDF actions wired: (1) `Filter` drives `statusFilter` state + `filteredProperties` useMemo, (2) `View Analytics` routes to `/analytics`, (3) `Add Beneficiary` opens a full modal dialog — form with name/relation/role/share/property-assignment checkboxes/verified flag; calls `addSuccessorAndAssign(successor, propertyIds[])`; validates on client + server; `router.refresh()` on success. Q4.V resolved (join table) unblocked Add Beneficiary mid-session. Deferred (require PDF/preview infrastructure): `Download Summary`, `Download all documents`, `View full history`, `Generate Portfolio Report`, `Review All`, `MoreHorizontal` per-row action.

**Q4.U** — **`HARDCODED_PROFESSIONALS[6]` fallback in `queries.ts:34–107`: replace with proper empty-state UI or keep as demo seed aid?** The 6-entry hardcoded array is injected when `db.professionals.list(userId)` returns empty. On a seeded instance (3 DB records), it never activates. On a fresh empty DB, it shows 6 fake professionals instead of an actionable empty state ("No professionals yet — Add your first"). Candidates: (a) **Replace** — remove `HARDCODED_PROFESSIONALS` and the conditional; wire `EmptyState` component when `dbProfessionals.length === 0`. Mirrors Q4.I analytics resolution (SavedReports empty-state). (b) **Keep** — treat as intentional demo aid; acceptable while the dataset is small. **Bias: option (a)** — mirrors the resolved analytics precedent. **Blocks PF5 fix** (see `pages/directory/audit.md` PF5). (Filed: Phase 8.4-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.4-Wiring): KEEP — but with architectural reframing.** User decision: the ideal running version has a Valgate-curated base directory of verified professionals + users can add their own unverified professionals. The `verified: boolean` field on `ProfessionalSchema` distinguishes the two tiers. The 6 HARDCODED_PROFESSIONALS entries were converted into 6 Valgate-verified seed records (PROF-0004 through PROF-0009) with `verified: true`, alongside the 3 existing user-added records (PROF-0001/0002/0003, `verified: false`). `HARDCODED_PROFESSIONALS` fallback removed from `queries.ts`; `getDirectoryPageData()` maps DB records directly. Verified badge (`<BadgeCheck>`) shown on card avatar when `pro.verified = true`. **PF5 closed.** (Note: EmptyState when all 9 are absent is deferred — dataset is always seeded.)

**Q4.X** — **Clerk Sync vs DB Storage for Extended Profile Fields:** The `/profile` page edits extended fields like `jobTitle`, `employeeId`, `officeLocation`, `language`, `timezone`, and `currency`. When Convex + Clerk integration lands, where should these live? (a) **Clerk `publicMetadata`** — synced down to Convex. Centralizes identity but balloons the token size. (b) **Convex `users` table** — strictly separate from Clerk auth. Auth info in Clerk, business/profile info in Convex. **Recommendation: option (b)**. Clerk should only own email, phone, and standard name. All enterprise extended fields belong strictly in Convex. (Filed: Phase 8.6-Wiring, 2026-05-07.)

**Q4.T** — **Multi-unit Property: build a `Unit` entity (Property → Unit FK with `Lease.unitId`) OR reshape demo data so each Property is treated as a single unit?** The `/rental` HeatmapGrid has 33 hardcoded unit tiles across 5 properties (8+6+5+4+10 units per property), implying multi-unit buildings. The current schema has no `Unit` entity — `Lease.unit` is a string label only. Two paths: (a) **Build `Unit` entity** — `Unit { propertyId, name, status, createdAt }` with `Lease.unitId` FK; heatmap maps `unitsDb.list(userId)` joined with tenants and leases. Schema impact: new entity + FK + Zod + seed. Estimated scope: Phase 6.9, ~1 day. Unlocks 33 surfaces. (b) **Single-unit per Property** — each Property has one implied unit; heatmap derives from `properties × leases × tenants`; no new entity. Much simpler, but the current 5-property heatmap data shows multi-unit buildings which are architecturally incompatible with this path. **Most consequential unresolved entity-design question of Phase 8.** Its resolution determines whether Phase 6.9 builds `Unit` (option a) or `PropertyComparable` (option b, already slated). **Blocks PF3 fix entirely** (see `pages/rental-dashboard/audit.md` PF3; `HeatmapGrid.tsx:30–89`). (Filed: Phase 8.2-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.2 Q-resolution): NO Unit entity — heatmap = properties grouped by suburb.** The heatmap represents all Portfolio properties, one tile per property, grouped by `Property.city || Property.province` (suburb). No `Unit` entity built. Each tile's status derives from the most recent Signed `Lease` covering today: no lease or `Property.status="Vacant"` → vacant; lease ending ≤ 30 days → expiring; otherwise → occupied. Tile tooltip shows property name, active lease's unit label, monthly rent, and lease end date. Heatmap header renamed "Portfolio Occupancy". HeatmapGrid now accepts `data: PropertyCluster[]` prop (no internal constants). `computeHeatmapData(properties, leases)` added to `lib/data/derivations/rental.ts`. **Resolves PF3 + PF6 (summary line updates automatically).**

**Q4.S** — Occupancy time-series on `/analytics`: should the occupancy sparkline be powered by a stored daily/weekly `Property.status` snapshot table, or should the page show only the current point-in-time occupancy (and drop the sparkline)? No historical status snapshots exist today — the 6-point sparkline at `AnalyticsPage.tsx:270` is a hardcoded array `[94, 93.5, 93, 92.2, 91.8, 91.4]`. Options: (a) **Point-in-time only** — remove the sparkline, show live occupancy pct from `computeKpiCards`; (b) **Stored snapshots** — add a `PropertyStatusSnapshot` table (propertyId, status, snapshotAt) with a Convex scheduled function writing a daily record; derive the time-series at query time; (c) **Hybrid** — derive from existing `Lease` start/end dates as a proxy for historical occupancy (retroactive computation, no new writes). Overlaps **Q4.J** (daily snapshots for sparklines). **Blocks PF4 fix** (see `pages/analytics/audit.md` PF4). (Filed: Phase 8.1, 2026-05-06.)

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): POINT-IN-TIME, formula defined.** Occupancy % = `count(properties with an active signed Lease covering today OR Property.status = "Owner-Occupied") / totalProperties × 100`. Drop the hardcoded sparkline entirely — show only the live scalar. New `Property.status` enum value `"Owner-Occupied"` added alongside "Rented", "Vacant", "For Sale", "Sold", "Archived". Sparkline deferred to Q4.J resolution (daily snapshots are a backend-phase concern). **Unblocks PF4 scalar fix.**

---

## Q5 — Schema / data quality questions

**Q5.A — Redundant fields in mock-data.ts**: `Property.status` ("Rented"|"Vacant") vs `statusVariant` ("rented"|"vacant"); `Property.title` ("Hard title"|"Soft title"|"—") vs `titleVariant` ("hard"|"soft"|"none"). The variants are CSS-aware enums. Drop them server-side and derive on the client?

**Q5.B — Add-property schema is too permissive**: every field is `z.string().optional()` (schemas.ts), including:
- `yearBuilt`, `totalArea`, `bedrooms`, `bathrooms`, `parkingSpaces` → should be `z.coerce.number().int().nonnegative()`
- All financial fields (`purchasePrice`, `currentMarketValue`, `outstandingMortgage`, etc.) → should be `z.coerce.number().nonnegative()` or a money type stored in cents
- `purchaseDate` → `z.coerce.date()` then store as Unix ms
- `propertyType` allows empty string (`""`) AND optional — collapse to optional only
Decide: tighten schemas.ts now (before form rewrite) or tighten at the Convex boundary in `api.properties.create`?

**Q5.C — Photos/documents in step4**: today stored as `string[]` of filenames; actual `File` blobs filtered out before localStorage (`drafts-storage.tsx:7–8`). On Convex, switch to `v.id("_storage")` for storage references. Confirm upload happens during the wizard (per file) or batched at submit?

**Q5.D — Mock-data fields not currently rendered in any UI**: `Property.statusVariant`, `Property.buyNumeric`, `Property.titleVariant` are present in `mock-data.ts` but only `buyNumeric` is consumed (in `getPortfolioPageData`'s sum). The `*Variant` fields drive CSS classes via `lib/property-helpers.ts` — keep server-side or compute client-side from the canonical fields? See Q5.A.

**Q5.E — Soft-delete vs hard-delete for documents**? "Deleted" state: hide from list, retain blob? Or remove blob too? Affects compliance/audit.

**Q5.F — `fullName` and `initials` derived vs stored**? `UserProfile.fullName` could derive from `firstName + " " + lastName`. `UserProfile.initials` could derive from those. Storing them costs nothing but goes stale on rename. Recommend: derive on read.

**Q5.G — Email verification: Clerk built-in vs Resend**? Clerk handles registration verification natively. Resend is in the stack — used for what? Notifications dispatch only?

**Q5.H — Currency/locale**: `UserProfile.currency` exists; UI displays USD throughout. Multi-currency support is implied but not yet active. v1: USD only? Or convert on display via FX rates?

**Q5.I — `RegisterPage.tsx:259` hardcodes "0:45" countdown** — when wired to Clerk, what's the real resend cooldown?

**Q5.S — Real PII encryption strategy for backend phase.** The FS-demo CoOwner entity stores SSN already-masked (`••••-••-XXXX`) — only the last 4 digits are plaintext; the full SSN never enters the system. This is forward-compatible with the backend phase but is not a security mechanism. When Convex/Neon migration lands, decide: (a) add `ssnEncrypted: bytes` (KMS-managed key, decrypt only in privileged server functions) alongside `ssnMasked` for display; (b) keep masked-only permanently if no operation requires the full SSN (e.g. 1099 generation would require it). **Blocks:** Convex migration phase. Does not block Phase 6.5 or any other FS-era phase.

**Q5.R — `Document.category` has no closed enum: what are the valid values?** The Zod schema has `category: z.string().optional()` with no enum constraint. The documents page renders category-labelled subsections (Title, Photos, Rental, Insurance, Tax, Sales seen in mock data). With an open string, typos ("title" vs "Title", "rental" vs "Rental") produce ghost categories in the UI and break status-derivation logic in the rental Documents card. Decision: (a) close to `z.enum(["Title", "Sales", "Tax", "Rental", "Photos", "Insurance"])` — guarantees cohesion and compile-time safety on seed data; (b) TypeScript union only (no Zod change) — documents intent without blocking unknown future categories; or (c) leave free-form with a consistent-casing convention and a lint note. Phase 6.3 seeds use Title-case values; wiring proceeds as untyped string today.

**Q5.Q — `SafetyRisk.resolved` field: catalog specifies it, type omits it.** `ref/00 §19` lists `resolved: v.boolean()` but `lib/data/types/safety-risk.ts` has no such field. Consequence: the "Open Issues" KPI on `/property/[id]/safety` cannot distinguish open vs. closed risks — it would collapse to `risks.length` (all risks are open by definition). Two sub-questions: (a) Is there a "close a risk" action in the planned UX? If not, risks are implicitly always open and `resolved` is not needed — change the KPI label to "Recorded Risks" and remove `resolved` from the catalog. (b) If risks can be resolved, add `resolved: boolean` to the type, add a write path (UI + DB mutation), and update seed data. Until decided, the hardcoded "2" on the KPI card is a silent correctness bug. (See audit: `pages/property-id-safety/audit.md` PF4; `pages/property-id-safety/plan.md` §3 Schema gap A.)

> **Resolved 2026-05-07 (Phase 8.6): OPTION (a) — no `resolved` field; KPI renamed to "Safety Risks".** No "close a risk" action exists in the current UI; adding dead schema is avoided. KPI headline = `risks.length`. KPI sub-label = severity breakdown ("N high · N medium · N low" or "No risks recorded"). Remove `resolved` from the entity catalog §19 note. **Unblocks PF4 rows 14–15.**

**Q5.J — Schema validation at the FS DB boundary**: `listMergedRecords<T>` (`lib/data/db/_fs.ts:60–75`) casts merged JSON directly to the entity type without runtime validation. A corrupted `core.json` (e.g. missing `statusVariant`) would still be counted by `properties.length` but silently dropped by status-filtered counts, breaking cross-card identities without a visible error. Validate with Zod at the boundary, or wait until the Convex migration where `v.*` schemas enforce shape automatically? (See audit: `portfolio--properties-count`.)

**Q5.K — What does `Property.health` (0–100) actually measure?** ~~The field is in `PropertyCore` as a bare `number` with no definition of what 0 means, what 100 means, or how the value is authored.~~

> **Resolved 2026-05-06: REMOVE the field — not currently useful.** `Property.health` is dropped from `PropertyCoreSchema` entirely. The `attentionCount` KPI (currently `health < 30`) needs a replacement signal — propose deriving from real entities: count of properties with open Emergency MaintenanceItems + count of properties with overdue rent (Payment.status = "Overdue"). The per-row health bar on the portfolio table is removed (or replaced with a derived signal in the same vein). Cleanup task scope: (a) remove `health` from `PropertyCoreSchema`, (b) remove from all PROP-NNNN/core.json seed files, (c) remove the `attentionCount` KPI on `/portfolio` OR rewire it to a derived attention-signal, (d) remove the per-row health bar from the portfolio table OR replace with a derived signal, (e) remove any audit reports that referenced Property.health (mark resolved-with-removal in fix logs). Files as a small cleanup phase: ~1.5 hours (mostly grep + delete + minor portfolio rewiring).

**Q5.M — Dual type classification with no reconciliation**: `PropertyCore.type: PropertyTypeCode` (3 values: Land/House/Building) and `PropertyMedia.propertyType?: PropertyTypeChoice` (8 values) coexist on the same Property record and represent the same concept at different granularities. The table badge renders `type` only; `propertyType` is stored but never displayed. There is no documented mapping invariant between them, no enforcement that they stay in sync, and no UI path to see the finer-grained value after property creation. Decision needed: (a) display `propertyType` in the table when present (requires updating badge/icon/color helpers for all 8 values), (b) consolidate to a single field and drop the coarser `type`, or (c) keep both but document `type` as a display-bucketing field derived from `propertyType` and enforce the mapping exhaustively. (See audit: `portfolio--property-type` F2.)

**Q5.L — `Property.code` has no format definition, no generation strategy, and no uniqueness guarantee**: Is `code` (a) a user-defined reference number from a land certificate or official document, (b) a system-generated shorthand (e.g. province prefix + sequential count like "PP-2026-0017"), or (c) a legacy field from a prior data model with no current meaning? The add-property wizard never collects it (`form.propertyId` defaults to `""`, no input rendered in any step), so every new property gets `code: ""` — silently leaving the table's sub-label blank and breaking code-based search. Additionally, `form.propertyId` is aliased post-submit to the DB `id` (e.g. "PROP-0017") for the Step6Success display, conflating two distinct identifiers. Decision needed before shipping: (a) drop the field, (b) auto-generate server-side in `db/properties.ts:create()`, or (c) collect from user with a defined format and add to `step2Schema`. Also decide whether `code` must be unique per user. (See audit: `portfolio--property-id` F1, F3, F4.)

**Q5.O — `PropertyMedia.size` vs `PropertyMedia.totalArea`: same concept or distinct?** In `actions.ts:70–72`, both fields are written from the same form source: `size: form.totalArea || ""` and `totalArea: form.totalArea || undefined`. In all 16 seed records `totalArea` is absent while `size` is always present. No code reads `totalArea` for any display purpose. If they are the same thing (total built area in m²), drop `totalArea`. If distinct (e.g., `size` = built area, `totalArea` = lot area), rename both fields to be explicit, add separate form inputs, and update the "Size" column label. (see audit: `portfolio--size` F3)

**Q5.N — `FormData.state` / `PropertyLocation.stateProv` / `PropertyLocation.province` naming tangle**: Three identifiers represent the same concept (the administrative province/state where a property sits) with no documented distinction: (a) `FormData.state` — the wizard's free-text field (placeholder "State") that writes to `province` on submit; (b) `PropertyLocation.stateProv?: string` — an optional field written to `location.json` by `splitProperty()` but never read in any UI; (c) `PropertyLocation.province: string` — the required field displayed in the table and used for filtering. These three should be unified: rename `FormData.state` → `FormData.province`, drop `stateProv`, change the Step 2 input from a free-text `<input>` to a `<select>` populated from the canonical 25-province list (which should live in a shared `lib/constants/cambodia-provinces.ts` instead of being duplicated in `PortfolioPage.tsx`). (See audit: `portfolio--province` F1, F3.)

**Q5.P — `purchasePrice` / `buyNumeric`: can `purchasePrice` be dropped from storage?** `buy` was removed from storage in `portfolio--buy-price` Rev 2 — now derived at query time. Two representations remain: `purchasePrice?: string` (raw wizard input, e.g. `"1278000"`) and `buyNumeric: number` (canonical integer, e.g. `1278000`). Decision: drop `purchasePrice` from `PropertyFinance` and `splitProperty` when the edit-property form is built — pre-fill the price input from `buyNumeric` directly (no need to preserve the raw string). **Resolve when:** edit-property UI is implemented (see `.context/todo-ui.md` §Edit Property §4). (See audit: `portfolio--buy-price` F2.)

**Q5.T — `Notification.propertyId` missing — property-scoped alerts require `linkTo` URL parsing.** The current `NotificationSchema` has no `propertyId` field; filtering Notifications to a specific property is implemented in Phase 6.8 by parsing the `linkTo` URL (regex `/^\/property\/([^/]+)\//`). This workaround holds for notifications that have a property deep-link target, but breaks for: (a) notifications without `linkTo` (e.g. account-level alerts), and (b) notifications scoped to a property but without a deep-link target. Decision: add `propertyId?: string` (optional, schema-version-safe) to `NotificationSchema` in a future schema PR. When `propertyId` is present, use it directly; fall back to `linkTo` parse when absent (dual-path for backwards compatibility). **Does not block any 6.x phase.** Revisit when: Notification auto-creation is implemented in the backend phase (Q4.F backend follow-up).

> **Resolved 2026-05-07 (Phase 8.8 Wiring):** `propertyId: z.string().optional()` added to `NotificationSchema` in `lib/data/types/notification.ts`. Seeds NOTIF-0001..0004 updated with `propertyId` values (NOTIF-0005 is portfolio-level — no property scope). `notificationMatchesProperty()` in `app/(shell)/property/[id]/overview/queries.ts` updated to prefer `propertyId` field, falling back to `linkTo` parse for backwards compatibility. **Schema gap closed.**

**Q5.W** — **Security / encryption copy on `/estate-planning`: soften or remove before a backend encryption model exists?** Two surfaces assert encryption: `stats[3].sub = "All encrypted & backed up"` (KPI card — Protected Documents) and the panel footer `"End-to-end encrypted estate planning data."`. The current implementation stores data in FS-layer JSON under `public/data/` — no encryption at rest, no end-to-end encryption. The phrase "End-to-end encrypted" has a specific technical meaning that is not met. Candidates: (a) **Soften** — change "All encrypted & backed up" to "Secured by Valgate" and "End-to-end encrypted estate planning data." to "Your data is kept private and secure." — factually defensible without a backend model; (b) **Remove** — drop both claims entirely until encryption is implemented; (c) **Accept** — treat as aspirational product copy, not a technical claim (riskiest: users and auditors may disagree). **Bias: option (a).** Softening is the minimal fix; it removes the technically false claim while preserving the reassurance intent. **Blocks** `estate-planning--stats-kpis` KPI card (row 7 sub-label) and PF3 resolution. (Filed: Phase 8.5-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.5 wiring pass): OPTION (a) soften copy.** Updated labels: KPI sub-label is now `"Secured by Valgate"` and footer copy is now `"Your estate planning data is kept private in Valgate."` This removes the technically false "end-to-end encrypted" claim while keeping reassurance copy until backend encryption scope is implemented.

**Q5.V** — **Add `email` and `phone` fields to `ProfessionalSchema`.** Currently absent from `lib/data/types/professional.ts`; the `/directory` page renders Email and Phone buttons (× 6 cards = 12 buttons total) with no backing data and no `onClick`. Candidates: (a) **Two optional string fields** — `email: z.string().email().optional()` + `phone: z.string().optional()`. Simple; straightforward Zod validation; seed data update needed for 3 DB records + 6 HARDCODED_PROFESSIONALS entries. Wire buttons with `mailto:`/`tel:` handlers. (b) **Contacts sub-object** — `contacts: z.object({ email: z.string().email().optional(), phone: z.string().optional(), secondary: z.string().optional() }).optional()`. More extensible but heavier schema change. (c) **Defer** — mark Email/Phone buttons as CHROME until a future phase. **Recommend (a)** — small, immediate, correct. **Blocks PF1 fix** (see `pages/directory/audit.md` PF1). (Filed: Phase 8.4-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.4-Wiring): OPTION (a) — two optional fields.** Added `email: z.string().email().optional()` + `phone: z.string().optional()` + `verified: z.boolean().default(false)` to `ProfessionalSchema` in `lib/data/types/professional.ts`. Updated all 9 seed records (PROF-0001 through PROF-0009) with `email`/`phone`/`verified` values. Email and Phone buttons wired: `disabled={!pro.email}` + `onClick={() => window.open('mailto:...', '_self')}`; `opacity-40 cursor-not-allowed` when no email/phone. `scripts/fixtures/professionals.ts` updated to include all 9 entries with new fields. **PF1 closed.**

**Q5.U** — Expense Breakdown donut on `/analytics`: the slice labelled "Utilities" is computed from `Property.annualInsurance` data, not from any utilities cost source. Label mislabels insurance as utilities. Two options: (a) **Rename only** — change `name: "Utilities"` to `name: "Insurance"` in `computeExpenseBreakdown` at `analytics.ts:231` (1-line fix, no schema change); (b) **Add utilities source** — add a `Property.annualUtilities` field (or a separate Expense entity with category=Utilities) and wire it to a correctly-labelled slice; rename the existing insurance slice to "Insurance". Option (a) is unblocked and immediately actionable. Option (b) is blocked on Q4.H (expenses table design). **Blocks PF5 fix** (see `pages/analytics/audit.md` PF5). Note: the "$48k" donut center (`AnalyticsPage.tsx:383`) is a separate hardcoded string that should be wired from the `total` variable in `computeExpenseBreakdown` regardless of which option is chosen. (Filed: Phase 8.1, 2026-05-06.)

> **Resolved 2026-05-06 (Phase 8.1 Q-resolution): ADD REAL UTILITIES SOURCE (option b), transaction-level.** The existing `Expense` entity (§25 in entity catalog, `lib/data/db/expenses.ts`, shipped Phase 6.2) already has `category: v.union(..., v.literal("Utilities"), ...)`. Wire the donut "Utilities" slice to `sum(Expense.amount where category="Utilities" and date in period)`. Rename the current mislabelled slice to "Insurance" and wire it to `Property.annualInsurance / 12 × months-in-period` (pro-rated fixed cost). The "$48k" donut center is wired from the computed `total` in `computeExpenseBreakdown`. All slices respect the active period filter. Seed data must include `Expense` records with `category="Utilities"` for demo properties. **No new entity needed** — `Expense` (§25) is already the answer. Partially resolves Q4.H (expenses table exists). **Unblocks PF5 fix and Row 38.**

**Q5.X** — **Where to store `dashboardView` preference on `/settings`:** new field on `UserProfile` or a new `UserPreference {key, value}` entity? (Filed: Phase 8.7-audit, 2026-05-07.)

> **Resolved 2026-05-07 (Phase 8.7 Wiring): Add to UserProfile.** Added `dashboardView: z.string().optional()` to `UserProfileSchema`. Reuses existing `upsert()` logic without needing a new generic preference entity.

---

## Q6 — Validation surfaces

**Q6.A — `/login` and `/register` have no Zod**. After Clerk wiring, Clerk handles validation; do we still need our own Zod for client-side hints?

**Q6.B — `/settings` MFA, password change** — Clerk handles, no Convex Zod needed.

**Q6.C — `/settings` notification toggles** — no validation needed (boolean × enum).

**Q6.D — `/settings` selects (dashboardView, language, timezone)** — should be `v.union(...)` enums on the Convex side; today no client validation.

**Q6.E — `/property/[id]/documents` newFolderName** — currently only `.trim()` non-empty. Add max-length, character allowlist (no slashes, etc.)?

**Q6.F — `/profile` Edit form (when wired)** — need a `userProfileSchema` Zod.

---

## Q7 — React Hook Form

The dependency is installed but unused. The add-property wizard uses manual state. Adopt during Convex migration?

- *Adopt*: leverage existing Zod schemas via `zodResolver`; clean form state; better validation UX.
- *Don't*: more refactor scope; manual state works today.
- Recommendation: yes, adopt. The Zod schemas already exist; the cost is mostly mechanical replacement.

---

## Q8 — Per-route uncertainty (one entry per non-trivial route)

| Route | Specific question |
|---|---|
| `/login` | Clerk integration approach: in-page form vs Clerk hosted? |
| `/register` | Clerk-managed verification email + redirect URL? |
| `/` | Map pin click behaviour after route is property-aware (Q4.G). |
| `/portfolio` | Filtering server-side (paginated) or client-side (current) when scale grows? |
| `/property/[id]/overview` | What's the "Recent activity" log? Audit table (Q4.P)? |
| `/property/[id]/documents` | Folder rename UX (modal? inline edit?). Bulk delete confirmation pattern? Upload concurrency cap? |
| `/property/[id]/location` | Map content beyond placeholder — what data drives it (boundary polygons, easements)? |
| `/property/[id]/safety` | "Add Certificate" flow: form fields and required documents? |
| `/property/[id]/ownership` | Equity calculation — see Q4.E. |
| `/property/[id]/rental` | Lease renewal flow: in-app form, email to tenant, both? |
| `/property/[id]/valuation` | Comparables source — manually entered, AVM API, AI? |
| `/add-property` | Drafts to Convex (Q4.A); RHF adoption (Q7); schema tightening (Q5.B); File upload model (Q5.C). |
| `/rental` | Pipeline movement UI: drag-drop or modal? Is rent collection a separate flow? |
| `/analytics` | Period control wiring; Compare/Schedule Report/Export are stubs. |
| `/settings` | MFA: implement now or rely on Clerk dashboard? Password change UX. |
| `/profile` | Edit-profile flow not implemented at all today. |
| `/directory` | Per-user vs global directory (Q4.A); contact actions (call/email)? |
| `/estate-planning` | Successor share validation rules (Q3.G); document/timeline write surfaces. |

---

## Q9 — Cross-cutting decisions to make first (highest leverage)

If the implementer can only resolve five things before starting, do these:

1. **Q4.A — drafts**: client-only or Convex.
2. **Q4.M — multi-user scope**: v1 single-user is fine but will inform every `userId` index decision.
3. **Q3.A–E — KPI definitions**: blocks `/portfolio` and `/analytics` from being more than placeholders.
4. **Q5.B — schema tightness**: blocks `api.properties.create` design.
5. **Q4.F — notification triggers**: cron, mutation hooks, or both — affects every entity that creates notifications.

---

## Open-questions count

- **Total**: ~82 distinct questions across 9 sections (+5 from Phase 8.1 Analytics audit; +8 from Phase 8.2-audit Rental Dashboard; +5 from Phase 8.4-audit Directory; +4 from Phase 8.5-audit Estate Planning).
- **Per non-trivial route**: ≥ 1 (Q8 table covers all 18 non-auth routes).
- **Top three blockers** (Q9): drafts location, multi-user scope, KPI definitions.
- **New additions (Phase 8.1, 2026-05-06):** Q1.F (period filter scope), Q3.K (NOI formula), Q3.L (expense series source), Q4.S (occupancy time-series), Q5.U (Utilities label fix).
- **New additions (Phase 8.2-audit, 2026-05-07):** Q1.G (nav tabs purpose), Q1.H (nav placement), Q3.M (recovery rate formula), Q3.N (eviction risk formula), Q3.O (vacancy cost formula), Q3.P (collection rate formula), Q3.Q (top spend category derivation), Q4.T (multi-unit/Unit entity decision — most consequential of Phase 8).
- **New additions (Phase 8.4-audit, 2026-05-07):** Q1.I (sort dropdown wire/remove), Q1.J (VIEW PROFILE target route), Q4.U (HARDCODED_PROFESSIONALS fallback UX), Q5.V (Professional.email + phone schema fields). Q1.C updated with implementation options for /directory pagination.
- **New additions (Phase 8.5-audit, 2026-05-07):** Q3.R (estate KPI formula definitions — Plan Completion, Pending Reviews, Named Beneficiaries, Protected Documents), Q4.V (Successor-to-Property assignment model — FK direction + scope), Q4.W (estate actions v1 scope — which of 8 CHROME stubs to wire), Q5.W (security/encryption copy softening — "End-to-end encrypted" claim has no backing implementation).
- **New additions (Phase 8.7-audit, 2026-05-07):** Q1.K (notification auto-save vs batch), Q1.L (add Profile section vs defer), Q5.X (dashboardView storage entity).
- **New additions (Phase 8.6-Wiring, 2026-05-07):** Q4.X (Clerk publicMetadata vs Convex storage for extended profile fields).
