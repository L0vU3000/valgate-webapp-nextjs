# Audit Index

> Two tables: per-datapoint audits (written by `/audit-datapoint`) and page-level audits (written by `/audit-page-datapoints`). Both sorted by slug, updated automatically.

## Per-datapoint audits

| Slug | Route | Data point | Latest verdict | Revisions |
|---|---|---|---|---|
| [portfolio--attention-count](portfolio--attention-count.md) | /portfolio | Attention (count) | ✅ Card removed · revisit when health/alert system defined | 2 |
| [portfolio--buy-price](portfolio--buy-price.md) | /portfolio | Buy price (table column) | ⚠️ F1+F3 resolved · F2 deferred (Q5.P) | 2 |
| [portfolio--filtered-count](portfolio--filtered-count.md) | /portfolio | Filtered / total count ("Showing X of Y") | ✅ F1+F2+F4 resolved · F3 partial (Sold shown; Archived via filter) | 3 |
| [portfolio--monthly-income](portfolio--monthly-income.md) | /portfolio | Monthly Income ($7.3K) | ✅ F1 + F3 resolved · 1 P2 deferred | 3 |
| [portfolio--occupancy](portfolio--occupancy.md) | /portfolio | Occupancy (44%) | ⚠️ F1+F4 resolved · F2+F3 deferred | 2 |
| [portfolio--properties-count](portfolio--properties-count.md) | /portfolio | Properties (count) | ✅ 3 resolved · 1 deferred (F3) | 2 |
| [portfolio--property-id](portfolio--property-id.md) | /portfolio | Property Code (table sub-label, e.g. "PP00016 PH") | ✅ All resolved · code=id format · not shown in table | 3 |
| [portfolio--property-name](portfolio--property-name.md) | /portfolio | Property Name (table column) | ✅ All 4 findings resolved | 4 |
| [portfolio--province](portfolio--province.md) | /portfolio | Province (table column) | ⚠️ F1+F2+F3 resolved · F4 deferred | 2 |
| [portfolio--property-type](portfolio--property-type.md) | /portfolio | Property Type badge (e.g. "Residential") | ✅ F1+F2+F3 resolved · F4 deferred | 2 |
| [portfolio--rental-status](portfolio--rental-status.md) | /portfolio | Rental Status (table column) | ✅ All 3 findings resolved | 2 |
| [portfolio--size](portfolio--size.md) | /portfolio | Size (m²) column | ✅ F1+F2+F3 resolved · F4 deferred (sorting not yet built) | 2 |
| [portfolio--title-deed-status](portfolio--title-deed-status.md) | /portfolio | Title/deed status badge (e.g. "Hard title") | ✅ All 4 findings resolved | 2 |
| [portfolio--total-value](portfolio--total-value.md) | /portfolio | Total Purchase Price ($10.79M) | ✅ 3 resolved · 1 deferred (F4) | 2 |
| [portfolio--yoy-growth](portfolio--yoy-growth.md) | /portfolio | YoY growth badge ("+$32K YoY") | ⚠️ 3 findings (2 P1, 1 P3) — correct for seed; "YoY" label misleading with limited history | 1 |
| [property-id-documents--file-count-subtitle](property-id-documents--file-count-subtitle.md) | /property/[id]/documents | Page subtitle — file count ("7 files · PP00001 House") | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-documents--folder-location-tree](property-id-documents--folder-location-tree.md) | /property/[id]/documents | Add Folder + Move To modals — location tree (rows 19 + 20, combined-derivation report) | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · same folderTree derivation drives both modals | 1 |
| [property-id-documents--folder-sidebar](property-id-documents--folder-sidebar.md) | /property/[id]/documents | File detail sidebar — folder list ("All Documents" + top-3 root folders) | ✅ Correct · 1 finding (P1 systemic) | 1 |
| [property-id-documents--folder-tile-grid](property-id-documents--folder-tile-grid.md) | /property/[id]/documents | Folder tile grid — root folder names as clickable tiles (row 7) | ✅ Correct · 1 finding (P1 systemic) | 1 |
| [property-id-documents--file-row-direct-reads](property-id-documents--file-row-direct-reads.md) | /property/[id]/documents | File list row — name, type icon, folder label, size, date, thumbnails (bundle: 6 surfaces, rows 8–13) | ✅ Correct · 3 findings (1 P1, 1 P2 resolved, 1 P3 deferred) — thumbnails deferred storage phase | 1 |
| [property-id-documents--section-file-count](property-id-documents--section-file-count.md) | /property/[id]/documents | Files section header — filtered file count ("All Files · 7 files" / "Tax · 1 file") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-documents--upload-demo-files](property-id-documents--upload-demo-files.md) | /property/[id]/documents | Upload progress panel — demo file list (Lease_Agreement_v3.pdf, Inspection_Photos.jpg, Safety_Cert.pdf) | ✅ Intentionally hardcoded — UI demo construct, not a data surface | 1 |
| [property-id-overview--active-leaseholders](property-id-overview--active-leaseholders.md) | /property/[id]/overview | Active Leaseholders table — rows (initials, name, unit, rent, status badge) | ✅ Correct · 2 findings (1 P1, 1 P2) | 1 |
| [property-id-overview--alerts-strip-notifications](property-id-overview--alerts-strip-notifications.md) | /property/[id]/overview | Action strip — stored Notification alerts (row 16 Notification merge) | ✅ Correct · 2 findings (1 P1, 1 P3) · Q4.F resolved | 1 |
| [property-id-overview--expenses](property-id-overview--expenses.md) | /property/[id]/overview | Financials card — Expenses value (YTD) | ✅ Correct · 2 findings (1 P1, 1 P3) · YTD window boundary confirmed | 1 |
| [property-id-overview--gross-income](property-id-overview--gross-income.md) | /property/[id]/overview | Financials card — Gross Income value (YTD) | ✅ Correct · 2 findings (1 P1, 1 P3) · Paid Rent filter verified | 1 |
| [property-id-overview--lease-expiring-alert](property-id-overview--lease-expiring-alert.md) | /property/[id]/overview | Action strip — lease-expiring alert items (derived from Lease.endDate) | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · Q4.F default documented | 1 |
| [property-id-overview--monthly-income](property-id-overview--monthly-income.md) | /property/[id]/overview | Monthly Income KPI — headline value | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · Q3.B choice documented | 1 |
| [property-id-overview--noi](property-id-overview--noi.md) | /property/[id]/overview | Financials card — Net Operating Income headline value | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · progress bar removed (no target) | 1 |
| [property-id-overview--property-valuation](property-id-overview--property-valuation.md) | /property/[id]/overview | Property Valuation ($1,310,000) | ✅ Correct · 2 findings (1 P2, 1 P3) | 1 |
| [property-id-overview--rental-status](property-id-overview--rental-status.md) | /property/[id]/overview | Rental status badge ("Rented") | ⚠️ 2 findings (1 P1, 1 P2) | 1 |
| [property-id-overview--tenant-mix-donut](property-id-overview--tenant-mix-donut.md) | /property/[id]/overview | Tenant Mix donut — stage breakdown arcs, center count, legend | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · schema-gap default documented | 1 |
| [property-id-rental--balance-due](property-id-rental--balance-due.md) | /property/[id]/rental | KPI card — Balance Due | ✅ Correct · 1 finding (P1) · $0.00 / Current for PROP-0001 | 1 |
| [property-id-rental--maintenance-card](property-id-rental--maintenance-card.md) | /property/[id]/rental | Maintenance card — open count badge + 2 item rows (rows 28, 29, 30 combined-derivation) | ✅ Correct · 2 findings (1 P1, 1 P3) · covers 3 surfaces | 1 |
| [property-id-rental--documents-card](property-id-rental--documents-card.md) | /property/[id]/rental | Documents card — 3-item list (name, status label, date) | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) | 1 |
| [property-id-rental--expenses-subtotal](property-id-rental--expenses-subtotal.md) | /property/[id]/rental | Financial Overview subtotals — Expenses | ✅ Correct · 1 finding (P1) · $930 for Nov–Apr window (5 expense records) | 1 |
| [property-id-rental--expiry-countdown](property-id-rental--expiry-countdown.md) | /property/[id]/rental | Lease Summary card — expiry countdown banner ("Expires in N days") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--financial-overview-chart](property-id-rental--financial-overview-chart.md) | /property/[id]/rental | Financial Overview — bar chart (6 monthly rent bars) | ✅ Correct · 1 finding (P1) · Nov–Apr window; only Mar bars are non-zero | 1 |
| [property-id-rental--lease-duration-badge](property-id-rental--lease-duration-badge.md) | /property/[id]/rental | Lease Summary card — term badge ("12-month") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--lease-summary-fields](property-id-rental--lease-summary-fields.md) | /property/[id]/rental | Lease Summary card — 5-row field table (Lease Start, Lease End, Rent, Deposit, Auto-pay) | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) | 1 |
| [property-id-rental--lease-summary-tenant](property-id-rental--lease-summary-tenant.md) | /property/[id]/rental | Lease Summary card — tenant name line (below card heading) | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--monthly-rent-kpi](property-id-rental--monthly-rent-kpi.md) | /property/[id]/rental | Monthly Rent KPI card — headline value "$X" | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-rental--moved-in-date](property-id-rental--moved-in-date.md) | /property/[id]/rental | Tenant Profile card — "Moved in" date field | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--net-income-subtotal](property-id-rental--net-income-subtotal.md) | /property/[id]/rental | Financial Overview subtotals — Net Income | ✅ Correct · 2 findings (2 P1) · $770 for Nov–Apr window; accent removed | 1 |
| [property-id-rental--occupancy-kpi](property-id-rental--occupancy-kpi.md) | /property/[id]/rental | Occupancy KPI card — value ("Occupied"/"Vacant") + accent ("N months · Since Mon YYYY") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--on-time-pct](property-id-rental--on-time-pct.md) | /property/[id]/rental | Tenant Profile — on-time payments % | ✅ Correct · 1 finding (P1) · 100% for PROP-0001 (3/3 Rent payments Paid) | 1 |
| [property-id-rental--page-subtitle](property-id-rental--page-subtitle.md) | /property/[id]/rental | Page header subtitle — "$X/mo · Occupied · Lease expires DATE" | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-rental--pagination](property-id-rental--pagination.md) | /property/[id]/rental | Payment History — pagination counts and page label | ✅ Correct · 1 finding (P3) · Showing 1–3 of 3 / Page 1 of 1 | 1 |
| [property-id-rental--payment-history](property-id-rental--payment-history.md) | /property/[id]/rental | Payment History — table rows (date, type, amount, method, status) | ✅ Correct · 1 finding (P1) · 3 rows shown; sorted desc by date | 1 |
| [property-id-rental--period-label](property-id-rental--period-label.md) | /property/[id]/rental | Financial Overview — period selector label | ✅ Correct · 0 findings · Nov 2025 – Apr 2026 derived from chart window | 1 |
| [property-id-rental--tenant-avatar-initials](property-id-rental--tenant-avatar-initials.md) | /property/[id]/rental | Tenant Profile card — avatar circle initials ("SD") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--tenant-email](property-id-rental--tenant-email.md) | /property/[id]/rental | Tenant Profile card — email contact row | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--tenant-name](property-id-rental--tenant-name.md) | /property/[id]/rental | Tenant Profile card — tenant name heading | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--tenant-phone](property-id-rental--tenant-phone.md) | /property/[id]/rental | Tenant Profile card — phone contact row | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--total-rent](property-id-rental--total-rent.md) | /property/[id]/rental | Financial Overview subtotals — Total Rent | ✅ Correct · 1 finding (P1) · $1,700 for Nov–Apr window (2 March payments) | 1 |
| [property-id-rental--unit-occupancy-pill](property-id-rental--unit-occupancy-pill.md) | /property/[id]/rental | Unit header pill — occupancy status badge ("Occupied" / "Vacant") | ✅ Correct · 1 finding (1 P1) | 1 |
| [property-id-rental--ytd-net-income](property-id-rental--ytd-net-income.md) | /property/[id]/rental | KPI card — YTD Net Income | ✅ Correct · 3 findings (2 P1, 1 P3) · Same YTD window as overview NOI; $1,800 | 1 |
| [property-id-valuation--appreciation-gain](property-id-valuation--appreciation-gain.md) | /property/[id]/valuation | Total Appreciation card — gain % + purchase date sub-label | ✅ Correct · 3 findings (1 P1, 2 P3) — percentage correct; purchaseDate absent from seed | 1 |
| [property-id-valuation--current-market-value](property-id-valuation--current-market-value.md) | /property/[id]/valuation | Current Market Value KPI card | ✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) | 1 |
| [property-id-valuation--qoq-change](property-id-valuation--qoq-change.md) | /property/[id]/valuation | QoQ change sub-label | ⚠️ 3 findings (1 P1, 1 P2, 1 P3) — "quarter" label uses adjacent records regardless of time gap | 1 |
| [property-id-valuation--total-appreciation](property-id-valuation--total-appreciation.md) | /property/[id]/valuation | Total Appreciation KPI card | ✅ Correct · 2 findings (1 P2, 1 P3) | 1 |
| [property-id-valuation--your-estimate](property-id-valuation--your-estimate.md) | /property/[id]/valuation | Comparable Sales footer — "Your estimate: $X" | ✅ Correct · 2 findings (1 P1, 1 P3) — hardcoded "1.4% below comps" delta is stale | 1 |
| [property-id-location--total-land-size](property-id-location--total-land-size.md) | /property/[id]/location | FullView KPI — Total Land Size (m² + hectares derivation) | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-location--development-potential](property-id-location--development-potential.md) | /property/[id]/location | FullView KPI — Development Potential bullet list | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-location--land-parcel-direct-reads](property-id-location--land-parcel-direct-reads.md) | /property/[id]/location | LandParcel direct-read bundle — rows 13, 14, 15, 17, 18, 24, 25, 26, 30 (9 surfaces) | ✅ Correct · 2 findings (1 P1, 1 P3) | 1 |
| [property-id-ownership--co-owner-cards-direct-reads](property-id-ownership--co-owner-cards-direct-reads.md) | /property/[id]/ownership | CoOwner cards bundle — rows 19–25 (7 surfaces: legend, 2× identity/share/equity/contact/tax) | ✅ Wired · 2 findings (1 P1 systemic, 1 P3) | 1 |
| [property-id-ownership--expense-responsibility](property-id-ownership--expense-responsibility.md) | /property/[id]/ownership | Expense Responsibility — row 29 (sharePercent → "shared costs" label) | ✅ Wired · 1 finding (P3 deferred) | 1 |
| [property-id-ownership--rent-income-split](property-id-ownership--rent-income-split.md) | /property/[id]/ownership | Rent Income Split — row 28 (sharePercent × active lease monthlyRent) | ✅ Wired · 2 findings (1 P1 systemic, 1 P2 expected-vs-received) | 1 |
| [property-id-ownership--split-donut](property-id-ownership--split-donut.md) | /property/[id]/ownership | Ownership Split donut — row 18 (SVG arc geometry + center text) | ✅ Wired · 2 findings (1 P1 systemic, 1 P3 overflow edge case) | 1 |
| [property-id-ownership--ownership-record-direct-reads](property-id-ownership--ownership-record-direct-reads.md) | /property/[id]/ownership | OwnershipRecord §21 direct-read bundle — rows 6, 13, 17, 27 (4 surfaces: holdingType KPI, mortgage terms, next payment due, distribution method) | ✅ Wired · 2 findings (1 P1 systemic, 1 P3) | 1 |
| [property-id-ownership--total-owners](property-id-ownership--total-owners.md) | /property/[id]/ownership | KPI — Total Owners (row 7) — cross-entity: coOwners.length | ✅ Wired · 2 findings (1 P1 systemic, 1 P3) | 1 |
| [property-id-ownership--acquisition-details](property-id-ownership--acquisition-details.md) | /property/[id]/ownership | Acquisition Details table — row 26 (10 sub-rows: Purchase Price, Down Payment, Closing Costs, Total Acquisition, Lender, Loan Amount, Interest Rate, Loan Term, Origination Date, Maturity Date) | ✅ Wired · 3 findings (1 P1 systemic, 1 P2, 1 P3 deferred) | 1 |

| [analytics--kpi-strip-direct-reads](analytics--kpi-strip-direct-reads.md) | /analytics | KPI strip — Total Revenue, Occupancy, Rent Collection, Maintenance KPI, change badges (5 surfaces) | ✅ 2 WIRED · 2 PARTIAL · 1 HARDCODED — no regressions | 1 |
| [analytics--noi-kpi](analytics--noi-kpi.md) | /analytics | NOI KPI value | ✅ PF3 resolved — NOI = Revenue − Expenses | 1 |
| [analytics--revenue-chart](analytics--revenue-chart.md) | /analytics | Revenue area series, Expense area series, X-axis labels (3 surfaces) | ✅ PF2 resolved — Expense series uses Expense.amount | 1 |
| [analytics--occupancy-card](analytics--occupancy-card.md) | /analytics | Occupancy headline value, "Point-in-time" label; sparkline removed | ✅ PF4 resolved — live scalar, sparkline removed | 1 |
| [analytics--lease-pipeline-direct-reads](analytics--lease-pipeline-direct-reads.md) | /analytics | Lease pipeline — bucket labels, unit counts, bar widths (3 surfaces) | ✅ Correct · 1 finding (P3 nit — "View All" stub) | 1 |
| [analytics--capital-growth-direct-reads](analytics--capital-growth-direct-reads.md) | /analytics | Capital Growth — rank, property name, growth %, bar widths (4 surfaces) | ✅ Correct · 1 finding (P3 nit — top-3 cut-off unlabelled) | 1 |
| [analytics--expense-breakdown](analytics--expense-breakdown.md) | /analytics | Expense donut — Maintenance, Utilities, Insurance/Tax slices, donut center (5 surfaces) | ✅ PF5 + Row 38 resolved — Expense entity drives all slices | 1 |
| [analytics--maintenance-spend](analytics--maintenance-spend.md) | /analytics | Maintenance Spend chart — monthly bars, month labels (2 surfaces) | ✅ PF5-sub resolved — uses Expense.amount; trailing-6M intentional | 1 |
| [rental--arrears-buckets](rental--arrears-buckets.md) | /rental | Rent Collection & Arrears — 3 aging buckets + Billing Recovery + Eviction Risk (5 surfaces) | ✅ All 5 wired · Q3.M + Q3.N resolved (Phase 8.2) | 1 |
| [rental--heatmap-summary-line](rental--heatmap-summary-line.md) | /rental | Portfolio Occupancy heatmap — summary line (occupied · vacant · expiring counts) | ✅ Resolved with PF3 · useMemo over live heatmapClusters prop | 1 |
| [rental--heatmap-unit-tiles-mocked](rental--heatmap-unit-tiles-mocked.md) | /rental | Portfolio Occupancy heatmap — property tiles grouped by province | ✅ All tiles wired · Q4.T resolved (properties by province, no Unit entity) | 1 |
| [rental--kpi-strip-mocked](rental--kpi-strip-mocked.md) | /rental | KPI strip — Hero gross income + trend + sparkline + 4 KPI cards (11 surfaces) | ✅ 7/11 wired · 2 CHROME · F1 sparkline HARDCODED (Q4.J) · F2 maintenance total HARDCODED (schema gap) | 1 |
| [rental--lease-pipeline-cards](rental--lease-pipeline-cards.md) | /rental | Lease Renewal Pipeline — 4 stage columns + count badges + ≤2 cards each (~14 surfaces) | ✅ All wired via computePipeline | 1 |
| [rental--lease-table-mocked](rental--lease-table-mocked.md) | /rental | Property Ranking table — 3 rows × 5 fields (NOI, Rent, Market Index) — 15 surfaces | ⚠️ All 15 HARDCODED · PF4 open · pending Phase 6.9 (computePropertyYieldRanking) | 1 |
| [rental--maintenance-summary](rental--maintenance-summary.md) | /rental | Maintenance Exposure — 3 severity rows + Top Spend category + bar (5 surfaces) | ✅ 4/5 wired · Q3.Q resolved · maintenance total deferred (schema-blocked) | 1 |
| [rental--upcoming-events](rental--upcoming-events.md) | /rental | Upcoming Events timeline — ≤5 event rows (time, title, detail, dot colour) | ✅ All wired via computeUpcomingEvents · 14-day horizon · 3 event types | 1 |
| [directory--professional-card-direct-reads](directory--professional-card-direct-reads.md) | /directory | Professional card bundle — 11 direct-read fields × 9 cards (99 surfaces) | ✅ All 99 surfaces WIRED · verified badge added · 1 deferred (PF6 linkedProperties scalar) | 1 |
| [directory--contact-buttons](directory--contact-buttons.md) | /directory | Contact buttons — Email × 9 + Phone × 9 (18 surfaces) | ✅ PF1 resolved — email/phone schema added; all 18 wired with mailto/tel + disabled state | 1 |
| [directory--filter-controls](directory--filter-controls.md) | /directory | Filter controls — search input + Grid/List toggle + 9 category pills (11 surfaces) | ✅ All 11 WIRED · 0 findings | 1 |
| [directory--pagination](directory--pagination.md) | /directory | Pagination — Showing X, of N, prev/next, page buttons (7 surfaces) | ✅ PF3 resolved — ITEMS_PER_PAGE=12; real count; dynamic buttons; 1 P3 nit (buttons hidden at current scale) | 1 |
| [directory--card-actions-stubs](directory--card-actions-stubs.md) | /directory | Card actions — COPY INFO × 9 + VIEW PROFILE × 9 (18 surfaces) | ✅ PF4 resolved — VIEW PROFILE → Link; COPY INFO was already wired | 1 |
| [directory--sort-and-empty-state](directory--sort-and-empty-state.md) | /directory | Sort dropdown + empty state + verified-tier architecture (PF2 + PF5) | ✅ PF2 + PF5 resolved — sort wired; HARDCODED_PROFESSIONALS removed; Valgate-verified tier introduced | 1 |
| [estate-planning--successor-table-direct-reads](estate-planning--successor-table-direct-reads.md) | /estate-planning | Successor table direct-reads — name, initials, relation, role badge, share % (rows 13–18) | ✅ All 5 fields WIRED · PF5 resolved (per-property scoping) · 0 findings | 1 |
| [estate-planning--successor-verification-status](estate-planning--successor-verification-status.md) | /estate-planning | Successor verification status badge (row 19) — Verified / Unverified | ✅ WIRED · PF2 resolved — conditional branch; SUCC-0003 renders Unverified · 0 findings | 1 |
| [estate-planning--stats-kpis](estate-planning--stats-kpis.md) | /estate-planning | Stats KPI cards — Plan Completion, Pending Reviews, Assigned Beneficiaries, Estate Documents (rows 4–7) | ✅ All 4 WIRED · Q3.R resolved (4-check rubric) · 1 P3 nit (plural "beneficiaries") | 1 |
| [estate-planning--property-cards](estate-planning--property-cards.md) | /estate-planning | Property list cards — name, address, status badge (row 8) | ✅ WIRED · status from 4-check rubric; filter select functional · 1 P3 nit (display cap) | 1 |
| [estate-planning--property-status-panel](estate-planning--property-status-panel.md) | /estate-planning | Property status panel — panel header + status bar (rows 10, 12) | ✅ Both WIRED · last-updated from activity events · 0 findings | 1 |
| [estate-planning--estate-documents](estate-planning--estate-documents.md) | /estate-planning | Estate Documents cards — name, meta, download (row 21) | ✅ WIRED · Q4.C resolved (category="estate") · empty-state present · 0 findings | 1 |
| [estate-planning--recent-activity](estate-planning--recent-activity.md) | /estate-planning | Recent Activity timeline — title, time, description (row 22) | ✅ WIRED · Q4.P resolved (EstateActivityEvent) · relative timestamps · 0 findings | 1 |
| [estate-planning--action-stubs](estate-planning--action-stubs.md) | /estate-planning | Action stubs — Generate Portfolio Report, Download Summary, Review All, MoreHorizontal, footer (rows 3, 11, 20, 23, 24) | ✅ View Analytics + Add Beneficiary WIRED · 5 stubs remain CHROME · Q4.W v1 scope resolved · 0 findings | 1 |

## Page-level audits

| Slug | Route | WIRED | HARDCODED | PFn | Latest verdict | Revisions |
|---|---|---|---|---|---|---|
| [portfolio](pages/portfolio/audit.md) | /portfolio | 15 | 1 | 2 | ⚠️ mostly wired — YoY growth needs PropertyValuation | 1 |
| [property-id-documents](pages/property-id-documents/audit.md) | /property/[id]/documents | 3 | 13 | 5 | ⚠️ 13 hardcoded — top entities: Document (9 surfaces) + Folder (4) | 1 |
| [property-id-location](pages/property-id-location/audit.md) | /property/[id]/location | 4 | 19 | 6 | ⚠️ 19 hardcoded — top entities: LandParcel (11 surfaces) + PropertyComparable (7); lat/lng never consumed | 1 |
| [property-id-overview](pages/property-id-overview/audit.md) | /property/[id]/overview | 9 | 6 | 4 | ⚠️ 6 hardcoded — Lease+Tenant wired Phase 6.1; top entity remaining: Payment+Expense | 1 |
| [property-id-ownership](pages/property-id-ownership/audit.md) | /property/[id]/ownership | 16 | 9 | 6 | ⚠️ 9 hardcoded — CoOwner + OwnershipRecord §21 wired (6.5+6.6); remaining: Property field promotion (7) + OwnershipDocument.status (1) | 1 |
| [property-id-rental](pages/property-id-rental/audit.md) | /property/[id]/rental | 16 | 16 | 4 | ⚠️ 16 hardcoded — Lease+Tenant wired Phase 6.1; Payment+Expense unlocks 10 more rows | 1 |
| [property-id-safety](pages/property-id-safety/audit.md) | /property/[id]/safety | 16 | 9 | 5 | ⚠️ KPI row ignores received arrays — derivation gap, not missing entities | 1 |
| [property-id-valuation](pages/property-id-valuation/audit.md) | /property/[id]/valuation | 4 | 18 | 4 | ⚠️ 18 hardcoded — PropertyValuation exists but not wired; market/comp data needs external integration | 1 |
| [analytics](pages/analytics/audit.md) | /analytics | 24 | 2 | 6 | ✅ Phase 8.1 complete — PF1–PF6 + Row 38 resolved; expenses/NOI/occupancy/period filter all wired | 2 |
| [rental-dashboard](pages/rental-dashboard/audit.md) | /rental | ~25 | ~67 | 6 | ⚠️ Phase 8.2-audit complete — ~67 hardcoded; KpiCards + LeaseTable + HeatmapGrid (33 tiles) all mocked; Unit entity decision (Q4.T) is the key blocker | 1 |
| [directory](pages/directory/audit.md) | /directory | 99+ | 0 | 6 | ✅ Phase 8.4-Wiring complete — PF1–PF5 resolved; 6 post-wiring audit reports written; PF6 deferred | 2 |
| [estate-planning](pages/estate-planning/audit.md) | /estate-planning | 17 | 0 | 6 | ✅ Phase 8.5-Post-Wiring complete — 17 WIRED · 5 CHROME · 2 PARTIAL; PF1–PF5 resolved; PF6 deferred; 8 audit reports written | 2 |
