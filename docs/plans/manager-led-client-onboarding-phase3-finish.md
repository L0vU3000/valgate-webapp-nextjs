# Manager-led onboarding — Phase 3 finish line + ship

- **Status:** approved (all decisions locked — ready for build/handoff)
- **Visual plan:** `plan-32c33a89a3f34747` — [hosted](https://plan.agent-native.com/plans/plan-32c33a89a3f34747)
- **Produced with:** Mobbin (pending-invitation refs) + `.impeccable.md` (Valgate Professional)
- **Supersedes the open items in:** [manager-led-client-onboarding-phase3.md](./manager-led-client-onboarding-phase3.md) (original draft)

> **Honest status — most of this is already done.** The branch is green and Phase 3 is
> ~90% shipped. This is a deliberately small plan: the rollout (push) plus the ONE
> genuinely unbuilt Phase 3 feature.

## Status of the three asks

- **Item 1 — push `ebcda21`:** not done (trivial; one command).
- **Item 2 — fix the 3 Phase-1 type errors:** ✅ **DONE.** `tsc --noEmit` is fully clean (0 errors). `PendingHandoffsSection.tsx` already uses valid `tier="confirm"` + optional-children `Th`.
- **Phase 3:** ✅ ~90% shipped — localized Resend emails (`sendInvitationEmail` + `invitation-en.ts`/`invitation-km.ts`, wired in `onboardClientPortfolio`), bounce detection (Svix-verified Resend webhook → `handleBounce`), and the full Pending-row UI (copy-link, EN/KM badge, bounced message, resend/revoke/remove-access).

## The one real feature — honor the "Keep my access" toggle

The wizard already has a **`retainAccess`** toggle (default on) that does nothing server-side
today. Phase 3's premise was "manager retains access by default, **with opt-out**." Make the
opt-out real: persist the manager's intent at onboard, act on it when the client accepts.

## Locked decision — org-orphaning trap

The client is invited as `org:admin` when role = **full**, but `org:viewer` when role = **view**.
The manager is the org's only admin. If a manager opts to *leave* a **view-only** portfolio,
the org is left with **no admin** — orphaned.

**Locked:** the "Keep my access" toggle is **forced on + disabled when role = view.** Only
**full-access** handoffs may opt to leave. Enforced in BOTH the wizard UI and the server
(ignore `intent = leave` when `role = view`).

## Schema change (the hard-to-reverse bet)

Add ONE column to `client_handoffs`:

| Column | Type | Default | Note |
|---|---|---|---|
| `manager_access_intent` | enum (`keep` \| `leave`) | `keep` | What the manager CHOSE at onboard. Kept SEPARATE from `manager_access` (`granted`/`removed`, the live state) so intent is never confused with reality. |

## Build worklist

1. `lib/db/schema/access.ts` + drizzle migration — add `manager_access_intent` enum, NOT NULL default `keep`. `npm run db:generate` → `db:migrate`. **Never `seed:reset`.**
2. `OnboardClientWizard.tsx` — send `retainAccess`; force the toggle ON + disabled when `role = "view"` with a one-line reason.
3. `app/(pro)/pro/actions.ts` — `onboardClientPortfolioAction`: accept `retainAccess`, map to intent, Zod-validate, pass through.
4. `lib/services/client-onboarding.ts` — persist intent (clamp to `keep` when `role = view`); in `handleInvitationAccepted`, if `intent = leave` AND `role = full`, **semi-auto**: write a best-effort ACCESS notification (do NOT auto-delete); the Clerk removal stays the existing one-click `removeManagerAccessAction`. Notification failure must not fail the webhook.
5. `PendingHandoffsSection.tsx` — two small indicators: (a) PENDING + `intent = leave` → "Will step away once accepted" badge; (b) ACCEPTED + `intent = leave` + still `granted` → emphasize the existing "Remove your access" button.

## UI/UX references

Backend-dominant feature; the Pending-row UI already meets the bar. For the small deltas
(intent indicator + disabled-toggle reason): **Slack Invitations**, **Figma members**,
**Grok/Dropbox** pending-invite patterns. Design per `.impeccable.md` — light, blue precious,
borders over shadows, badge = trailing-edge metadata.

## Rollout (items 1 + 2)

- **Item 2** — ✅ nothing to do (branch green).
- **Item 1** — `git push` `L0vU3000/pro-ui-ux` (HEAD `ebcda21`). Ship now (Phase 1+2 complete) or after this feature lands. The new column needs a migration on the Neon branch before the feature works in prod.
- **Ops:** `RESEND_API_KEY` + `RESEND_FROM_EMAIL` must be set in Vercel for real invite emails (code no-ops gracefully without them).

## Locked decisions (resolved 2026-06-29)

1. **Reconcile mode = semi-auto.** When a `leave` + full-access client accepts, `handleInvitationAccepted` does **not** delete the manager. It writes a best-effort ACCESS notification ("You chose to hand off fully — remove your access", → `/pro/clients`) and the Pending row emphasizes the existing one-click **"Remove your access"**. Keeps a human in the loop for the irreversible, retry-prone Clerk membership delete.
2. **Pending-row hint = yes.** Pending `leave` handoffs show a subtle **"Will step away once accepted"** badge (trailing-edge metadata).

## Verification

- `npx tsc --noEmit` clean · `npx eslint` clean.
- Migration applies cleanly (`db:migrate`); `db:ping` OK.
- Manual: onboard a full-access client with "keep access" OFF → accept → manager is prompted/removed per the chosen mode. Onboard a view-only client → toggle is disabled-on.
