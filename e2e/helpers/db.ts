/**
 * E2E DB helper — raw SQL via pg Pool.
 * Creates/destroys throwaway entities scoped to ORG-0001 so tests never touch seed data.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createRequire } from 'node:module'

// pg has conditional exports that crash Playwright's worker ESM loader on a static
// `import { Pool } from 'pg'` (Node 22 + PW 1.61: "context.conditions?.includes is not a function").
// Load it lazily via CJS require from the project root so the ESM resolve hook never touches it.
const projectRequire = createRequire(resolve(process.cwd(), 'package.json'))

// Load DATABASE_URL into process.env for each Playwright worker that imports this module.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e'), override: true })

const ORG = 'ORG-0001'
const USR = 'USR-0001'

let _pool: any = null
function pool(): any {
  if (_pool) return _pool
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set — check .env.e2e or .env.local')
  const { Pool } = projectRequire('pg')
  _pool = new Pool({ connectionString: url })
  return _pool
}

async function q<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool().query<T>(sql, params)
  return rows
}

async function nextId(collection: string): Promise<string> {
  const rows = await q<{ next: string }>(
    `UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next`,
    [collection],
  )
  const next = Number(rows[0]?.next)
  if (!next) throw new Error(`nextId: unknown collection "${collection}"`)
  return `${collection}-${String(next - 1).padStart(4, '0')}`
}

// ──────────────────────────────────────────
// Throwaway entity creation
// ──────────────────────────────────────────

export type ThrowawayIds = {
  propertyId: string
  name: string
  leaseId?: string
  paymentId?: string
  documentId?: string
  folderId?: string
  coOwnerId?: string
  safetyRiskId?: string
}

export async function createThrowawayProperty(opts: {
  withLease?: boolean
  withPayment?: boolean
  withDocument?: boolean
  withFolder?: boolean
  withCoOwner?: boolean
  withSafetyRisk?: boolean
  // When set, the property is assigned to this client id (e.g. seed client "CLI-0001").
  // The Pro cockpit ("under management" register, work-order property picker) only shows
  // properties that have a client_id, so pass this to make a throwaway appear there.
  managedByClientId?: string
} = {}): Promise<ThrowawayIds> {
  const propId = await nextId('PROP')
  const name = `E2E-${propId}`

  // Clone an existing valid seed property so every NOT NULL / enum / numeric-shadow
  // column is satisfied without hand-listing the full evolving schema.
  const seedRows = await q<Record<string, any>>(
    `SELECT * FROM properties WHERE id = 'PROP-0001' LIMIT 1`,
  )
  const seed = seedRows[0]
  if (!seed) throw new Error('createThrowawayProperty: seed PROP-0001 not found — run seed:neon')
  seed.id = propId
  seed.org_id = ORG
  seed.user_id = USR
  seed.name = name
  seed.code = `E2E${propId.slice(-4)}`
  seed.status = 'Vacant'
  if ('archived_at' in seed) seed.archived_at = null
  if ('client_id' in seed) seed.client_id = opts.managedByClientId ?? null
  const cols = Object.keys(seed)
  await q(
    `INSERT INTO properties (${cols.map((c) => `"${c}"`).join(', ')})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    cols.map((c) => seed[c]),
  )

  const ids: ThrowawayIds = { propertyId: propId, name }

  if (opts.withFolder) {
    const folderId = crypto.randomUUID()
    await q(
      `INSERT INTO folders (id, org_id, user_id, property_id, name) VALUES ($1, $2, $3, $4, $5)`,
      [folderId, ORG, USR, propId, 'E2E Folder'],
    )
    ids.folderId = folderId
  }

  if (opts.withDocument) {
    const docId = crypto.randomUUID()
    await q(
      `INSERT INTO documents
         (id, org_id, user_id, property_id, name, kind, mime_type, extension, size_bytes, storage_id, uploaded_by, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, 'document', 'application/pdf', 'pdf', 1024, $6, $7, NOW())`,
      [docId, ORG, USR, propId, 'e2e-test.pdf', `e2e-fake-${docId}`, USR],
    )
    ids.documentId = docId
  }

  if (opts.withLease) {
    const leaseId = await nextId('LEASE')
    await q(
      `INSERT INTO leases
         (id, org_id, user_id, property_id, unit, stage, start_date, end_date, monthly_rent, term_months)
       VALUES ($1, $2, $3, $4, '1A', 'Signed', '2025-01-01', '2025-12-31', 1000, 12)`,
      [leaseId, ORG, USR, propId],
    )
    ids.leaseId = leaseId
  }

  if (opts.withPayment) {
    const payId = await nextId('PMT')
    await q(
      `INSERT INTO payments
         (id, org_id, user_id, property_id, lease_id, date, kind, amount, method, status)
       VALUES ($1, $2, $3, $4, $5, '2025-01-15', 'Rent', 1000, 'Cash', 'Paid')`,
      [payId, ORG, USR, propId, ids.leaseId ?? null],
    )
    ids.paymentId = payId
  }

  if (opts.withCoOwner) {
    const coId = crypto.randomUUID()
    await q(
      `INSERT INTO co_owners (id, org_id, user_id, property_id, name, role, share_percent)
       VALUES ($1, $2, $3, $4, 'E2E Co-Owner', 'Minor', 25)`,
      [coId, ORG, USR, propId],
    )
    ids.coOwnerId = coId
  }

  if (opts.withSafetyRisk) {
    const riskId = crypto.randomUUID()
    await q(
      `INSERT INTO safety_risks (id, org_id, user_id, property_id, severity, title, description, status)
       VALUES ($1, $2, $3, $4, 'Low', 'E2E Test Risk', 'E2E risk description', 'Open')`,
      [riskId, ORG, USR, propId],
    )
    ids.safetyRiskId = riskId
  }

  return ids
}

// Inserts a RESOLVED safety risk against an existing property and returns its id.
//
// Why this exists: the Pro Compliance page's "Show resolved" checkbox is a native
// <input type="checkbox"> that is DISABLED whenever summary.resolvedRiskCount === 0
// (there is nothing to reveal, so the toggle never offers an empty view). That count
// is derived server-side from every safety_risk in the demo org (ORG-0001 / USR-0001),
// so without at least one risk whose status is 'Resolved' the N2 toggle test can never
// enable, click, or assert anything. This helper seeds exactly that one resolved risk.
//
// Columns/enums mirror the Open-risk insert in createThrowawayProperty({withSafetyRisk}):
//   severity ∈ ('Critical','High','Medium','Low'), title + description are NOT NULL,
//   status ∈ ('Open','Resolved'). For a resolved risk we also stamp resolved_at NOW()
//   to match how a genuinely resolved risk looks in the schema (resolved_at is nullable
//   but a real Resolve action sets it). The page reads safety_risks scoped to ORG-0001 /
//   USR-0001, so we insert with the same ORG/USR constants used everywhere else here.
export async function seedResolvedSafetyRisk(propertyId: string): Promise<string> {
  const riskId = crypto.randomUUID()
  await q(
    `INSERT INTO safety_risks (id, org_id, user_id, property_id, severity, title, description, status, resolved_at)
     VALUES ($1, $2, $3, $4, 'Low', 'E2E Resolved Risk', 'E2E resolved risk description', 'Resolved', NOW())`,
    [riskId, ORG, USR, propertyId],
  )
  return riskId
}

// Creates a payment linked to a property but NOT to a lease — to test SET NULL survival.
export async function createStandalonePayment(propertyId: string): Promise<string> {
  const payId = await nextId('PMT')
  await q(
    `INSERT INTO payments
       (id, org_id, user_id, property_id, lease_id, date, kind, amount, method, status)
     VALUES ($1, $2, $3, $4, NULL, '2025-01-15', 'Rent', 500, 'Cash', 'Paid')`,
    [payId, ORG, USR, propertyId],
  )
  return payId
}

// ──────────────────────────────────────────
// Assertions
// ──────────────────────────────────────────

export async function rowExists(table: string, id: string): Promise<boolean> {
  // ponytail: table name injected via allowlist only — no user input reaches this
  const ALLOWED = new Set(['properties', 'leases', 'payments', 'documents', 'folders', 'co_owners', 'safety_risks'])
  if (!ALLOWED.has(table)) throw new Error(`rowExists: table "${table}" not in allowlist`)
  const rows = await q(`SELECT id FROM ${table} WHERE id = $1 LIMIT 1`, [id])
  return rows.length > 0
}

export async function paymentPropertyNulled(paymentId: string): Promise<boolean> {
  const rows = await q<{ property_id: string | null }>(
    'SELECT property_id FROM payments WHERE id = $1 LIMIT 1',
    [paymentId],
  )
  return rows.length > 0 && rows[0].property_id === null
}

export async function getLastActivity(entity: string, action: string) {
  const rows = await q<{ id: string; entity: string; action: string; created_at: Date }>(
    `SELECT id, entity, action, created_at FROM activities
     WHERE org_id = $1 AND entity = $2 AND action = $3
     ORDER BY created_at DESC LIMIT 1`,
    [ORG, entity, action],
  )
  return rows[0] ?? null
}

// ──────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────

// Delete throwaway properties by ID — cascade handles all children.
export async function cleanup(...propertyIds: (string | undefined)[]): Promise<void> {
  for (const id of propertyIds) {
    if (!id) continue
    await q('DELETE FROM properties WHERE id = $1', [id])
  }
}

// Delete a payment directly (for set-null survivors that outlive their property).
export async function cleanupPayment(paymentId: string | undefined): Promise<void> {
  if (!paymentId) return
  await q('DELETE FROM payments WHERE id = $1', [paymentId])
}

// Delete a single safety risk directly by id. Risks normally cascade-delete with
// their property, but the N2 toggle test seeds a resolved risk that it wants to
// remove in its own finally block (independent of property teardown), so this gives
// it a precise, one-row cleanup.
export async function cleanupSafetyRisk(riskId: string | undefined): Promise<void> {
  if (!riskId) return
  await q('DELETE FROM safety_risks WHERE id = $1', [riskId])
}
