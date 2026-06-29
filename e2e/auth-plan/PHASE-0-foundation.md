# Phase 0 — Real-Clerk foundation (shared infra for Phases 2 & 3)

> Required before any browser-based auth test. Sets up real Clerk, a separate Playwright project, and
> provisioned test users/orgs. Not needed for Phase 1.

## Goal

A repeatable way to run Playwright against the app with **real Clerk auth** (`DEMO_MODE=false`), with
test users/orgs that exist in both Clerk and the dev DB, isolated from the fast DEMO suite.

## Tasks

- [ ] **Install** Clerk's official test helpers: `npm i -D @clerk/testing`.
- [ ] **Env file** `.env.e2e-auth` (gitignored): `DEMO_MODE=false`, real `pk_test`/`sk_test`,
      `CLERK_SECRET_KEY` (real test secret), dev `DATABASE_URL`, no `SITE_PASSWORD`.
- [ ] **Server script** `dev:e2e-auth` in package.json: starts Next on a port (e.g. 3002) with
      `.env.e2e-auth` so it runs real Clerk. (Mirror `dev:e2e` but DEMO off, real keys on.)
- [ ] **Separate Playwright project** in `playwright.config.ts`: a project named `auth` with its own
      `testDir: './e2e/auth'`, `baseURL` for the auth server, and a dependency on a `setup` project.
      Keep the existing DEMO project untouched.
- [ ] **Global setup** `e2e/auth/global.setup.ts`: call `clerkSetup()` (fetches a Testing Token that
      bypasses bot/captcha — this is what broke during the migration with `#clerk-captcha`).
- [ ] **Provisioning script** `scripts/provision-clerk-test-users.mjs` using the Clerk **Backend API**
      (`sk_test`), idempotent:
  - [ ] Create users: `owner-a+clerk_test@example.com`, `viewer-a+clerk_test@example.com`,
        `owner-b+clerk_test@example.com`.
  - [ ] Create orgs **ORG-A** and **ORG-B**.
  - [ ] Memberships: owner-a = owner of A, viewer-a = **viewer** of A, owner-b = owner of B.
  - [ ] Ensure matching rows exist in the DB (`organizationMemberships`, users) — or rely on the app's
        JIT-sync on first sign-in (`lib/auth/ctx.ts`).
  - [ ] Seed one property in A and one in B via `e2e/helpers/db.ts` (scoped per org) for the IDOR tests.
- [ ] **Auth setup project** `e2e/auth/auth.setup.ts`: for each user, `clerk.signIn({ page, emailAddress })`
      (server-side token sign-in, skips all verification), then save `storageState` to
      `playwright/.clerk/<role>.json` (`owner-a.json`, `viewer-a.json`, `owner-b.json`).
- [ ] **.gitignore**: add `playwright/.clerk/` and `.env.e2e-auth`.

## Files

- New: `.env.e2e-auth`, `e2e/auth/global.setup.ts`, `e2e/auth/auth.setup.ts`,
  `scripts/provision-clerk-test-users.mjs`.
- Modify: `playwright.config.ts` (add `auth` + `setup` projects with `dependencies`), `package.json`
  (`dev:e2e-auth` script, `@clerk/testing` dep), `.gitignore`.
- Reuse: `e2e/helpers/db.ts` for per-org seed data; existing `global-setup.ts` as a pattern.

## Key APIs (from Clerk docs, confirmed current)

```ts
import { clerkSetup, clerk } from '@clerk/testing/playwright'
await clerkSetup()                                   // global setup — Testing Token
await clerk.signIn({ page, emailAddress })           // instant session, no UI, no verification
// Backend API (provisioning): users.createUser, organizations.createOrganization,
//                             organizations.createOrganizationMembership
```

## Verification

- `node scripts/provision-clerk-test-users.mjs` is idempotent (safe to re-run; reports created vs existing).
- A smoke test using `owner-a.json` storageState loads `/portfolio` authenticated (no `/login` redirect).
- DEMO suite still runs unchanged.

## Risks / notes

- Real-Clerk mode needs the DB to recognize the org/user — provisioning must create memberships, or the
  first request JIT-syncs them. Verify a freshly-provisioned user can actually load a protected page.
- Test emails (`+clerk_test`) + code `424242` only work on **dev** Clerk instances.
- `storageState` sessions expire — the setup project re-runs each suite invocation, so that's fine.

## Effort: ~0.5 day (most of it is the provisioning script + the separate project wiring).
