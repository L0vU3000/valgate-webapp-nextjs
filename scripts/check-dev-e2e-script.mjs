import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';

const PKG_PATH = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const script = pkg.scripts['dev:e2e'];

if (!script) {
  console.error('Error: scripts.dev:e2e not found in package.json');
  process.exit(1);
}

console.log('Verifying dev:e2e script semantics...');

try {
  // Required Semantics
  assert(script.includes('DEMO_MODE=true'), 'Missing DEMO_MODE=true');
  assert(script.includes('DEMO_ALLOW_WRITES=true'), 'Missing DEMO_ALLOW_WRITES=true');
  assert(script.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='), 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=');
  // Ensure publishable key is actually empty (followed by space or end of string)
  assert(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(?=\s|$)/.test(script), 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be empty');
  assert(script.includes('next dev --turbopack -H 0.0.0.0 -p 3001'), 'Missing correct next dev command');

  // Prohibited Content
  assert(!script.includes('CLERK_SECRET_KEY'), 'Prohibited: CLERK_SECRET_KEY assignment found');
  assert(!script.includes('SITE_PASSWORD'), 'Prohibited: SITE_PASSWORD assignment found');
  assert(!/sk_[a-zA-Z0-9_]+/.test(script), 'Prohibited: Secret key (sk_...) string found');

  console.log('✓ dev:e2e script passes static verification');
} catch (e) {
  console.error(`✗ Verification failed: ${e.message}`);
  process.exit(1);
}
