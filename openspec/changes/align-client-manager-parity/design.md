## Context

Two facts from the audit shape this design:

1. **The write plumbing already exists — it's just under-connected.** `manager-act-on-behalf` shipped a single audited path: `proposeChangeAction` re-derives the manager's grant server-side and routes to `recordAndApplyManagerChange` (full grant → insert-approved + apply) or `createChangeRequest` (viewer grant → pending). But the dispatcher `REGISTRY` only knows 4 entities, and the Pro book pages (`work-orders`/`compliance`/`rent` actions) never use this path — they call `requireCtx()` and write to the **manager's own org**, unaudited.

2. **The preview mirrors shell pages, not Pro pages.** The as-client preview renders the *client's* shell routes scoped to the client org. It can only mirror what the client has. The client has no Work Orders page (though the `maintenance-items` service + actions exist) and no Compliance rollup (only per-property Safety). So those two surfaces are invisible in the preview and unreachable by an acting manager there.

The dependency chain that makes both directions fall out of one effort:

```
  [B] client Compliance + Work Orders pages  (+ fill action gaps)
       │
       ├──▶ as-client preview mirrors them        ← view-parity, nearly free
       │
  [A] extend dispatcher REGISTRY to those entities ──▶ manager can ACT there
       │
  [A] re-home Pro book-page writes onto the audited path ──▶ one ledger, no bypass
```

## Goals / Non-Goals

**Goals:**
- Client can self-serve every entity family they own, including net-new Work Orders and portfolio Compliance pages, with no missing actions.
- Every manager on-behalf write — from any surface — is recorded in `change_requests`, scoped to the client's org, grant-decided (apply vs propose) server-side.
- The dispatcher registry covers all mutable entities, reusing existing Zod schemas and service fns.
- The preview reaches Compliance and Work Orders like every other section.
- Deliver in phases so the highest-value surfaces (Compliance, Work Orders) land first.

**Non-Goals:**
- New entities or schema migrations — every table already exists; `change_requests` status vocab already suffices.
- A parallel audit-log table — the ledger is the audit log (established in `manager-act-on-behalf`).
- Changing the grant model (still binary viewer/full) or the preview's deep-link escape behavior.
- Redesigning the manager's existing Pro book pages' *layout* — only re-homing their write actions.
- Real-time/websocket sync — request-time reads + `revalidate`/`refresh` as today.

## Decisions

### D1: One audited path — extend the registry AND re-home the Pro writes
Add ~14 entries to `_change-request-dispatcher.ts` `REGISTRY` (certification, inspection, safety-risk, maintenance-item, co-owner, ownership-record, ownership-document, property-valuation, estate-assignment, successor, emergency-contact, document, folder, professional), each a `{createSchema, updateSchema, create, update, delete}` tuple wired to the entity's existing `New*`/`Patch*` schema and service fns. Then rewrite `work-orders.actions.ts`, `compliance.actions.ts`, `rent.actions.ts` to resolve the target client org and route through `proposeChangeAction`/`recordAndApplyManagerChange` instead of `requireCtx()`.
- **Why:** the registry is the choke point every audited apply already flows through; extending it is mostly declarative. Re-homing the book-page writes removes the one surface that silently bypasses the ledger, so "the ledger is the audit log" becomes actually true.
- **Alternative — leave Pro book pages direct, only extend the registry for the preview:** less disruptive, but keeps two inconsistent write surfaces (one audited, one not) and a manager editing a work order from `/pro/work-orders` still leaves no record. Rejected: the user's ask is explicitly "one path, everything audited."

### D2: Universal coverage, phased delivery
Everything is in scope, but sequenced: **Phase 1** builds the two client pages (Compliance, Work Orders) + fills the client action gaps (safety-risk create/delete, payment update/delete) — pure shell work, no manager coupling. **Phase 2** extends the registry to exactly those Phase-1 entities, re-homes the Pro writes, and adds the two preview mirror sections — so the manager reaches parity on the same surfaces the client just got. **Phase 3** extends the registry to the remaining entities (ownership, estate, docs, valuation, professional).
- **Why:** Phase 1 is independently shippable and de-risks the UI (the net-new pages) before touching the shared dispatcher. Phases 2–3 are additive registry entries with near-zero blast radius.
- **Alternative — big-bang all entities + re-home at once:** larger untestable diff, and the UI work (highest risk) would block on the plumbing. Rejected.

### D3: Client pages read via existing services, write via existing actions (no on-behalf coupling)
The client Work Orders and Compliance pages are *ordinary shell pages* — they read through `lib/services/*` under the owner's own ctx and mutate through `app/actions/*`. They know nothing about managers or `change_requests`. The manager coupling happens only when the **preview** mounts the same page components under a client-scoped `viewerCtx` + the audited action routing from `manager-act-on-behalf`.
- **Why:** keeps the client experience simple and the audited path orthogonal — the same component serves both, exactly as `PortfolioPage`/`RentalDashboardPage` already do with the `readOnly`/`canWrite` props.

### D4: UI derived from Mobbin references, built with /impeccable at execution
- **Work Orders:** Jobber-style status tiles (Open / In Progress / Overdue / Resolved with counts) over a Linear-style grouped list (property · unit · vendor · priority · status). Refs: Jobber `26563ea4-1b26-4a35-8c59-f9e8aab7de5c`, Linear `be6c4ee4-aa93-42b4-89b3-dcfc8386f022`.
- **Compliance:** Vanta-style progress card + "needs attention" monitoring cards (Certifications / Inspections / Safety Risks) over an Employment-Hero/Vanta-Controls register table (item · property · expiry · "Overdue by Nd" · status badge · row action). Refs: Vanta `69019619-0740-4bc7-9d77-20ebd9c321d5` and `0e24849e-96f6-4350-8e77-727f29293b4c`, Employment Hero `8ed3e501-b10d-4d8e-8efd-19796a230e12`.
- Both derive all stats from live derivations (per project UI Design Standard — no mocks). `/impeccable` (craft) is the execution-stage tool for these components.

### D5: Fill action gaps as thin action wrappers
`app/actions/safety-risks.ts` (new: create/update/delete wrapping `lib/services/safety-risks.ts`) and two new exports in `app/actions/payments.ts` (update/delete wrapping `lib/services/payments.ts`), each following the existing action shape (`requireCtx` → Zod validate → service → `bustCache`). No service changes expected — the service fns already exist.

## Risks / Trade-offs

- **Re-homing Pro writes changes their behavior for full vs viewer grants** → a viewer-grant manager who could previously (accidentally) write to their own org now correctly gets a *pending proposal* instead. Mitigation: this is the intended correctness fix; call it out in QA and verify each Pro book-page action end-to-end.
- **Registry grows to ~18 entities; a wrong schema/service wiring applies bad data** → Mitigation: `applyChangeRequest` re-validates every patch against the registered schema before writing; add a registry-coverage test asserting each entity's create/update/delete round-trips.
- **Delete-heavy entities (documents, folders) have side effects (S3 objects)** → Mitigation: the dispatcher calls the same service `delete` that the direct path uses, so cleanup semantics are unchanged; verify document/folder deletes in the audited path free their objects.
- **Two new dynamic pages add read load** → trivial; they reuse cached reads (`cached-reads.ts`) already powering portfolio/rental.
- **Scope creep across 3 phases** → Mitigation: Phase 1 is independently shippable; Phases 2–3 are additive and can land incrementally without blocking the client-facing value.

## Migration Plan

Additive; no data migration. Rollout by phase:
1. **Phase 1** — client Compliance + Work Orders pages, sidebar nav, action-gap fills. Ship + QA independently (no manager surfaces touched).
2. **Phase 2** — registry entries for {certification, inspection, safety-risk, maintenance-item}; re-home `work-orders`/`compliance`/`rent` actions; add `as-client/compliance` + `as-client/work-orders` mirror sections; extend `ProposeChangePanel` entity coverage.
3. **Phase 3** — registry entries for the remaining entities (co-owner, ownership-record/-document, property-valuation, estate-assignment, successor, emergency-contact, document, folder, professional).

Rollback: each phase reverts independently. Reverting a registry entry disables on-behalf writes for that entity but leaves the client's own self-service intact. Reverting the re-homing restores the old `requireCtx()` Pro actions.

## Resolved Decisions (were open questions)

- **Book-page vs preview writes for the manager (Q1) — RESOLVED:** the Pro book-page quick-actions act **inline** for single-field actions (resolve risk, mark rent) and **deep-link into the as-client preview** for multi-field create/edit. Both routes go through the audited path; the split is only about where the form lives. Applies in Phase 2.
- **Professional (vendor) ownership (Q2) — RESOLVED:** **confirm the org-scoping in code before registering** `professional` (Phase 3). If it's a manager-level shared directory rather than per-client-org, it is NOT an on-behalf entity and stays out of the registry.
- **Client Compliance write depth (Q3) — RESOLVED:** the client Compliance page gets **inline resolve + status actions** and **links to the per-property Safety tab for full create/edit** — no duplicate Safety forms. It stays a read/act rollup.
