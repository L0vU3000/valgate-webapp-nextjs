# Manager-led onboarding — Phase 6: multi-user portfolios & member roles

- **Plan ID:** `plan-8de51d03a2de40d7`
- **Status:** review (decisions locked, ready for Sonnet handoff)
- **Hosted:** https://plan.agent-native.com/plans/plan-8de51d03a2de40d7
- **Produced with:** `/visual-plan` (UI-first canvas) + Mobbin MCP references + `.impeccable.md` (Valgate Professional), on Opus
- **Depends on:** Phase 5 (`manager-led-client-onboarding-phase5.md`) — the `createClientPortfolio` / `inviteClientToPortfolio` decouple and the `draft` status. Execute the Phase 5 split first if building fresh.

---

## Objective

A client portfolio is a Clerk org, and orgs already hold **many members with roles**
(`organization_memberships`, role enum `owner|admin|member|viewer`, synced by the Clerk
webhook). What blocks multi-user is the single-client invitation model and the missing UI.

Phase 6 lets a manager **add multiple users to one portfolio and control each person's role
(including granting Admin)** via: a members **drawer**, a **multi-invitee** create wizard, and
a **three-tier role model** (Admin / Member / Viewer). The only Clerk call not yet used is
`updateOrganizationMembership` (the role change).

---

## Locked decisions

- **D1 — Members drawer** opened from a portfolio row on `/pro/clients` (Read.cv / Jasper).
- **D2 — Multi-invitee wizard + add-later** — repeatable `{ email, role, name? }` rows
  (monday.com), plus add-more from the drawer afterward.
- **D3 — Three roles: Admin / Member / Viewer** → `org:admin` / `org:member` / `org:viewer`.
- **≥1 invitee at create** — a portfolio always has at least one handoff, so it stays
  discoverable without a separate portfolios table. *(Revises Phase 5's "single clientEmail
  required".)*

---

## Design language (.impeccable.md — Valgate Professional)

Light mode; borders over shadows (the drawer is an overlay, so elevation is allowed for the
drawer surface only); **blue is precious** (primary actions + the **Admin** role accent only);
**badge = metadata** (status/role pills are inline secondary info); no side-stripe accents.
The role selector carries a one-line description per role (Productboard pattern).

### Mobbin references (verified via MCP)
- [Read.cv — Members + inline role dropdown](https://mobbin.com/screens/97afea39-a9d9-4107-8467-51af6feb163c)
- [Jasper — Change member role modal](https://mobbin.com/screens/b6cfc4bf-0426-47c3-986b-65667cf08af4)
- [Cycle — Members overflow (Edit role / Remove)](https://mobbin.com/screens/d5d2c85b-60f4-49b8-b40f-86cd9412ac63)
- [Spline — Pending invites overflow (Change role / Resend / Remove)](https://mobbin.com/screens/1327f4ad-9f97-401a-8f44-a9ab385b223d)
- [monday.com — Multi-row invite with per-email role](https://mobbin.com/screens/634c2846-9ff9-40f5-b6c4-6f6e1f168b96)
- [Productboard — Role selector with descriptions](https://mobbin.com/screens/849d1f53-bd7e-4f3c-900a-dedc890ddacd)
- [Amplitude — Remove member confirm](https://mobbin.com/screens/c86b2e69-f643-45f7-909f-3dd5589b18b9)

---

## Data-model changes (hard-to-reverse — settle first)

1. **New `portfolioRoleEnum`** — `pgEnum("portfolio_role", ["admin","member","viewer"])` in
   `lib/db/schema/access.ts`.
2. **Migrate `clientHandoffs.role`** from `accessLevelEnum` (`view`/`full`) to `portfolioRoleEnum`,
   backfilling `full → admin`, `view → viewer`. `accessLevelEnum` stays — it's still used by the
   separate manager↔owner access-request flow in `managers.ts`.
3. **`clientHandoffs.clientName` → nullable** — extra invitees are email-only until they accept
   (real name arrives from the Clerk user); display falls back to email.
4. **Persist portfolio name to `organizations.name`** — the wizard's "Portfolio name" is the org
   name (already is in `createClientPortfolio`); stop overloading `clientName` as the label.
5. **Phase 5 prereq** — `handoff_status` gains `draft`.
6. **Clerk prereq (verify, not code)** — confirm `org:member` + `org:viewer` exist in the Clerk
   dashboard org settings. `normaliseRole` (`identity-sync.ts:11-21`) expects both.

> Mirror quirk: `normaliseRole` maps `org:admin → "owner"`. So an Admin member is stored as
> `orgRoleEnum "owner"`. The members read must treat `owner|admin → Admin`, `member → Member`,
> `viewer → Viewer`.

```sql
CREATE TYPE "portfolio_role" AS ENUM ('admin','member','viewer');
ALTER TABLE "client_handoffs" ALTER COLUMN "role" TYPE "portfolio_role"
  USING (CASE "role" WHEN 'full' THEN 'admin' ELSE 'viewer' END)::"portfolio_role";
ALTER TABLE "client_handoffs" ALTER COLUMN "client_name" DROP NOT NULL;
```

---

## Backend (extend `lib/services/client-onboarding.ts`)

Reuses Phase 5's `createClientPortfolio` / `inviteClientToPortfolio`, plus `assertOrgAdmin`
(`_crud.ts:20`), `upsertMembership` (`identity-sync.ts:82`), and the Clerk-invite + Resend path.

```ts
export type PortfolioRole = "admin" | "member" | "viewer";

function clerkRoleForPortfolioRole(role: PortfolioRole): string {
  if (role === "admin") return "org:admin";
  if (role === "member") return "org:member";
  return "org:viewer";
}

// Add people to an EXISTING portfolio (no new org).
export async function addPortfolioInvitees(
  ctx: Ctx, orgId: string,
  invitees: Array<{ email: string; role: PortfolioRole; name?: string }>,
  sendNow: boolean,
): Promise<{ added: number }> {
  assertOrgAdmin(ctx, orgId);
  // for each: insert client_handoffs (status "draft"); if sendNow -> inviteClientToPortfolio
}

// "Grant admin" / change role of an ACCEPTED member — the one new Clerk call.
export async function changeMemberRole(
  ctx: Ctx, orgId: string, memberClerkUserId: string, role: PortfolioRole,
): Promise<void> {
  assertOrgAdmin(ctx, orgId);
  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId: clerkOrgId, userId: memberClerkUserId,
    role: clerkRoleForPortfolioRole(role),
  });
  await upsertMembership({ clerkOrgId, clerkUserId: memberClerkUserId, role: clerkRoleForPortfolioRole(role) });
  // webhook organizationMembership.updated re-syncs (route.ts:52-58) — idempotent.
}

// changeInviteeRole(handoffId, role): draft -> update row; pending -> revoke + recreate invite.
// removePortfolioMember(orgId, userId): deleteOrganizationMembership; guard last-admin + not-self.
// listPortfolioMembers(orgId): memberships (active) JOIN users  +  handoffs (draft/pending/bounced).
```

**Actions** (`app/(pro)/pro/actions.ts`): `addPortfolioInviteesAction`, `changeMemberRoleAction`,
`changeInviteeRoleAction`, `removePortfolioMemberAction` — Zod + `requireCtx` + `revalidatePath`.

**Query** (`app/(pro)/pro/queries.ts`): `listClientPortfolios` **grouped by org**
(`memberCount`/`pendingCount`/`propertyCount`, one row per portfolio); add `listPortfolioMembers`;
widen `HandoffRow.role` to `admin|member|viewer`.

**Webhook**: no change — `organizationMembership.updated` already handled (`route.ts:52-58`).

---

## File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | `portfolioRoleEnum`; `clientHandoffs.role → it`; `clientName` nullable. `db:generate` → `db:migrate` (review backfill). |
| `lib/services/client-onboarding.ts` | `clerkRoleForPortfolioRole`; extend `createClientPortfolio(invitees[])`; add `addPortfolioInvitees`, `changeMemberRole`, `changeInviteeRole`, `removePortfolioMember`, `listPortfolioMembers`. |
| `app/(pro)/pro/actions.ts` | four new actions. |
| `app/(pro)/pro/queries.ts` | group `listClientPortfolios` by org; add `listPortfolioMembers`; widen `HandoffRow.role`. |
| `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` | Portfolio name → org.name; new People step (repeatable email+role rows + Add another); keep Phase 5 dual-CTA. |
| `app/(pro)/pro/clients/_components/PendingHandoffsSection.tsx` | Becomes the **Portfolios** list grouped by org; row opens the drawer via "Manage members". |
| `app/(pro)/pro/clients/_components/ManageMembersDrawer.tsx` | **New.** Members + pending invites + add-people; role dropdowns; remove via `ConfirmAction`. |
| `app/(pro)/pro/clients/_components/RoleSelect.tsx` | **New, reusable.** Admin/Member/Viewer with one-line descriptions; Admin uses blue accent. |

Reused unchanged: Clerk org/mirror/membership plumbing, `createPropertyForOrg`,
`AddPropertyFlowPro`, accept/bounce/remove-access lifecycle, `ProModal`/`ProField`, `ConfirmAction`.

---

## Verification (end-to-end)

1. Migration applies; existing handoffs backfill `full→admin` / `view→viewer`; no data loss.
2. Clerk `org:member` + `org:viewer` confirmed present (the grant test proves it).
3. Wizard creates a portfolio with 3 people at distinct roles; "Create & invite now" sends 3
   emails; "Create portfolio" leaves 3 drafts (Resend quiet).
4. Drawer "Add people" adds invitees to an existing portfolio → appear under Pending invites.
5. Changing an accepted Viewer to Admin calls `updateOrganizationMembership`; member gains admin;
   mirror reflects it.
6. Changing a pending invitee's role revokes + recreates the invite; accepting lands the new role.
7. Remove member calls `deleteOrganizationMembership`; last-admin guard blocks removing the only admin.
8. Portfolios list shows correct grouped counts (N members / M pending), one row per org.
9. `tsc --noEmit` + `npm run lint` clean. Never run `seed:reset`.

---

## Sonnet execution handoff (connector form)

> Implement plan `plan-8de51d03a2de40d7` (fetch via `get-visual-plan`). Read the **Decisions
> locked** callout first (D1 drawer / D2 multi-invitee / D3 three roles / ≥1 invitee). Do Phase 5's
> decouple first if not present. Order: data model (portfolio_role enum + `clientHandoffs.role`
> migration + `clientName` nullable) → service fns (`addPortfolioInvitees`, `changeMemberRole`,
> `changeInviteeRole`, `removePortfolioMember`, `listPortfolioMembers`) → actions → grouped
> `listClientPortfolios` + `listPortfolioMembers` → UI (wizard People step, Portfolios list,
> `ManageMembersDrawer`, `RoleSelect`). Verify Clerk `org:member`/`org:viewer` exist before the
> grant test. Verify per checklist. Never `seed:reset`.
