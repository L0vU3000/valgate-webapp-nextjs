---
title: Open Questions — unresolved decisions & risks
type: doc
status: living
source: agent memory, .context handoffs
tags: [open-questions, decisions, risks]
added: 2026-07-15
---

## Summary
Things that are undecided, at-risk, or half-done — parked here so they don't get
silently dropped. When one is resolved, move it to a decision note or the error
log and remove it here.

## Open
- **OpenWiki CI vs the `AGENTS.md` symlink.** The `openwiki-update.yml` workflow
  writes and commits both `CLAUDE.md` and `AGENTS.md`. We made `AGENTS.md` a
  symlink → `CLAUDE.md`. If OpenWiki's writer replaces the symlink with a real
  file, our single-source-of-truth silently breaks. Watch the next
  `openwiki/update` PR; if it turns `AGENTS.md` back into a regular file, either
  drop `AGENTS.md` from the workflow's `add-paths` or re-create the symlink after.
- **Reevaluate entities & fields after the scope reduction.** The MVP/scope cut
  removes a lot of surface, so the entity model (Property, CoOwner,
  OwnershipRecord, PropertyValuation, the 8 Progress pillars…) and their fields
  need a pass — some are now unused. **Blocks** writing `domain/property-model.md`;
  don't lock the entity model in the vault until this pass is done.
- ~~**Sole-Ownership switch leaves co-owner rows**~~ — resolved 2026-07-15: went
  with the explicit, confirmed cleanup. Switching to "Sole Ownership" with saved
  co-owners now shows "This removes N co-owners: [names]" with Keep (default) /
  Remove radios; deletion only on explicit Remove. Built and proven by the new
  `feature` agent-loop pipeline (acceptance tests in
  `OwnershipUnlock.sole-cleanup.test.ts`). See [[error-log]].
- **Add Property still describes a rental-listing marketplace.** The introduction promises
  hosts, pricing optimization, guests, listings, bookings, and publishing. Select product
  copy that matches Valgate's current property-management workflow before editing it.
- **Docked-bar overlap** — layout bug flagged during expand-mvp-scope.
- **Client permission-leader not executed** — 3-phase plan exists but unbuilt;
  the `change_requests` table is unwired. See [[client-permission-leader]].
- **MCP write tools in the in-app AI** — decision to unify the two AI surfaces
  (both wrap `lib/services` via `ctxFor`); not yet done.
- **Prod hardening** — rotate Neon prod password; stand up Clerk prod instance;
  brand the MCP consent screen on the custom domain.

## Links
- [[roadmap]] · [[error-log]] · [[obsidian]]
