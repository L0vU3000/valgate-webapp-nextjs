import { config } from 'dotenv'
import { resolve } from 'path'

// Setup for the LIVE Jev suite (vitest.config.live.ts).
//
// The mirror image of ./setup/env.ts. That file deliberately blanks every third-party credential —
// including OPENROUTER_API_KEY — so `npm test` can never make a network call. Reusing it here meant
// the key was '' before any test module loaded, every Jev decision came back null, and the failure
// looked like a broken classifier rather than a stripped credential.
//
// This suite is opt-in and never runs in CI, so the real key stays. It loads .env.local the same way
// the DB suite does for DATABASE_URL, and asserts the key is actually present so a missing key fails
// loudly instead of silently producing empty suggestions.
config({ path: resolve(process.cwd(), '.env.local') })

// lib/env.ts (t3-env) validates at import time and these two are non-optional, so a missing
// .env.local still needs inert placeholders. Real values from .env.local always win.
process.env.DATABASE_URL ||= 'postgres://test:***@localhost:5432/test'
process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||= 'test-mapbox-token'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error(
    'OPENROUTER_API_KEY is unset. Run `npm run env:sync dev` to pull it from Infisical into ' +
      '.env.local before running the live Jev suite.',
  )
}
