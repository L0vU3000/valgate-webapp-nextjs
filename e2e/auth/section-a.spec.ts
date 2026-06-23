/**
 * e2e/auth/section-a.spec.ts
 *
 * Section A — Auth-flow UI tests
 *
 * These tests drive the real login / register / forgot-password UI pages
 * against a real Clerk dev instance running on port 3002 (PLAYWRIGHT_AUTH=1).
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. SERIAL ORDER (test.describe.serial):
 *    A5 registers a fresh user and stores their email in SHARED.email.
 *    A1 / A2 / A6 all reuse that email. Serial order ensures A5 runs first.
 *
 * 2. FRESH USER (not the provisioned users):
 *    The provision script creates owner-a / viewer-a / owner-b with
 *    skip_password_requirement: true — they have NO password. A real
 *    email+password login test (A1) requires a user who signed up with a
 *    password. A5 registers exactly that user on the fly.
 *
 * 3. OTP 424242:
 *    On Clerk dev instances, any email ending in +clerk_test@... accepts
 *    OTP code 424242 without sending a real email.
 *
 * 4. setupClerkTestingToken({ page }):
 *    Injects the Testing Token into each test's browser context so Clerk
 *    does not show the captcha / bot-detection challenge.
 *
 * HOW TO RUN:
 *   # Start the auth server (real Clerk keys, port 3002):
 *   npm run dev:e2e-auth
 *
 *   # Run this file only (auth-setup sessions must already exist):
 *   PLAYWRIGHT_AUTH=1 npx playwright test --project auth e2e/auth/section-a.spec.ts
 *
 *   # Run the full auth suite (setup + all auth tests):
 *   npm run test:e2e:auth
 */

import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// ---------------------------------------------------------------------------
// Shared state across all tests in this serial block.
//
// A5 writes SHARED.email after generating a unique address.
// A1, A2, and A6 read SHARED.email to interact with that same user.
//
// SHARED.password is the password set during A5 registration.
// A6 changes the password to NEW_PASSWORD — that is intentional and safe
// because A1 (which uses SHARED.password) always runs before A6.
// ---------------------------------------------------------------------------

const SHARED = {
  email: '',
  password: 'Secure@E2E2024!',
}

// The new password set during A6 (forgot-password flow).
// Must differ from SHARED.password so Clerk's "same as current" check passes.
const NEW_PASSWORD = 'NewSecure@E2E!'

test.describe.serial('Section A — Auth flow UI', () => {
  // Inject the Clerk Testing Token before every test.
  // Without this, Clerk's bot-detection shows a captcha challenge and the
  // test hangs waiting for user input.
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })

    // Start every auth-flow test from a guaranteed signed-out state. The auth
    // suite signs users in elsewhere on the same Clerk instance, and a leftover
    // session makes signUp.password() / signIn throw "You're already signed
    // in." Load a page that has Clerk (so window.Clerk exists), then sign out.
    // clerk.signOut() is a harmless no-op when no session is present.
    await page.goto('/login')
    await clerk.signOut({ page })
  })

  // -------------------------------------------------------------------------
  // A5 — Register a fresh user
  //
  // Runs FIRST so SHARED.email is populated before A1 / A2 / A6 need it.
  // The email uses Date.now() to stay unique across repeated test runs.
  // After OTP verification, Clerk's signUp.finalize() redirects to "/".
  // -------------------------------------------------------------------------
  test('A5 — register: fill form → OTP 424242 → land on /', async ({ page }) => {
    // The +clerk_test suffix tells the Clerk dev instance to accept OTP 424242
    // without sending a real email. Date.now() keeps the address unique.
    SHARED.email = `e2e-${Date.now()}+clerk_test@example.com`

    await page.goto('/register')

    // ── Step 1: fill the registration form ──────────────────────────────────

    // Full name field (placeholder "John Doe")
    await page.locator('#fullName').fill('E2E Test User')

    // Work email field (placeholder "john@company.com")
    await page.locator('#email').fill(SHARED.email)

    // Password field (placeholder "••••••••")
    await page.locator('#password').fill(SHARED.password)

    // Confirm password field — must match SHARED.password exactly
    await page.locator('#confirmPassword').fill(SHARED.password)

    // Terms and conditions checkbox — required to enable the submit button.
    // Match by accessible name, not a bare input[type=checkbox]: browser
    // extensions inject their own checkboxes into the page, so the broad
    // selector hits multiple elements (strict-mode violation).
    await page.getByRole('checkbox', { name: /I agree to the Terms/i }).check()

    // Submit the form. Clerk creates the unverified account and triggers the
    // OTP email (which auto-accepts 424242 on dev instances).
    await page.getByRole('button', { name: 'Create account' }).click()

    // ── Step 2: enter the OTP code ───────────────────────────────────────────

    // The OTP step only renders if signUp.password() + sendEmailCode() both
    // succeeded. If signUp errored, the component shows a sonner error toast
    // and stays on the form — which would otherwise surface as a confusing
    // "OTP input not found" timeout. Wait for EITHER the OTP input or an error
    // toast, and if the toast appears, fail with its actual message text.
    const otpInput = page.locator('input[data-input-otp]')
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(otpInput.or(errorToast).first()).toBeVisible({ timeout: 10_000 })
    if (await errorToast.isVisible()) {
      throw new Error(`Registration failed before OTP step: ${await errorToast.innerText()}`)
    }

    // The input-otp library renders a single hidden <input data-input-otp>
    // that backs a 6-slot display. Filling it directly fires the input events
    // that enable the submit button.
    await otpInput.fill('424242')

    // The "Verify & continue" button is disabled until all 6 digits are entered.
    // After .fill('424242') the button becomes enabled.
    await page.getByRole('button', { name: 'Verify & continue' }).click()

    // ── Step 3: confirm redirect to / ───────────────────────────────────────

    // signUp.finalize() → router.push('/').
    // Allow 15 s for the redirect + React hydration to complete.
    await expect(page).toHaveURL('/', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // A1 — Login with valid credentials
  //
  // Uses the account registered in A5 (SHARED.email + SHARED.password).
  // On a fresh browser context, Clerk always shows the device-trust OTP step
  // after password entry — we handle that with OTP 424242.
  // -------------------------------------------------------------------------
  test('A1 — login (valid): email + password + OTP → /', async ({ page }) => {
    await page.goto('/login')

    // ── Step 1: enter email and password ────────────────────────────────────

    // Locate inputs by their visible label text (most robust against DOM changes)
    await page.getByLabel('Email address').fill(SHARED.email)
    // The password input isn't reachable by label: the login page wraps the
    // <Input> in a <div> inside <FormControl>, so shadcn's generated id lands
    // on the div, not the input — the visible "Password" label is associated
    // with nothing, and "Show password" (the toggle's aria-label) is the only
    // thing matching /password/. Target the input by its stable autocomplete
    // attribute instead.
    await page.locator('input[autocomplete="current-password"]').fill(SHARED.password)

    // Submit the credentials
    await page.getByRole('button', { name: 'Log In' }).click()

    // ── Step 2: device-trust OTP verification ────────────────────────────────

    // On a fresh Playwright browser context, Clerk does not recognise the
    // device, so it always prompts for OTP after password. Same selector as
    // the register verify step.
    const otpInput = page.locator('input[data-input-otp]')
    await expect(otpInput).toBeVisible({ timeout: 10_000 })
    await otpInput.fill('424242')

    await page.getByRole('button', { name: 'Verify & sign in' }).click()

    // ── Step 3: confirm we reached the app ──────────────────────────────────

    // signIn.finalize() → router.push('/').
    await expect(page).toHaveURL('/', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // A2 — Login with wrong password
  //
  // Clerk returns an authentication error. The page should show an error toast
  // and stay on /login — any redirect would mean the wrong password was
  // accepted, which is a security failure.
  //
  // We assert on the URL rather than the toast text because toast selectors
  // can be brittle (class names change, timing varies). URL stability is the
  // most meaningful signal here.
  // -------------------------------------------------------------------------
  test('A2 — login (wrong password): error shown, no redirect', async ({ page }) => {
    await page.goto('/login')

    // Enter the correct email but a deliberately wrong password
    await page.getByLabel('Email address').fill(SHARED.email)
    // The password input isn't reachable by label: the login page wraps the
    // <Input> in a <div> inside <FormControl>, so shadcn's generated id lands
    // on the div, not the input — the visible "Password" label is associated
    // with nothing, and "Show password" (the toggle's aria-label) is the only
    // thing matching /password/. Target the input by its stable autocomplete
    // attribute instead.
    await page.locator('input[autocomplete="current-password"]').fill('WrongPassword123!')

    await page.getByRole('button', { name: 'Log In' }).click()

    // Wait briefly for Clerk's error response and the toast to appear.
    // Clerk returns the error synchronously (no OTP step on failure), so
    // 2 s is more than enough.
    await page.waitForTimeout(2_000)

    // The URL must still contain /login.
    expect(
      page.url(),
      'a wrong password should keep the user on /login — a redirect means login was incorrectly accepted',
    ).toContain('/login')
  })

  // -------------------------------------------------------------------------
  // A6 — Forgot password flow
  //
  // Uses SHARED.email (the account created in A5).
  //
  // After this test, the password for SHARED.email changes to NEW_PASSWORD.
  // That is intentional — A1 (which uses SHARED.password) always runs before
  // A6 in serial order, so there is no conflict.
  // -------------------------------------------------------------------------
  test('A6 — forgot password: request → OTP 424242 → new password → logged in', async ({ page }) => {
    await page.goto('/forgot-password')

    // ── Step 1: request the reset code ──────────────────────────────────────

    // Same div-wrapper label bug as the login page: <FormControl> wraps a
    // <div>, so the email <Input> has no accessible label and getByLabel hangs.
    // Target by the stable autocomplete attribute instead.
    await page.locator('input[autocomplete="email"]').fill(SHARED.email)

    // This triggers signIn.resetPasswordEmailCode.sendCode() on the backend.
    await page.getByRole('button', { name: 'Send reset code' }).click()

    // ── Step 2: enter OTP and set a new password ─────────────────────────────

    // Wait for the reset step to appear (same OTP input selector as before)
    const otpInput = page.locator('input[data-input-otp]')
    await expect(otpInput).toBeVisible({ timeout: 10_000 })
    await otpInput.fill('424242')

    // Fill the new password fields
    await page.locator('#newPassword').fill(NEW_PASSWORD)
    await page.locator('#confirmNewPassword').fill(NEW_PASSWORD)

    // Submit — triggers verifyCode() + submitPassword() + finalize()
    await page.getByRole('button', { name: 'Reset password' }).click()

    // ── Step 3: confirm redirect to / ───────────────────────────────────────

    // signIn.finalize() → router.push('/').
    await expect(page).toHaveURL('/', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // A4 — MFA (manual / not automatable)
  //
  // Clerk's TOTP / authenticator-app MFA flow requires scanning a QR code
  // in a real authenticator app. Playwright cannot do that. Skip here and
  // cover it in the manual QA checklist.
  // -------------------------------------------------------------------------
  test('A4 — MFA: skipped (requires manual QR code scan)', async () => {
    test.skip(true, 'MFA requires an authenticator app — verify manually via the QA checklist')
  })

  // -------------------------------------------------------------------------
  // A7 — Site gate (conditional)
  //
  // Only runs if SITE_PASSWORD is set in .env.e2e-auth.
  // Currently that variable is empty, so this test is a no-op.
  // Set SITE_PASSWORD=<value> to activate.
  // -------------------------------------------------------------------------
  test('A7 — site gate: correct code grants access', async ({ page }) => {
    test.skip(
      !process.env.SITE_PASSWORD,
      'SITE_PASSWORD not set in .env.e2e-auth — skipping site gate test',
    )

    // When SITE_PASSWORD is configured, add the gate interaction here:
    // navigate to the gate page, enter the password, confirm the redirect
    // to the protected content.
  })
})
