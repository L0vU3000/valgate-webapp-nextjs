import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local before any test module is evaluated.
//
// Why this must be a setupFile (not a top-level import in each test):
// lib/db/client.ts creates the Neon Pool at module-init time using env.DATABASE_URL.
// Vitest's setupFiles run before test-file modules are loaded, so DATABASE_URL is
// already in process.env when the Pool constructor fires.
config({ path: resolve(process.cwd(), '.env.local') })
