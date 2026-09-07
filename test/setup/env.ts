import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local before any test module is evaluated.
//
// Why this must be a setupFile (not a top-level import in each test):
// lib/db/client.ts creates the Neon Pool at module-init time using env.DATABASE_URL.
// Vitest's setupFiles run before test-file modules are loaded, so DATABASE_URL is
// already in process.env when the Pool constructor fires.
config({ path: resolve(process.cwd(), '.env.local') })

// CI has no .env.local, and lib/env.ts (t3-env) validates at IMPORT time — so any test
// file that transitively imports it dies before a single test body runs. Only two vars
// are non-optional, so fill just those with inert placeholders when absent; real values
// from .env.local always win.
//
// This is safe because the default suite never connects to anything: live-DB tests are
// `*.db.test.ts`, excluded here and run under vitest.config.db.ts, which loads .env.local
// itself and skips entirely without a real DATABASE_URL. A placeholder here cannot make
// a live-DB test silently pass against a fake database.
//
// `||=` not `??=`: t3-env sets emptyStringAsUndefined, so an empty-string var must be
// treated as absent here too, or validation still fails.
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||= 'test-mapbox-token'
