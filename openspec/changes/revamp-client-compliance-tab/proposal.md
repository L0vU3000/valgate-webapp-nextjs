## Why

The manager's client Compliance tab (`/pro/clients/[clientId]/compliance`) renders a single dashboard widget — the certificate-only `ComplianceTable` — so it reads as "thin" even though the query layer already loads that client's safety risks and inspections. This is not a data problem: `getClientPortfolioData` builds a `scoped` slice and `getCompliancePageData` already derives the full certification-expiry timeline, the severity-ranked safety-risk register, the recent-inspection log, and a book-level summary. The richest compliance pieces already exist and are already client-attributed (`row.clientId`); they are simply not composed onto this tab, and the `scoped` slice does not yet carry safety risks or inspections.

## What Changes

- **Compliance tab becomes a client-scoped compliance workspace.** Replace the single `ComplianceTable` with: a 5-metric KPI strip (Valid · Expiring · Expired/Overdue · Open risks · Failed inspections), the certification-expiry **timeline** (Overdue / Due in 30 days / 31–90 days / Later horizon buckets with status pills), the severity-ranked **safety-risk register** (with the existing "Show resolved" toggle), and the recent-**inspection** log — every surface scoped to this one client.
- **Compose existing, tested components** — `KpiMetricStrip`, `CertTimeline`, `SafetyRisksCard`, `InspectionsCard` (the same ones the global `/pro/compliance` page ships) — rather than build new widgets. Reusing the global compliance widgets is what keeps the cross-portfolio page and the per-client tab aligned by construction.
- **Extend the `scoped` slice to carry safety risks + inspections**, and **extract a shared `deriveComplianceSurfaces(ctx)`** (a verbatim move of the certification/safety-risk/inspection/summary derivation currently inline in `getCompliancePageData`) called by both `getCompliancePageData` (full ctx) and `getClientPortfolioData` (scoped slice), so the two can never drift. No new business logic, no schema change.
- **Add client-scoped compliance fields to `getClientPortfolioData`** — `complianceSummary`, `safetyRisks`, `inspections` — derived over the `scoped` slice. The existing `compliance` (certifications) field is unchanged (it is the same `buildComplianceRows(scoped)` value the new helper returns).
- **Overview tab keeps a compact compliance snapshot** (the `ComplianceTable` certs snapshot) and gains a "View full compliance →" link into the tab — mirroring the Financials and Work-Orders Overview trims, so each surface has one job.

## Capabilities

### New Capabilities
- `client-compliance-workspace`: The manager's per-client Compliance tab presents a complete, client-scoped compliance workspace — a KPI header, the certification-expiry timeline with horizon buckets, the severity-ranked safety-risk register with resolve/show-resolved, and the recent-inspection log — all derived from real records for that one client.

### Modified Capabilities
<!-- No archived specs in openspec/specs/ to modify. This tab composes surfaces defined by the still-active `align-client-manager-parity` change; the alignment principle (shared compliance widgets across the global and per-client Pro surfaces) is captured in prose above and in design.md, to be reconciled as a delta once that change is archived. -->

## Impact

- **Query layer:** `app/(pro)/pro/queries.ts` — extract `deriveComplianceSurfaces(ctx)` from `getCompliancePageData`; extend the `scoped` slice in `getClientPortfolioData` with `safetyRisks` + `inspections`; `ClientPortfolioData` gains `complianceSummary`, `safetyRisks: ProSafetyRiskRow[]`, `inspections: ProInspectionRow[]`. No new derivation logic in `lib/services/pro-derive.ts`.
- **New tab composition:** `app/(pro)/pro/clients/[clientId]/compliance/page.tsx` replaced with a thin server shell rendering a new `_components/ClientCompliancePage.tsx` client component that composes the reused widgets.
- **Reuse (no changes):** `KpiMetricStrip`, `CertTimeline`, `SafetyRisksCard`, `InspectionsCard` (from `app/(pro)/pro/compliance/_components/`), `ComplianceTable`'s exported `STATUS_PILL`, the already-audited `resolveSafetyRisk` action.
- **Overview trim:** `app/(pro)/pro/clients/[clientId]/_components/ClientPortfolioPage.tsx` gains a "View full compliance →" link beside the existing `ComplianceTable` snapshot.
- **No schema migration.** Every field comes from existing tables (certifications, safety_risks, inspections) already loaded by `loadProContext`.
