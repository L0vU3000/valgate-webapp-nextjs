---
title: Decision — MCP reuses lib/services via a ctxFor() seam
type: decision
status: accepted
source: agent memory (MCP server plan, connect-page shipped PR #25)
tags: [decision, mcp, architecture, services]
added: 2026-07-15
---

## Decision
The Valgate MCP server exposes tools by **reusing the existing `lib/services/*`**
(the same Drizzle data layer the web app uses), through a new **`ctxFor()`**
context seam — rather than duplicating business logic for the MCP transport.

## Why
- The web app and MCP need identical behaviour (same auth, same writes). Two
  copies would drift.
- `lib/services/*` is transport-agnostic; a `ctxFor()` factory supplies the
  per-request context (who is calling, which org) so the same service works from
  a Server Action or an MCP tool call.

## Consequence
- New tools are thin wrappers over services, not new logic.
- Both AI surfaces (MCP + the in-app assistant) share this seam — which is why
  unifying them is a tracked task (bring MCP write tools into the in-app AI).
- Shipped: Connect page + setup Sheet (PR #25); toolset verified live.

## Links
- [[glossary]] (ctxFor seam, MCP) · [[roadmap]] · [[open-questions]]
