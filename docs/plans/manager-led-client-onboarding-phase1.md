# Manager-led client onboarding (reverse handoff) — Phase 1

- **Plan ID:** `plan-0ddab424743d45dd`
- **Hosted:** https://plan.agent-native.com/plans/plan-0ddab424743d45dd
- **Status:** approved (decisions locked, ready for Sonnet handoff)
- **Surface:** UI-first — canvas wireframes (6 artboards) + interactive prototype (4 screens) + technical doc.

## Objective

Add the **mirror** of the existing client→manager grant flow. Today a relationship can
only start client-side (owner issues an invite code → manager `requestAccess` → owner
`approveAccessRequest` creates a real Clerk membership, `lib/services/managers.ts`). This
lets a **manager start it**: create a client's portfolio (a real Clerk organization),
populate it with properties, then invite the client by email to verify and take ownership.

The current "Onboard a client" modal (`OnboardClientModal.tsx`) only writes a CRM record to
the FS layer and tags `clientId` on existing properties — it never creates an account the
client can sign into. This replaces it with a 3-step wizard backed by real Clerk + Neon
writes, plus a **Pending handoffs** section on `/pro/clients`.

**Done (Phase 1):** manager completes the wizard → new Clerk org + Neon mirror exist →
chosen properties belong to that org → client receives a Clerk invitation → on acceptance
the client signs in and sees their portfolio → the manager sees the handoff flip
Invited → Accepted and can Resend/Revoke while pending.

## Phasing — this plan is Phase 1

| Phase | Scope |
|---|---|
| **1 (this plan)** | 3-step wizard (client/portfolio → property stubs → email invite), ordered `onboardClientPortfolio` action, `client_handoffs` table, Pending-handoffs list (Resend/Revoke), acceptance via `organizationInvitation.accepted` webhook. |
| **2 — Rich property population** | Launch the full add-property wizard (photos, docs, valuation) against a created portfolio; bulk-assign; CSV import. |
| **3 — Lifecycle & polish** | Manager-access reconciliation after acceptance; `bounced` status via Resend bounce webhook; invitation-link sharing tab; localized invite emails; notification parity with the client→manager flow. |

The risky, hard-to-reverse bets (Clerk org-creation write surface, invitation-acceptance
matching, the `client_handoffs` shape) all live in Phase 1 by design.

## Core model (locked)

One ordered server action `onboardClientPortfolio()` does all writes at the end, mirroring
`approveAccessRequest`'s create-Clerk-then-mirror-Neon ordering:

1. `assertCanMutate()` + `requireManager(ctx)`
2. **Clerk** `createOrganization({ name, createdBy: managerClerkUserId })` → manager auto-admin
3. **Neon** `upsertOrg({ id: clerkOrg.id, name })` + `upsertMembership({ clerkOrgId, clerkUserId, role: "org:admin" })`
4. `createPropertyForOrg(newOrgId, stub)` ×N
5. **Clerk** `createOrganizationInvitation({ organizationId, emailAddress, role: "org:admin", inviterUserId })`
6. Insert `client_handoffs` row `{ clerkInvitationId, status: "pending" }`

Nothing is written until the final step (all wizard state is client-side) so an abandoned
wizard never orphans an org.

### Correctness notes caught in review (must honor)

- **`upsertOrg` id semantics:** `upsertOrg({id,name})` treats `id` as the **Clerk** org id and
  self-allocates the Neon `ORG-…` id internally. Pass `clerkOrg.id` — never a pre-allocated
  `nextId("ORG")`. The `clerkOrgId` unique index dedupes against the `organization.created` webhook.
- **No `org:owner` role** — `org:admin` is the Clerk ceiling; "owner" is only the Neon mirror
  label (`normaliseRole` collapses `org:admin → owner`). Invite the client as `org:admin`.
- **Acceptance webhook:** flip the handoff from `organizationInvitation.accepted` matched on
  `clerk_invitation_id` — **NOT** `organizationMembership.created`, which also fires for the
  manager's own membership at org-creation and would falsely mark Accepted immediately.
- **Partial failure:** Clerk writes can't be transactional. On a mid-sequence failure the org +
  earlier writes already exist; return a precise partial-success message and make the org
  resumable from the Pending handoffs list rather than rolling back. Wrap the Neon writes in one
  `db.transaction`.
- **`createPropertyForOrg`:** existing `createProperty` scopes to the **active** org via
  `requireCtx()`. Add an org-targeted variant that builds a `Ctx` for an explicit org after an
  `assertOrgAdmin(ctx, targetOrgId)` IDOR guard — avoids `setActive()` juggling mid-wizard.

## Data model

New `client_handoffs` table (status enum `pending | accepted | revoked | bounced`,
role reuses `accessLevelEnum`); `organizations` + `organizationMemberships` reused unchanged.
`accessRequests` is **not** reused — it is keyed `(owner_org_id, manager_user_id)` and assumes
the target user already exists.

```ts
// lib/db/schema/access.ts
export const handoffStatusEnum = pgEnum("handoff_status", ["pending","accepted","revoked","bounced"]);
export const clientHandoffs = pgTable("client_handoffs", {
  id: text("id").primaryKey(),                                  // CHO-0001
  managerUserId: text("manager_user_id").notNull().references(() => users.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clerkInvitationId: text("clerk_invitation_id"),              // null when "create without inviting"
  status: handoffStatusEnum("status").notNull().default("pending"),
  role: accessLevelEnum("role").notNull().default("full"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
// npm run db:generate && npm run db:migrate
```

## File map

| File | Change |
|---|---|
| `lib/services/client-onboarding.ts` | **new** — `createPortfolioOrg`, `inviteClient`, `onboardClientPortfolio`, `resend/revokeClientInvitation` (mirrors `managers.ts`; reuses `AccessError`, `assertCanMutate`, `upsertOrg`, `upsertMembership`, `nextId`). |
| `app/actions/properties.ts` | **new path** — `createPropertyForOrg(targetOrgId, input)` with `assertOrgAdmin` IDOR guard. |
| `app/(pro)/pro/actions.ts` | **new actions** — `onboardClientPortfolio`, `resendClientInvitation`, `revokeClientInvitation` (Zod + safe-error mapping). |
| `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` | **new** — 3-step wizard, replaces `OnboardClientModal`. |
| `app/(pro)/pro/clients/_components/PendingHandoffsSection.tsx` | **new** — pending table, mirrors `ManagersSection`. |
| `app/(pro)/pro/clients/_components/ClientsIndexPage.tsx` | mount `<PendingHandoffsSection>`. |
| `app/(pro)/pro/queries.ts` + `clients/page.tsx` | `listClientHandoffs(ctx)`. |
| `lib/db/schema/access.ts` | `clientHandoffs` table + `handoffStatusEnum`. |
| Clerk webhook route | handle `organizationInvitation.accepted` → flip handoff to `accepted`. |

## Design language

Valgate Professional brief (`.impeccable.md`): light mode, ClickUp/Linear PM SaaS, blue
precious, **no side-stripe borders**, borders over shadows, hierarchy over decoration.
Wizard pattern informed by Mobbin (Plane/Render/Todoist onboarding — top progress stepper,
one decision per step, skip/"I'll do it later" escapes, success summary) and the
Pending-handoffs list by Slack/Circle invitation managers (status pills, per-row Resend/Revoke).

## Locked decisions (no open questions remain)

1. **Acceptance sync** → flip the handoff from the `organizationInvitation.accepted` webhook, matched on `clerk_invitation_id` (never `membership.created` — it fires for the manager's own membership too).
2. **Manager access after acceptance** → retain full access (`org:admin`) by default, with a Step-3 toggle to opt out (means two admins on the org: manager + client).
3. **Where "manager has access" lives** → `client_handoffs` is the handoff record only; the org membership (via `createOrganization`'s `createdBy`) IS the access truth — do **not** also write an `access_requests` row.
4. **Wizard surface** → large centered wizard panel over the dimmed cockpit (reuses pro-modal primitives; stays in `/pro/clients`).
5. **Property capture** → lightweight stubs (name / type / value) + assign existing unassigned; full add-property wizard deferred to Phase 2.

## Verification

- `db:generate`/`db:migrate` clean; `client_handoffs` exists (`db:ping`).
- Unit: `onboardClientPortfolio` (fake Ctx) creates org + N properties + handoff row; IDOR guard rejects non-manager / non-owned `targetOrgId`.
- E2E (real-Clerk auth project): wizard → Clerk org + invitation created; org in manager's managed accounts.
- E2E: accept invitation as client → client sees portfolio + properties; handoff flips to Accepted.
- Resend revokes+recreates; Revoke cancels + marks row revoked; both visible without refresh.
- Authz suite green; no Clerk secret in the client bundle (service is `server-only`).

## Execution handoff (Opus → Sonnet 4.6)

Connector form (when `claude mcp list` shows `plan … ✓ Connected`):

> Implement **Phase 1** of plan `plan-0ddab424743d45dd` (fetch via `get-visual-plan`). Lock
> the 5 open-question recommendations as defaults. Mirror `lib/services/managers.ts` style;
> honor the "correctness notes caught in review" exactly (especially `upsertOrg` id semantics
> and the `organizationInvitation.accepted` acceptance webhook). Backend first
> (schema → service → actions → webhook), then the wizard + Pending-handoffs UI. Verify per the
> plan's verification checklist.
