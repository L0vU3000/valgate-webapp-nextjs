# Findings & Decisions — Valgate Pro Interface

> Working memory on disk. Captures the explore-stage research so it survives context resets.
> Branch: `L0vU3000/pro-interface-valgate` · Target: `origin/valgate-webapp-nextjs-v1.0.2`

## Requirements (from user)

- The current `/pro/dashboard` "gets the idea but isn't there yet": its stats are **not grounded** in the seed-data types the client side already uses.
- **Pro and client side must share the same schema foundation.** Pro adds extra Pro-only schema, but the foundation comes from the client side.
- Research **what a real asset manager does day-to-day** → use that to decide the most important things a pro-level asset manager wants to see per page.
- Identify the **processes Valgate can take off the manager**, and the **inputs the manager gives Valgate** so Valgate is maximally useful.
- Focus on a **small number of main pages** (the core Pro features). Each page has several processes (on-page or connected to the broader Valgate system) — identify & prioritise. Not everything ships; focus on main features. Prioritise via the asset-manager lens.
- Make everything **functional using the same technique as the client side**: the simulated-backend JSON file structure (offline-mode Valgate, local-first). This is a staged version before a real backend (Convex) migration.
- We are in **explore stage**; make a plan when ready.

## The core structural insight (north star)

> The client side is **one owner managing their own properties**. Pro is **one manager overseeing many owners' properties**. Pro is a **multi-owner overlay on the exact same schema** — and every Pro stat is just an existing per-property derivation, grouped by client and rolled up.

The only missing foundational piece is a **`Client` (owner) entity + a `clientId` tag on each property**, so the existing 23 seed properties can be partitioned across ~6–7 clients. After that, every Pro KPI becomes a real aggregation (no invented formulas).

## Research Findings

### A. Client-side shared schema (the foundation)

- **Seed data root:** `public/data/users/demo-user/<collection>/<recordId>/*.json`. Each record is **split across JSON files** (`core.json`, `finance.json`, `location.json`, `media.json`) and **merged** on read.
- **Seed volume (real, already present):** 23 properties · 48 property-valuations · 5 leases · 9 payments · 5 tenants · 3 ownership-records · 10 professionals · 11 maintenance-items · 10 certifications · 10 inspections · 7 safety-risks · 15 documents · 12 folders · 10 emergency-contacts · 3 successors · 2 estate-assignments · 21 ownership-documents · 17 ownership-history.
- **Types (Zod):** `lib/data/types/*.ts` — Property (core/location/finance/media), PropertyValuation, Lease, Payment, Tenant, OwnershipRecord, CoOwner, OwnershipDocument, SafetyRisk, Inspection, Certification, EmergencyContact, Successor, EstateAssignment, Professional, Document, Folder, MaintenanceItem, UserProfile, Progress.
- **Local-db (simulated backend):** `lib/data/db/_fs.ts` (read/merge/write JSON; `nextId`, `writableRoot` → `/tmp` on Vercel else seed) + per-entity modules `lib/data/db/<entity>.ts` with `list/get/create/update/remove`.
- **Derivations:**
  - `lib/data/derivations/progress.ts` → `computeProgressDetails(property, context)` — 7 weighted pillars. *(VERIFY live weights: subagent reported Location 15 / Financials 30 / Rental 20 / Ownership 15 / Safety 10 / Estate 5 / Docs 5, but memory `project_property_progress_stat` records Financials 20 + Valuation 10. Read the file before relying on weights.)*
  - `lib/data/derivations/portfolio.ts` → `computeStats(items)` (totalValue, rented/vacant, occupancyRate, avgProgress) and `computeKpis(properties, payments, leases, totalValue)` (monthlyExpected, monthlyCollected, isUnderCollected, newThisMonth).
- **Query layer (server):** `app/(shell)/queries.ts` (`getHomePageData`), `app/(shell)/portfolio/queries.ts` (`getPortfolioPageData`). Build full `ProgressContext`, compute per-property progress + portfolio stats.
- **Key field names:**
  - Property.core: `id, userId, name, code, type, status, lat, lng, propertyUse, rentalVerified, estateVerified, isArchived`
  - Property.finance: `purchasePrice, purchaseDate, currentMarketValue, outstandingMortgage, monthlyPayment, interestRate, annualPropertyTax, annualInsurance, ownershipStatus, buyNumeric`
  - Property.location: `addressLine, city, province, country, zip, locationVerified`
  - Property.media: `totalArea, yearBuilt, bedrooms, bathrooms, parkingSpaces, photoStorageIds, documentStorageIds`
  - Lease: `propertyId, tenantId, unit, stage(Approaching|Offered|Signed|Declined), startDate, endDate, monthlyRent, termMonths, renewalStatus`
  - Payment: `leaseId, date, kind(Rent|Fee|Deposit|Refund), amount, method(ABA Bank|Wing|Wire|Cash), status(Paid|Pending|Failed|Overdue)`
  - Professional: `name, company, category(Notary|Lawyer|Accountant|Agent|Electrician|Plumber|Inspector|Maintenance), rating, linkedProperties, available, verified` — **this is the vendor pool for work orders**.
- **Derivation specs documented in audit corpus:** Holding Period `(today − purchaseDate)`; Appreciation `(currentMarketValue − buyNumeric)/buyNumeric`; Equity `currentMarketValue − outstandingMortgage`; LTV `outstandingMortgage / currentMarketValue`; YoY growth from valuations.
- **Convex (future backend, already drafted):** `convex/schema/property.ts` etc. — normalized `property`, `property_finance`, `property_location`, `owner`, `property_owner_membership`, `lease`, `lease_payment`, `document`. **`owner` + `property_owner_membership` already model multi-owner** — the Pro `Client` concept should align with this for clean migration.

### B. Current Pro mock — the gap to close

- **File:** `app/(pro)/pro/_data/mock.ts` (~1240 lines). Exports `mockKpis, mockAlerts, mockClients, mockAssets, mockWorkOrderStatus, mockFinancials, mockOccupancy, mockMaintenance, mockCompliance, mockActivity` + `buildClientOverview()`/`getClientOverview()`.
- **Everything is hardcoded literals**, not derivations. Examples of invented data with no schema grounding:
  - `portfolioValue: "$12.4M"`, `aum: "47"`, `noi: "$94,200"` — typed strings.
  - `collected = Math.round(client.assetCount * 3200 + 4000)`; `expected = collected * 1.12`; NOI derived circularly from collected.
  - `occupancyLabelForStatus()` maps a status string → occupancy text (not lease-driven).
- **Concept mismatches vs real schema:**
  - Pro `Asset` = property **| vehicle | equipment**; real schema has only `Property` (residential/commercial). Vehicles/equipment are **out of scope** for the shared foundation.
  - Pro `Client` is free-floating; real schema has `owner` + `property_owner_membership` (and single `demo-user` today). No `clientId` link exists yet.
  - Pro `currentValue: "$1.8M"` string vs real `currentMarketValue` number + `PropertyValuation` history.
  - `mockCompliance` / `mockMaintenance` arrays not linked to `Certification`/`Inspection`/`SafetyRisk`/`MaintenanceItem`.
  - Discrepancies even within the mock (WorkOrderStatus header says "12 total" but counts sum to 36; MaintenanceQueue header "12" but only 5 items).
- **Pro routes today:** `/pro/dashboard` (full) and `/pro/clients/[clientId]` (full, mirrors dashboard scoped to one client via `buildClientOverview`). Shell (sidebar/header/workspace tabs) is polished. Nav items Inbox/Reports/More and Create/Settings buttons are stubs.

### C. Wiring methodology (replicate this exactly)

- **Corpus:** `.claude/data-audit/` — `WIRING-PLAYBOOK.md`, `pages/SUMMARY.md`, `pages/INDEX.md`, per-page `pages/<slug>/audit.md` + `plan.md` + `datapoints/`, `ref/07-entity-fields.md`, `ref/08-backend-migration-readiness.md`, `ref/09-page-wiring-status.md`, `ref/05-open-questions.md`.
- **Per-surface classification:** WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE.
- **Three-rule pre-flight before wiring:** (1) adjacent-hardcode sweep, (2) empty-state convention match within the file, (3) multi-record mental walk-through of any conditional-sum loop (numerator & denominator use same condition).
- **Derivation helpers** live as pure functions co-located in `queries.ts`. No gratuitous abstraction.
- **Phase plan convention (project memory):** every phase plan written to BOTH `~/.claude/plans/` (active) AND `.claude/data-audit/docs/plans/Plan-Phase-<n>-<title>.md` (archive), in the same step. Build-order rule: sort entities by (pages_touched DESC, surfaces DESC).

### D. Domain research — what an asset manager does

- **Asset manager vs property manager (real distinction):**
  - **Property manager** = operational, tenant-facing: rent collection, maintenance, leasing, tenant comms. Day-to-day.
  - **Asset manager** = financial/strategic, *does NOT touch tenants*: maximise portfolio value, cash-flow forecasting, buy/hold/sell, performance vs market, **and reporting to the owners they manage on behalf of**.
  - **Valgate's DNA = asset management** (the client side is a wealth/ownership view: valuation, equity, ownership structure, estate, risk — not a tenant-ops CRM). → Position Pro as an **asset-manager cockpit** that *surfaces* operational items for triage, not a full property-mgmt CRM.
- **Metrics asset managers live by:** NOI, occupancy (target >94%), collection rate, cap rate (NOI/value), DSCR (lenders want 1.25–1.35), equity/LTV, appreciation, portfolio ROI/IRR. (Client side already derives holding period, appreciation, equity, LTV.)
- **Biggest time-drains Valgate can take off them (ranked):**
  1. **Owner reporting** — repeatedly cited as a major drain; managers work late assembling monthly owner packets.
  2. **Maintenance coordination** — ranked #1 challenge in every industry survey.
  3. **Rent collection & follow-up** — chasing overdue payments.
  4. **Compliance tracking** — inspections/certs expiring across many properties.
  5. **Admin / data-gathering** — ~40% of a manager's week is admin; 62% work 50+ hrs/wk.
- **What owners want in a monthly report:** rent collected, income/expenses, mgmt fees, NOI, occupancy & rent roll, open/completed work orders, reserve balance, upcoming lease expirations, lease/inspection docs. Delivered within ~10 days of month-end; real-time owner portal increasingly expected.
- **Inputs a manager gives software (map 1:1 to existing local-db CRUD):** onboard client + assign properties · log payment received · create & assign work order to a vendor · record inspection / upload certificate · update valuation · add/renew lease · upload documents.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Rebuild Pro on the shared client-side schema + derivations | User requirement; eliminates invented numbers; preserves Convex migration path (only db layer swaps later) |
| Pro = multi-owner overlay (`Client` + `clientId`) on existing Property schema | Smallest change that makes every rollup real; aligns with Convex `owner`+`property_owner_membership` |
| Position Pro as asset-manager cockpit (ops surfaced for triage) | Matches Valgate DNA; avoids building a tenant-ops CRM we have no data for |
| Drop Asset = vehicle/equipment | No schema/seed support; out of scope for the shared foundation |
| Use planning-with-files (.planning/ slug dir, git-trackable) | Working memory survives context resets; user relies on git as backup; `.context` is gitignored so unsuitable for backup |

## Issues / Open Questions (to resolve before locking the plan)

| Question | Recommendation |
|----------|----------------|
| Positioning: asset-manager cockpit vs full property-mgmt CRM? | **Asset-manager cockpit** — matches Valgate DNA |
| The 4 main pages (see task_plan) — right set? swap any? | Confirm or adjust the ①–④ set |
| Foundational schema (`Client`/`clientId` + seed partition) as Phase 1? | **Yes** — nothing is real until properties belong to clients |
| `Client` entity scope: reuse Owner/CoOwner vs thin new `Client` engagement entity (fee, mandate, client-since)? | **Thin new `Client`** referencing owners, so ownership schema isn't overloaded |
| Verify live Progress pillar weights (code vs memory note conflict) | Read `lib/data/derivations/progress.ts` before relying on weights |

## Resources

- Pro UI: `app/(pro)/pro/` — `_components/` (shell), `dashboard/`, `clients/[clientId]/`, `_data/mock.ts`
- Shared schema: `lib/data/types/`, `lib/data/db/`, `lib/data/derivations/`, `app/(shell)/queries.ts`
- Audit corpus: `.claude/data-audit/` (WIRING-PLAYBOOK, ref/07–09, pages/)
- Seed data: `public/data/users/demo-user/`
- Convex draft: `convex/schema/property.ts`
- Domain sources: Indeed (asset mgr duties); YU blog (asset vs property mgmt); Gallagher Mohan & 37Parallel (metrics/DSCR); AllBetter & AppFolio (pain points); Iconic PM (owner reporting).

---
*Update after every 2 search/explore operations. External/web content lives here, never in task_plan.md.*
