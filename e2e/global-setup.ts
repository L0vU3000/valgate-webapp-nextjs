import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

// Load .env.local first (DATABASE_URL), then .env.e2e to override DEMO_MODE etc.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e'), override: true })

export default async function globalSetup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL not set.\n' +
      'Copy it from .env.local into .env.e2e (DATABASE_URL=...) and retry.'
    )
  }

  const pool = new Pool({ connectionString: dbUrl })

  try {
    // 1. Ping
    const { rows: pingRows } = await pool.query<{ ok: number }>('SELECT 1 AS ok')
    if (pingRows[0]?.ok !== 1) throw new Error('DB ping returned unexpected result')

    // 2. Confirm migrations applied (0005 statuses, 0006 activities, 0007 cascade FKs)
    const { rows: tableRows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('activities', 'safety_risks', 'id_counters')`,
    )
    const tables = tableRows.map((r) => r.table_name)
    const missing = ['activities', 'safety_risks', 'id_counters'].filter((t) => !tables.includes(t))
    if (missing.length) {
      throw new Error(`Missing tables: ${missing.join(', ')} — run: npm run db:migrate`)
    }

    // 3. Confirm seed data present (never seed:reset — additive only)
    const { rows: seedRows } = await pool.query<{ id: string }>(
      "SELECT id FROM properties WHERE id = 'PROP-0001' LIMIT 1",
    )
    if (seedRows.length === 0) {
      throw new Error(
        'Seed data missing — run: npm run seed:neon\n' +
        'NEVER run seed:reset (destroys evolved seed data).'
      )
    }

    // 4. Reset accumulated E2E test rows so each run starts clean. Several specs create
    //    named entities they cannot reliably clean up themselves (work orders live in
    //    maintenance_items; throwaway cleanup can be skipped if a test crashes). Left to
    //    pile up, these slow data-heavy pages and trip strict-mode locators. All test rows
    //    use an "E2E" name/title prefix, so this only ever removes test data — never seed.
    const props = await pool.query("DELETE FROM properties WHERE name LIKE 'E2E%'")
    const profs = await pool.query("DELETE FROM professionals WHERE name LIKE 'E2E%'")
    const wos = await pool.query("DELETE FROM maintenance_items WHERE title LIKE 'E2E%'")
    console.log(
      `✓ E2E pre-run cleanup — removed ${props.rowCount} properties, ` +
      `${profs.rowCount} professionals, ${wos.rowCount} work orders`,
    )
  } finally {
    await pool.end()
  }

  console.log('✓ E2E harness ready — DB reachable, migrations applied, seed present')
}
