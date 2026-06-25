import { readdir, readFile, rm } from 'fs/promises'
import { resolve } from 'path'

// Runs ONCE after all e2e workers finish (registered as globalTeardown in
// playwright.config.ts). Its job: remove the throwaway *file-based* clients that
// specs like pro-clients K1 ("onboard a client") create during a run.
//
// Why this exists separately from the pre-run DB cleanup in global-setup.ts:
//   - global-setup deletes test ROWS from Postgres (properties, professionals,
//     work orders) by their "E2E" name prefix.
//   - Clients are NOT in Postgres yet — they persist as JSON files under
//     public/data/users/demo-user/clients/<id>/core.json (the legacy file store,
//     lib/data/db/_fs.ts). A SQL DELETE can't touch them, and unlike DB rows they
//     show up as untracked files in `git status` and can be committed by accident.
//
// Safety: we ONLY delete a client dir when its core.json "name" starts with "E2E"
// — the same convention the DB cleanup relies on. Real seed clients (CLI-0001..0006)
// have human names ("Acme Holdings" etc.), so they are never matched or removed.

const CLIENTS_DIR = resolve(
  process.cwd(),
  'public/data/users/demo-user/clients',
)

export default async function globalTeardown(): Promise<void> {
  let entries: string[]
  try {
    // { withFileTypes: false } → just the dir/file names inside the clients folder.
    entries = await readdir(CLIENTS_DIR)
  } catch (err) {
    // Folder may not exist on a fresh checkout, or perms could fail. Either way
    // there is nothing to clean — log and return rather than failing the run.
    console.log(`✓ E2E teardown — no clients dir to scan (${(err as Error).message})`)
    return
  }

  let removed = 0

  for (const entry of entries) {
    const corePath = resolve(CLIENTS_DIR, entry, 'core.json')

    let name: string
    try {
      const raw = await readFile(corePath, 'utf8')
      name = (JSON.parse(raw) as { name?: string }).name ?? ''
    } catch {
      // Not a client dir (no core.json) or malformed JSON — skip it, never delete
      // something we can't positively identify as an E2E test client.
      continue
    }

    // The only discriminator between test data and real seed is the "E2E" prefix.
    if (name.startsWith('E2E')) {
      try {
        await rm(resolve(CLIENTS_DIR, entry), { recursive: true, force: true })
        removed += 1
      } catch (err) {
        // Don't fail the whole run if one dir can't be removed — just report it.
        console.log(`  ⚠ E2E teardown — could not remove ${entry}: ${(err as Error).message}`)
      }
    }
  }

  console.log(`✓ E2E teardown — removed ${removed} throwaway test client(s)`)
}
