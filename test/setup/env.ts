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

// --- third-party credentials are neutralised for the DEFAULT suite -----------
//
// A developer's .env.local carries REAL Upstash/S3/Resend keys (as it must, to run the
// app). Loading them here quietly broke the invariant stated above — "the default suite
// never connects to anything" — and turned unit tests into network calls:
//
//   * lib/ratelimit.ts picks in-memory vs Upstash at IMPORT time from env.UPSTASH_*, so
//     limiter tests silently hit live Redis: shared budget across tests, real latency,
//     and failures like `Too many requests` instead of the assertion under test.
//   * uploadDraftFileAction's test then ate the LIVE actionLimiter budget (30/min) before
//     it could reach the S3 branch it was written to assert.
//
// Setting these to "" makes lib/env.ts (emptyStringAsUndefined) treat them as unset, which
// is exactly the CI condition these tests are written against. They run BEFORE test-module
// imports, so the import-time branch is correct too.
//
// Safe because nothing in the default suite legitimately needs them: lib/services/storage.ts
// throws `Storage not configured` on a missing key and its test mocks the module anyway.
// Live-service tests are *.db.test.ts under vitest.config.db.ts, which does NOT use this
// setup file and loads .env.local itself.
for (const k of [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY',
  'STORAGE_BUCKET',
  'RESEND_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  process.env[k] = ''
}
