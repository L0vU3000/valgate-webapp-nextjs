---
title: Consumer Release Plan — Valgate (single-owner, no-bug launch)
type: plan
status: living
source: authored 2026-07-18 planning session
tags: [plan, release, launch, pro-teardown, qa]
added: 2026-07-18
---

## Summary
The path from the current state to a clean consumer-facing web release. Scope is
**single-owner only** — the Pro (manager/client) side is being removed entirely.
Grounded in the repo state on 2026-07-18: the `/pro` cockpit UI is already gone
on this branch, but the Pro backend (managers, clients, invitations,
change-requests, portfolio-sharing) still threads through auth, the Clerk
webhook, identity-sync, the shell layout, and Settings.

"No-bug" is a **gate you pass**, not a promise you code toward — this plan ends
in a QA/verification gate that must go green, not a vibe.

Decisions needing an owner call are marked 🟡 with a recommendation.

Sibling notes: [[tasks]] (work board) · [[open-questions]] (undecided calls) ·
[[roadmap]] (product state) · [[gotchas]] (landmines to respect).

---

## Phase 0 — Lock scope (Pro teardown)
Unblocks everything else: it shrinks the surface that has to be QA'd.

- [ ] Remove residual Pro UI: account-type toggle + Managers section in Settings
  (`app/(shell)/settings/_components/SettingsPage.tsx`, `ManagersSection.tsx`);
  manager banner + cross-org logic in `app/(shell)/layout.tsx`.
- [ ] Strip `isManager` from auth (`lib/auth/ctx.ts`, delete `lib/auth/cross-org.ts`),
  `identity-sync.ts`, and the Clerk webhook (`app/api/webhooks/clerk/route.ts`).
- [ ] Delete dead Pro services + tests: `managers`, `managed-orgs`, `client-invitations`,
  `client-onboarding`, `client-records`, `change-requests`, `change-request-types`,
  `_change-request-dispatcher`, `portfolio-members`, `portfolio-shared`,
  `estate-assignments`. **Verify each** — some (`professionals`, `estate-assignments`,
  `client-records`) may be owner-facing, not Pro.
- [ ] 🟡 **DB decision:** keep `organizations` / `organization_memberships` tables but
  stop writing to them (low risk) **vs.** collapse to one-org-per-user (clean but
  migration-heavy). **Recommend: keep + stop writing** — a schema collapse is the
  riskiest possible change right before a launch.
- [ ] Drop `is_manager` + Pro-only tables/enums (`clients`, `access_requests`,
  `change_requests`, `client_handoffs` and their enums) via a **hand-authored**
  migration (`drizzle-kit generate` is broken here). Dev Neon branch first, then prod.
- [ ] Audit the MCP toolset (`app/mcp/route.ts`, `mcp-server/`) for client/manager
  write tools; remove them and update the tool count.

**Order:** remove callers → delete dead code → drop schema. Otherwise `tsc` fights you.

## Phase 1 — Fix the known open bugs
From [[open-questions]] and [[error-log]].

- [ ] **Docked-bar overlap** layout bug (flagged during expand-mvp-scope).
- [ ] **Add-Property intro copy** still describes a rental-listing marketplace
  (hosts / guests / bookings / publishing) — rewrite to match the
  property-management product.
- [ ] Confirm recent fixes are still green: co-owner data-loss, Mapbox WebGL crash,
  duplicate React keys, Save-as-Draft navigation.

## Phase 2 — Product completeness (consumer polish)
Frontend-led. The `impeccable:harden` skill covers most of it.

- [ ] **Empty states** for every list/route: portfolio (0 properties), documents,
  analytics, rental, financials.
- [ ] **First-run / onboarding**: what a brand-new user sees before their first
  property exists.
- [ ] **Error states**: every server-action failure shows a human message (never a
  raw error); every data route has `loading.tsx` + an error boundary.
- [ ] **Copy sweep** against [[words-to-avoid]] — no dev-framing leaks (MVP,
  placeholder, mock) in user-facing text.
- [ ] **Responsive pass** — every screen at mobile width (also de-risks the iOS track).
- [ ] Accessibility basics: focus order, labels, contrast, keyboard nav.

## Phase 3 — Backend & data correctness
- [ ] **Entity/field reevaluation** (open question): after the scope cut, map which
  entities/fields are still used vs. dead; remove dead ones. Blocks locking the
  data model in `domain/property-model.md`.
- [ ] Verify the 8 **Progress pillars** derivation still computes correctly post-cut.
- [ ] Confirm seed data is single-owner-clean (no manager/client fixtures).
  ⚠️ Never `seed:reset`; never re-run `seed:neon` for a second account.

## Phase 4 — Security & auth pass
- [ ] Run the `cso` skill: every mutation authenticates **and** authorizes (IDOR check).
- [ ] Rewrite `tests/authz/` — cases assume managers/cross-org; make them single-owner.
- [ ] Confirm no secrets in `NEXT_PUBLIC_*`; no full DB objects sent as props.
- [ ] Decide rate limiting on login/signup/sensitive actions (CLAUDE.md says
  "decide later" — decide now).

## Phase 5 — The no-bug gate
This is the actual "no-bug" work — all must go green.

- [ ] `tsc` + `eslint` clean.
- [ ] Unit tests green (`npm run test`).
- [ ] E2E green — Playwright `e2e/` suite, **Node ≥24 runner**, never `networkidle`.
- [ ] Full manual QA via the `qa` skill across every consumer flow
  (login → add property → detail → docs → analytics → settings).
- [ ] **Live QA, not just `next build`** — the demo-mode `currentUser()` crash class
  only surfaces in the running app.

## Phase 6 — Prod launch ops
Respect [[gotchas]] — deploys do NOT auto-migrate.

- [ ] Rotate the Neon **prod** password.
- [ ] Stand up the **Clerk prod instance** (currently dev).
- [ ] Set all Vercel prod env vars (`OPENAI_API_KEY`, DB URL, MCP flags).
- [ ] **Run `drizzle-kit migrate` against prod manually** after any schema change —
  a missed migration 500s every authenticated page. See [[prod-migration-drift]].
- [ ] Post-deploy canary + smoke test.

---

## Suggested sequencing
Phase 0 → 1 first (scope lock + known bugs) — they shrink the QA surface. The iOS
track (see the 2026-07-18 planning session) is independent and can run in parallel;
Phase 2's responsive pass feeds directly into it.

## Links
- [[tasks]] · [[open-questions]] · [[roadmap]] · [[gotchas]] · [[error-log]] · [[obsidian]]
