# Honolulu system-check — audit task list

Worktree: `valgate-webapp-nextjs/system-check`
Branch: `L0vU3000/system-check`
Goal: run a focused system audit for production readiness without blocking UI work in the other worktree.

---

## 1. High-traffic readiness (100–500 DAU minimum)

Define and verify the minimum system needed to support 100–500 daily active users.

- [ ] Inventory current runtime target: Vercel free/pro, Node server, or VPS + nginx
- [ ] Inspect database connection setup: `lib/db/client.ts`, Neon pool settings, `DATABASE_URL`
- [ ] Verify Next.js caching strategy: `unstable_cache`, `cache()`, `revalidateTag`, `loading.tsx`
- [ ] Review image/upload flow: S3 presigned POST limits, file-size guards, upload rate limits
- [ ] Verify `@upstash/ratelimit` is wired on all public mutations and auth actions
- [ ] Confirm production `DATABASE_URL` uses a pooled connection / `pgbouncer` mode if required
- [ ] Document minimum recommended infra in `docs/audit/high-traffic-minimum.md`
- [ ] Add a smoke load test (k6 or Artillery) for login + dashboard paths

Acceptance: the report explains exactly what changes are required to support 500 DAU, and at least one load test runs against preview.

---

## 2. Testing pyramid — minimum viable test system

Ensure unit, integration, and e2e layers exist and pass.

- [ ] Run unit tests: `npm run test`
- [ ] Run component/integration tests: `npm run test:preview`
- [ ] Run DB-layer tests: `npm run test:db`
- [ ] Run e2e tests: `npm run test:e2e`
- [ ] Run auth e2e tests: `npm run test:e2e:auth`
- [ ] Identify empty or failing layers and add the minimum missing coverage:
  - one happy-path unit test per `lib/services/*` module
  - one Server Action integration test hitting a test DB
  - one Playwright smoke test per critical flow (login, add-property, dashboard)
- [ ] Wire tests into CI (`.github/workflows`) if missing
- [ ] Document test commands and required env in `docs/audit/testing-pyramid-minimum.md`

Acceptance: `npm run test`, `npm run test:preview`, and `npm run test:e2e` all complete with a baseline pass, and each layer has at least one meaningful test.

---

## 3. Security [report drafted in ] — minimum front-end and back-end baseline

Enforce a baseline security posture without requiring encryption of stored data.

### Front-end minimum

- [ ] Audit `.env.example` and `.env.local` for `NEXT_PUBLIC_*` secrets
- [ ] Review `next.config.ts` and `middleware.ts` for security headers / CSP
- [x] Confirm Clerk public key is the only Clerk value exposed to the browser
- [x] Check that Server Components do not pass full DB objects or secrets as client props
- [x] Verify browser-side upload restrictions match server-side limits

### Back-end minimum

- [x] Audit every Server Action and route handler for authentication + authorization
- [x] Confirm Zod validation on every user input before DB/service calls
- [x] Confirm IDOR checks (pattern correct; coverage incomplete): users can only mutate resources they own
- [x] Verify rate limiting on auth actions (MCP/API v1/pillars covered; other mutations not uniform), public mutations, upload endpoints
- [x] Confirm Drizzle parameterized queries (no raw string interpolation from user input)
- [x] Confirm error handling returns generic messages to client and logs details server-side
- [ ] Review `middleware.ts` matcher scope and route protection
- [x] Document findings and gaps in `docs/audit/security-baseline-minimum.md`

Acceptance: report lists every audited action/handler, marks each check pass/fail/gap, and provides the minimum fixes needed.

---

## 4. Deferred — not important now

- [ ] Comprehensive codebase documentation
- [ ] Agent-facing documentation

