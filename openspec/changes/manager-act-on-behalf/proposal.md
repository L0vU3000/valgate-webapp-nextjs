## Why

The "View as client" preview (`browsable-client-view-preview`) hardcodes `orgRole: "viewer"` — a manager can only *propose* changes, even when the client has granted them **full** permission. Managers with a full grant should be able to act on the client's portfolio directly. But doing that as plain direct writes (Option A) leaves no record of *who* did *what* on the client's behalf — and for deletes it leaves **nothing at all**, since the row is gone.

This change makes the preview grant-aware and adds a **hybrid write path**: every manager mutation still flows through the existing `change_requests` ledger (so it is always recorded), but a full-grant manager's request is **auto-approved and applied instantly**. Viewer-grant managers keep the classic propose-then-client-approves flow. One path, always audited; the grant decides whether it waits.

## What Changes

- **Role-aware preview ctx.** `requirePreviewContext` reads the manager's actual role from `organization_memberships(clientOrg, managerUserId)` instead of hardcoding `viewer`. New `getMembershipRole(orgId, userId)` service. Absent/`viewer` grant → read-only; `admin`/`owner` grant → write.
- **Hybrid single-path write** — new `recordAndApplyManagerChange(writeCtx, input)` service: inserts a `change_requests` row **already `approved`** (`decidedByUserId = managerUserId`) and applies it via the existing `applyChangeRequest` dispatcher, **in one transaction**. Reuses all existing re-validation.
- **UI follows the grant.** The `readOnly` prop added in `browsable-client-view-preview` becomes `readOnly = !canWrite` (derived from the grant), so real Add/Edit/Delete controls render only for full-grant managers. Read-only managers keep the Propose-changes panel. **This modifies the "preview remains read-only" behavior established in `browsable-client-view-preview`.**
- **Notifications flip direction.** For an auto-applied manager change, notify the **client** ("Your manager updated Lease 3A"), not the manager — the transparency that makes pre-granting full permission trustworthy.
- **Failure integrity.** If the apply fails validation, the transaction rolls back — no `approved`-but-not-applied ghost rows.

## Capabilities

### New Capabilities
- `manager-act-on-behalf`: A full-grant manager may mutate a client's portfolio directly through the preview; every mutation (of any grant level) is recorded in `change_requests` with the acting manager, the patch, the outcome, and who decided it.

### Modified Capabilities
- `client-view-preview`: the "Preview remains read-only" requirement is rewritten to be grant-aware — read-only only for `viewer`/absent grants; full grants apply directly, still recorded in `change_requests`. Delta at `specs/client-view-preview/spec.md`. **Archive order:** archive `browsable-client-view-preview` first (so the base spec lands in `openspec/specs/`), then this change so the MODIFIED delta resolves.

## Impact

- **Auth/ctx:** `app/(pro)/pro/clients/[clientId]/as-client/_ctx.ts` (role-aware); new `getMembershipRole` in a service (e.g. `lib/services/portfolio-members.ts` or `managers.ts`).
- **Services:** new `recordAndApplyManagerChange` in `lib/services/change-requests.ts`, reusing `applyChangeRequest` (`_change-request-dispatcher.ts`) — unchanged. New client-facing notification via existing `insertAccessNotification`.
- **Actions:** `app/(pro)/pro/change-requests.actions.ts` routes to propose (viewer) vs record-and-apply (full) based on the server-derived grant.
- **UI:** `RentalDashboardPage` / `PortfolioPage` `readOnly` prop now driven by `canWrite`; section pages pass it; the preview's write controls become live.
- **Security boundary:** the membership-role lookup becomes the authorization gate — role is **derived server-side every request, never client-supplied**.
- **No schema migration required** (status vocab `pending|approved|denied` already suffices; optional `auto_applied` flag deferred).
