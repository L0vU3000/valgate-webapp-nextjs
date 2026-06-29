#!/usr/bin/env node

/**
 * scripts/provision-clerk-test-users.mjs
 *
 * Creates the test users, organisations, and memberships in Clerk for the
 * E2E auth test suite (Phases 2 & 3). Safe to re-run — reports "already exists"
 * for anything that is already in place instead of creating duplicates.
 *
 * WHAT IT CREATES:
 *   Users:
 *     owner-a+clerk_test@example.com  — will be org:admin of ORG-A → "owner" in app
 *     viewer-a+clerk_test@example.com — will be org:member of ORG-A → "member" in app
 *     owner-b+clerk_test@example.com  — will be org:admin of ORG-B → "owner" in app
 *
 *   Organisations:
 *     ORG-A — owned by owner-a
 *     ORG-B — owned by owner-b
 *
 *   Memberships:
 *     owner-a  → org:admin  of ORG-A  (normaliseRole → "owner")
 *     viewer-a → org:member of ORG-A  (normaliseRole → "member")
 *     owner-b  → org:admin  of ORG-B  (normaliseRole → "owner")
 *
 * NOTE — "viewer" role:
 *   The app supports a "viewer" permission level (lib/services/identity-sync.ts:
 *   normaliseRole("viewer") → "viewer"). For Clerk to send that string, you need
 *   a CUSTOM ORG ROLE named "viewer" created in the Clerk dashboard. Until then,
 *   viewer-a is provisioned as "org:member" which maps to "member". This is enough
 *   for Phase 0 and Phase 2 tests; update before Phase 3 viewer-specific tests.
 *
 * HOW DATABASE ROWS ARE CREATED:
 *   This script only touches Clerk — it does NOT insert rows into the Neon DB.
 *   Database rows (users, organizations, organization_memberships) are created
 *   automatically by the app's JIT sync on first sign-in (lib/auth/ctx.ts →
 *   requireCtx). The auth.setup.ts file triggers this by navigating to "/" after
 *   signing in, which causes the Next.js server to call requireCtx().
 *
 * PREREQUISITES:
 *   • .env.e2e-auth must exist with real sk_test_... values
 *   • Run BEFORE auth.setup.ts (Playwright auth-setup project)
 *
 * USAGE:
 *   node scripts/provision-clerk-test-users.mjs
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

// ─── Load env from .env.e2e-auth ──────────────────────────────────────────────
// dotenv is already a devDependency (package.json). We load .env.local first for
// any base vars, then .env.e2e-auth with override: true so the test keys win.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e-auth'), override: true })

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

// ─── Safety checks ────────────────────────────────────────────────────────────

if (!CLERK_SECRET_KEY || CLERK_SECRET_KEY === 'sk_test_REPLACE_ME') {
  console.error('\n❌  CLERK_SECRET_KEY is not configured.')
  console.error('    Fill in .env.e2e-auth with your test Clerk instance keys.')
  console.error('    (Go to dashboard.clerk.com → your dev app → API Keys)\n')
  process.exit(1)
}

if (!CLERK_SECRET_KEY.startsWith('sk_test_')) {
  console.error('\n❌  CLERK_SECRET_KEY does not look like a test key (expected sk_test_...).')
  console.error('    NEVER use production keys for E2E tests.\n')
  process.exit(1)
}

// ─── Clerk REST API helpers ────────────────────────────────────────────────────
// We use the Clerk REST API directly via fetch rather than importing @clerk/backend.
// @clerk/backend is a transitive dependency of @clerk/nextjs but importing it from
// a plain Node script risks pulling in Next.js-specific code. fetch is simpler.

const CLERK_API_BASE = 'https://api.clerk.com/v1'

/**
 * Makes a GET request to the Clerk Backend API.
 * Throws if the response is not 2xx.
 */
async function clerkGet(path) {
  const url = `${CLERK_API_BASE}${path}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clerk GET ${path} failed (HTTP ${res.status}): ${body}`)
  }
  return res.json()
}

/**
 * Makes a POST request to the Clerk Backend API with a JSON body.
 * Throws if the response is not 2xx.
 */
async function clerkPost(path, body) {
  const url = `${CLERK_API_BASE}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const responseBody = await res.text()
    throw new Error(`Clerk POST ${path} failed (HTTP ${res.status}): ${responseBody}`)
  }
  return res.json()
}

// ─── User helpers ──────────────────────────────────────────────────────────────

/**
 * Searches for a Clerk user by email address.
 * Returns the user object if found, or null if they don't exist yet.
 *
 * The Clerk API returns an array of matching users when queried by email.
 * We take the first match (the email is unique on a dev instance).
 */
async function findUserByEmail(email) {
  // Clerk's /users endpoint accepts email_address as a filter.
  // We encode the email for safe URL inclusion.
  const data = await clerkGet(`/users?email_address=${encodeURIComponent(email)}&limit=1`)

  // The API returns an array directly (not wrapped in a .data property).
  const users = Array.isArray(data) ? data : (data.data ?? [])
  return users[0] ?? null
}

/**
 * Creates a Clerk user if they don't already exist (idempotent).
 *
 * For E2E test users we:
 *   - Use the +clerk_test email suffix so Clerk knows these are test accounts.
 *   - Set skip_password_checks / skip_password_requirement so we don't need
 *     to manage passwords. The @clerk/testing sign-in flow uses email codes
 *     with the fixed test code "424242" (only works on dev instances).
 *
 * Returns the existing OR newly-created user object.
 */
async function ensureUser({ email, firstName, lastName }) {
  // Check if user already exists before trying to create.
  const existing = await findUserByEmail(email)

  if (existing) {
    console.log(`    ✓ already exists: ${email}  (clerk id: ${existing.id})`)
    return existing
  }

  // User does not exist yet — create them.
  const created = await clerkPost('/users', {
    email_address: [email],  // Clerk expects an array of email addresses
    first_name: firstName,
    last_name: lastName,

    // skip_password_checks: true allows user creation without a password.
    // On a dev Clerk instance, test emails (with +clerk_test) use OTP code 424242.
    // The @clerk/testing library auto-submits this code during clerk.signIn().
    skip_password_checks: true,
    skip_password_requirement: true,
  })

  console.log(`    ✅ created: ${email}  (clerk id: ${created.id})`)
  return created
}

// ─── Organisation helpers ──────────────────────────────────────────────────────

/**
 * Searches for a Clerk organisation by exact name.
 * Returns the org object if found, or null if not found.
 *
 * The Clerk API has a ?query= search that returns orgs whose name contains the
 * query string. We then filter for an exact name match to avoid false positives
 * (e.g. "ORG-A" matching "ORG-AB").
 */
async function findOrgByName(name) {
  const data = await clerkGet(`/organizations?query=${encodeURIComponent(name)}&limit=20`)

  // The organizations endpoint wraps results in a .data array.
  const orgs = data.data ?? (Array.isArray(data) ? data : [])

  // Exact name match only — the ?query= search is a prefix/contains search.
  return orgs.find((org) => org.name === name) ?? null
}

/**
 * Creates a Clerk organisation if it doesn't already exist (idempotent).
 *
 * The creator (createdByUserId) is automatically added as org:admin by Clerk.
 * We still call ensureMembership() for them to be safe (idempotent).
 *
 * Returns the existing OR newly-created org object.
 */
async function ensureOrg({ name, createdByUserId }) {
  const existing = await findOrgByName(name)

  if (existing) {
    console.log(`    ✓ already exists: ${name}  (clerk id: ${existing.id})`)
    return existing
  }

  const created = await clerkPost('/organizations', {
    name,
    created_by: createdByUserId,  // Clerk auto-adds this user as org:admin
  })

  console.log(`    ✅ created: ${name}  (clerk id: ${created.id})`)
  return created
}

// ─── Membership helpers ────────────────────────────────────────────────────────

/**
 * Adds a user to an organisation with the given role, or updates their role
 * if they are already a member with a different role. Fully idempotent.
 *
 * Clerk organisation roles:
 *   org:admin  → normaliseRole → "owner" in the app
 *   org:member → normaliseRole → "member" in the app
 *   viewer     → normaliseRole → "viewer" in the app
 *   org:viewer → normaliseRole → "viewer" in the app
 *
 * The "viewer" role requires a CUSTOM Clerk org role created in the dashboard.
 *   Clerk Dashboard → Organizations → Roles → New role → key: "viewer"
 *   (or key: "org:viewer" — the app handles both via normaliseRole)
 */
async function ensureMembership({ orgId, orgName, userId, userEmail, role }) {
  // Fetch the current member list for this org (up to 100 — more than enough for tests).
  const data = await clerkGet(`/organizations/${orgId}/memberships?limit=100`)
  const members = data.data ?? (Array.isArray(data) ? data : [])

  // Check if this user is already a member.
  const existing = members.find((m) => {
    // The membership object contains public_user_data.user_id for the user's Clerk ID.
    return m.public_user_data?.user_id === userId
  })

  if (existing) {
    // Member already exists. If the role matches what we want, nothing to do.
    if (existing.role === role) {
      console.log(`    ✓ already member: ${userEmail} in ${orgName} (role: ${existing.role})`)
      return existing
    }

    // Role differs from what we want — update it so re-running the script
    // picks up role changes (e.g. upgrading viewer-a from org:member to viewer).
    console.log(`    ↻ updating role: ${userEmail} in ${orgName} (${existing.role} → ${role})`)
    return await updateMembershipRole({ orgId, userId, userEmail, orgName, role })
  }

  // Not yet a member — add them with the requested role.
  const created = await clerkPost(`/organizations/${orgId}/memberships`, {
    user_id: userId,
    role: role,  // e.g. "org:admin", "viewer"
  })

  console.log(`    ✅ added member: ${userEmail} → ${orgName} (role: ${role})`)
  return created
}

/**
 * Updates an existing organisation membership to a new role via Clerk's PATCH endpoint.
 * Called by ensureMembership when the stored role differs from the requested role.
 */
async function updateMembershipRole({ orgId, userId, userEmail, orgName, role }) {
  const url = `${CLERK_API_BASE}/organizations/${orgId}/memberships/${userId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clerk PATCH membership failed (HTTP ${res.status}): ${body}`)
  }
  const updated = await res.json()
  console.log(`    ✅ role updated: ${userEmail} in ${orgName} → ${role}`)
  return updated
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧  Provisioning Clerk test users for the E2E auth suite')
  console.log('─'.repeat(60))
  console.log(`  Clerk instance key: ${CLERK_SECRET_KEY.slice(0, 18)}...`)
  console.log()

  // ── Step 1: Users ─────────────────────────────────────────────────────────
  // Create the three test accounts. The +clerk_test suffix tells Clerk these
  // are automated-test accounts eligible for the fixed OTP code 424242.

  console.log('Step 1 — Users')
  const ownerA = await ensureUser({
    email: 'owner-a+clerk_test@example.com',
    firstName: 'Owner',
    lastName: 'Alpha',
  })
  const viewerA = await ensureUser({
    email: 'viewer-a+clerk_test@example.com',
    firstName: 'Viewer',
    lastName: 'Alpha',
  })
  const ownerB = await ensureUser({
    email: 'owner-b+clerk_test@example.com',
    firstName: 'Owner',
    lastName: 'Beta',
  })
  // Pro-2.1 — a portfolio Manager. Gets their OWN org (ORG-M) so requireCtx()
  // resolves on sign-in (the app has no null-org path). The is_manager flag is
  // flipped in the DB by auth.setup.ts AFTER JIT sync — Clerk has no such field.
  const managerA = await ensureUser({
    email: 'manager-a+clerk_test@example.com',
    firstName: 'Manager',
    lastName: 'Alpha',
  })
  console.log()

  // ── Step 2: Organisations ─────────────────────────────────────────────────
  // Create two isolated tenant orgs. ownerA creates ORG-A, ownerB creates ORG-B.
  // Clerk automatically adds the creator as org:admin — we still call
  // ensureMembership() for them in step 3 (it becomes a no-op if already added).

  console.log('Step 2 — Organisations')
  const orgA = await ensureOrg({ name: 'ORG-A', createdByUserId: ownerA.id })
  const orgB = await ensureOrg({ name: 'ORG-B', createdByUserId: ownerB.id })
  // The manager's own home org. Clerk auto-adds managerA as org:admin.
  const orgM = await ensureOrg({ name: 'ORG-M', createdByUserId: managerA.id })
  console.log()

  // ── Step 3: Memberships ───────────────────────────────────────────────────
  // Set up who belongs to which org and at what role.
  //
  // Role notes (see lib/services/identity-sync.ts → normaliseRole):
  //   org:admin  → "owner"   in app
  //   org:member → "member"  in app
  //   "viewer"   → "viewer"  in app  (needs custom Clerk role — see NOTE above)
  //
  // IDOR boundary: viewer-a and owner-a both belong to ORG-A.
  //                owner-b belongs ONLY to ORG-B.
  //                Tests will verify owner-b cannot touch ORG-A data.

  console.log('Step 3 — Memberships')
  await ensureMembership({
    orgId: orgA.id,
    orgName: 'ORG-A',
    userId: ownerA.id,
    userEmail: 'owner-a+clerk_test@example.com',
    role: 'org:admin',   // → "owner" in app
  })
  await ensureMembership({
    orgId: orgA.id,
    orgName: 'ORG-A',
    userId: viewerA.id,
    userEmail: 'viewer-a+clerk_test@example.com',
    // "org:viewer" is the Clerk API key for the custom "Viewer" role.
    // Clerk automatically prepends "org:" to all custom role keys in the dashboard,
    // so a role created with key "viewer" is stored and returned as "org:viewer".
    // normaliseRole("org:viewer") → "viewer" in the app (lib/services/identity-sync.ts).
    role: 'org:viewer',
  })
  await ensureMembership({
    orgId: orgB.id,
    orgName: 'ORG-B',
    userId: ownerB.id,
    userEmail: 'owner-b+clerk_test@example.com',
    role: 'org:admin',   // → "owner" in app
  })
  await ensureMembership({
    orgId: orgM.id,
    orgName: 'ORG-M',
    userId: managerA.id,
    userEmail: 'manager-a+clerk_test@example.com',
    role: 'org:admin',   // → "owner" of their own org; is_manager flag set in DB later
  })
  console.log()

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('─'.repeat(60))
  console.log('✅  Provisioning complete\n')

  console.log('  Layout:')
  console.log(`    ORG-A (Clerk: ${orgA.id})`)
  console.log('      • owner-a+clerk_test@example.com  — org:admin  → "owner"')
  console.log('      • viewer-a+clerk_test@example.com — viewer     → "viewer"')
  console.log()
  console.log(`    ORG-B (Clerk: ${orgB.id})`)
  console.log('      • owner-b+clerk_test@example.com  — org:admin  → "owner"')
  console.log()

  console.log('  DB rows:')
  console.log('    NOT created here — the app\'s JIT sync (lib/auth/ctx.ts →')
  console.log('    requireCtx) creates them automatically on first sign-in.')
  console.log('    Trigger JIT by running the auth-setup Playwright project next.')
  console.log()

  // ── Step 4: Write Clerk org IDs to a fixture file ────────────────────────
  // The app's JIT sync (lib/auth/ctx.ts) stores the Clerk org ID as the org's
  // name placeholder (no webhook = no real name). Tests cannot look up orgs by
  // the human-readable name "ORG-A" — they must query by clerk_org_id instead.
  // This file gives role-idor.spec.ts the Clerk IDs it needs without hardcoding
  // them or calling the Clerk API again at test runtime.

  const fixtureDir = resolve(process.cwd(), 'playwright/.clerk')
  mkdirSync(fixtureDir, { recursive: true })

  const fixtureData = {
    // Clerk org IDs — use these to look up internal ORG-XXXX IDs via:
    //   SELECT id FROM organizations WHERE clerk_org_id = $1
    orgAClerkId: orgA.id,
    orgBClerkId: orgB.id,
    orgMClerkId: orgM.id,   // the manager's home org (Pro-2.1)
  }

  writeFileSync(
    resolve(fixtureDir, 'test-org-ids.json'),
    JSON.stringify(fixtureData, null, 2),
  )

  console.log(`  Fixture written → playwright/.clerk/test-org-ids.json`)
  console.log()

  console.log('  Next steps:')
  console.log('    1. Fill in .env.e2e-auth if not already done')
  console.log('    2. Start the auth server:')
  console.log('         npm run dev:e2e-auth')
  console.log('    3. Run auth setup (sign in + save sessions):')
  console.log('         PLAYWRIGHT_AUTH=1 npx playwright test --project auth-setup')
  console.log('    4. Run the smoke test:')
  console.log('         PLAYWRIGHT_AUTH=1 npx playwright test --project auth')
  console.log()
}

// Run and surface any unhandled errors with a clean exit code.
main().catch((err) => {
  console.error('\n❌  Provisioning failed:', err.message)
  if (err.message.includes('401') || err.message.includes('403')) {
    console.error('    Hint: check that CLERK_SECRET_KEY in .env.e2e-auth is correct.')
  }
  process.exit(1)
})
