# Draft Client Portfolios — email/invite optional (Approach A)

> Archived copy of the approved execution plan (source: `~/.claude/plans/`).
> Part of the unified add-client initiative (follows `unified-add-client-phase1.md`).

## Context

A manager could not create a client portfolio without entering at least one invitee
**email**: the "New client" wizard on `/pro/clients` gated step 2 on a valid email,
the server action rejected zero invitees, and a handoff row requires an email. This
blocks the desired workflow:

> Manager creates a portfolio, names it after the client (a draft), fills it with
> properties, and **invites later** (email optional). On client acceptance the
> portfolio becomes their active account.

The Clerk org *can* be created up front (the manager never sees it — it's just the
portfolio's backing store), so we defer only the **invitation**, not the org.
"Approach A" — far smaller and lower-risk than deferring org creation, reusing
machinery that already exists.

Established constraints:
- `properties.org_id` is `NOT NULL` → properties need an org, so the org must exist
  while building the portfolio.
- The invite→accept flow is built on Clerk **organization invitations**
  (`handleInvitationAccepted` resolves `handoff.orgId → clerkOrg`), so it works
  unchanged once the org exists.
- `clients.org_id` is nullable; a client with an org but no handoff already lists —
  it just showed a "—" status.
- The "invite later" surface already exists: the **Manage members** drawer
  ("Add people → Send invitation" via `addPortfolioInviteesAction`) works on an org
  that only has the manager, and its button shows for any client with an `orgId`.

## Locked decisions
- **D1 = A** — draft portfolios count toward the 20-portfolio cap
  (`MAX_UNCONFIRMED_CLIENTS`), to prevent unbounded org creation.
- **D2 = A** — first invite is sent from the existing Manage members drawer only.

## Changes (as implemented)

1. **Allow zero invitees at the server boundary** — `app/(pro)/pro/actions.ts`
   `createPortfolioSchema`: `invitees` `.min(1)` → `.default([])`, plus a `.refine()`
   requiring a non-blank `portfolioName` when there are zero invitees. The action now
   surfaces the first validation message (authored, safe) instead of a generic string.
   `createClientPortfolioWithInvitees` already tolerated zero invitees; only its
   manager notification got a "Draft portfolio created" branch.

2. **Count drafts toward the cap (D1)** — `lib/services/client-onboarding.ts`
   `countUnconfirmedClients`: now counts distinct active `clients` portfolios
   (`org_id` not null) whose org has **no accepted handoff** — subsumes drafts (no
   handoff), pending, and bounced; excludes accepted. Verified via SQL on the dev
   branch (a simulated draft increments the count).

3. **Draft badge** — `app/(pro)/pro/queries.ts` `augmentRollupsWithOrgData`:
   `confirmationStatus = bestStatus(...) || "draft"`, so an org-backed client with no
   handoff shows the existing "Draft" pill (no `ClientsTable` change).

4. **Wizard** — `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx`
   (`OnboardClientFlow`, the draft-capable `/pro/clients` path): step-2 gate allows
   zero invitees (blocks only malformed emails); step 2 copy reframed optional; step 4
   shows a single "Create portfolio" CTA when there are no invitees (both CTAs when
   ≥1); success + summary copy handle the zero-invitee case. The `onComplete`
   add-property path (`OnboardClientWizard`) still requires ≥1 invitee (always sends).

## Deliberately unchanged
- `ManageMembersDrawer.tsx` / `addPortfolioInvitees` (the invite-later surface, D2=A).
- `ClientsTable.tsx` `STATUS_CONFIG` ("Draft" already exists).
- `handleInvitationAccepted`, the Clerk webhook, DB schema/migrations (org exists
  before invite → acceptance works as-is; no migration).

## Verification
- `npx tsc --noEmit` clean (only pre-existing `archive/convex` errors); `eslint` clean
  on the four touched files.
- New count logic validated with SQL on Neon dev branch `br-solitary-lab-aoci2g33`.
- Remaining manual (needs a Clerk session): create a draft via the UI → "Draft" badge,
  no email; confirm quota increments; send first invite via Manage members → status
  flips to Invited → accept → Active.
