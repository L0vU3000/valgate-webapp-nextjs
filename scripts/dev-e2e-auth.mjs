/**
 * scripts/dev-e2e-auth.mjs
 *
 * Starts the Next.js dev server on port 3002 with real Clerk keys loaded
 * from .env.e2e-auth. This exists because `node --env-file=.env.e2e-auth`
 * is not reliable here:
 *
 *   Problem: Node's --env-file skips vars already in the environment, AND
 *   Next.js 15 Turbopack reads .env.local from disk when bundling middleware.
 *   The middleware.ts `hasClerk` flag evaluates process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *   at module init — if Turbopack picks up .env.local's value instead of the
 *   test key, hasClerk=false → siteGateOnly runs → auth() throws.
 *
 *   Fix: use dotenv with override:true to set ALL vars in process.env BEFORE
 *   spawning Next. Next.js's own dotenv loading uses override:false, so it
 *   cannot overwrite what we set here. process.env is what Turbopack reads.
 *
 * Usage (via package.json): npm run dev:e2e-auth
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()

// Step 1: Load .env.local as the base (DATABASE_URL, MAPBOX_TOKEN, etc.)
config({ path: resolve(ROOT, '.env.local') })

// Step 2: Load .env.e2e-auth with override:true so the test keys win.
// This sets DEMO_MODE=false, CLERK_SECRET_KEY=sk_test_..., etc. in process.env.
// Next's own dotenv loading (override:false) cannot overwrite these.
config({ path: resolve(ROOT, '.env.e2e-auth'), override: true })

// Quick safety check — the file should have been filled in before running this.
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
if (!key || key === 'pk_test_REPLACE_ME') {
  console.error('\n❌  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set in .env.e2e-auth')
  console.error('    Fill in your Clerk test keys and retry.\n')
  process.exit(1)
}

console.log('✓ Env loaded — DEMO_MODE:', process.env.DEMO_MODE, '| hasClerk:', Boolean(key))
console.log('  Starting auth dev server on http://localhost:3002...\n')

// Step 3: Spawn Next.js with the merged process.env.
// We pass the current process.env (already merged above) as the child's env,
// so Next receives the correct values immediately on startup.
const next = resolve(ROOT, 'node_modules/next/dist/bin/next')
const child = spawn(
  process.execPath,  // the same `node` binary running this script
  [next, 'dev', '--turbopack', '-H', '0.0.0.0', '-p', '3002'],
  {
    env: process.env,   // the merged env — this is what Next and Turbopack see
    stdio: 'inherit',   // forward Next's stdout/stderr to this terminal
  },
)

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('Failed to start dev server:', err.message)
  process.exit(1)
})
