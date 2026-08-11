# Architecture Primer

Concise, factual orientation to this codebase, verified against `origin/encryption` at `7c141bc9`.
Where the codebase's own docs describe something that does **not** match current source, this is
called out as **[INTENDED, not current]**.

## 1. Start here — exact-path map

| Concern | Path |
|---|---|
| DB client | `lib/db/client.ts` |
| DB schema (one file/entity) | `lib/db/schema/*` |
| Data access (Drizzle queries) | `lib/services/*` (one module per entity) |
| Shared CRUD/authz helpers | `lib/services/_crud.ts`, `lib/services/_mapping.ts` |
| Server Actions | `app/actions/*.ts` |
| API route handlers | `app/api/**/route.ts` |
| Auth context resolution — web | `lib/auth/ctx.ts` |
| Auth context resolution — MCP/API | `mcp-server/ctxFor.ts` |
| Ctx type definition | `lib/services/_mapping.ts` |
| Cross-org access resolution | `lib/auth/cross-org.ts` |
| MCP HTTP transport (OAuth token → Ctx) | `app/mcp/route.ts` |
| Clerk↔Postgres identity mirror | `lib/services/identity-sync.ts`, `app/api/webhooks/clerk/route.ts` |
| Edge auth/redirect gate | `middleware.ts` |
| Env validation | `lib/env.ts` |
| Rate limiting | `lib/ratelimit.ts` |
| Spreadsheet import (AI extraction) | `lib/services/unified-extract.ts` |
| Spreadsheet import (UI entry) | `app/(shell)/add-property/import/_components/ImportFlow.tsx` |
| Unit tests | `lib/services/*.test.ts`, `tests/authz/*.test.ts` (Vitest) |
| DB-integration tests | `lib/services/*.db.test.ts` (Vitest, separate config) |
| E2E tests | `e2e/**/*.spec.ts` (Playwright — **not run in CI**) |
| CI gates | `.github/workflows/ci.yml` |
| Generic Next.js pattern reference | `docs/nextjs-architecture.md` — **[INTENDED, not current layout]** (see §7) |

## 2. Request flow: route → Server Action/API → `lib/services` → Drizzle

**A. Server Action (dominant path for mutations)**

```
Client Component → app/actions/<domain>.ts ("use server"; Zod-parses; calls requireCtx())
  → lib/services/<entity>.ts (takes ctx explicitly; runs Drizzle query) → lib/db/client.ts
← action revalidates (revalidateFeTag / bustCache) → Server Component re-fetches
```

Example, `app/actions/properties.ts:33-46` (`createProperty`): Zod-validates via
`NewPropertySchema`, calls `requireCtx()`, then `svcCreateProperty` (`lib/services/properties.ts:42`)
which calls `requireMember(ctx)`, allocates an id via `nextId("PROP")`, and inserts. On success:
`revalidateFeTag`+`bustCache`. Errors are caught, logged via `console.error`, and a generic
`ActionResult` string is returned — raw errors never reach the client.

**B. Server Component read** — e.g. `app/(shell)/layout.tsx:24-50` calls `requireCtx()`, then
`lib/services/*` read functions in parallel via `Promise.all`, mapping DB rows to slim UI-only
shapes (e.g. `PropertyListItem[]`) before passing as props.

**C. API route handlers** (`app/api/**/route.ts`) — file upload/scan, Clerk/Resend webhooks, a
Vercel Cron cleanup job, document summarization. These call the same `lib/services/*` functions;
webhook routes verify their own signatures instead of calling `requireCtx()` (§4).

**Never**: components or route handlers querying Drizzle directly — enforced by convention only, no
lint rule.

## 3. The `Ctx` seam

- **Type**: `lib/services/_mapping.ts:9` — `{ userId, orgId, orgRole: "owner"|"admin"|"member"|"viewer" }`,
  defined outside `lib/auth/` so ordinary services can consume auth context without importing Clerk's
  session APIs. A few identity/manager services do import `clerkClient` for Clerk administration.
- **Built (web)**: `lib/auth/ctx.ts:15-54` (`resolveCtx`), wrapped in React `cache()` as `requireCtx`, is
  the primary session-cookie-to-`Ctx` resolver for ordinary service reads/actions. `DEMO_MODE` returns
  a hardcoded `DEMO_CTX` (`ORG-0001`, `owner`) instead of calling Clerk, refused in production or with a
  real `CLERK_SECRET_KEY`. Otherwise it calls `auth()`, JIT-upserts identity-mirror rows if the Clerk
  webhook has not fired, then resolves Clerk ids via `identity-sync.ts`. A few specialized web paths
  call Clerk directly — `app/(auth)/actions.ts`, `app/(shell)/settings/actions.ts`, and
  `app/(shell)/profile/queries.ts` — but they do not construct the ordinary service `Ctx`.
- **Built (MCP/API, no web session)**: `mcp-server/ctxFor.ts` — a second, parallel Ctx builder, its
  header calling itself "the MCP auth seam," two entry points. `ctxFor()` returns a hardcoded demo `Ctx`
  mirroring `DEMO_CTX`, wired only into the local stdio server (`mcp-server/index.ts:22`). **It is not a
  read-only safety boundary**: the exposed `create_property` MCP path reaches `createProperty`, which
  checks `requireMember` but not `assertCanMutate`, so this owner `Ctx` can write even in demo mode.
  `ctxFromMcpAuth(clerkUserId, options?)` turns a bare
  Clerk user id into a real, org-scoped `Ctx` with no session/cookie — `app/mcp/route.ts` is the only
  caller: `withMcpAuth` validates an incoming Clerk OAuth bearer token (`verifyClerkToken`), and
  `authInfo.extra.userId` is handed to `ctxFromMcpAuth` per-request; this route never calls
  `auth()`/`currentUser()` from `lib/auth/ctx.ts`.
  - *Resolution*: maps Clerk user id → internal `USR-*` id, reads active `organizationMemberships`
    ordered deterministically by `orgId`. Org selection is explicit, never "first row": a
    caller-supplied `requestedOrgId` must be one of the user's active memberships or the call is
    refused; single-org needs no disambiguation; multi-org **read** with no org named falls back to a
    deterministic "primary" org (most senior role, tie-broken by org id); multi-org **write** with no
    org named is refused (`requireExplicitOrg` throws `"org_required"`), never guessed.
  - *JIT provisioning*: if the Clerk user id has no `users` row (e.g. an AI-client-only user who never
    opened the web app), `provisionMcpUser` hits the Clerk Backend API directly and mirrors the user plus
    all Clerk org memberships via the same `upsertUser`/`upsertOrg`/`upsertMembership` writers the web
    JIT path uses — "no new writer." The Clerk webhook handles Clerk-originated lifecycle events, while
    app invitation/membership workflows also mirror eagerly through `identity-sync`; MCP provisioning is
    the first-request fallback. Exercised by a live-DB test, `mcp-server/ctxFor.db.test.ts`
    (`describe.skipIf(!HAS_DB)`), covering a fresh-provision case and an already-provisioned fast path.
    No separate non-DB unit test exists for this file; the DB-gated test runs via `test:db`, not part of
    default `npm test` CI (§8).
  - *Transport independence*: both `ctxFor()` and `ctxFromMcpAuth()` produce the same `Ctx` shape
    consumed by `lib/services/*`, so stdio, HTTP `/mcp`, and the web app drive identical org-scoped
    service calls through one seam. `mcp-server/context.ts` reuses pure helpers from
    `lib/data/derivations/progress` and `portfolio`, while deliberately avoiding the specific
    Clerk/Next-coupled `ai-context` and `portfolio-snapshot` modules that call `requireCtx()` internally.
  - *Future `/api/v1` reuse* — **[INTENDED, not current]**: `docs/plans/IOS-APP-PLAN.md` (not yet built)
    proposes a versioned REST API for a native app, stating the auth seam "already exists and is
    proven" — `/api/v1/*` would verify a bearer token with Clerk, extract the Clerk user id, and call
    `ctxFromMcpAuth(clerkUserId)` unchanged (possibly renamed `ctxFromClerkUserId()`), since it has no
    dependency on the MCP protocol or a web session, only a validated Clerk user id.
- **Passed** explicitly as the first argument to ordinary caller-scoped service operations (e.g.
  `createProperty(ctx, input)`) — no ambient session lookup in those operations. Trusted system writers
  are explicit exceptions: `identity-sync.ts` serves verified webhooks/JIT provisioning without `Ctx`,
  and `sweepExpiredDrafts` is a cross-org cron cleanup with no caller identity.
- **Cross-org variant**: `lib/auth/cross-org.ts:13-38` (`resolveCrossOrgCtx`) builds a *different* Ctx
  (role forced to `"viewer"`, `orgId` swapped) for a manager viewing a client's org, only after checking
  `listManagedOrgIds(ctx.userId)` contains the requested org. Callers must branch on the returned
  `isCrossOrg` flag, never the raw query param (IDOR risk called out in-source).
- **Boundaries**: most DB-backed service modules carry `import "server-only"` and take `Ctx` as data;
  pure type/helper/adapter modules under `lib/services/` are exceptions. `requireCtx` is the primary web
  session-to-`Ctx` boundary, not the sole Clerk reader. The **active** OAuth bearer path is
  `app/mcp/route.ts` → `mcp-server/ctxFor.ts`; a legacy, apparently unused `lib/auth/mcp-ctx.ts` implements
  a different org-selection strategy and should not be treated as the active reference. Edge-gating
  role checks (`requireRole`,
  `lib/auth/ctx.ts:61-63`) are distinct from write-gating role checks (`requireMember`/`requireAdmin`,
  `lib/services/_crud.ts:12-18`). `assertCanMutate()` (`lib/services/_mapping.ts:17-19`) is the demo-mode
  write guard, kept out of `ctx.ts` for the same Clerk-SDK-isolation reason as the `Ctx` type, re-exported
  from `lib/auth/ctx.ts:67`.

## 4. Clerk authentication & session flow

- `middleware.ts` runs `clerkMiddleware` at the edge only when `hasClerk` is true (`CLERK_SECRET_KEY`
  set, not the `sk_test_placeholder` demo sentinel). When false, only the MCP IP rate limiter runs.
- Public routes: `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/oauth-consent`,
  `/contact`, `/api/webhooks/clerk`, `/mcp`, `/.well-known/*`, `/__clerk`, `/docs`. Middleware also
  contains a stale `/api/mcp` public matcher, but no `app/api/mcp/route.ts` exists. Everything else
  calls `auth.protect()`, redirecting unauthenticated visitors to `/login`.
- `/login`/`/register` while already signed in → edge-redirected to a validated same-origin
  `redirect_url` when present, otherwise `/app`.
- Identity-mirror writes are centralized in `lib/services/identity-sync.ts`. The verified Clerk webhook
  (`app/api/webhooks/clerk/route.ts`) handles Clerk-originated lifecycle events; `lib/auth/ctx.ts` and
  `ctxFromMcpAuth` provide JIT fallbacks, while invitation/membership workflows in services such as
  `managers.ts`, `portfolio-members.ts`, and `client-invitations.ts` mirror successful Clerk operations
  eagerly rather than waiting for the webhook.

### The former `/launch` defect is fixed

The deleted `/launch` decider is no longer part of the active flow. `/app` is the permanent
authenticated home route (`app/(shell)/app/page.tsx`); bare `/` temporarily renders the same `HomePage`
until the public-launch marketing phase replaces it.

Clerk fallback redirects in `app/layout.tsx`, the login/register/invitation clients, OAuth consent,
and signed-in auth-entry handling in `middleware.ts` now resolve to `/app`. The shared
`app/(auth)/_lib/resolve-redirect-url.ts` helper preserves relative and same-origin deep links but rejects
external, protocol-relative, and auth-loop destinations. A source audit finds no literal `/launch`
references under `app/`, `lib/`, `components/`, or `middleware.ts`, and the production route table emits
`/app`.

This removes the old manager-vs-owner decider intentionally: the Pro cockpit was cut, identity mirroring
is covered by Clerk webhooks plus the `requireCtx()` JIT fallback, and the handoff completion behavior was
specific to the removed Pro flow. Do not reintroduce `/launch`; new post-auth paths should target `/app`
or pass through the shared redirect resolver.

## 5. Authorization and org/property scoping

Enforced at the service layer keyed on `ctx.orgId`, not at route/middleware (middleware only gates
*authentication*):

- **Role gating**: `requireMember`/`requireAdmin` (`lib/services/_crud.ts:12-18`) rank
  `viewer < member < admin < owner`. A separate edge-level `requireRole` exists for early-exit checks.
- **Row scoping (IDOR defense)**: `scopedInsert`/`scopedUpdate`/`scopedDelete`
  (`lib/services/_crud.ts:37-84`) stamp every insert with `orgId: ctx.orgId` and filter every
  update/delete `WHERE orgId = ctx.orgId AND id = ...`. Most service modules use these; `properties.ts`
  hand-writes its insert but still stamps `orgId: ctx.orgId`.
- **Cross-org (manager→client) reads**: `lib/auth/cross-org.ts` (§3) — verdict is `isCrossOrg`, checked
  against `listManagedOrgIds`, never the raw `?orgId=` param.
- **Org-admin actions on another org**: `assertOrgAdmin` (`lib/services/_crud.ts:20-35`) does a direct
  membership-table lookup for `(targetOrgId, ctx.userId, status: "active")` before allowing it.
- **Dedicated authz suite**: `tests/authz/*.test.ts` — `org-scoping-idor`, `role-gating`,
  `cross-org-ctx`, `manager-access`, `manager-act-on-behalf`, `parity-registry`. It mixes mocked unit
  coverage with live-Neon integration tests (§8).

## 6. Service boundaries and shared abstractions

`lib/services/` has ~65 modules, mostly one-per-entity (`properties.ts`, `tenants.ts`, `leases.ts`,
`payments.ts`, `documents.ts`, ...), plus shared infrastructure:

| Module | Role |
|---|---|
| `_mapping.ts` | `Ctx` type, role ranking, `assertCanMutate` (demo-write guard), `nextId` (prefixed-id counter), `toDomain` |
| `_crud.ts` | `requireMember`/`requireAdmin`/`assertOrgAdmin`, `scopedInsert`/`scopedUpdate`/`scopedDelete` |
| `identity-sync.ts` | Clerk↔Postgres mirror writers, role normalization |
| `managers.ts`, `managed-orgs.ts` | Manager/client relationship resolution (used by cross-org scoping) |
| `s3Client.ts`, `storage.ts` | Object storage (S3/R2) client + presigned uploads |
| `entity-import.ts`, `import-property-link.ts`, `unified-extract.ts`, `<entity>-import.ts` (×13) | Spreadsheet ingestion — §7 |
| `_change-request-dispatcher.ts`, `change-requests.ts`, `change-request-types.ts` | Client-initiated change-request workflow |
| `reconcile-extractions.ts` | Post-import reconciliation |

`lib/services/ingestion/` (adapters + `persist.ts` + `types.ts`) is a second, adapter-oriented
ingestion layer alongside the AI-driven `unified-extract.ts` path — handles non-AI/structured imports
(e.g. document scans).

Column mapping between DB rows and domain/FE shapes is centralized in `lib/db/column-classifier.ts`
(`convertRowToDb`, `convertRowToDomain`), the "single DB→FE conversion point."

## 7. Spreadsheet import flow, and two recent regressions

Entry: `ImportFlow.tsx` → Server Action `extractAllAction` (`app/actions/unified-extract.ts:19-35`):

1. `requireCtx()`.
2. Slices each sheet to an 8-row preview, calls `extractAll(previews)`
   (`lib/services/unified-extract.ts:360-389`) — one `generateObject` call to `gpt-4o-mini` returning a
   structured plan mapping spreadsheet columns to Valgate fields across 14 entity types.
3. Applies the plan deterministically (not AI) via `applyPlan`, using `entity-import.ts`
   (`sanitizePlan`, `assembleRows`) and `import-property-link.ts` (`resolveProperty`).
4. Returns `{ rows, properties }` to the review UI; a later per-entity action commits accepted rows via
   `bulkCreate*`.

Both regressions fixed on this branch (`194d1da`, `e299e46`) touched **only**
`lib/services/unified-extract.ts`:

- **`194d1da` — silent zero-record failures.** The plan schema used `z.record()` for `sources`, which
  compiles to an open-ended JSON-schema object; OpenAI's strict structured-output mode rejects that and
  throws. The `catch` swallowed the error into an empty plan, read by users as "no records found" for
  every workbook. Fix: `sources` is now a typed array, `joins` is required (no `.default([])` — strict
  mode rejects defaults too), and `extractAll`'s catch now re-throws so the action surfaces an honest
  error. **Any future `unifiedPlanSchema` change must stay strict-mode-safe**: no `z.record()`, no
  `.default()` on required object fields.
- **`e299e46` — property name mapped to an internal ID code.** `buildPrompt` sent the model only field
  *names*, not descriptions, so it had no signal to prefer a human-readable value over an internal
  reference code (e.g. `PROP-0001`) for `propertyName`. Fix: an explicit rule added to the prompt text
  itself. **This means all AI-extraction field-preference logic lives in prompt text, not code/schema**
  — unvalidated by TypeScript or tests; a regression in this class is caught only by manually inspecting
  extraction output against a real workbook.

Neither commit touched `entity-import.ts`, `import-property-link.ts`, or `ingestion/adapters/*`.

## 8. Testing seams — and what each gate does *not* prove

Per `.github/workflows/ci.yml`, CI runs exactly three blocking jobs on every push and on PRs into
`valgate-webapp-nextjs-v1.0.2`/`main`: **`test`**, **`typecheck`**, **`lint`**. **No `next build` job**
(a production build needs the Mapbox token). `typescript.ignoreBuildErrors` has been removed, so a manual
or Vercel production build now performs a real type check; CI still relies on its separate `typecheck`
job rather than building. **No E2E job.** The CI `test` job requires `DATABASE_URL` from GitHub Secrets
both for import-time env validation
and because a subset of `tests/authz/*` accesses the live Neon development branch, even though separately
named `*.db.test.ts` files are excluded.

| Gate | Command | Scope | Does NOT prove |
|---|---|---|---|
| `test` | `npm test` (`vitest run`) | Vitest unit/service tests plus `tests/authz/*` (**mixed mocked and live-Neon coverage**); excludes `e2e/**`, disabled `**/queries.test.ts` (pre-Neon), `**/*.db.test.ts` | DB behavior outside the included authz integration subset; UI/browser behavior; no `/launch`-style navigation bug caught here |
| `typecheck` | `npx tsc --noEmit` | Whole repo | Runtime correctness; string-literal route paths are not App Router route-checked, so a missing destination can still typecheck; Zod/AI-provider runtime compatibility (`194d1da`); prompt-text correctness (`e299e46`) |
| `lint` | `npm run lint` (`eslint app lib components`) | Only `app/`, `lib/`, `components/` — excludes `archive/convex/` and Figma-generated `imports/` | Logic/authz correctness; anything outside the three linted dirs |
| `test:db` | `vitest run --config vitest.config.db.ts` | DB-integration tests (`**/*.db.test.ts`) | **Not run in CI** — local-only, needs live `DATABASE_URL` |
| `test:e2e` | `playwright test` (`e2e/**/*.spec.ts`) | Real browser flows incl. `e2e/auth/*.spec.ts` (login/register/manager-routing/role-IDOR) | **Not run in CI.** This is the layer that would have caught the former `/launch` defect (§4); `e2e/auth/section-a.spec.ts` now asserts `/app` after registration, login, and password reset. Being local-only, regressions remain invisible to CI until the suite is run manually. |
| build | `next build --turbopack` (not in CI) | Production compilation, route emission, and TypeScript validation | `eslint.ignoreDuringBuilds` remains enabled, so build does not enforce lint. It also does not prove browser behavior, auth redirect completion, external-service compatibility, or database correctness. |

**Net effect**: a green `test`+`typecheck`+`lint` run proves the codebase compiles, is statically
well-typed, and passes Vitest unit/service/authz tests — it proves **nothing** about whether a
page renders, a redirect target exists, a third-party API accepts a request shape, or a real user can
complete a flow end-to-end. The former `/launch` defect (§4) is a concrete example none of the three
gates detected before it shipped.

## 9. Security-sensitive paths and anti-patterns to avoid

**Security-sensitive paths** (extra care / extra review):
- `lib/auth/ctx.ts` — primary session-cookie-to-`Ctx` boundary for service calls; specialized paths named
  in §3 read Clerk directly. Its `DEMO_MODE` bypass must never be reachable in production or alongside
  a real Clerk key.
- `lib/auth/cross-org.ts` — the web manager→client read boundary for request-controlled `orgId`; new web
  cross-org reads must use `resolveCrossOrgCtx` and branch on `isCrossOrg`. MCP separately accepts an
  explicit `requestedOrgId` and validates it against active memberships in `ctxFromMcpAuth` (§3).
- `lib/services/_crud.ts` — `scopedInsert`/`scopedUpdate`/`scopedDelete` are the IDOR defense for most
  entities; new modules that hand-roll Drizzle calls must still filter every write by `ctx.orgId`.
- `middleware.ts` — the `isPublicRoute`/`isMcpRoute` matchers; adding a route here without checking
  `auth()` elsewhere effectively makes it public.
- `app/api/webhooks/clerk/route.ts` is public in middleware and relies on Clerk webhook-signature
  verification rather than `requireCtx()`. `app/api/webhooks/resend/route.ts` verifies its Resend/Svix
  signature, but is **not** listed as public in `middleware.ts`; with Clerk enabled it is also subjected
  to `auth.protect()` before the handler, which can block normal third-party webhook delivery.
- `lib/env.ts` — single typed env boundary (`@t3-oss/env-nextjs`); secrets go in `server: {}`, never
  `client: {}`/`NEXT_PUBLIC_*`.
- `mcp-server/`, `app/mcp/`, `app/.well-known/*` — the MCP OAuth surface; deliberately public/
  unauthenticated by session cookie (validates its own bearer tokens), gated by an edge IP rate limiter.
- `mcp-server/index.ts` / `mcp-server/ctxFor.ts` — the local stdio server uses a hardcoded owner `Ctx`.
  Its exposed `create_property` path currently bypasses `assertCanMutate`, so `DEMO_MODE` does not make
  this transport read-only; do not run it against a database where writes are unacceptable.
- `app/mcp/route.ts` — the MCP HTTP front door: validates the Clerk OAuth bearer token
  (`verifyClerkToken`), enforces an OAuth client allowlist (fail-closed in production when unbound and
  `MCP_ALLOW_ANY_OAUTH_CLIENT` unset), and applies a per-user rate limiter (`mcpLimiter`).
  **Current documented limitation**: the rate-limit decision happens in `withMcpAuth`'s verify callback,
  which `mcp-handler` runs *before* the tool handler executes; the wrapper only discards the *response*
  and returns 429 after the fact, so an over-limit request's tool call — including a write — still runs
  before being rejected. Source comments call this acceptable given the current limit (60/min/user) and
  audit logging on every write, with a documented upgrade path (moving auth ahead of the handler) — but
  the limiter does not currently prevent an over-limit write from executing.

**Anti-patterns confirmed guarded against** (per CLAUDE.md, verified in paths read for this primer):
ordinary actions catch internal errors and return generic strings (e.g. `app/actions/properties.ts:43-44`),
rather than exposing arbitrary `err.message`; settings actions intentionally return only the controlled,
user-safe `AccessError.message` defined in `lib/services/managers.ts`. Ordinary service calls take an
explicit `Ctx`; secrets are not passed as Client Component props in the reviewed paths.

**Anti-patterns to specifically watch for**:
- Adding a new auth-entry redirect target as a bare string literal (as `/launch` was) with no route
  behind it and no test exercising the redirect — `tsc`/`lint`/`test` will not catch this (§8).
- Loosening `unifiedPlanSchema` back toward `z.record()` or `.default()` on a required field — breaks
  OpenAI strict-mode structured output silently until a live extraction is attempted (§7).
- Treating `docs/nextjs-architecture.md`/`docs/products.md` as descriptions of current file layout —
  they describe a `(pro)/` route group, `app/error.tsx`, `app/not-found.tsx` that do not currently exist
  (`find app -maxdepth 1` shows only `mcp/`, `api/`, `(shell)/`, `_shared/`, `_components/`, `(auth)/`,
  `.well-known/`, `actions/`). **[INTENDED, not current]** — this primer describes current state.
