# Refactor Phase 2 — Backend Layering (actions → services → Drizzle)

**Goal:** restore the project's own rule — Server Actions stay thin, `lib/services/*` owns queries — by splitting the three backend god files.
**Risk:** Medium. Pure code movement, no behavior change, but these files are the auth/ownership hot path.
**Effort:** Medium (1–2 days).

## Backend context (beginner-level)
A *Server Action* is a function the browser can call; a *service* is a plain server function that talks to the database. The rule "actions call services, services own Drizzle" exists so that every database query lives in one findable place with its ownership checks, instead of being scattered through UI-adjacent files. Today `app/(pro)/pro/queries.ts` (2,283 lines) and `actions.ts` (935 lines) query the database directly, which is exactly what the rule forbids.

## Targets

### 1. Split `app/(pro)/pro/actions.ts` (935 lines) by domain
Follow the existing convention (`change-requests.actions.ts` already does this):
- `clients.actions.ts` — client/onboarding mutations
- `properties.actions.ts` — property mutations
- `portfolio.actions.ts` — portfolio/member mutations
- Keep `change-requests.actions.ts` as is.

Move-only refactor: every action keeps its exact body, Zod schema, and `requireCtx` call. Update imports at call sites. No logic edits.

### 2. Extract `app/(pro)/pro/queries.ts` (2,283 lines) into services
- Any function that touches Drizzle directly moves to a service module — extend the existing `lib/services/*` file for its entity; create `lib/services/pro-dashboard.ts` only for genuinely cross-entity aggregations.
- The route-level `queries.ts` shrinks to thin composition: call services, shape props for the page. Target < 400 lines.
- Preserve every `cache()`/`unstable_cache` wrapper exactly where it is — caching behavior must not change in this phase.

### 3. Split `lib/services/client-onboarding.ts` (1,772 lines)
Split by concern along its existing section boundaries (read the file first; likely: org/portfolio creation, invitation flow, backfill/draft handling). Aim for 3 files, each with one job. Keep the dual-write code paths intact — Phase 4 retires them.

### 4. Carry-over TODOs
Pick up any Phase 1 triaged TODOs that live in these files (e.g. `lib/data/auth-shim.ts:13` callsites note) if they are one-line fixes; otherwise re-note them for Phase 4.

## Guardrails
- **No behavior change.** This phase is `git mv` + import surgery. Any "while I'm here" improvement is out of scope.
- Every moved mutation must still have its `requireCtx`/ownership check adjacent — run `/cso` or `security-review` on the diff before landing (IDOR checks are the whole point of this layering).
- Client = permission-leader and change-request flows are live features; do not reorder their logic.

## Done when
- No file in `app/(pro)/pro/` imports Drizzle (`lib/db/client`) directly.
- `actions.ts` no longer exists or is < 100 lines of re-exports (prefer deleting it and updating imports).
- tsc, lint, `npm run test` (26/26 authz) green; `npm run test:e2e:auth` passes (real-Clerk rig, port 3002, Node ≥ 24).
- `/code-review` on the diff finds no correctness issues.
- `graphify update .` run after landing.

## Execution prompt (paste into Sonnet)
> Execute docs/plans/refactor-phase-2-backend-layering.md. Move-only refactor: split app/(pro)/pro/actions.ts by domain, extract Drizzle queries from app/(pro)/pro/queries.ts into lib/services/*, split lib/services/client-onboarding.ts by concern. Zero behavior change — keep every Zod schema, requireCtx call, and cache wrapper exactly as-is. Verify: tsc, lint, npm run test, test:e2e:auth. Commit per split (3 commits). Then run /code-review.
