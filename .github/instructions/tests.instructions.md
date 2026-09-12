---
applyTo: "test/**,tests/**,e2e/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
---

# Tests

Read `AGENTS.md` → Commands for verified vs omitted test commands.

- **Unit (`npm test`):** Vitest, no database — this is the CI blocking gate.
- **DB (`npm run test:db`):** requires `DATABASE_URL`; not a default agent command.
- **E2E (`npm run test:e2e`):** Playwright; CI E2E job is `continue-on-error` until Clerk test users exist (TM1-62).
- Capture screenshot baselines against production builds (`next build && next start`), not `next dev`.
- Prefer accessibility-tree selectors over vision-based clicking in Playwright.
