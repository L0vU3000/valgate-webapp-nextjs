# Revamp Client Compliance Tab → Compliance Workspace

- **Plan ID:** `plan-b85fc528225749b7`
- **Hosted:** https://plan.agent-native.com/plans/plan-b85fc528225749b7
- **OpenSpec change:** `openspec/changes/revamp-client-compliance-tab/` (proposal · design · specs/client-compliance-workspace · tasks) — **source of truth for execution**; `openspec validate` ✅
- **Status:** in_progress — defaults locked (kept `ComplianceTable` snapshot + link · kept "Show resolved" toggle · Standard↔Pro unify deferred), implemented; tsc + eslint green; seed extended + run; live QA (CLI-0011 / empty client) pending — author's.

## Objective

Turn `/pro/clients/[clientId]/compliance` from a single certs-only `ComplianceTable` into a **client-scoped compliance workspace** — a 5-metric KPI strip over the cert-expiry timeline, the severity-ranked safety-risk register, and the recent-inspection log. It reads as "thin" today even though the query layer already loads that client's risks and inspections — a wiring problem, not a data problem.

**Done means:** the tab composes the same widgets `/pro/compliance` ships, scoped to one client. No new compliance math, no schema migration, no new write path.

## The core realization

`/pro/compliance` is already client-attributed (every cert/risk/inspection row carries `clientId`). So the client Compliance tab is *"the global compliance page pre-scoped to this client."* This is composition, not new UI — the exact move `deriveRentSurfaces` / `deriveWorkOrderSurfaces` already made for the Financials and Work-Orders tabs.

## Component reuse map (all already `"use client"`)

| Element | Source | Role | Change |
|---|---|---|---|
| `KpiMetricStrip` | `pro/_components` | 5-metric header: Valid · Expiring · Expired · Open risks · Failed inspections | reuse (exact 5) |
| `CertTimeline` | `pro/compliance/_components` | cert expiry timeline: Overdue / 0–30 / 31–90 / Later buckets + `STATUS_PILL` | reuse |
| `SafetyRisksCard` | `pro/compliance/_components` | severity-ranked risks; Resolve + Show-resolved | reuse (props already optional) |
| `InspectionsCard` | `pro/compliance/_components` | inspection log, newest first, outcome pill + relative time | reuse |
| `STATUS_PILL` | `dashboard/ComplianceTable` | Valid/Expiring/Expired pill colors | reuse (shared export) |
| `resolveSafetyRisk` | `pro/compliance.actions` | one-way resolve (already audited) | reuse — no new write path |
| `deriveComplianceSurfaces` | `queries.ts` | certs + risks + inspections + summary from any ctx slice | **NEW** (extracted from `getCompliancePageData`) |

## Layout (after)

```
KpiMetricStrip: Valid · Expiring · Expired · Open risks · Failed inspections
┌─────────────────────────────┬───────────────────────────┐
│ CertTimeline (scoped)       │ [Show resolved] toggle    │
│                             │ SafetyRisksCard           │
│                             │ InspectionsCard           │
└─────────────────────────────┴───────────────────────────┘
```

## Query-layer change — no new logic

Extract the certification/safety-risk/inspection/summary derivation currently inline in `getCompliancePageData` into a shared `deriveComplianceSurfaces(ctx)`; call it from both `getCompliancePageData` (full `ctx`, plus the cross-client `clients` filter-chip list) and `getClientPortfolioData` (the existing `scoped` slice). Extend `scoped` with the only missing arrays.

```ts
// app/(pro)/pro/queries.ts — getClientPortfolioData
const scoped: ProContext = {
  ...ctx,
  /* …existing properties/leases/maintenance/certifications/payments… */
  safetyRisks: ctx.safetyRisks.filter((r) => clientPropertyIds.has(r.propertyId)),
  inspections: ctx.inspections.filter((i) => clientPropertyIds.has(i.propertyId)),
};

const c = deriveComplianceSurfaces(scoped);
return {
  /* …existing… */
  compliance: c.certifications,   // byte-identical to today's buildComplianceRows(scoped)
  complianceSummary: c.summary,   // ← 3 new ClientPortfolioData fields
  safetyRisks: c.safetyRisks,
  inspections: c.inspections,
};
```

Own-portfolio view (`OWN_PORTFOLIO_ID`) gets the fields for free — its scoped slice already filters on `!p.clientId` via `clientPropertyIds`.

## Overview trim

Overview keeps its compact `ComplianceTable` certs snapshot and gains a **"View full compliance →"** link card to the tab — mirroring the Financials/Work-Orders link cards. The tab no longer renders `ComplianceTable` (it uses `CertTimeline`), so there's no duplicate widget.

## Build phases (mirror of tasks.md)

1. **Query layer** — extract `deriveComplianceSurfaces`; extend `scoped`; add the 3 fields to `ClientPortfolioData`; confirm `/pro/compliance` byte-identical.
2. **New `ClientCompliancePage`** — KPI strip + CertTimeline / [Show-resolved + SafetyRisksCard + InspectionsCard]; thin server `page.tsx` (no internal header — matches `ClientFinancialsPage`).
3. **Overview trim** — keep `ComplianceTable` + add the link card.
4. **`queries.test.ts`** — scoping asserts + status-partition reconciliation; **preserve** the deliberate status-vs-date mismatch (tsc-checked, not executed).
5. **`/impeccable`** — KPI count = 5, borders-over-shadows link card, optional `hideClient` on single-client rows, severity/status color consistency.
6. **Verify** — `tsc` 0 errors, `eslint` clean, `/pro/compliance` unchanged; extend `.context/seed-cli-0011.mjs` (+1 risk, +1 inspection); `graphify update .`; live QA PENDING (author's).

## Mobbin references (grammar, not vibes)

- **Register + status pills:** [7shifts Certifications](https://mobbin.com/screens/806539a9-f62a-44fd-aad4-db4283e65b31), [Vanta Policies](https://mobbin.com/screens/0fe2d163-f6d0-4e8c-bfa0-7ac18cebdee3), [Deel Compliance & Documents](https://mobbin.com/screens/0f172a40-ec90-4d5c-b8e7-0a38fb20cfe9)
- **KPI summary tiles:** [Vanta Controls](https://mobbin.com/screens/0e24849e-96f6-4350-8e77-727f29293b4c), [Deel Compliance Documents](https://mobbin.com/screens/9c17783e-46c9-45d2-8bfd-0f3d1cff575b)
- **Horizon buckets:** [Employment Hero](https://mobbin.com/screens/ecc8864e-8e9f-441b-b923-4d5ff3a765f9), [Notion Timeline](https://mobbin.com/screens/19ea2491-2cbf-435d-8ec5-c2305878efa0)
- **Severity-ranked risks:** [Linear grouped-by-priority](https://mobbin.com/screens/9f5a1d65-952b-4dbc-b181-811a89670582), [Miro](https://mobbin.com/screens/44e50cec-19a4-46df-9c7b-5ceabc7ba93e)
- **Inspection / audit log:** [Fibery Audit Log](https://mobbin.com/screens/8ebb779a-53f5-4ba8-b717-ea5b9cda1017), [Front Audit log](https://mobbin.com/screens/0c2efddc-d2d9-4a17-b589-34523d08e1d8)
- **Certificate detail:** [Deel Certificate](https://mobbin.com/screens/a0d68988-e0a5-4b6a-9b9f-2f4c9249347c), [Uxcel](https://mobbin.com/screens/246e28d8-6e0a-4eb6-bf07-a5ebd26df292)

## Open questions (defaults recommended)

1. **Overview snapshot** → default **keep `ComplianceTable` + add the link** (matches the two prior trims).
2. **"Show resolved" toggle on the client tab** → default **keep** (free, already built).
3. **Unify Standard `/compliance` with the Pro widgets now?** → default **no** (different design + derivation; a separate redesign, out of scope here).

## Execution prompt (paste into a Sonnet chat)

> Implement the OpenSpec change `revamp-client-compliance-tab` (see `openspec/changes/revamp-client-compliance-tab/` — read proposal.md, design.md, specs/client-compliance-workspace/spec.md, tasks.md). Visual plan: `plan-b85fc528225749b7`. It's a read/compose change — reuse `CertTimeline`/`SafetyRisksCard`/`InspectionsCard`/`KpiMetricStrip`/`STATUS_PILL`; extract `deriveComplianceSurfaces` from `getCompliancePageData` and call it over the existing `scoped` slice in `getClientPortfolioData` (extend `scoped` with `safetyRisks` + `inspections`). Follow tasks.md phases 1→5. Run `graphify` before reading source. Preserve the deliberate cert status-vs-date mismatch. Verify: `tsc` + `eslint` clean, `/pro/compliance` unchanged, extend `.context/seed-cli-0011.mjs` (+1 risk, +1 inspection), live QA CLI-0011 (populated) + an empty client.
