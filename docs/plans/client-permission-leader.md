# Client as permission leader — master plan (phased)

**Branch:** `L0vU3000/pro-ui-ux` · **Decided:** 2026-06-30 · Decisions D1=A, D2=A, D3=A.

## Context / why
Today, when a manager onboards a client and the client accepts, **both end up co-admins** of the
portfolio org — equal power. We want to flip the default so the **client is the permission leader**:
on accept the client becomes admin and the manager drops to **read-only (viewer)**, able only to
**propose changes** that the client approves — unless the manager was explicitly granted full access.
This is the manager-led onboarding model from the user's whiteboard ("created under the manager,
shared to the client on accept"), with the power balance corrected toward the client.

Key enabler found during exploration: the schema for this already exists but is unwired —
`change_requests` + `access_requests` + `request_status` enum in `lib/db/schema/access.ts`
(comment: *"view → viewer (read-only, may propose change_requests); full → admin"*). We build the
flows on top; we do not invent a second permissions engine — **org membership role is the access
truth** (Clerk role → mirrored in `organization_memberships` → `ctx.orgRole` → `requireMember`/
`requireAdmin` gates in `lib/services/_crud.ts`).

## The three phases (each ships independently; each gets its own /visual-plan)

### Phase 1 — Permission flip on accept + onboarding choice  ← build first
Make the client admin and the manager a viewer (or removed) when the invite is accepted, with the
manager's post-accept access chosen at onboarding.
- **Schema:** add `manager_access_model` enum (`approval` | `full` | `remove`, default `approval`)
  to `client_handoffs` (`lib/db/schema/access.ts`). Retire `manager_access_intent` (keep/leave) —
  `manager_access_model` supersedes it. Migration via `db:generate` → `db:migrate`.
- **Onboarding UI:** in `OnboardClientWizard.tsx` StepFour (Review), add a 3-way picker
  ("Manager access after the client accepts"): Approval (default) / Full access / Remove. Primary
  client is **always invited as admin** (D1). Thread through `createPortfolioAction` + its Zod
  schema (`app/(pro)/pro/actions.ts`) → `createClientPortfolioWithInvitees` → store on the handoff.
- **Accept handler:** in `handleInvitationAccepted` (`client-onboarding.ts:1204`), after status →
  accepted: (1) ensure the accepting client is **admin** (Clerk `updateOrganizationMembership`),
  THEN (2) apply the manager model — `approval` → demote manager to **viewer**; `full` → no-op
  (co-admin); `remove` → drop manager membership (Clerk `deleteOrganizationMembership`, set
  `manager_access = removed`). Order matters: never leave the org admin-less. Reuse the
  `changeMemberRole` pattern (`client-onboarding.ts:541`) but call Clerk + `upsertMembership`
  directly (webhook path has no `ctx`).
- **Notifications:** keep the "client accepted" note; adjust the "leave" nudge to the new model.
- **Result:** client leads; manager is read-only (`approval`) and our existing `requireMember`
  gates already block the manager's direct writes. View-as-client preview still works (scopes to
  `client.orgId`). Shippable on its own.

### Phase 2 — Change-request loop, proven on Properties
Give the read-only manager a way to **propose** edits the client approves.
- **Service:** `lib/services/change-requests.ts` — `createChangeRequest`, `listPendingForOwner`,
  `listForManager`, `approveChangeRequest` (apply + mark approved), `rejectChangeRequest`. Uses the
  existing `change_requests` table (`{ ownerOrgId, managerUserId, entityType, entityId,
  proposedPatch, status }`). Start **update-only** (the table's `proposedPatch` shape); create/delete
  deferred to Phase 3 (needs an `operation` column).
- **Generic apply:** `lib/services/_change-request-dispatcher.ts` — registry mapping `entityType` →
  the entity's existing `update*(ctx, id, patch)` service fn, so approval replays through the same
  uniform CRUD used everywhere (feasible because all ~28 services share
  `create/update/delete(ctx, …)` signatures).
- **Manager entry point (D2):** make the **View-as-client preview editable for Properties** — the
  manager edits a property in the owner form; save routes to `createChangeRequest` instead of a
  direct write. Reuses the owner's existing edit form.
- **Client approval inbox:** owner-shell page listing pending changes with Approve/Reject; reuse the
  notification system (`insertAccessNotification` + `linkTo` deep link, ACCESS category) for both
  directions ("Manager proposed a change" → client; "Client approved/rejected" → manager).
- **Manager pending list:** on `/pro/clients/[clientId]`, show the manager's proposed changes + status.

### Phase 3 — Expand change-request coverage
- Add `operation` enum (`create` | `update` | `delete`) to `change_requests` + nullable `entity_id`
  for creates; extend the dispatcher registry.
- Wire more editable entities into the preview (leases, tenants, documents, valuations, …) — each is
  the same pattern as Properties from Phase 2.

## Critical files (verified)
- `lib/db/schema/access.ts` — `change_requests`, `access_requests`, `request_status`,
  `client_handoffs`, `portfolio_role`, `manager_access*` enums.
- `lib/services/client-onboarding.ts` — `createClientPortfolioWithInvitees` (~312),
  `changeMemberRole` (541), `removeManagerAccess` (1117), `handleInvitationAccepted` (1204),
  `clerkRoleForPortfolioRole` (184), `insertAccessNotification` (240).
- `lib/services/identity-sync.ts` — `upsertMembership`, `removeMembership`, `normaliseRole`.
- `app/api/webhooks/clerk/route.ts` — `organizationInvitation.accepted`, `organizationMembership.created`.
- `app/(pro)/pro/actions.ts` — `createPortfolioAction` + `createPortfolioSchema`.
- `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` — StepFour review.
- `lib/services/_crud.ts` / `_mapping.ts` — `requireMember`/`requireAdmin`/`scoped*`/`Ctx` (the access truth).
- Change-request loop (Phase 2+): `lib/services/notifications.ts`,
  `components/layout/NotificationsPanel.tsx`, owner shell `app/(shell)/**`.

## Verification per phase
- **P1:** real Clerk accept-as-admin run → confirm client is org:admin, manager is org:viewer (or
  removed) in Clerk + mirrored in `organization_memberships`; manager direct writes 403; View-as-client
  still renders. Plus `tsc`/`eslint`/`db:migrate`.
- **P2:** manager edits a property in the preview → a `change_requests` row appears + client gets a
  notification → client approves → property updates + manager notified; reject path leaves data untouched.
- **P3:** repeat P2 verification per newly-wired entity.
