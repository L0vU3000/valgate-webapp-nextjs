/**
 * e2e/helpers/db-auth.ts
 *
 * Database helpers for the auth test suite (e2e/auth/ project).
 *
 * Unlike e2e/helpers/db.ts — which is permanently scoped to the demo org
 * ORG-0001 — these helpers work with dynamically-looked-up org and user IDs.
 * That lets IDOR tests seed and query rows in ORG-A and ORG-B specifically,
 * using whichever internal IDs Neon assigned when auth.setup.ts triggered
 * the JIT sync.
 *
 * DATABASE CONNECTION:
 *   DATABASE_URL is loaded from .env.local (same Neon dev database as the demo
 *   suite). .env.e2e-auth only contains Clerk keys and does not override
 *   DATABASE_URL, so the .env.local value is always the one used here.
 *
 * CJS REQUIRE WORKAROUND:
 *   Same as db.ts: pg has conditional exports that crash Playwright's worker
 *   ESM loader on a static `import { Pool } from 'pg'` (Node 22 + PW 1.61:
 *   "context.conditions?.includes is not a function"). We load pg lazily via
 *   CJS require so the ESM resolve hook never touches it.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createRequire } from 'node:module'

// CJS require anchored to the project root — same workaround as db.ts.
const projectRequire = createRequire(resolve(process.cwd(), 'package.json'))

// Load DATABASE_URL from .env.local first.
// .env.e2e-auth is loaded second but only contains Clerk keys — it does not
// define DATABASE_URL, so the .env.local value is never overwritten.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e-auth'), override: true })

// ── Connection pool ───────────────────────────────────────────────────────────

// Lazy-initialised pool so the module can be imported without immediately
// opening a connection (useful in environments where DATABASE_URL is not set).
let _pool: any = null

function pool(): any {
  if (_pool) return _pool
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL not set.\n' +
      '  Check that .env.local contains a valid DATABASE_URL pointing at the Neon dev branch.',
    )
  }
  const { Pool } = projectRequire('pg')
  _pool = new Pool({ connectionString: url })
  return _pool
}

// Thin typed query wrapper — mirrors the pattern in db.ts.
async function q<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { rows } = await pool().query<T>(sql, params)
  return rows
}

// Allocates the next ID from the shared id_counters table.
// e.g. nextId('PROP') → 'PROP-0042' (the value before the counter was bumped).
async function nextId(collection: string): Promise<string> {
  const rows = await q<{ next: string }>(
    `UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next`,
    [collection],
  )
  const next = Number(rows[0]?.next)
  if (!next) {
    throw new Error(`nextId: unknown collection "${collection}" — is the id_counters table seeded?`)
  }
  // next was incremented before we read it, so the allocated ID is (next - 1).
  return `${collection}-${String(next - 1).padStart(4, '0')}`
}

// ── Org and user lookup ───────────────────────────────────────────────────────

/**
 * The result of looking up an organisation by name.
 * Both IDs are needed: internalId for seeding DB rows, clerkOrgId for API calls.
 */
export type OrgLookup = {
  // Internal database PK, e.g. "ORG-0042"
  internalId: string
  // Clerk's organisation ID, e.g. "org_abc123xyz"
  clerkOrgId: string
}

/**
 * Looks up an organisation row by its Clerk org ID.
 *
 * Why clerk_org_id and not name:
 *   The app's JIT sync (lib/auth/ctx.ts line 42) writes the Clerk org ID as the
 *   name placeholder — "ponytail: org name = Clerk id as placeholder; webhook fills
 *   in real name/slug". Since E2E tests run without a webhook, the name column
 *   always contains the Clerk org ID, never "ORG-A" or "ORG-B".
 *   The provision script writes the Clerk org IDs to playwright/.clerk/test-org-ids.json
 *   so callers don't need to hardcode them.
 *
 * Throws a descriptive error if the row is missing — almost always means
 * auth.setup.ts has not been run (so JIT sync never created the row).
 */
export async function lookupOrgByClerkId(clerkOrgId: string): Promise<OrgLookup> {
  const rows = await q<{ id: string; clerk_org_id: string }>(
    `SELECT id, clerk_org_id FROM organizations WHERE clerk_org_id = $1 LIMIT 1`,
    [clerkOrgId],
  )

  if (!rows[0]) {
    throw new Error(
      `lookupOrgByClerkId: org "${clerkOrgId}" not found in the database.\n` +
      `  Ensure the auth setup has run:\n` +
      `    1. node scripts/provision-clerk-test-users.mjs\n` +
      `    2. npm run test:e2e:auth  (runs auth-setup → JIT sync → saves sessions)\n`,
    )
  }

  return { internalId: rows[0].id, clerkOrgId: rows[0].clerk_org_id }
}

/**
 * Looks up the internal user ID for the first active "owner" in the given org,
 * identified by its Clerk org ID.
 *
 * We need the internal user ID when seeding throwaway properties, because every
 * property row has a NOT-NULL user_id foreign key.
 *
 * Joins by clerk_org_id for the same reason as lookupOrgByClerkId — the org name
 * column holds the Clerk ID placeholder, not a human-readable name.
 *
 * Throws if no owner is found — almost always means auth.setup.ts has not run.
 */
export async function lookupOwnerUserIdByClerkOrgId(clerkOrgId: string): Promise<string> {
  const rows = await q<{ user_id: string }>(
    `SELECT m.user_id
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.org_id
      WHERE o.clerk_org_id = $1
        AND m.role          = 'owner'
        AND m.status        = 'active'
      LIMIT 1`,
    [clerkOrgId],
  )

  if (!rows[0]) {
    throw new Error(
      `lookupOwnerUserIdByClerkOrgId: no active owner found for Clerk org "${clerkOrgId}".\n` +
      `  Ensure auth.setup.ts ran so JIT sync created the organization_memberships row.`,
    )
  }

  return rows[0].user_id
}

/**
 * Marks a user as a portfolio Manager (users.is_manager = true), identified by
 * their primary email — which JIT sync sets to the Clerk email address.
 *
 * Pro-2.1 routing flag. auth.setup.ts calls this AFTER the manager has signed in
 * (so JIT sync already created the user row); the next page load then redirects
 * them to /pro/dashboard.
 *
 * Idempotent — running it twice is a harmless no-op. Throws if the user row is
 * missing (almost always means the manager was never signed in / JIT'd).
 */
export async function setManagerFlag(email: string): Promise<void> {
  const rows = await q<{ id: string }>(
    `UPDATE users SET is_manager = true, updated_at = now() WHERE primary_email = $1 RETURNING id`,
    [email],
  )

  if (!rows[0]) {
    throw new Error(
      `setManagerFlag: no user row for "${email}".\n` +
      `  Ensure auth.setup.ts signed this user in (JIT sync) before flagging them as a manager.`,
    )
  }
}

// ── Throwaway property creation ───────────────────────────────────────────────

/**
 * The IDs and name returned after seeding a throwaway property.
 * Pass the whole object to cleanup() in afterAll.
 */
export type AuthThrowawayIds = {
  // Internal database PK, e.g. "PROP-0099"
  propertyId: string
  // The exact name written to the DB — used in test assertions for presence/absence.
  name: string
}

/**
 * Seeds one throwaway property scoped to a specific org and user.
 *
 * Strategy: clone the demo seed row PROP-0001 so every NOT-NULL, enum, and
 * numeric-shadow column is satisfied without hand-listing the full schema.
 * This is the same pattern used by createThrowawayProperty() in db.ts.
 *
 * The seeded property is useful as:
 *   • A role-test target: viewer-a (in ORG-A) can navigate to it but the Delete
 *     control should be absent from the portfolio row menu.
 *   • An IDOR test target: owner-b (only in ORG-B) must be blocked from viewing
 *     it when it belongs to ORG-A.
 *
 * IMPORTANT: call cleanup() in afterAll — this function does NOT clean up after itself.
 */
export async function createThrowawayPropertyInOrg(
  orgId: string,
  userId: string,
): Promise<AuthThrowawayIds> {
  // Allocate the next PROP ID from the shared counter.
  const propId = await nextId('PROP')

  // A recognisable, deterministic name so tests can assert presence/absence by text.
  const name = `E2E-${propId}`

  // Clone the demo seed row to satisfy all schema columns automatically.
  const seedRows = await q<Record<string, any>>(
    `SELECT * FROM properties WHERE id = 'PROP-0001' LIMIT 1`,
  )
  const seed = seedRows[0]
  if (!seed) {
    throw new Error(
      'createThrowawayPropertyInOrg: seed row PROP-0001 not found.\n' +
      '  Run `npm run seed:neon` to populate the dev database.',
    )
  }

  // Override the columns that must differ from the seed row.
  seed.id      = propId
  seed.org_id  = orgId
  seed.user_id = userId
  seed.name    = name
  seed.code    = `E2E${propId.slice(-4)}`
  seed.status  = 'Vacant'

  // Clear columns that must not carry over from the seed row.
  if ('archived_at' in seed) seed.archived_at = null
  if ('client_id' in seed)   seed.client_id   = null

  // Build a parameterised INSERT from the cloned row's column list.
  const cols = Object.keys(seed)
  await q(
    `INSERT INTO properties (${cols.map((c) => `"${c}"`).join(', ')})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    cols.map((c) => seed[c]),
  )

  return { propertyId: propId, name }
}

/**
 * Seeds one throwaway document attached to an existing property.
 *
 * Used by the P-ROLE document test: a viewer must be able to SEE a document
 * (so the page isn't empty — which would give a false-green absence check) but
 * must NOT see any delete control for it.
 *
 * Inserts only the NOT-NULL columns the schema requires (id, org_id, user_id,
 * property_id, name, kind, storage_id, uploaded_at); everything else is nullable.
 * storage_id points at no real blob — fine, the test never downloads the file.
 *
 * No separate cleanup needed: documents.property_id has ON DELETE CASCADE, so
 * cleanup() removing the parent property also removes this row.
 */
export async function createThrowawayDocumentInProperty(args: {
  orgId: string
  userId: string
  propertyId: string
}): Promise<{ documentId: string; name: string }> {
  // Deterministic, recognisable values so the test can assert presence by text.
  const documentId = `E2EDOC-${args.propertyId}`
  const name = `E2E-${args.propertyId}-file.pdf`
  await q(
    `INSERT INTO documents
       (id, org_id, user_id, property_id, name, kind, storage_id, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, 'document', 'e2e-test-storage', now())`,
    [documentId, args.orgId, args.userId, args.propertyId, name],
  )
  return { documentId, name }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

/**
 * Deletes throwaway properties by ID.
 *
 * The database CASCADE constraint removes all child rows automatically
 * (leases, payments, documents, co_owners, safety_risks, etc.), so there
 * is no need to delete sub-entities separately.
 *
 * Accepts undefined entries so callers can pass a variable that may not
 * have been populated (e.g. if beforeAll threw before creating the second property).
 */
export async function cleanup(...entries: (AuthThrowawayIds | undefined)[]): Promise<void> {
  for (const entry of entries) {
    if (!entry) continue
    await q('DELETE FROM properties WHERE id = $1', [entry.propertyId])
  }
}
