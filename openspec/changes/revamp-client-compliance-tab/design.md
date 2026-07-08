## Context

`getClientPortfolioData(clientId)` (`app/(pro)/pro/queries.ts`) already builds a `scoped: ProContext` whose `properties`, `leases`, `payments`, `maintenance`, and `certifications` are filtered to a single client's properties — but **not** `safetyRisks` or `inspections`. It returns `compliance: ProComplianceRow[]` (certifications only, via `buildComplianceRows(scoped)`); the Compliance tab (`compliance/page.tsx`) renders only that, as a `ComplianceTable`.

The global `/pro/compliance` page (`getCompliancePageData` → `CompliancePage`) is the reference compliance surface. It derives, from the full `ctx`: the certification timeline (`buildComplianceRows`), the safety-risk register (joined + severity-sorted), the inspection log (joined + newest-first), and a book-level `summary` (`expiredCount`, `expiringCount`, `validCount`, `openRiskCount`, `resolvedRiskCount`, `highRiskCount`, `failedInspections`). It renders them with `KpiMetricStrip` (5 metrics), `CertTimeline`, `SafetyRisksCard`, and `InspectionsCard`, behind a per-client filter-chip row. Crucially every row already carries `clientId`, so these widgets are proven to work on a single-client slice.

This mirrors the just-shipped Financials tab revamp exactly: there, `deriveRentSurfaces(ctx)` was extracted from `getRentPageData` and called over the `scoped` slice; here, `deriveComplianceSurfaces(ctx)` is extracted from `getCompliancePageData` and called over the same `scoped` slice.

## Goals / Non-Goals

**Goals:**
- Make the Compliance tab a complete, client-scoped compliance workspace.
- Reuse the exact derivations and components the global `/pro/compliance` page uses — zero new business logic, zero new schema.
- Keep the global cross-portfolio compliance page and the per-client tab aligned by sharing widgets rather than forking presentation.
- Give each tab one job: Overview = certs snapshot + link; Compliance = the deep certs + risks + inspections view.

**Non-Goals:**
- No new compliance calculations (status partition, daysLeft, severity rank already exist).
- No new mutations/write paths — the only inline action (resolve safety risk) reuses the already-audited `resolveSafetyRisk`.
- No changes to the global `/pro/compliance` page or its components' props (except additive/optional ones).
- No schema migration.
- **Not** unifying the Standard (client-shell) `/compliance` page with the Pro compliance widgets. The Standard page uses a wholly different derivation (`buildComplianceSummary` → progress ring + monitor cards + a combined register) and reconciling the two is a redesign, out of scope here (see Open Questions).

## Decisions

### Decision 1: Extract `deriveComplianceSurfaces(ctx)`, call it from both pages
Move the certification/safety-risk/inspection/summary derivation currently inline in `getCompliancePageData` into a pure `deriveComplianceSurfaces(ctx: ProContext)` returning `{ certifications, safetyRisks, inspections, summary }`. `getCompliancePageData` calls it and adds only the cross-client `clients` filter-chip list (global-page chrome). `getClientPortfolioData` calls it over `scoped`.

**Why:** the derivations are pure functions of a context slice; `scoped` is that slice. **Alternative considered:** call `getCompliancePageData` and filter client-side — rejected because it re-loads and re-derives the entire manager portfolio just to throw most of it away, and duplicates the request-time `now` anchor. **Fallback:** if extraction proves noisy, duplicate the ~40 lines with a comment pointing at the source — but prefer the helper (this is exactly what `deriveRentSurfaces`/`deriveWorkOrderSurfaces` already do).

### Decision 2: Extend the `scoped` slice with safety risks + inspections
`getClientPortfolioData` builds `clientPropertyIds` already. Add two lines to `scoped`:
```ts
safetyRisks: ctx.safetyRisks.filter((r) => clientPropertyIds.has(r.propertyId)),
inspections: ctx.inspections.filter((i) => clientPropertyIds.has(i.propertyId)),
```
The lookup maps (`propertyById`, `clientById`) stay whole on the slice, so name/client resolution inside `deriveComplianceSurfaces` still works.

**Why:** the compliance workspace needs all three entity families, not just certs. Own-portfolio view (`OWN_PORTFOLIO_ID`) gets them for free — its `belongsToView = p => !p.clientId` already drives `clientPropertyIds`.

### Decision 3: Add derived compliance fields to `ClientPortfolioData`
Extend with `complianceSummary: CompliancePageData["summary"]`, `safetyRisks: ProSafetyRiskRow[]`, `inspections: ProInspectionRow[]`. In `getClientPortfolioData`, call `deriveComplianceSurfaces(scoped)` once and map its fields; keep `compliance: surfaces.certifications` (byte-identical to today's `buildComplianceRows(scoped)`), so the existing Overview `ComplianceTable` and the `compliance` scoping test stay green.

### Decision 4: New `ClientCompliancePage` client component composes reused widgets
`compliance/page.tsx` (server) stays thin: `await params`, `getClientPortfolioData`, `notFound()` guard, render `<ClientCompliancePage data={...} />`. The new `_components/ClientCompliancePage.tsx` mirrors the global `CompliancePage`'s layout, minus the client-filter chips and page breadcrumb header (the workspace shell already provides tab chrome — matches `ClientFinancialsPage`, which also has no internal header):
```
KpiMetricStrip (Valid · Expiring · Expired · Open risks · Failed inspections)
┌─────────────────────────────┬───────────────────────────┐
│ CertTimeline (scoped)       │ [Show resolved] toggle    │
│                             │ SafetyRisksCard           │
│                             │ InspectionsCard           │
└─────────────────────────────┴───────────────────────────┘
```
The "Show resolved" toggle + `useState` for it are lifted verbatim from the global page (it filters `safetyRisks` client-side; the summary supplies `resolvedRiskCount` to disable the toggle when there are none).

**Why a client component:** `CertTimeline`/`SafetyRisksCard`/`InspectionsCard` are already `"use client"`, and the resolve action + show-resolved toggle are interactive.

### Decision 5: Overview keeps the certs snapshot + adds a link
In `ClientPortfolioPage.tsx`, keep the existing `<ComplianceTable compliance={data.compliance} />` (the compact certs snapshot) and add a "View full compliance →" link card to the Compliance tab beneath it — mirroring the Financials ("Financials & owner statement →") and Work-Orders ("View all work orders →") link cards already there. The full timeline + risks + inspections live only on the tab; the tab no longer renders `ComplianceTable`, so there is no duplicate widget.

**Why:** consistent with the two prior Overview trims; least disruptive; the certs snapshot is genuinely useful on the Overview and is not the same widget the tab now shows (Overview = `ComplianceTable`, tab = `CertTimeline`).

## Risks / Trade-offs

- **Extracting `deriveComplianceSurfaces` touches the shipped `/pro/compliance` path** → keep it a pure move (same inputs/outputs); confirm the global page's KPI + three sections are unchanged before/after. The `clients` filter-chip list stays in `getCompliancePageData`, not the helper.
- **`scoped` slice change affects `getClientPortfolioData`** → additive (two new filtered arrays); every existing consumer of `scoped` (rent/work-order/activity surfaces) is unaffected because they read the other arrays.
- **Own-portfolio view** (`OWN_PORTFOLIO_ID`) must also get the new fields → the `scoped` slice already covers it, so the same derivation applies with no special-casing.
- **Deliberate cert status-vs-date mismatch** → the summary's status partition (`Valid`/`Expiring`/`Expired`) reconciles to the cert total; `daysLeft` is date-based and intentionally does NOT match the status split. Tests preserve this distinction — they must not "fix" it.
- **Thin demo data** → the seeded test client `CLI-0011` has 3 certs but no safety risks or inspections, so those two cards would render their (inviting) empty states. The additive seed `.context/seed-cli-0011.mjs` is extended with one safety risk + one inspection to exercise the full tab (no `seed:reset`).

## Migration Plan

Pure additive/compose change, no data migration. Rollback = revert the commit; no persisted state changes. Ship behind no flag (read-only UI apart from the pre-existing resolve action). Verify on the seeded `CLI-0011` client (3 certs + the newly seeded risk/inspection) and on an empty client for the empty states.

## Open Questions

- **Keep the `ComplianceTable` certs snapshot on the Overview, or swap it for a count-only summary line?** Lean: keep `ComplianceTable` + add the link (matches the Financials/Work-Orders trims, which kept a real widget + link).
- **Should the client tab keep the "Show resolved" toggle for safety risks?** Lean: yes — it is free (already built into `SafetyRisksCard`/the page pattern) and genuinely useful per client.
- **Unify the Standard `/compliance` page with these Pro widgets?** Lean: no — the Standard page is a different design (progress ring + monitor cards) with a different derivation; aligning them is a separate redesign, not this pass.
