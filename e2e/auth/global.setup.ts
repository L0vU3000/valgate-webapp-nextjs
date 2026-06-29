/**
 * e2e/auth/global.setup.ts
 *
 * Fetches a Clerk Testing Token before any sign-in happens.
 *
 * WHY THIS EXISTS:
 *   Clerk's bot-detection system normally blocks automated browser sessions with
 *   a #clerk-captcha challenge. During the Clerk migration this is exactly what
 *   broke the E2E suite — the sign-in form hung waiting for captcha to clear.
 *
 *   clerkSetup() contacts Clerk's API (using CLERK_SECRET_KEY) and gets a
 *   short-lived "Testing Token". That token is stored in process.env.CLERK_TESTING_TOKEN.
 *   When clerk.signIn() runs later in auth.setup.ts, it includes that token in the
 *   request so Clerk knows "this is a trusted automated test, skip captcha".
 *
 * HOW IT IS CALLED:
 *   auth.setup.ts imports and calls setupClerkTesting() in a test.beforeAll().
 *   We do it this way (rather than in playwright.config.ts globalSetup) so it
 *   only runs for the auth project, not the DEMO project.
 *
 * REQUIREMENT:
 *   CLERK_SECRET_KEY must be set to a real test secret (sk_test_...).
 *   The server started by dev:e2e-auth loads it from .env.e2e-auth.
 */

import { clerkSetup } from '@clerk/testing/playwright'

export async function setupClerkTesting(): Promise<void> {
  // clerkSetup() reads CLERK_SECRET_KEY from process.env, calls Clerk's API,
  // and writes the returned token to process.env.CLERK_TESTING_TOKEN.
  // All subsequent clerk.signIn() calls in the same process will find it there.
  await clerkSetup()
  console.log('✓ Clerk Testing Token fetched — captcha bypass active')
}
