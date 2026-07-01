# Phase 1 — Client as permission leader (mirror of plan-2ba8eb361caf494f)

**Hosted:** https://plan.agent-native.com/plans/plan-2ba8eb361caf494f
**Branch:** `L0vU3000/pro-ui-ux` · **Status:** approved (locked, ready) · Phase 1 of 3.
**Umbrella:** [client-permission-leader.md](./client-permission-leader.md) (all three phases).

## Locked decisions (D1/D2/D3 = A/A/A)
- **D1 = A** — phase it: this permission flip + onboarding choice ships first; the change-request workflow is Phase 2/3.
- **D2 = A** — the manager's edit entry point (Phase 2) will be the editable "View as client" preview.
- **D3 = A** — onboarding offers three models: Approval (default) / Full access / Remove. Retires the old keep/leave intent.

## Objective
When a manager-onboarded client accepts their invite, the **client becomes `org:admin`** (the permission leader) and the **manager drops to read-only `org:viewer`** — or stays co-admin, or is removed — per a choice the manager makes at onboarding. Default = `approval` (viewer). Org membership role stays the **single source of access truth** (Clerk role → `organization_memberships` mirror → `ctx.orgRole` → `requireMember`/`requireAdmin` in `lib/services/_crud.ts`). No second permissions engine.

**Done:** accepting an admin invite ⇒ client `org:admin` + manager `org:viewer`/removed/unchanged, in Clerk **and** the mirror, with the manager's direct writes blocked by `requireMember`.

**Out of scope (Phase 2/3):** the change-request *workflow* (manager proposes edits, client approves). The `change_requests` table already exists unwired in `lib/db/schema/access.ts`.

## Manager-access models
| Onboarding choice | `manager_access_model` | Manager role after accept | Manager can… |
|---|---|---|---|
| Approval (default) | `approval` | `org:viewer` (read-only) | View all; propose changes for client approval (Phase 2) |
| Full access | `full` | `org:admin` (unchanged) | Edit directly, manage members |
| Remove on accept | `remove` | removed from org | Nothing; can be re-invited |

## Data-model change
One enum + one column on `client_handoffs` (`lib/db/schema/access.ts`); `manager_access_model` supersedes `manager_access_intent` (removed). Migration: `npm run db:generate` → review (~`0019_*`) → `npm run db:migrate`.

```ts
export const managerAccessModelEnum = pgEnum("manager_access_model", [
  "approval", // manager -> viewer; may propose change_requests (default)
  "full",     // manager stays co-admin
  "remove",   // manager leaves the org on accept
]);
// clientHandoffs: managerAccessModel ... .notNull().default("approval")
// remove managerAccessIntent + its enum (migrate existing rows)
```

## Accept flow — order matters
Clerk `organizationInvitation.accepted` → `handleInvitationAccepted` (`client-onboarding.ts:1204`). **Promote client → admin BEFORE demoting/removing the manager**, or the org is briefly admin-less and Clerk rejects it.

```ts
// after status -> accepted:
const clerk = await clerkClient();
const clerkOrgId = await clerkOrgIdFor(handoff.orgId);
const clientClerkUserId = await resolveAcceptingClientUserId(handoff); // see Open Question

// STEP 1 — client admin first
await clerk.organizations.updateOrganizationMembership({ organizationId: clerkOrgId, userId: clientClerkUserId, role: "org:admin" });
await upsertMembership({ clerkOrgId, clerkUserId: clientClerkUserId, role: "org:admin" });

// STEP 2 — apply manager model
const mgr = await clerkUserIdFor(handoff.managerUserId);
if (handoff.managerAccessModel === "approval") {
  await clerk.organizations.updateOrganizationMembership({ organizationId: clerkOrgId, userId: mgr, role: "org:viewer" });
  await upsertMembership({ clerkOrgId, clerkUserId: mgr, role: "org:viewer" });
} else if (handoff.managerAccessModel === "remove") {
  await clerk.organizations.deleteOrganizationMembership({ organizationId: clerkOrgId, userId: mgr });
  await removeMembership({ clerkOrgId, clerkUserId: mgr }); // + set manager_access = "removed"
}
// "full" -> no-op
```
Reuse the role-change pattern from `changeMemberRole` (`client-onboarding.ts:541`) and the delete pattern from `removeManagerAccess` (`:1117`), but call Clerk + `upsertMembership`/`removeMembership` directly (webhook path has no `ctx`).

## Onboarding wiring
- `app/(pro)/pro/actions.ts` — add `managerAccessModel: z.enum(["approval","full","remove"]).default("approval")` to `createPortfolioSchema`.
- `OnboardClientWizard.tsx` StepFour — 3-way picker bound to `form.managerAccessModel`; primary client invitee role forced to `admin`. Style per `.impeccable.md` (light, blue #2563EB, borders over shadows).
- `client-onboarding.ts` `createClientPortfolioWithInvitees` (~`:399`) — store the model on the `clientHandoffs` insert.

## Risk
Clerk requires ≥1 admin per org (hence client-promotion first). Webhook ordering between `organizationMembership.created` and `organizationInvitation.accepted` is not guaranteed → resolve the client userId + set roles explicitly inside the handler.

## Verification
1. `db:migrate` applies enum+column; `tsc` + `eslint` clean.
2. Onboard with "Approval", send + accept invite via **real Clerk**.
3. Confirm in Clerk + `organization_memberships`: client `org:admin`, manager `org:viewer`.
4. Repeat with "Full access" (manager stays admin) and "Remove" (membership gone, `manager_access = removed`).
5. As demoted manager, direct entity write → forbidden (`requireMember`).
6. "View as client" preview still renders (scopes to `client.orgId`).

## Decided (was the open question)
**Resolve the accepting client's Clerk userId via org-membership lookup** — inside `handleInvitationAccepted`, call `clerkClient().organizations.getOrganizationMembershipList({ organizationId: clerkOrgId, limit: 100 })` and match on `handoff.clientEmail` (`publicUserData.identifier`); take `publicUserData.userId`. Self-contained — no dependency on the `organizationMembership.created` webhook landing first. If the membership isn't synced yet, log and return; Clerk retries the webhook (and the JIT path backfills the mirror).

```ts
const { data: members } = await clerk.organizations.getOrganizationMembershipList({ organizationId: clerkOrgId, limit: 100 });
const clientClerkUserId = members.find(
  (m) => m.publicUserData?.identifier?.toLowerCase() === handoff.clientEmail.toLowerCase(),
)?.publicUserData?.userId;
if (!clientClerkUserId) return; // not synced yet — Clerk retries
```

No remaining open questions; plan is ready to execute.
