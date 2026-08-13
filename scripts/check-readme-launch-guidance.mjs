import fs from 'node:fs';
import path from 'node:path';

const README_PATH = path.join(process.cwd(), 'README.md');

const REQUIRED_PATTERNS = [
  /# Valgate/,
  /## Local Development/,
  /http:\/\/localhost:3001/,
  /npm run build/,
  /npm run test/,
  /npm run lint/,
  /NEXT_PUBLIC_APP_URL/,
  /npm run db:ping/,
  /npm run db:migrate/,
  /Do not run seed\/reset in production/,
  /MCP_ALLOW_ANY_OAUTH_CLIENT.*must not be set/,
  /consumer-release posture/,
  /docs\/migration\/PROD-DEPLOY-CHECKLIST\.md/,
  /rotate.*production database password/,
  /explicit approval/,
  /redeploy known-good release/,
  /DB recovery action only with owner approval/,
  /MCP backend deferred/,
  /Settings UI is hidden/,
  /OAuth allowlisting\/consent\/privacy\/security review/,
];

const FORBIDDEN_PATTERNS = [
  /encryption-first/,
  /sovereign data/,
  /encrypted asset management/,
];

function checkReadme() {
  console.log(`Checking ${README_PATH}...`);
  if (!fs.existsSync(README_PATH)) {
    console.error('README.md not found');
    process.exit(1);
  }

  const content = fs.readFileSync(README_PATH, 'utf8');
  const missing = REQUIRED_PATTERNS.filter(pattern => !pattern.test(content));
  const forbidden = FORBIDDEN_PATTERNS.filter(pattern => pattern.test(content));

  if (missing.length > 0 || forbidden.length > 0) {
    if (missing.length > 0) {
      console.error('❌ README.md is missing critical launch guidance:');
      missing.forEach(pattern => console.error(`  - Missing: ${pattern.toString()}`));
    }
    if (forbidden.length > 0) {
      console.error('❌ README.md contains forbidden/inaccurate claims:');
      forbidden.forEach(pattern => console.error(`  - Forbidden: ${pattern.toString()}`));
    }
    process.exit(1);
  }

  console.log('✅ README.md contains all required launch guidance and no forbidden claims.');
}

checkReadme();
