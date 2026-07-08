## Why

Today the client (Standard/shell) and the manager (Pro) are badly out of parity, in both directions. A codebase audit found: the manager's only **audited** on-behalf write path (`proposeChangeAction` → the change-request dispatcher) knows just **4 of ~24** mutable entities, while the Pro book pages that *look* like acting for a client (`work-orders`/`compliance`/`rent` actions) actually run against the **manager's own org** via `requireCtx()` and leave **no ledger entry**. Meanwhile the client has no Work Orders page at all (the service + actions exist, but no UI) and no portfolio-level Compliance rollup (only a per-property Safety tab) — so the "view as client" preview can't mirror them and the manager can't reach them there either.

The goal the user set: the manager can **see and do everything** on the client's behalf (through one trustworthy, audited path), and the client can **do everything for themselves**. This change closes both gaps at once, and because the preview reuses shell pages, building the client's pages automatically restores view-parity for the manager.

## What Changes

- **Client Work Orders page** (`/work-orders`, shell) — a self-service maintenance view over the existing `maintenance-items` service/actions. New sidebar nav entry. First client UI for an entity that already had full CRUD actions but nowhere to use them.
- **Client Compliance page** (`/compliance`, shell) — a portfolio-level rollup of `certifications` + `inspections` + `safety-risks` with expiry/overdue tracking. New sidebar nav entry. Complements the existing per-property Safety tab.
- **Fill client action gaps** — add `safety-risk` create/delete (none exist today) and `payment` update/delete (only `create` exists), so no page has a dead-end.
- **One audited write path (BREAKING for the Pro book-page write flow).** Extend the change-request dispatcher `REGISTRY` from `{property, lease, tenant, payment}` to **all** mutable entities, and **re-home** the Pro `work-orders`/`compliance`/`rent` write actions off `requireCtx()` (manager's own org, unaudited) onto the client-org + `change_requests` path. Every on-behalf mutation is then recorded; full-grant managers auto-apply, viewer-grant managers propose (reusing `manager-act-on-behalf`).
- **Preview view-parity** — the as-client preview gains `as-client/compliance` and `as-client/work-orders` mirror sections once the client pages exist, so a full-grant manager can act on them through the audited path.
- **Phased delivery** — Compliance + Work Orders (the entities the manager has but the client + ledger lack) land first; the remaining entities follow.

## Capabilities

### New Capabilities
- `client-operations-parity`: The client (Standard/shell) can view and manage every entity family they own directly — including net-new Work Orders and portfolio-level Compliance surfaces — with no gaps in the underlying self-service actions.
- `unified-audited-write-path`: Every manager mutation of a client's portfolio, for any entity type, flows through the single audited `change_requests` ledger (auto-applied for full grants, proposed for viewer grants); the dispatcher registry covers all mutable entities and the Pro book-page writes no longer bypass it.

### Modified Capabilities
<!-- No archived specs to modify — `browsable-client-view-preview` and `manager-act-on-behalf` are still active changes, not yet in openspec/specs/. Their behavior is EXTENDED here (more mirror sections; registry beyond 4 entities); captured as deltas once those changes are archived. Noted in prose above. -->

## Impact

- **New client routes/UI:** `app/(shell)/work-orders/*`, `app/(shell)/compliance/*` (+ `_components`, `queries.ts`, `loading.tsx`); sidebar entries in `components/layout/Sidebar.tsx`.
- **New/extended client actions:** `app/actions/safety-risks.ts` (new), `app/actions/payments.ts` (add update/delete); wraps existing `lib/services/safety-risks.ts`, `payments.ts`.
- **Dispatcher:** `lib/services/_change-request-dispatcher.ts` `REGISTRY` gains ~14 entries (certification, inspection, safety-risk, maintenance-item, co-owner, ownership-record, ownership-document, property-valuation, estate-assignment, successor, emergency-contact, document, folder, professional) — reusing existing `New*`/`Patch*` Zod schemas and service `create`/`update`/`delete` fns.
- **Re-homed Pro actions:** `app/(pro)/pro/work-orders.actions.ts`, `compliance.actions.ts`, `rent.actions.ts` route through `proposeChangeAction`/`recordAndApplyManagerChange` (client-org ctx + ledger) instead of `requireCtx()`.
- **Preview:** new `app/(pro)/pro/clients/[clientId]/as-client/{compliance,work-orders}/page.tsx` mirror sections + panel entity coverage (`ProposeChangePanel`).
- **Reuse:** `manager-act-on-behalf` (`recordAndApplyManagerChange`, grant-aware routing), all `lib/services/*` write fns, the `readOnly`/`canWrite` preview plumbing.
- **No schema migration expected** — every entity already has a table; `change_requests` status vocab already suffices.
