---
name: verify-webapp
description: "Drive the Valgate webapp the way a user does and prove behavior with evidence. Use before claiming a webapp round works, when asked to verify UI behavior, or when a map feature needs exercising (pstack create-verification-skill output, house location per AGENTS.md docs/agents convention)."
---

# Verify Valgate webapp

Prove user-facing behavior on the real app. The repo's Playwright suite IS the
harness; this skill tells an agent how to launch, drive, and produce evidence
the same way every round.

## Launch
`npm run dev:e2e` (repo root) — DEMO_MODE=true, DEMO_ALLOW_WRITES=true, Clerk keys
blanked (publishable AND `CLERK_SECRET_KEY=` — the secret leaks from .env.local and
middleware.ts would otherwise run real-Clerk and bounce users to /login), port
**3001**. Ready = `curl -s -o /dev/null -w '%{http_code}'
http://localhost:3001` returns 200. A server may already be running on 3001
(check `lsof -i :3001`): driving a live server is fine, starting a second is not.
The Playwright global setup pings the dev DB and requires seed data (PROP-0001
and neighbors), so the dev DB must be seeded (`npm run seed:neon` when fresh).

## Doctor
One read-only check: `/` answers 200 and `npm run db:ping` passes. If either
fails, report the launcher state before attempting any proof.
If the bounce persists, your server has a Clerk secret loaded: relaunch with
`CLERK_SECRET_KEY= npm run dev:e2e` and check the sign-in-redirect disappears.

## Drive
The harness is the repo's own Playwright suite (`e2e/*.spec.ts`,
`playwright.config.ts`, workers:1 serial **by design** — specs mutate shared
seed data; never run them parallel):

- **DEMO suite (default):** `npm run test:e2e`, or one feature:
  `npx playwright test e2e/dashboard.spec.ts` — project `chromium` only;
  auth/ and preview/ specs are excluded automatically.
- **Real-Clerk suite:** `npm run test:e2e:auth` after
  `node scripts/provision-clerk-test-users.mjs`; server on 3002.
- Prefer ARIA roles/labels over coordinates. Never weaken a journey to make it
  pass; if a mapped entry point is unreachable, report the unmet precondition
  in the feature file's Gotchas instead.

## Evidence
HTML report (`npx playwright show-report`) + `e2e/test-results.json`;
screenshots on failure, trace on first retry. This project's round standard is
visual proof: for an on-demand visual, keep a failing screenshot or use a
scratch spec's `page.screenshot()`. Mutation proofs include the read-back of
stored state (specs already assert DB/UI end state).

## Cleanup
The DEMO suite's teardown removes throwaway file-based test clients (named
"E2E …"). Manual scratch-drive the same way: create only E2E-named artifacts
and never delete proof artifacts or evidence paths during cleanup.
