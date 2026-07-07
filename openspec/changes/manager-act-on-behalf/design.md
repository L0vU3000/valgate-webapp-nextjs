## Context

Two facts from the codebase make this small:

1. **The write pipeline already exists.** `change_requests` records every proposal `(managerUserId, entityType, entityId, operation, proposedPatch, status, decidedByUserId, decidedAt)`. `applyChangeRequest(ctx, cr)` (`_change-request-dispatcher.ts`) re-validates the patch and applies it through the real service fns (`createProperty`, `updateLease`, …) under a write-capable ctx. `approveChangeRequest` already does *load → apply → stamp approved → notify*.
2. **Enforcement is centralized.** Every write goes through `_crud` (`requireMember`/`requireAdmin`, `roleAtLeast`). RANK = `viewer 0 < member 1 < admin 2 < owner 3`. Grants (from `managers.ts`) expose two levels: `view → viewer` (read), `full → admin`/mirror `owner` (write). So the grant is effectively **binary**: viewer = propose-only, full = act directly.

The only thing the preview does wrong today is discard the real grant: `_ctx.ts` hardcodes `orgRole: "viewer"`.

## Goals / Non-Goals

**Goals:**
- Full-grant managers mutate the client's portfolio directly from the preview.
- Every manager mutation is recorded in `change_requests`, regardless of grant — one audited write path.
- Deletes leave a durable tombstone (the row survives the entity).
- The read/write split is derived server-side from the grant; never client-supplied.
- Reuse the existing dispatcher + re-validation + notification plumbing.

**Non-Goals:**
- A parallel audit-log table (the `change_requests` ledger *is* the audit log).
- Client-facing "review / revert manager activity" UI (future; this change makes the data exist for it).
- Per-action client approval for full-grant managers (the grant is the pre-approval).
- New grant tiers / a `member`-level grant (UI still exposes only view/full).
- Changing deep-link escape behavior from `browsable-client-view-preview` (still a separate concern).

## Decisions

### D1: Role-aware `requirePreviewContext`
Replace the hardcoded `viewer` with a server-side lookup:
```ts
const role = await getMembershipRole(resolved.orgId, authCtx.userId); // organization_memberships
const orgRole = role ?? "viewer";              // safe floor when no active grant row
return { viewerCtx: { userId: authCtx.userId, orgId: resolved.orgId, orgRole },
         canWrite: roleAtLeast(orgRole, "admin"), ... };
```
`getMembershipRole(orgId, userId)` selects `role` from `organization_memberships` where `status = 'active'`. Two authz checks must BOTH hold (defense in depth): **(a)** `clients.managerUserId === authCtx.userId` (ownership — already in `resolveClientOrgForManager`), **(b)** an active membership row granting the role.

- **Why:** the grant already lives as data; this just stops throwing it away. The lookup *becomes* the authorization boundary, so it is server-only and re-derived every request.
- **Alternative — keep hardcoded viewer, add a separate "manage" route that does a real Clerk org-switch:** that path exists (`ManagerContextBanner`) and already grants write, but it leaves the preview and doesn't produce the audit ledger. Rejected as the primary path; it stays available.

### D2: Hybrid write via a dedicated `recordAndApplyManagerChange` (not two reused calls)
```ts
// full-grant manager acting directly — insert-approved + apply, atomically
export async function recordAndApplyManagerChange(writeCtx: Ctx, input): Promise<ChangeRequest> {
  assertCanMutate();
  requireAdmin(writeCtx);                 // full grant == admin/owner
  return db.transaction(async (tx) => {
    const cr = insert change_requests { ...input, managerUserId: writeCtx.userId,
                                        status: "approved", decidedByUserId: writeCtx.userId,
                                        decidedAt: now };
    await applyChangeRequest(writeCtx, cr);   // re-validates + writes; throws → tx rolls back
    return cr;
  });
}
```
- **Why:** inserting **directly as `approved`** avoids a momentary `pending` row flashing in the client's approval inbox, avoids the silly self-notification of `approveChangeRequest`, and the **transaction** guarantees no `approved`-but-unapplied ghost. Reuses `applyChangeRequest` (the valuable shared piece).
- **Alternative — call `createChangeRequest()` (pending) then `approveChangeRequest(writeCtx)`:** works (a full-grant ctx passes `requireAdmin`), fewest new lines, but has the pending-window race + self-notify quirk + non-atomic apply. Rejected for a money/audit path.

### D3: `decidedByUserId` is the discriminator — no schema change
```
decidedByUserId === clientUserId  → client approved a proposal   (classic B)
decidedByUserId === managerUserId → manager acted under full grant (hybrid)
status = pending                   → awaiting client              (viewer grant)
```
- **Why:** the existing columns already distinguish the three cases. An `auto_applied` boolean is inferable, so it's deferred until a client-facing activity view needs a cheap `WHERE`.

### D4: Notifications flip to the client
Auto-applied change → `insertAccessNotification` to the **client** (owner org's non-manager member): "Your manager {op}'d {entity}." Viewer-grant propose → unchanged (client gets the approval request).
- **Why:** pre-granting full permission is only trustworthy if the client sees a running feed of what the manager did (and can revoke the grant). This is the power-of-attorney model: act freely, everything visible.

### D5: UI `readOnly` derived from `canWrite`
Section pages pass `readOnly={!canWrite}`; the Propose-changes panel is shown for read-only, hidden (or repurposed to direct-edit) for write. The action layer routes to `recordAndApplyManagerChange` (full) or `createChangeRequest` (viewer) — decided by the **server-derived** grant, never a prop.

## Risks / Trade-offs

- **The role lookup is the new security boundary** → Mitigation: server-only, `status='active'` filter, both authz checks (ownership + grant), re-derived per request; add an authz test mirroring `tests/authz/` (viewer grant cannot reach `recordAndApplyManagerChange`; non-owner manager 404s).
- **Double write per action** (1 insert + N applies + within a tx) vs A's single write → trivial at manager-action frequency; the audit trail is the point.
- **Apply fails mid-transaction** → tx rollback leaves no row; surface a generic error to the manager. No partial state.
- **Client confusion** — changes appear without their approval → Mitigation: D4 notifications + the grant being an explicit, revocable consent.
- **Stale entity on update/delete** (client edited concurrently) → `applyChangeRequest` already swallows stale deletes; updates apply last-write-wins as today.
- **Demo mode** → `assertCanMutate` still guards; hybrid path inherits it.

## Migration Plan

Additive. No data migration (status vocab suffices). Rollout:
1. `getMembershipRole` + role-aware `_ctx.ts` (still read-only in UI until D5 wires controls) — safe, no behavior change for viewer grants.
2. `recordAndApplyManagerChange` + action routing.
3. UI `readOnly = !canWrite` + client notifications.
Rollback = revert `_ctx.ts` to hardcoded `viewer`; the new service is unused if the action doesn't route to it.

## Open Questions

- **Review/revert:** should the client get a "manager activity" view that can *undo* a manager change? The ledger makes it possible; out of scope here but may argue for the `auto_applied` flag now to avoid a later migration.
- **Direct-edit UX in write mode:** do full-grant managers edit via the real section controls (inline, like an owner) *and/or* keep the Propose panel as a quick-action? Recommend: real controls primary; retire the panel for full-grant.
- **Member-tier grant:** the data model supports `member`, but the grant UI doesn't expose it. Leave binary (viewer/full) unless a middle tier is requested.
