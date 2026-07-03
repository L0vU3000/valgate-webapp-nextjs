# Manager-led onboarding — Push, green tsc, Phase 3 lifecycle

- **Plan ID:** `plan-c9fe358d379f4805`
- **Status:** review (ready for approval)
- **Hosted:** https://plan.agent-native.com/plans/plan-c9fe358d379f4805
- **Produced with:** `/visual-plan` + `.impeccable.md` (Valgate Professional) + Mobbin references
- **Predecessors:** [Phase 1](./manager-led-client-onboarding-phase1.md) (shipped), [Phase 2](./manager-led-client-onboarding-phase2.md) (P0–P2 shipped, commit `ebcda21`), [Phase 3 mirror](./manager-led-client-onboarding-phase3.md) (partial)

---

## Objective

Phase 2 (P0–P2) is committed locally as `ebcda21` but **not pushed**. Three pre-existing `tsc` errors block a fully-green build. Phase 3 is **~60% done** in code (acceptance webhook, bounce handler service, copy-link/remove-access actions, locale in wizard) but still missing **Resend send path**, **bounce webhook route**, **localized email templates**, and **row UI polish** (locale badge, bounced helper copy, copy feedback).

This plan sequences three tracks in order: **push → green tsc → Phase 3 finish**.

---

## Locked decisions

1. **Resend for invitation email** — Clerk creates the invitation (URL + ID); Resend sends the localized email and receives bounce webhooks.
2. **Manager removal is explicit** — `organizationInvitation.accepted` webhook flips status only; manager opts out via "Remove your access".
3. **ConfirmAction tiers** — use `tier="confirm"` for Revoke/Remove access (not `"destructive"` — that value does not exist on `ConfirmTier`). Style destructive buttons via className.
4. **Mobbin references (verified via MCP):**
   - [Linear — Inviting a guest flow](https://mobbin.com/flows/33b82696-2a33-44e4-9059-4e8d5c5170bb) — pending row badge, dimmed invitee, "1 invite sent" toast, invite-link Copy button
   - [Upwork — Team](https://mobbin.com/screens/25a18f7c-828b-4770-b348-bd545f693458) — Pending/Active status pills in table
   - [Notion — People settings](https://mobbin.com/screens/c77d2a3a-7556-4f27-857a-3e7960411086) — Copy link + "Remove from workspace" destructive pattern
   - [Notion — Invite modal](https://mobbin.com/screens/c6ab4021-2048-4117-b27b-563533556144) — "INVITED" badge on pending rows
5. **Design language** — `.impeccable.md` Valgate Professional: light mode, borders over shadows, blue precious, badge-as-metadata, no side-stripe accents.

---

## Mobbin → Impeccable translation

**Pending handoffs table** — keep the existing bordered card on `/pro/clients`; lift row density from [Linear Members](https://mobbin.com/flows/33b82696-2a33-44e4-9059-4e8d5c5170bb):
- Status pill + locale badge inline (metadata, not hierarchy)
- Pending rows slightly muted (Linear dims pending invitees)
- Row actions as compact text buttons (Copy link · Resend · Revoke) — one-click recovery for bounced invites

**Copy link** — Linear pattern: "Copy link" button label; toast on success ("Link copied to clipboard"); optional "Last copied {date}" tooltip.

**Bounced state** — [Upwork Team](https://mobbin.com/screens/25a18f7c-828b-4770-b348-bd545f693458) red **Bounced** pill + one-line helper. Resend = primary blue.

**Remove access** — [Notion People](https://mobbin.com/screens/c77d2a3a-7556-4f27-857a-3e7960411086) destructive separation via ConfirmAction; after removal show muted "Access removed" read-only row.

**Wizard locale step** — keep dropdown; add helper: "Invitation email will be sent in the selected language."

---

## Track A — Push Phase 2 commit (~2 min)

| Step | Action |
|------|--------|
| A1 | `git push -u origin HEAD` on branch `L0vU3000/pro-ui-ux` |
| A2 | Confirm CI / preview deploy if applicable |

**Commit:** `ebcda21` — 9 files (Phase 2 P1+P2 code + docs mirror). No code changes in this track.

- [ ] Push `ebcda21` to origin
- [ ] Confirm remote branch shows Phase 2 commit

---

## Track B — Fix Phase 1 type errors (~10 min)

Three errors in `PendingHandoffsSection.tsx` — the only blockers to green `tsc`:

1. **L69** — `<Th className="w-[1%]" />` missing required `children`. Fix: pass `\u00a0` or make `children` optional in `Th`.
2. **L159, L184** — `tier="destructive"` invalid for `ConfirmTier` (`"undo" | "confirm" | "typed"`). Fix: `tier="confirm"` + keep existing red button className for Revoke.

**Do-not-edit lifted** for this file only. No behavior change — types only.

```tsx
// Preferred: make children optional on Th
function Th({ children, className }: { children?: React.ReactNode; className?: string }) { ... }

// Actions column header:
<Th className="w-[1%]">{"\u00a0"}</Th>

// Revoke / Remove access:
<ConfirmAction tier="confirm" title="Revoke invitation?" ...>
```

- [ ] Fix Th children / empty actions header (L69)
- [ ] Replace `tier="destructive"` with `tier="confirm"` (L159, L184)
- [ ] Run `tsc --noEmit` — expect fully green

---

## Track C — Phase 3 lifecycle finish

### Already shipped in code (verify, don't rebuild)

- `organizationInvitation.accepted` → `handleInvitationAccepted` in Clerk webhook
- `handleBounce`, `removeManagerAccess`, `recordInvitationLinkCopy` in `lib/services/client-onboarding.ts`
- Copy link / Resend / Revoke / Remove access buttons in `PendingHandoffsSection.tsx`
- Locale selector in `OnboardClientWizard.tsx` Step 3
- `insertAccessNotification` calls for sent / accepted / bounced

### Still missing

**Flow:** Onboard → Clerk invitation + store URL/locale → **sendInvitationEmail (Resend)** → bounce webhook → accepted webhook → manager opt-out.

#### C1 — Resend integration (features 2 + 4 together)

| File | Change |
|------|--------|
| `package.json` | Add `resend` dependency |
| `.env.example` | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` |
| `lib/email-templates/invitation-en.ts` | **New** — English HTML template with CTA button |
| `lib/email-templates/invitation-km.ts` | **New** — Khmer Unicode template, right-aligned body text |
| `lib/services/client-onboarding.ts` | **New** `sendInvitationEmail(email, url, locale, clientName)` — call from `onboardClientPortfolio` + `resendClientInvitation` |
| `app/api/webhooks/resend/route.ts` | **New** — verify Svix signature, dispatch `email.bounced` → `handleBounce` |

#### C2 — Pending row UI polish (see hosted canvas artboards)

| Change | Detail |
|--------|--------|
| **Locale badge** | Add `locale` to `HandoffRow` + `listClientHandoffs` query; render `EN` / `KM` pill beside status |
| **Bounced helper** | One line under status: "Email could not be delivered — try another address or share the link" |
| **Copy feedback** | After clipboard write: brief toast "Link copied"; tooltip when `invitationLastCopiedAt` set |
| **Removed access state** | When `managerAccess === "removed"`: show muted "Access removed" label, hide action button |
| **Resend email** | `resendClientInvitation` must call `sendInvitationEmail` after Clerk recreate |

- [ ] Install resend + env vars
- [ ] Create `invitation-en.ts` + `invitation-km.ts` templates
- [ ] Wire `sendInvitationEmail` in onboard + resend paths
- [ ] Create `app/api/webhooks/resend/route.ts`
- [ ] Add locale to `HandoffRow` query + UI badge
- [ ] Bounced helper text + copy toast/tooltip
- [ ] Accepted + `managerAccess=removed` read-only state
- [ ] `tsc` + `eslint` clean; manual: send EN/KM invite, bounce webhook, accept flow

---

## Canvas artboards (hosted plan)

| Artboard | State |
|----------|-------|
| Pending invitation row | Status pill + EN/KM locale badge + Copy link / Resend / Revoke |
| Bounced row | Red badge + recovery hint + Resend primary |
| Accepted row | "Remove your access" + read-only after removal |
| Copy link feedback | Toast + last-copied tooltip |
| Wizard invite step | Locale selector + Resend send note |

---

## Recommended execution order

1. **Track A** — push (user-approved)
2. **Track B** — type fixes (~10 min, unblocks CI)
3. **Track C1** — Resend backend (templates → send fn → webhook)
4. **Track C2** — UI polish on `PendingHandoffsSection`
5. Update `docs/plans/manager-led-client-onboarding-phase3.md` mirror + README registry row
6. `graphify update .`

---

## Verification

- `tsc --noEmit` fully green (no `PendingHandoffsSection` errors)
- Resend email sends in English and Khmer based on `locale`
- `email.bounced` webhook flips handoff to `bounced`, stamps `bouncedAt`
- Copy link copies URL + stamps `invitationLastCopiedAt`
- "Remove your access" removes Clerk membership, stamps `managerAccess: "removed"`
- All 3 notification events (sent, accepted, bounced) appear in manager notification panel

---

## Sonnet execution handoff

Connector form (when Plan MCP connected):

> Implement plan `plan-c9fe358d379f4805` (fetch via `get-visual-plan`). Tracks A→B→C in order. Read the **DECISIONS LOCKED** callout first. Track B requires editing `PendingHandoffsSection.tsx` (do-not-edit lifted). Track C: backend first (Resend + webhook), then UI polish. Verify per checklist above.
