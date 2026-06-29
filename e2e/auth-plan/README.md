# Auth / Role / IDOR E2E Test Plan

Plan to automate the checklist items the DEMO_MODE suite **can't** cover — Section A (auth flows),
role-based access, and IDOR (cross-org access). These are listed as "deferred — manual" in
`e2e/QA-FINDINGS.md`; this plan turns them into automated coverage.

## Why these were deferred

The main CRUD suite runs in **DEMO_MODE**, which logs in as a single all-powerful owner
(`USR-0001`/`ORG-0001`) and skips Clerk entirely. That's perfect for CRUD but **physically cannot** test:
- the real login/register/OTP/forgot **UI flows** (DEMO_MODE bypasses them), or
- "can a **viewer** be blocked" / "can org A reach org B" (DEMO_MODE is always owner, one org).

These need **real Clerk** (`DEMO_MODE=false`, `pk_test`/`sk_test`) and more than one user/org.

## The core idea: test the right thing with the right tool

| What | Really testing | Tool | Phase |
|---|---|---|---|
| Section A | login/register/forgot **UI** | Playwright + real Clerk | **2** |
| Role + IDOR enforcement | **authorization logic** | **Vitest** (service layer) | **1** |
| Role + IDOR in the UI | buttons hidden / URLs blocked | Playwright (thin smoke) | **3** |

The authz logic does **not** live in the browser — it lives in `lib/services/_crud.ts`
(`scopedDelete` needs `admin`; queries filter by `ctx.orgId`). The cheapest, most reliable way to prove
"viewer can't delete" and "org B can't read org A" is to call those services directly with a synthetic
`Ctx` and assert they throw / return nothing. No browser, no Clerk, deterministic. That's **Phase 1** and
it's where the real security value is.

## Phases (do in this order)

| Phase | Title | Needs Clerk rig? | Effort | File |
|---|---|---|---|---|
| **1** | Authorization core (role + IDOR) via Vitest | No | ~0.5 day | `PHASE-1-authz-vitest.md` |
| **0** | Real-Clerk foundation (shared infra) | — | ~0.5 day | `PHASE-0-foundation.md` |
| **2** | Section A auth flows (Playwright) | Yes (Phase 0) | ~0.5 day | `PHASE-2-auth-ui.md` |
| **3** | Role + IDOR UI smoke (Playwright) | Yes (Phase 0) | ~1 day | `PHASE-3-role-idor-ui.md` |

> Phase 1 is listed first deliberately — it needs **zero** Clerk setup, covers the security-critical core,
> and de-risks everything else. Phase 0 (foundation) is only required before Phases 2 & 3.

## Prerequisites (whole track)

- Clerk **development** instance keys (`pk_test`/`sk_test`) — test emails/codes only work on dev instances.
- Real-auth run mode: `DEMO_MODE=false` (NOT `dev:e2e`). Needs matching `organizationMemberships` rows in
  the dev DB (the Phase-0 provisioning script handles this; JIT-sync covers first sign-in otherwise).
- **Node ≥24** for the Playwright runner (Node 22.17 + PW 1.61 loader bug — see `QA-FINDINGS.md`).
- Clerk auth here uses the **Future/signals API** (see memory `project_clerk_future_api`) — the app's
  `/login`, `/register`, `/forgot-password` pages.

## Guardrails

- **Never `seed:reset`.** Tests create throwaway data via `e2e/helpers/db.ts` and clean up.
- Keep the real-Clerk project **isolated** from the fast DEMO suite (separate Playwright project + env) so
  the bulk stays quick and offline.
- Test emails/codes are **dev-instance only** — production launch needs its own manual pass.

## Done =

All three checklist groups have green automated coverage (or a documented, justified manual remainder for
MFA), and `e2e/QA-FINDINGS.md`'s "deferred — manual" section is updated to point here.
