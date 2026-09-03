# Security baseline audit — Honolulu system-check worktree

Branch: 
Date: 2026-09-03
Scope: minimum front-end + back-end security without end-to-end encryption of stored data.

## 1. Front-end security

### 1.1 NEXT_PUBLIC_* exposure

| Variable | Type | Assessment |
|---|---|---|
|  | Public by design | OK — Clerk publishable keys are safe in the browser |
|  | Public by design | OK — Mapbox access tokens are meant for client use |
|  | Feature flag | OK |
|  | Build-time route | OK |
|  | Build-time route | OK |
|  | App origin | OK — origin only, no secret |

Finding: no server secrets are prefixed with NEXT_PUBLIC_*. All other env vars are server-only.

### 1.2 Security headers / CSP

Finding: no Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, or Referrer-Policy is configured in next.config.ts or middleware.

Minimum recommendation: add a baseline headers config to next.config.ts with X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, and a restrictive CSP.

### 1.3 Client-side secret handling

- lib/env.ts uses t3-env to enforce server/client split at runtime.
- No raw DB connection strings or API keys are passed as props in inspected actions.
- Mapbox token and Clerk publishable key are the only secrets reachable by the browser, both public by design.

Status: front-end secret exposure is controlled.

## 2. Back-end security

### 2.1 Authentication + authorization

- lib/auth/ctx.ts provides requireCtx(), the single auth entry point.
- All inspected Server Actions call await requireCtx() before touching services.
- requireRole() enforces viewer/member/admin/owner ranks.
- lib/services/_crud.ts provides scoped helpers that always attach orgId, userId and scope mutations by orgId.
- DEMO_MODE refuses writes in production and refuses real Clerk keys.
- Clerk webhook route is public by design and verifies signature.

Status: auth pattern is sound.

### 2.2 IDOR

- scopedUpdate / scopedDelete use WHERE org_id = ctx.orgId AND id = id.
- Some service functions do not use _crud.ts helpers; a complete audit of every service file is needed to confirm scoping everywhere.

Minimum recommendation: add an org_id assertion unit test for every entity action. Existing tests/authz/org-scoping-idor.db.test.ts covers several entities but is pending seed fixes.

Status: pattern is correct, coverage incomplete.

### 2.3 Input validation

- app/actions/properties.ts uses Zod schema parsing.
- app/actions/property-drafts.ts uses Zod schemas.
- Most actions use Zod parsing.

Status: validation is consistently applied.

### 2.4 SQL injection

- All database access goes through Drizzle ORM.
- Raw sql fragments are constant strings or Drizzle column references.
- nextId() uses parameterized queries.

Status: no SQL injection vector found.

### 2.5 Rate limiting

| Surface | Status |
|---|---|
| MCP route | OK — per-IP edge limit + Upstash user limit |
| verify / revoke property pillars | OK — verifyLimiter |
| API v1 | OK — apiReadLimiter |
| Auth actions | handled by Clerk |
| Other mutation actions | not uniformly rate-limited |

Minimum recommendation: add a shared mutation rate limiter and apply it to uploads, imports, and CRUD mutations.

### 2.6 Error handling

- Server Actions return generic error strings.
- err.message is not sent to the client.

Status: no internal error leakage observed.

### 2.7 File uploads

- lib/upload-constants.ts defines 10 MB max and allowed MIMEs.
- Server-side re-validates MIME and size before storage presign.
- Presigned S3 POST reduces trust in the client.

Status: upload guards are present.

### 2.8 Middleware route protection

- Public routes are explicitly listed.
- API v1 routes bypass auth.protect() for JSON 401 behavior.
- MCP routes have an in-memory IP rate limiter.

Status: route protection is deliberate.

## 3. Gaps and minimum fixes

| Priority | Item | Action |
|---|---|---|
| High | Add security headers / CSP | Update next.config.ts with baseline headers |
| Medium | Complete IDOR coverage | Add per-entity org-scoping tests |
| Medium | Uniform mutation rate limits | Add actionLimiter to imports, uploads, and CRUD mutations |
| Low | Unsafe metadata | Validate accountType against an enum |
| Low | Audit all route handlers | Confirm each route.ts validates auth and input |

## 4. Verdict

The project has a solid minimum security foundation. To reach production-baseline minimum, add CSP/security headers and complete IDOR + rate-limiting coverage.
