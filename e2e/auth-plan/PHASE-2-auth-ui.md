# Phase 2 — Section A auth flows (Playwright + real Clerk)

> Depends on **Phase 0**. Tests the actual login/register/forgot **UI** — the one thing only a real browser
> against real Clerk can verify.

## Goal

Automate QA checklist Section A: register, login (valid + wrong password), email verification code, forgot
password, and the site gate. MFA is intentionally left manual (see below).

## Approach

Drive the app's real pages (`/login`, `/register`, `/forgot-password` — the Future/signals API, see memory
`project_clerk_future_api`) using Clerk **reserved test emails** + the **fixed code `424242`** so flows run
unattended with no real inbox. Each test starts by injecting a Testing Token to bypass bot protection.

```ts
import { setupClerkTestingToken } from '@clerk/testing/playwright'
test('register → OTP → dashboard', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/register')
  // fill form with  alice+clerk_test@example.com  ...
  // submit → OTP step → enter 424242 → assert dashboard + org created
})
```

## Tasks — one test per checklist item

- [ ] **A5 Register** → fill form (`name+clerk_test@example.com`) → submit → OTP step → enter `424242` →
      lands on dashboard; an org was auto-created.
- [ ] **A1 Login (valid)** → existing test user → dashboard.
- [ ] **A2 Login (wrong password)** → clear error message, no crash/blank.
- [ ] **A3 Email verification code** (new-device / sign-in code) → `424242` accepted.
- [ ] **A6 Forgot password** → request → `424242` → set new password → logged in with it.
- [ ] **A7 Gate** (only if `SITE_PASSWORD` is set on this server) → wrong = error; right = through; the
      `?from=` param can't redirect off-site (no open-redirect).
- [ ] **A4 MFA** → leave as a documented **manual** item (needs a TOTP-provisioned account; low ROI to
      automate). Note it in QA-FINDINGS.

## Files

- New: `e2e/auth/section-a.spec.ts` (in the `auth` Playwright project from Phase 0).
- Reuse: Phase-0 foundation (server, `clerkSetup`, test emails).

## Verification

- Run the `auth` project under **Node ≥24**:
  `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/@playwright/test/cli.js test --project=auth`
- All Section A flows green except MFA (documented manual).

## Risks / notes

- These specs **cannot** use a saved session — they ARE the login. So no `storageState` here; each test
  drives the UI from signed-out.
- Wrong-password and forgot flows must assert the **app's** error UI, not Clerk's hosted page — confirm the
  custom pages own these states (they do, per the migration build).
- Selectors: the auth pages have no `data-testid` (like the rest) — use role + label/placeholder.

## Effort: ~0.5 day.
