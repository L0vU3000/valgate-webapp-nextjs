# Manager-led onboarding — Phase 5: create portfolio before inviting

- **Plan ID:** `plan-facd0e1c8f29410c`
- **Status:** review (decisions locked, ready for Sonnet handoff)
- **Hosted:** https://plan.agent-native.com/plans/plan-facd0e1c8f29410c
- **Produced with:** `/visual-plan` (UI-first canvas) on Opus, per [Opus→Sonnet workflow](./README.md)
- **Predecessors:** Phases 1–3 shipped (manager creates org + seeds + invites + accept lifecycle). Phase 4 (client-side `/portfolio` experience) is a separate, deferred slice.

---

## Objective

Today the onboard wizard creates the Clerk org, seeds properties, **and** fires the
client invitation in one atomic action (`onboardClientPortfolio`). Phase 5 splits that
into two stages so a manager can **build out a portfolio over days before the client is
invited**:

1. **Create portfolio** — Clerk org + Neon mirror + manager-admin membership + seeded
   properties + a handoff in a new `draft` state. **No invitation, no email.**
2. **Invite client** — later, from the Clients page, turn a draft into a live invitation
   (Clerk invite + localized Resend email), moving the handoff `draft → pending`.

Everything from `pending` onward (accept webhook, notifications, bounce handling,
manager opt-out) is **unchanged**. Purely a manager-side restructure.

---

## Locked decisions (A / A / keep-required)

1. **Wizard offers both paths** — Step 3 footer has **"Create portfolio"** (draft) and
   **"Create & invite now"** (today's one-shot, preserved). No regression for managers
   who already know the client.
2. **One lifecycle list** — the existing pending section becomes a single **"Portfolios"**
   list rendering `Draft → Invited → Accepted` rows, not a separate drafts card.
3. **clientEmail stays required at create** — the `client_handoffs.client_email` column is
   already `notNull`; the email is simply unused until Invite. Making it optional would be
   a larger migration for little gain.

---

## The three blockers (and fixes)

| # | Blocker | Fix |
|---|---------|-----|
| 1 | `onboardClientPortfolio()` does create + seed + invite + email atomically — no stop point. | Split into `createClientPortfolio()` + `inviteClientToPortfolio()`; one-shot becomes a thin wrapper. |
| 2 | `listClientPortfolios()` (`queries.ts:1165`) filters `status = "accepted"` — and it feeds the "add property to which portfolio?" picker, so a not-yet-accepted portfolio can't be targeted. | Widen to `inArray(status, ["draft","pending","accepted"])`. **One-line unlock.** |
| 3 | `handoff_status` pgEnum has no "not invited yet" value. | Add `draft` to the enum (small generated migration). |

> Schema note: `client_handoffs.clerk_invitation_id` is already nullable with the comment
> *"null when 'create without inviting'"* — the data model anticipated this exact decouple.

---

## Lifecycle

```
draft ──Invite client──▶ pending(Invited) ──accepts──▶ accepted
                              │
                              ├── revoke ──▶ revoked
                              └── bounces ─▶ bounced ──resend──▶ pending
```

`draft` is the only new state; it sits *before* the existing flow.

---

## Backend changes

The heavy lifting (Clerk org creation, Neon mirror, manager-admin membership,
`createPropertyForOrg`, `bulkAssignProperties`, the Clerk-invite + Resend-email path)
already exists inside `onboardClientPortfolio` / `resendClientInvitation`. Phase 5 mostly
**re-arranges** it into two callable halves.

### `createClientPortfolio` (new)

```ts
// lib/services/client-onboarding.ts
// NEW: build the portfolio, but do NOT invite the client yet.
export async function createClientPortfolio(
  ctx: Ctx,
  input: {
    name: string;
    clientEmail: string;        // still required (schema notNull) — unused until invite
    role: "view" | "full";
    locale?: "en" | "km";
    propertyStubs?: PropertyStub[];
    assignPropertyIds?: string[];
  },
): Promise<{ handoffId: string; orgId: string; propertyCount: number }> {
  assertCanMutate();
  // 1–2b: create Clerk org, upsert Neon mirror, mirror manager as org:admin (verbatim)
  // 5b:   seed properties via createPropertyForOrg / bulkAssignProperties (verbatim)
  // Handoff: NO Clerk invitation → clerkInvitationId/invitationUrl null, status "draft".
  const handoffId = await nextId("CHO");
  await db.insert(clientHandoffs).values({
    id: handoffId,
    managerUserId: ctx.userId,
    orgId: orgRow.id,
    clientName: input.name,
    clientEmail: input.clientEmail,
    clerkInvitationId: null,
    status: "draft",
    role: input.role,
    managerAccess: "granted",
    invitationUrl: null,
    locale: input.locale ?? "en",
  });
  return { handoffId, orgId: orgRow.id, propertyCount };
}
```

### `inviteClientToPortfolio` (new)

```ts
// lib/services/client-onboarding.ts
// NEW: turn a draft into a live invitation. Reuses resendClientInvitation's
// Clerk-invite + sendInvitationEmail logic.
export async function inviteClientToPortfolio(
  ctx: Ctx,
  handoffId: string,
): Promise<{ invitationUrl: string | null }> {
  assertCanMutate();
  const handoff = await getOwnHandoff(ctx, handoffId);
  if (handoff.status !== "draft") {
    throw new AccessError("This portfolio has already been invited.");
  }
  // 1. client.organizations.createOrganizationInvitation({ ...role, redirectUrl })
  // 2. await sendInvitationEmail(handoff.clientEmail, url, handoff.locale, handoff.clientName)
  // 3. update handoff: status "pending", clerkInvitationId, invitationUrl
  // 4. insertAccessNotification("Invitation sent") — best-effort
  return { invitationUrl };
}
```

### `onboardClientPortfolio` (now a wrapper — one-shot preserved)

```ts
export async function onboardClientPortfolio(ctx: Ctx, input: OnboardInput): Promise<OnboardResult> {
  const created = await createClientPortfolio(ctx, input);
  const { invitationUrl } = await inviteClientToPortfolio(ctx, created.handoffId);
  return { handoffId: created.handoffId, orgId: created.orgId, invitationUrl, propertyCount: created.propertyCount };
}
```

### `listClientPortfolios` (widen filter)

```ts
// app/(pro)/pro/queries.ts (~L1165) — the add-property picker source.
import { inArray } from "drizzle-orm";
.where(
  and(
    eq(clientHandoffs.managerUserId, authCtx.userId),
    inArray(clientHandoffs.status, ["draft", "pending", "accepted"]),
  ),
)
```

### Enum migration

```sql
-- lib/db/schema/access.ts:
-- handoffStatusEnum = pgEnum("handoff_status",
--   ["draft", "pending", "accepted", "revoked", "bounced"])

ALTER TYPE "handoff_status" ADD VALUE 'draft' BEFORE 'pending';
-- ADD VALUE can't run inside a transaction; Drizzle emits it standalone.
-- No backfill — existing rows keep their status.
```

---

## File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | Add `"draft"` to `handoffStatusEnum`; then `db:generate` → `db:migrate`. |
| `lib/services/client-onboarding.ts` | Add `createClientPortfolio()` + `inviteClientToPortfolio()`; refactor `onboardClientPortfolio()` into a wrapper. |
| `app/(pro)/pro/actions.ts` | Add `createClientPortfolioAction` + `inviteClientAction` (Zod, `requireCtx`, `revalidatePath`). Keep `onboardClientPortfolioAction`. |
| `app/(pro)/pro/queries.ts` | Widen `listClientPortfolios` status filter; add `"draft"` to `HandoffRow.status` union. |
| `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` | Step 3 footer: two buttons; per-path success copy. |
| `app/(pro)/pro/clients/_components/PendingHandoffsSection.tsx` | Render draft rows (muted + Draft pill) with Add properties + Invite client; rename heading to "Portfolios". |

**Reused unchanged:** Clerk org/mirror/membership, `createPropertyForOrg`,
`bulkAssignProperties`, Clerk-invite + Resend-email path, `AddPropertyFlowPro`,
`PortfolioSelectorModal`, accept/bounce/remove-access lifecycle.
**Deferred:** client-side welcome banner + `/portfolio` page (original Phase 4).

---

## Open questions (recommended defaults in the hosted plan)

1. **"Delete draft" teardown** — *recommend:* delete handoff **+ Clerk org + seeded
   properties** (a draft was never handed to anyone). Alt: handoff-only (leaves orphans).
2. **"Add properties" entry point** — *recommend:* open `AddPropertyFlowPro` with
   `targetOrgId` preset to the draft's org (skips the picker; drafts have no detail page).
   Alt: build a draft detail page first.

---

## Verification

- Migration applies; existing handoffs keep status; new drafts insert as `draft`.
- "Create portfolio" creates org + seeds properties + draft handoff and sends **no** email.
- A draft appears in the add-property `PortfolioSelectorModal`; properties land in its org.
- "Invite client" on a draft creates the Clerk invitation, sends the localized email,
  flips the row to Invited (pending).
- "Create & invite now" still works end-to-end (one-shot regression check).
- Accepting a draft-originated portfolio flips to Accepted; seeded properties visible to
  the client (org-scoped).
- `tsc --noEmit` + `npm run lint` clean.

---

## Sonnet execution handoff (connector form)

> Implement plan `plan-facd0e1c8f29410c` (fetch via `get-visual-plan`). Read the
> **Decisions locked** callout first (A/A/keep-required). Backend first: enum `draft` +
> migration → split `client-onboarding.ts` into `createClientPortfolio` /
> `inviteClientToPortfolio` + wrapper → widen `listClientPortfolios` → new actions. Then
> UI: wizard Step 3 dual-CTA + `PendingHandoffsSection` draft rows ("Portfolios" list).
> Resolve the two open questions with their recommended defaults unless told otherwise.
> Verify per checklist. Never run `seed:reset`.
