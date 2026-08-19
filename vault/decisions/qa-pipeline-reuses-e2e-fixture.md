---
title: Decision — QA pipeline reuses the e2e browser fixture
type: decision
status: accepted
source: agent-loop QA run 2026-07-15-160345
tags: [decision, qa, playwright, clerk, agent-loop]
added: 2026-07-15
---

## Decision

Browser QA uses the same client setup as `e2e/fixtures.ts`: it blocks only Clerk's hosted
development script, marks the page with `window.__E2E__`, and injects the fixture's overlay
CSS. QA records that blocked request as test-rig noise and continues to fail on product
console or network errors.

## Why

The DEMO server bypasses authentication, but Clerk's development client can still render
setup overlays that cover the app and intercept clicks. A generic browser session therefore
tests a Clerk configuration screen instead of Valgate. Reusing the repository fixture keeps
QA and the blocking e2e suite on one explicit browser contract without creating a broad error
allowlist.

## Consequence

- DEMO QA runs on port 3001; port 3002 stays exclusive to the real-Clerk auth project.
- Both exploration and independent evaluation must start a fresh context with the fixture.
- The exact blocked Clerk request is reported separately; ordinary failures cannot be
  filtered away.
- A clean exploration still receives an independent evaluation pass.

## Revisit if

DEMO mode stops mounting Clerk's browser SDK. Remove the workaround from both
`e2e/fixtures.ts` and the QA pipeline in the same change.

## Links

- [[agent-loop-system]] · [[runbook]] · [[gotchas]]
