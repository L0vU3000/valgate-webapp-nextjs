import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = '/home/hermes/development/projects/valgate-webapp-nextjs-encryption';
const CONFIG_PATH = path.join(REPO_ROOT, 'vitest.config.ts');
const DB_CONFIG_PATH = path.join(REPO_ROOT, 'vitest.config.db.ts');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('Checking Vitest Suite Boundaries...');

const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
const dbConfigContent = fs.readFileSync(DB_CONFIG_PATH, 'utf8');

// Check default config exclusions
const excludeBlock = configContent.match(/exclude: \[([\s\S]*?)\]/);
if (!excludeBlock) {
  console.error('❌ Could not find exclude block in vitest.config.ts');
  process.exit(1);
}
const excludes = excludeBlock[1];

assert(excludes.includes('"e2e/**"'), 'Default config excludes "e2e/**"');
assert(excludes.includes('"**/*.db.test.ts"'), 'Default config excludes "**/*.db.test.ts"');
assert(excludes.includes('"**/.worktrees/**"'), 'Default config excludes "**/.worktrees/**"');

// Check DB config inclusions
const includeBlock = dbConfigContent.match(/include: ([\s\S]*?)(,|$)/);
if (!includeBlock) {
  console.error('❌ Could not find include block in vitest.config.db.ts');
  process.exit(1);
}
const includes = includeBlock[1];
assert(includes.includes('"**/*.db.test.ts"'), 'DB config includes "**/*.db.test.ts"');

console.log('\nAll boundary checks passed!');
