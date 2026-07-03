# Manager-led client onboarding (reverse handoff) — Phase 3

- **Plan ID:** `plan-phase3-handoff-lifecycle`
- **Status:** draft
- **Surface:** backend + UI — 5 independent features layered on the Phase 1 handoff infrastructure.

## Objective

Phase 1 created the `client_handoffs` table + the wizard and Pending-handoffs list.
Phase 2 added rich property population (full wizard, CSV import, bulk assign, draft scoping).
Phase 3 rounds out the handoff lifecycle: post-acceptance manager access, bounce detection,
invitation-link sharing, localized emails, and in-app notifications.

## Scope

| # | Feature | Effort |
|---|---------|--------|
| 1 | Manager-access reconciliation after acceptance | M |
| 2 | `bounced` status via Resend bounce webhook | L |
| 3 | Invitation-link sharing tab | S |
| 4 | Localized invite emails (Khmer + English) | M |
| 5 | Notification parity with client→manager flow | S |

---

## 1 — Manager-access reconciliation after acceptance

### Problem

When a manager invites a client via `createOrganizationInvitation`, the manager is already
`org:admin` of the client's org (Clerk `createOrganization` includes `createdBy` which auto-adds
the creator). After the client accepts, the manager has permanent admin access — no off-ramp.

### Decision: add an opt-in "Remove my access" toggle

After a handoff flips to `accepted`, show a setting in the Pending handoff's row (or on the
client portfolio detail page): **"Remove your access to this portfolio"**.

On activation:
1. `clerkClient().organizations.deleteOrganizationMembership({ organizationId, userId })` — removes the manager from the client's org.
2. Upsert a new `client_handoffs.managerAccess` column: `"granted" | "removed"` (default `"granted"`).
3. The manager can still see the handoff row (read-only) but can no longer act in the org.

### The `organizationInvitation.accepted` checkpoint

The webhook (`organizationInvitation.accepted`) fires when the client accepts. At that point the
manager still has full access. The toggle is purely manager-initiated — the webhook does not
auto-remove anything. The webhook already bears responsibility for flipping `client_handoffs.status`
to `accepted` (still unimplemented in Phase 1), so Phase 3 must **first** implement that webhook
handler, then layer the removal toggle on top.

### Data model

```ts
// Add to clientHandoffs pgTable:
  managerAccess: text("manager_access").notNull().default("granted"),
  // enum: "granted" | "removed"
```

### File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | Add `managerAccess` column + `managerAccessEnum` to `clientHandoffs`. Run `db:generate` + `db:migrate`. |
| `lib/services/client-onboarding.ts` | Add `removeManagerAccess(ctx, handoffId)` — verifies handoff is accepted, belongs to caller, calls Clerk to delete membership, stamps `managerAccess: "removed"`. |
| `app/api/webhooks/clerk/route.ts` | ADD `organizationInvitation.accepted` handler — lookup by `clerk_invitation_id`, flip `client_handoffs` to `accepted`, stamp `acceptedAt`. **This is a Phase 1 gap that Phase 3 must fix first.** |
| `app/(pro)/pro/actions.ts` | Add `removeManagerAccessAction` (Zod + safe-error). |
| `app/(pro)/pro/clients/_components/...` | Add "Remove your access" button to the handoff row, only when `status === "accepted"` and `managerAccess === "granted"`. |

---

## 2 — `bounced` status via Resend bounce webhook

### Problem

`client_handoffs` has a `bounced` enum value but nothing sets it. A bounced email means the
invitation couldn't be delivered — the manager should know so they can try another email address.

### Architecture

Clerk sends invitation emails itself (we use `clerkClient().organizations.createOrganizationInvitation`).
If the email bounces, Clerk does NOT surface it through its API — there is no
`organizationInvitation.bounced` event. The project must route bounce notifications through **Resend**.

Decision: **Use Resend as the email-sending layer for invitation emails, replacing Clerk's built-in
email for invites**. This gives us:
- Bounce webhooks (Resend has them natively)
- Custom templates (enables feature 4 — localized invites)
- Delivery analytics

### Flow

1. Manager sends invitation → `onboardClientPortfolio` creates the Clerk invitation AND sends an
   email via Resend (`POST https://api.resend.com/emails`). The Resend email `to:` is the client's
   email, the content includes the Clerk invitation URL.
2. Resend sends a webhook `POST` to `app/api/webhooks/resend/route.ts` with bounce/delivery events.
3. The webhook handler matches the bounce to a `client_handoffs` row by email address, flips
   status to `bounced`, stamps `bouncedAt`.
4. The Pending-handoffs list shows `bounced` handoffs with a "Resend" action (already implemented
   in Phase 1 action sketch: revokes Clerk invitation, recreates it, resends email).

### Resend integration

- **Package:** `resend` npm package. Add to `package.json`.
- **Env:** `RESEND_API_KEY` in project env.
- **Webhook signing:** Resend sends `svix`-signed webhooks. Use `resend`'s built-in webhook
  verification or a lightweight `crypto.timingSafeEqual` check.

### Data model

Add `bouncedAt` to `client_handoffs`:
```ts
bouncedAt: timestamp("bounced_at", { withTimezone: true }),
```

### File map

| File | Change |
|------|--------|
| `package.json` | Add `resend` dependency. |
| `.env.example` | Add `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`. |
| `lib/services/client-onboarding.ts` | Add `sendInvitationEmail(email, clerkInvitationUrl)` — calls Resend API to send the templated email. Refactor `onboardClientPortfolio` to call it. Add `handleBounce(email, bounceType)` — matches to `client_handoffs`, flips `bounced`. |
| `app/api/webhooks/resend/route.ts` | **New** — `POST` handler that verifies Resend signature, dispatches bounce events to `handleBounce`. |
| `lib/db/schema/access.ts` | Add `bouncedAt` column to `clientHandoffs`. |
| `app/(pro)/pro/actions.ts` | Update `resendClientInvitation` to also resend the Resend email. |

---

## 3 — Invitation-link sharing tab

### Problem

Managers want to share invitations outside of email (WhatsApp, Telegram, Slack). Clerk generates
an invitation URL but doesn't expose it through the management API — the invitation is sent
entirely over email.

### Architecture

When creating a Clerk invitation via `createOrganizationInvitation`, Clerk returns the invitation
object including a `url` field. This URL is the one included in the email. **Capture it at creation
time and store it in `client_handoffs`.**

### Data model

```ts
invitationUrl: text("invitation_url"),  // stored from Clerk's createOrganizationInvitation response
```

### UI

- In the Pending handoffs row, add a "Copy link" button that copies `handoff.invitationUrl` to clipboard.
- Show a small link-history indicator (copied count or last-copied timestamp — stored in a new `invitationLastCopiedAt` column).
- The "Copy link" button is available even for `bounced` handoffs (the invitation still works).

### File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | Add `invitationUrl` + `invitationLastCopiedAt` columns. |
| `lib/services/client-onboarding.ts` | Update `onboardClientPortfolio` to store `invitationUrl` from Clerk response. Add `recordInvitationLinkCopy(ctx, handoffId)` to stamp `invitationLastCopiedAt`. |
| `app/(pro)/pro/actions.ts` | Add `copyInvitationLinkAction` (returns the URL, server-side so Clerk key stays server-only). Uses Clerk client to regenerate the URL if it's missing (backfill for existing handoffs). |
| `app/(pro)/pro/clients/_components/PendingHandoffsSection.tsx` | Add "Copy link" button per row, plus last-copied tooltip. |

---

## 4 — Localized invite emails

### Problem

Clerk's default invitation emails are English-only. Cambodia is the primary market — Khmer-language
invitations are a hard requirement. Clerk does not natively support localized invitation templates
through the API.

### Decision

**Use Resend for custom email templates** (same decision as feature 2). This gives full control
over the email body and subject in any language. The `client_handoffs` table will store a
`locale` column (default `"en"`, options: `"en" | "km"`).

### Flow

1. In the Onboard wizard (Phase 1's Step 3 — email + invite), add a locale selector:
   - English (`"en"`)
   - Khmer (`"km"`)
2. Store `locale` on the handoff row.
3. When sending via Resend, pick the appropriate template/subject based on locale.
4. Templates: simple HTML emails with the Clerk invitation URL, the client's name, a CTA button,
   and a short explanation in the selected language. Store as React email templates or
   plain HTML strings in `lib/email-templates/`.

### Data model

```ts
locale: text("locale").notNull().default("en"),  // "en" | "km"
```

### File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | Add `locale` column. |
| `lib/email-templates/invitation-en.ts` | **New** — English email template (HTML string or React Email component). |
| `lib/email-templates/invitation-km.ts` | **New** — Khmer email template. |
| `lib/services/client-onboarding.ts` | Update `sendInvitationEmail` to accept a `locale` param and select the right template. |
| `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` | Add locale dropdown to the invite step. |

---

## 5 — Notification parity

### Problem

The client→manager flow (`accessRequests`) has in-app notifications: when a manager requests
access, the owner gets a notification; when the owner approves, the manager gets one.
The manager→client handoff has none.

### Events to notify

| Event | Recipient | Notification title | Notification category |
|-------|-----------|-------------------|----------------------|
| Invitation sent | Manager (the sender) | "Invitation sent to {clientName}" | "ACCESS" |
| Client accepted | Manager | "{clientName} accepted their portfolio invitation" | "ACCESS" |
| Invitation bounced | Manager | "Invitation to {clientEmail} bounced" | "ACCESS" |

All use the existing `notifications` table and the same `insertAccessNotification` pattern from
`lib/services/managers.ts:73-91`. No new DB schema needed.

### File map

| File | Change |
|------|--------|
| `lib/services/client-onboarding.ts` | After each step (invite sent, acceptance webhook received, bounce received), call `insertAccessNotification`. |
| `lib/db/schema/notifications.ts` | No change — `"ACCESS"` category already exists. |

---

## Architecture decisions (locked)

1. **Resend for email, not Clerk** — Clerk's built-in invitation email is English-only and has no
   bounce webhook. Replacing it with Resend unlocks feature 2 (bounce detection) and feature 4
   (localized templates) in one shot. Existing Clerk invitations still work as fallback (the
   `clerkInvitationId` is stored and the URL is captured).
2. **No new notification schema** — The `notifications` table already has `"ACCESS"` category and
   the `insertAccessNotification` helper in `managers.ts` is a proven pattern. Reuse it directly.
3. **Manager removal is explicit, not automatic** — The webhook does NOT auto-remove manager access
   on acceptance. The manager decides via a toggle. This preserves the Phase 1 decision (locked #2).
4. **Invitation URL captured at creation** — Clerk returns the URL from `createOrganizationInvitation`.
   Store it immediately rather than trying to reconstruct it later (Clerk doesn't expose a
   "get invitation URL" endpoint for existing invitations).
5. **`organizationInvitation.accepted` webhook must be implemented first** — This is Phase 1's
   unimplemented acceptance logic. Without it, `bounced` and `accepted` handoffs can't be
   distinguished. Feature 1 and 5 depend on it. Implementation order: webhook → feature 1 → 2+3 → 4 → 5.

## Data model changes (cumulative)

All additions to `lib/db/schema/access.ts` `clientHandoffs` table:

```ts
  managerAccess:        text("manager_access").notNull().default("granted"),   // "granted" | "removed"
  invitationUrl:        text("invitation_url"),                                 // from Clerk createOrganizationInvitation
  invitationLastCopiedAt: timestamp("invitation_last_copied_at", { withTimezone: true }),
  locale:               text("locale").notNull().default("en"),                // "en" | "km"
  bouncedAt:            timestamp("bounced_at", { withTimezone: true }),        // set by webhook handler
```

## File map

| File | Change |
|------|--------|
| `lib/db/schema/access.ts` | Add 5 columns + `managerAccessEnum`. Run `db:generate` + `db:migrate`. |
| `lib/services/client-onboarding.ts` | **Major update** — add `sendInvitationEmail`, `handleBounce`, `removeManagerAccess`, `recordInvitationLinkCopy`. Refactor `onboardClientPortfolio` to store `invitationUrl` + call Resend + write notification. Add notification calls in acceptance/bounce paths. |
| `app/api/webhooks/clerk/route.ts` | ADD `organizationInvitation.accepted` — **must be done first**. Match on `clerk_invitation_id`, flip `client_handoffs.status = "accepted"`, stamp `acceptedAt`, write notification. |
| `app/api/webhooks/resend/route.ts` | **New** — Handle bounce/delivery events from Resend. Verify webhook signature, dispatch to `handleBounce`. |
| `lib/email-templates/invitation-en.ts` | **New** — English email template. |
| `lib/email-templates/invitation-km.ts` | **New** — Khmer email template (Khmer Unicode, right-aligned text for Khmer script). |
| `app/(pro)/pro/actions.ts` | Add `removeManagerAccessAction`, `copyInvitationLinkAction`. Update `resendClientInvitation` to resend Resend email. |
| `app/(pro)/pro/clients/_components/PendingHandoffsSection.tsx` | Add "Remove your access" button (for accepted), "Copy link" button (for pending/bounced), locale badge, bounced-status display. |
| `app/(pro)/pro/clients/_components/OnboardClientWizard.tsx` | Add locale dropdown to invite step. |
| `package.json` | Add `resend` dependency. |
| `.env.example` | Add `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`. |

## Implementation order

1. **`organizationInvitation.accepted` webhook handler** (Clerk webhook route) — unlocks accepted-status
   detection for all downstream features. Must go first.
2. **Notification helper in `client-onboarding.ts`** — extract `insertAccessNotification` pattern
   from `managers.ts` into a shared utility, add notification calls for invite sent / accepted / bounced.
3. **Invitation-link capture + sharing** (feature 3) — low-risk, self-contained, adds `invitationUrl`
   column and copy button. Can be done independently once the webhook is in place.
4. **Resend integration** (feature 2 + 4 together) — install Resend, add webhook route, add email
   templates (En + Km), update `onboardClientPortfolio` to send via Resend, add bounce handling. These
   two features share the Resend dependency so they ship together.
5. **Manager-access removal** (feature 1) — add `managerAccess` column, add toggle UI, add Clerk
   `deleteOrganizationMembership` call. Ships last because it's the least critical path.

## Verification

- `db:generate` + `db:migrate` clean; 5 new columns on `client_handoffs`.
- `organizationInvitation.accepted` webhook handler flips handoff status, stamps `acceptedAt`, writes notification.
- Resend `email.bounced` webhook flips handoff to `bounced`, stamps `bouncedAt`.
- Bounced handoffs show in Pending list with "Resend" action working.
- "Copy link" copies invitation URL to clipboard; `invitationLastCopiedAt` stamps correctly.
- Localized email sends in Khmer when `locale === "km"`, English otherwise.
- "Remove your access" removes the manager from Clerk org, stamps `managerAccess: "removed"`.
- All 3 notification events (sent, accepted, bounced) appear in the manager's notification panel.
- `npm run lint` passes; no Clerk secret leaks; no new DB tables (only columns on `clientHandoffs`).
