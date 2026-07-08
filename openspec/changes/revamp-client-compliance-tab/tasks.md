## 1. Query layer — shared compliance surfaces + scoped risks/inspections (no new business logic)

- [x] 1.1 Added pure `deriveComplianceSurfaces(ctx: ProContext)` in `app/(pro)/pro/queries.ts` returning `{ certifications, safetyRisks, inspections, summary }` — a verbatim move of the derivation that was inline in `getCompliancePageData` (risk join + severity sort, inspection join + newest-first, status-partition summary). Mirrors `deriveRentSurfaces`/`deriveWorkOrderSurfaces`.
- [x] 1.2 Refactored `getCompliancePageData` to call `deriveComplianceSurfaces(ctx)` + add only the cross-client `clients` filter-chip list; behavior byte-identical.
- [x] 1.3 Extended the `scoped` slice in `getClientPortfolioData` with `safetyRisks` and `inspections` filtered by `clientPropertyIds`.
- [x] 1.4 Extended `ClientPortfolioData` with `complianceSummary: CompliancePageData["summary"]`, `safetyRisks: ProSafetyRiskRow[]`, `inspections: ProInspectionRow[]`.
- [x] 1.5 `getClientPortfolioData` calls `deriveComplianceSurfaces(scoped)` and returns the new fields; `compliance` kept as `surfaces.certifications` (byte-identical to `buildComplianceRows(scoped)`). Own-portfolio view gets the fields for free.
- [x] 1.6 `queries.test.ts`: added scoping asserts (`safetyRisks`/`inspections` every `clientId === clientId`), status-partition reconciliation (`validCount + expiringCount + expiredCount === compliance.length`), open/resolved split, and failed-inspection count. Preserved the deliberate status-vs-date distinction. (tsc-checked, not executed.)

## 2. New Compliance tab composition

- [x] 2.1 Added `_components/ClientCompliancePage.tsx` (`"use client"`): `KpiMetricStrip` (Valid · Expiring · Expired · Open risks · Failed inspections) over `[CertTimeline]` / `[Show-resolved toggle + SafetyRisksCard + InspectionsCard]`, with the show-resolved `useState` lifted from the global page.
- [x] 2.2 `compliance/page.tsx` reduced to the thin server shell (`await params` → `getClientPortfolioData` → `notFound()` → `<ClientCompliancePage>`, `dynamic = "force-dynamic"`), dropping the direct `ComplianceTable` render.
- [x] 2.3 Empty states: reused each widget's existing states — no new component.

## 3. Overview trim — snapshot + link, no duplicate widget

- [x] 3.1 `ClientPortfolioPage.tsx`: kept the `ComplianceTable` certs snapshot; added a "View full compliance →" link card to the Compliance tab beneath it (mirrors the Financials/Work-Orders link cards).

## 4. Polish (/impeccable pass — real micro-issues only)

- [x] 4.1 KPI grid count = exactly 5.
- [x] 4.2 Borders-over-shadows on the new link card (`rounded-lg` border, no shadow).
- [x] 4.3 Added additive optional `hideClient` prop to `CertTimeline`/`SafetyRisksCard`/`InspectionsCard` (default `false` → global page byte-identical); client tab passes `hideClient` to drop the redundant `· clientName` suffix. Mirrors `RentRollTable`'s `hideClient`.
- [x] 4.4 Horizon-bucket + severity color consistency inherited from the shared `STATUS_PILL` / `SEVERITY_BADGE` (reused, not reimplemented).

## 5. Verify

- [x] 5.1 `npx tsc --noEmit` → 0 errors; `eslint` clean on all touched files (queries.ts, ClientCompliancePage, compliance/page, ClientPortfolioPage, CertTimeline, SafetyRisksCard, InspectionsCard, queries.test).
- [x] 5.2 Global `/pro/compliance` unchanged — only additive `deriveComplianceSurfaces` extraction + optional `hideClient` props; typechecks with unchanged call sites.
- [x] 5.3 Extended `.context/seed-cli-0011.mjs` with 3 safety risks (2 open Critical/High + 1 resolved) + 2 inspections (1 Failed, 1 Passed); ran it (idempotent, no `seed:reset`).
- [~] 5.4 Live QA on seeded `CLI-0011` — PENDING (author has the dev server).
- [~] 5.5 Live QA on an empty client (empty states) — PENDING (author's).
- [x] 5.6 `graphify update .` run; docs/plans mirror + these checkboxes updated.
