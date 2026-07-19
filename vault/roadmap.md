---
title: Roadmap — shipped vs dormant vs next
type: doc
status: living
source: agent memory, branches, .context handoffs
tags: [roadmap, state, product]
added: 2026-07-15
---

## Summary
Current state of the product: what's live, what's built-but-dormant, and what's
next. Update as things move.

## Live in prod (www.valgate.co)
- Core owner flows: add-property wizard, property detail, documents (+ AI
  summaries), analytics, financials.
- Pro cockpit: dashboard, clients, owner-grouped properties, manager-led
  onboarding, view-as-client.
- MCP connector (Settings → AI assistant), verified end-to-end.

## Built but dormant / not fully wired
- **Client permission-leader** — plan written, `change_requests` table exists,
  **not executed**. See [[client-permission-leader]].
- **MVP-cut dormant services** — feed progress stat, some auth paths (restorable
  from `valgate-pro`). See [[ruthless-mvp-cut]].
- **MCP write tools in the in-app AI** — in-app AI is read-only + `propose_*`
  today; bringing MCP's write tools in is the tracked next task.

## Next / open threads
- Co-owner data-loss bug in the ownership wizard (see [[open-questions]]).
- Rotate the Neon prod password before further deploys.
- Clerk prod instance + branded MCP consent on the custom domain.

## Links
- [[open-questions]] · [[changelog]] · [[user-journeys]]
