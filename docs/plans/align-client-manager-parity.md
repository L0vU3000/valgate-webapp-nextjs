# Align Client ↔ Manager — one audited write path + full parity

- **Plan ID:** `plan-3deabd47a4584c60` · [open hosted](https://plan.agent-native.com/plans/plan-3deabd47a4584c60)
- **OpenSpec change:** `align-client-manager-parity` (`openspec/changes/align-client-manager-parity/` — proposal, design, 2 specs, phased tasks; validated)
- **Status:** approved — all decisions locked (D1, D2 + the 3 former open questions)
- **Builds on:** `browsable-client-view-preview` + `manager-act-on-behalf` (the audited `recordAndApplyManagerChange` + grant-aware routing already shipped)

## Objective

Make the two sides symmetric: the **client (Standard/shell)** can do everything for themselves, and the **manager (Pro)** can do everything on a client's behalf **through one trustworthy, audited path** (`change_requests`).

Audit findings driving it:
- **Direction B (client gap):** no Work Orders page at all (the `maintenance-items` service + `app/actions/maintenance-items.ts` exist, but no UI), no portfolio-level Compliance rollup (only per-property `/property/[id]/safety`), and two missing self-service actions (`safety-risk` create/delete; `payment` update/delete).
- **Direction A (manager gap):** the only audited on-behalf path (`proposeChangeAction` → dispatcher REGISTRY) covers **4 of ~24** entities; the Pro book pages (`work-orders`/`compliance`/`rent` actions) call `requireCtx()` = the manager's **own** org and leave **no ledger entry**.

Keystone insight: the as-client preview reuses shell pages, so building the client's pages **also** restores the manager's view-parity.

## Locked decisions

- **D1 — one audited path.** Extend the dispatcher `REGISTRY` to every mutable entity **and** re-home the Pro `work-orders`/`compliance`/`rent` writes onto the client-org + `change_requests` path. Every on-behalf write is recorded; full grants auto-apply, viewer grants propose.
- **D2 — universal coverage, phased.** Ship **Compliance + Work Orders first** (entities the manager has but the client + ledger lack), then the rest.
- **Q1 — book-page quick-actions:** inline for single-field actions (resolve risk, mark rent), deep-link into the as-client preview for multi-field create/edit (both via the audited path).
- **Q2 — `professional`:** confirm org-scoping in code before registering (Phase 3); if manager-shared, it stays out of the registry.
- **Q3 — client Compliance edit depth:** inline resolve + status actions; link to the per-property Safety tab for full create/edit (no duplicate forms).

## The parity gap (entity × capability)

"Audited on-behalf" = reachable through `proposeChangeAction` → dispatcher registry today.

| Entity | Client action | Client page | Audited on-behalf | Gap |
|---|---|---|---|---|
| property / lease / tenant | ✓ CRUD | ✓ | ✓ | — |
| payment | ⚠ create only | ✓ rental | ✓ | add update/delete action |
| maintenance-item | ✓ CRUD | ✗ no page | ✗ | client page + registry |
| certification / inspection | ✓ CRUD | ~ per-property | ✗ | compliance page + registry |
| safety-risk | ✗ none | ~ per-property | ✗ (resolve only) | actions + page + registry |
| co-owner / ownership / valuation / estate / docs / professional | ✓ CRUD | ✓ tabs | ✗ | registry (Phase 3) |

## One audited path (after re-homing)

```
Preview action ┐
               ├─→ proposeChangeAction (re-derive grant, server-side) ─→ change_requests ledger ─→ applyChangeRequest → services
Pro book action┘        full grant: approved+apply now / viewer: pending
```
Removed: Pro book writes → manager's own org (`requireCtx`), unrecorded.

## Dependency chain (why both directions ship together)

```
[Phase 1] Client Compliance + Work Orders pages ──reuses shell page──→ as-client preview mirrors them ──→ manager acts on-behalf
     │                    │                                                                                    ▲
     │                    └──same entities──→ extend dispatcher REGISTRY ───────enables writes────────────────┘
     └─ fill action gaps (safety-risk, payment) ──no dead ends──→ (supports Phase 1)
```

## Design language / UI (Mobbin refs → build with /impeccable)

Both pages mount in the existing shell (sidebar: Home · Portfolio · Directory · Rental · Analytics · Estate Planning · **+Work Orders · +Compliance** · Settings). Live derivations only — no mocks (per project UI Design Standard).

- **Work Orders** (`/work-orders`, dynamic): Jobber-style status tiles (Open / In Progress / Overdue / Resolved + counts) over a Linear-style grouped list (property · unit · vendor · priority · status).
  Refs: [Jobber](https://mobbin.com/screens/26563ea4-1b26-4a35-8c59-f9e8aab7de5c) · [Linear](https://mobbin.com/screens/be6c4ee4-aa93-42b4-89b3-dcfc8386f022)
- **Compliance** (`/compliance`): Vanta-style progress card + needs-attention monitoring cards (Certifications / Inspections / Safety Risks) over an Employment-Hero/Vanta-Controls register table (item · property · expiry · "Overdue by Nd" · status · row action).
  Refs: [Vanta home](https://mobbin.com/screens/69019619-0740-4bc7-9d77-20ebd9c321d5) · [Vanta Controls](https://mobbin.com/screens/0e24849e-96f6-4350-8e77-727f29293b4c) · [Employment Hero](https://mobbin.com/screens/8ed3e501-b10d-4d8e-8efd-19796a230e12)

## Phases (see `openspec/changes/align-client-manager-parity/tasks.md` for the tracked checklist)

**Phase 1 — Client self-service parity (shell only; independently shippable).**
`app/actions/safety-risks.ts` (new) · `payments.ts` add update/delete · `/work-orders` page · `/compliance` page · sidebar nav · wire create/edit · tsc+eslint+QA.

**Phase 2 — One audited path for Compliance + Work Orders.**
REGISTRY += certification, inspection, safety-risk, maintenance-item · extend `ENTITY_SCHEMAS` + `ProposeChangePanel` · re-home `work-orders`/`compliance`/`rent` actions · preview mirror sections `as-client/{compliance,work-orders}` · preview sidebar · authz test · QA.

**Phase 3 — Remaining entities.**
Confirm `professional` org-scoping · REGISTRY += co-owner, ownership-record/-document, valuation, estate-assignment, successor, emergency-contact, document, folder · verify S3-side-effect deletes · registry-coverage test · `graphify update .`.

## File & route map

New (+): `app/(shell)/work-orders/`, `app/(shell)/compliance/`, `app/actions/safety-risks.ts`, `as-client/{compliance,work-orders}/`.
Modified (~): `app/actions/payments.ts`, `components/layout/Sidebar.tsx`, `lib/services/_change-request-dispatcher.ts` (REGISTRY 4→~18), `app/(pro)/pro/{work-orders,compliance,rent,change-requests}.actions.ts`, `as-client/_components/ProposeChangePanel.tsx`.

## Open questions — all resolved (locked into the plan)

1. **Book-page quick-actions** → inline for single-field actions, deep-link into preview for multi-field create/edit.
2. **`professional` scoping** → confirm per-client vs manager-shared in code before registering.
3. **Client Compliance edit depth** → inline resolve/status + link to Safety tab for full create/edit.

## Verification bar

`tsc` + `eslint` clean per phase · authz suite green (add coverage for the new registered entities) · live QA both surfaces (full grant → applied + client notified; viewer → pending) · `graphify update .`.

## Execution handoff (Sonnet, new chat)

> Connector form: fetch this plan via the Plan MCP (`get-visual-plan` `plan-3deabd47a4584c60`) and run `/opsx:apply align-client-manager-parity`. Start with Phase 1 (shell-only, independently shippable); pause at the 3 open questions above before Phase 2.
