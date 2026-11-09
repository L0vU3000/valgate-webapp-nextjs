# Shared organisation (family co-ownership view)

Owner: product owner (brendan) · Last-Verified: 2026-11-09 ·
Review trigger: any auth/ctx, membership, or settings change.

## Goal (owner's words, 2026-11-09)
"Pro is currently disabled. All I want as a feature is multi-user sharing of an
organisation — e.g. all family members can VIEW the same portfolio."

So: kill the Manager-cockpit framing; the feature is **invite household members
to one organisation and let them see the same portfolio (read-only)**.

## Already exists (do not rebuild — verified in code 2026-11-09)
- `lib/db/schema/access.ts` Phase 6: `portfolioRoleEnum("admin" | "member" |
  "viewer")` → Clerk org roles; viewer is read-only. This IS the family role.
- Clerk organisation memberships + invitations (dev/staging instance
  charmed-ostrich-94) with invite codes (`getOrCreateInviteCode`,
  `lib/services/managers.ts`) and an invitation email template (`invitation-en.ts`).
- Shell renders per-org portfolio; membership switch already drives MCP ctx.
- The `/pro/*` cockpit UI is disabled/absent — that is fine, we do not need it.

## Plan (minimal — reuse, then thin UI)
1. **Sharing UI (Owner only) in Settings**: a "Sharing" section — invite a
   member by email with role preset to **viewer**; list existing members +
   roles; revoke. No other roles exposed yet (YAGNI: admin/member come later).
2. **Server enforcement**: `requireCtx`/service layer denies all mutations for
   non-owner roles except through the existing `change_requests` path — family
   members can VIEW and optionally PROPOSE changes; the owner approves (Pro-2.3
   semantics already exist — reuse, don't invent).
3. **api/v1 auth ctx**: make `/api/v1` membership-aware the same way MCP ctx
   is (resolve granted org instead of "ignore active org, pick primary").
   Contract-first rule: this is a wire-visible auth change → two rounds
   (web contract + iOS consumer listing), per umbrella AGENTS.md.
4. **Verification map**: new feature `docs/agents/verify-webapp/features/shared-org.md` —
   invite → member sees same portfolio read-only → propose change → owner approves.
   Empty state for the member's Portfolio (if the org has none): actionable CTA
   pointing to the owner (owner adds data), not bare text.

## Out of scope for round 1
Manager cockpit re-enable, paid/Pro tiers, member write access (admin/member
paths stay dormant), client_handoffs Phase 6 rework beyond what viewer needs.

## Rounds
- R-A (codex maker): Sharing UI + service glue + enforcement. Visual proof both
  sides (owner settings; member's read-only shell).
- R-B (two rounds, contract first): api/v1 membership ctx in web; iOS
  consumer round: existing family-account test user sees shared portfolio.
- R-C: map entries + maintain drive; AGENT-OPS ledger lines.
