/**
 * e2e/auth/auth.setup.ts
 *
 * Signs in the three test users and saves their browser sessions to disk.
 *
 * HOW IT WORKS:
 *   1. setupClerkTesting() fetches the Testing Token (bypasses captcha).
 *   2. For each user, clerk.signIn() creates a real Clerk session in the browser
 *      without going through the login UI — instant sign-in.
 *   3. We navigate to the app root ("/") so the app's JIT sync runs:
 *      lib/auth/ctx.ts sees a new Clerk user+org and upserts matching rows into
 *      the database (users, organizations, organization_memberships tables).
 *      Without this step, the DB has no record of these users and the app throws
 *      "unauthenticated" on every protected route.
 *   4. page.context().storageState() saves the browser's cookies and localStorage
 *      to a JSON file. Later tests load this file via storageState: '...' and
 *      start already signed in — no login UI, no repeated sign-in overhead.
 *
 * PREREQUISITE:
 *   Run the provisioning script first:
 *     node scripts/provision-clerk-test-users.mjs
 *
 * OUTPUT FILES:
 *   playwright/.clerk/owner-a.json   — owner of ORG-A
 *   playwright/.clerk/viewer-a.json  — member of ORG-A (viewer for Phase 2/3)
 *   playwright/.clerk/owner-b.json   — owner of ORG-B
 *
 * SESSION EXPIRY:
 *   Clerk sessions expire (typically 7 days on dev instances). Re-run this setup
 *   file whenever tests start failing with authentication errors.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { test as setup, expect } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'
import { setupClerkTesting } from './global.setup'
import { setManagerFlag } from '../helpers/db-auth'

// Load the auth env so this setup file (which runs in the test runner process,
// not in the Next.js server) also has CLERK_SECRET_KEY available for clerkSetup().
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e-auth'), override: true })

// The three test users created by scripts/provision-clerk-test-users.mjs.
// Each entry becomes one storageState JSON file under playwright/.clerk/.
const TEST_USERS = [
  {
    // Owner of ORG-A. Used for Phase 2 ownership tests and the Phase 0 smoke test.
    emailAddress: 'owner-a+clerk_test@example.com',
    storageFile: 'playwright/.clerk/owner-a.json',
    label: 'owner-a',
  },
  {
    // Member of ORG-A. For Phase 2/3: this user can view ORG-A data but should
    // be blocked from owner-only mutations.
    // TODO (Phase 2/3): once a custom Clerk "viewer" role is configured in the
    // Clerk dashboard, change this user's membership role in Clerk and re-run
    // the provisioning script. The app's normaliseRole("viewer") → "viewer" path
    // is already wired in lib/services/identity-sync.ts.
    emailAddress: 'viewer-a+clerk_test@example.com',
    storageFile: 'playwright/.clerk/viewer-a.json',
    label: 'viewer-a',
  },
  {
    // Owner of ORG-B. Used for Phase 2/3 IDOR tests:
    // this user owns ORG-B data and must NOT be able to access ORG-A data.
    emailAddress: 'owner-b+clerk_test@example.com',
    storageFile: 'playwright/.clerk/owner-b.json',
    label: 'owner-b',
  },
  {
    // Pro-2.1 — a portfolio Manager (owner of their own ORG-M). markManager flips
    // users.is_manager = true in the DB after JIT sync, so the saved session
    // redirects to /pro/dashboard. Used by the manager-routing spec.
    emailAddress: 'manager-a+clerk_test@example.com',
    storageFile: 'playwright/.clerk/manager-a.json',
    label: 'manager-a',
    markManager: true,
  },
]

// Fetch the Clerk Testing Token once before signing in any users.
// This must run before the first clerk.signIn() call.
setup.beforeAll(async () => {
  await setupClerkTesting()
})

// Create one setup "test" per user. Playwright runs these serially (workers: 1).
// Each one signs in, triggers JIT sync, and saves the session to disk.
for (const user of TEST_USERS) {
  setup(`save session: ${user.label}`, async ({ page }) => {
    console.log(`\n  Signing in ${user.emailAddress}...`)

    // STEP A — navigate to an unprotected page that LOADS Clerk before signing
    // in. clerk.signIn() drives window.Clerk in the browser, so Clerk must
    // already be loaded on the current page. Calling it on a blank page (or on
    // "/", which returns 404 here and mounts no ClerkProvider) makes the helper
    // poll for window.Clerk until the test times out. /login renders the
    // ClerkProvider, so Clerk is available there.
    await page.goto('/login')

    // STEP B — clerk.signIn with just emailAddress is the recommended form: it
    // works regardless of the instance's verification/MFA settings and
    // auto-handles the fixed test code (424242) for +clerk_test emails on a dev
    // instance. (It also calls setupClerkTestingToken() internally, so no
    // separate token step is needed here.)
    await clerk.signIn({
      page,
      emailAddress: user.emailAddress,
    })

    // Navigate to the app root. This does two important things:
    //   (a) Triggers lib/auth/ctx.ts → requireCtx() → JIT upsert of DB rows.
    //       Without this, the DB has no record of the Clerk user/org and every
    //       subsequent protected-page visit throws "unauthenticated".
    //   (b) Confirms the session cookie is actually working before we save it.
    await page.goto('/')

    // After the JIT sync, the app should NOT redirect to /login.
    // If it does, the session didn't take or the org isn't active.
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/sign-in')) {
      throw new Error(
        `JIT sync or session failed for ${user.label}: landed on ${currentUrl}\n` +
        `Check that:\n` +
        `  1. The user exists in Clerk (re-run provision script)\n` +
        `  2. The user belongs to exactly one org (auto-sets active org)\n` +
        `  3. CLERK_SECRET_KEY in .env.e2e-auth is correct\n`,
      )
    }

    // Save the browser's cookies and localStorage to a JSON file.
    // Later tests load this file to start pre-authenticated.
    await page.context().storageState({ path: user.storageFile })
    console.log(`  ✓ Session saved → ${user.storageFile}`)

    // Pro-2.1 — flip users.is_manager = true now that JIT sync (the goto('/')
    // above) has created this user's DB row. Clerk has no such field, so this is
    // a direct DB write. The saved session is unaffected; the NEXT page load is
    // what redirects the manager to /pro/dashboard.
    if ('markManager' in user && user.markManager) {
      await setManagerFlag(user.emailAddress)
      console.log(`  ✓ Flagged ${user.label} as a manager (is_manager = true)`)
    }

    // TODO (Phase 2/3 — property seeding):
    // After JIT sync, DB rows for the org now exist. We can seed test properties
    // here (one per org) so IDOR tests have real data to probe. Property seeding
    // requires knowing the internal ORG-XXXX ID, which can be looked up from the
    // Clerk org ID via: SELECT id FROM organizations WHERE clerk_org_id = $1
    // This is deferred to Phase 2/3 setup so Phase 0 stays minimal.
  })
}
