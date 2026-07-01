# Phase 2 — Change-request loop, proven on Properties (mirror of plan-5d5ce2f2a25b4fdd)

**Hosted:** https://plan.agent-native.com/plans/plan-5d5ce2f2a25b4fdd
**Branch:** `L0vU3000/pro-ui-ux` · **Status:** ✅ complete (shipped; tsc/eslint clean) · Phase 2 of 3.
**Open Qs resolved to defaults:** inbox = dedicated `/portfolio/pending-changes` route; conflict = last-write-wins.
**Shipped files:** `lib/services/change-requests.ts`, `lib/services/_change-request-dispatcher.ts`, `app/(pro)/pro/change-requests.actions.ts` (`proposePropertyChangeAction`), `app/(shell)/portfolio/change-requests.actions.ts`, `app/(shell)/portfolio/pending-changes/page.tsx` + `_components/PendingChangesClient.tsx`, `ClientViewPreview.tsx` (Propose-changes panel), manager status card on `ClientPortfolioPage.tsx`.
**Umbrella:** [client-permission-leader.md](./client-permission-leader.md) · **Prev:** [phase1-client-permission-leader.md](./phase1-client-permission-leader.md).

## Objective
After Phase 1 the manager is a read-only `org:viewer`. Phase 2 gives that manager a way to **propose** edits the client approves — the change-request loop, **proven end-to-end on Properties (update only)**. Wires the already-existing `change_requests` table; no migration.

**Done:** manager edits a property in the View-as-client preview → a `pending` change_request (no direct write) → client sees it (inbox + notification) → **Approve** applies the patch to the real property + notifies the manager; **Reject** leaves data untouched + notifies the manager.

**Non-goals (Phase 3):** other entities (leases/tenants/documents/…) and create/delete proposals (needs an `operation` column). Design is generic so Phase 3 only grows the dispatcher registry.

## Locked wire format (hard to reverse)
- One generic `change_requests` row carries `{ entityType, entityId, proposedPatch }`. `proposedPatch` = the entity's `*Patch` JSON (e.g. `PropertyPatch`).
- On **approve**, a dispatcher **re-validates** the patch with the entity's Zod schema and replays it through the existing service `update*(ctx, id, patch)`, run with the **owner's (client) admin ctx**.
- The manager **never** writes the client's data directly — the propose action only inserts a `pending` row after `resolveClientOrgForManager` authz.
- `ownerOrgId` = the client's org; reads scope by `ownerOrgId`/`ctx.orgId`.

## The loop
`proposePropertyChangeAction` → `createChangeRequest` (pending) → notify client → client inbox → **Approve** `applyChangeRequest` (owner ctx) → property updated → notify manager · **Reject** → status denied → notify manager.

## Data model — `change_requests` (exists, no migration)
`{ id, owner_org_id→orgs, manager_user_id→users, entity_type ('property'), entity_id (PROP-xxxx), proposed_patch (jsonb = PropertyPatch), status (request_status: pending|approved|denied), decided_by_user_id, decided_at }`. Phase 3 adds an `operation` enum (create/update/delete) + nullable `entity_id`.

## Surfaces
| Surface | Who | Where | Reuses |
|---|---|---|---|
| Propose an edit | Manager (viewer) | View-as-client preview → property → "Propose changes" | `EditPropertyForm` fields + `PropertyPatchSchema`; new `proposePropertyChangeAction` |
| Approval inbox | Client (admin) | New `/portfolio/pending-changes` + notification deep-link | `listNotifications`/`NotificationsPanel`; new list page + approve/reject actions |
| My proposed changes | Manager | `/pro/clients/[clientId]` status list | `listForManager`; existing page layout |

## Files (new)
- `lib/services/change-requests.ts` — `createChangeRequest`, `listPendingForOwner`, `listForManager`, `approveChangeRequest` (requireMember + apply via dispatcher + notify), `rejectChangeRequest`.
- `lib/services/_change-request-dispatcher.ts` — `REGISTRY = { property: { schema: PropertyPatchSchema, apply: updateProperty } }`; `applyChangeRequest(ctx, cr)` re-validates then applies.
- `app/(pro)/pro/change-requests.actions.ts` — `proposePropertyChangeAction({clientId, propertyId, patch})`; authz via `resolveClientOrgForManager` (already exists in `app/(pro)/pro/queries.ts`); notify client via `insertAccessNotification` (`client-onboarding.ts:240`), `linkTo` = inbox.
- `app/(shell)/portfolio/change-requests.actions.ts` — `approveChangeRequestAction` / `rejectChangeRequestAction` (revalidate `properties` + `change-requests`).
- `app/(shell)/portfolio/pending-changes/page.tsx` — Server Component; `listPendingForOwner(ctx)`; renders proposed fields + Approve/Reject.

Reuse: property update path `app/actions/properties.ts updateProperty` → `lib/services/properties.ts updateProperty(ctx,id,patch)`; `PropertyPatchSchema` (`lib/data/types/property.ts`).

## Risks / integrity
1. Re-validate `proposed_patch` with the entity Zod schema **at apply time** — never trust stored JSON.
2. Apply only with the owner-org ctx (tenant `orgId` scoping + `requireMember` hold); manager propose only inserts.
3. Staleness: last-write-wins on the patched fields (Phase 2); baseline-conflict detection is a Phase 3 option.
4. Only `pending` requests scoped to `ctx.orgId` can be approved/rejected (no cross-org).

## Verification
1. `tsc --noEmit` 0 errors + eslint clean; no migration.
2. Manager proposes a property edit in the preview → `pending` row, no direct write.
3. Client gets ACCESS notification; inbox lists the proposal with changed fields.
4. Approve → property reflects patch; status approved; manager notified.
5. Reject → property unchanged; status denied; manager notified.
6. `/pro/clients/[clientId]` shows the request + status.
7. Tamper check: invalid `proposed_patch` field rejected at apply by re-validation.

## Open questions (recommended defaults; lock before executing)
1. **Inbox location** → recommended: dedicated `/portfolio/pending-changes` route (vs section on an existing page, vs notification-only).
2. **Conflict handling** → recommended: re-validate + last-write-wins on patched fields (vs capture-baseline-and-warn, deferred to Phase 3).
