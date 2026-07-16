---
title: Glossary — Valgate terms
type: doc
source: consolidated from code, docs, agent memory
tags: [glossary, domain, product]
added: 2026-07-15
---

## Summary
Project vocabulary. What each term means so a new person (or agent) isn't
guessing. One line each.

## Users & roles
- **Standard** — the property-owner interface. The default user.
- **Pro** — the manager cockpit (`/pro/*`). Gated by `is_manager`.
- **Manager** — a Pro user who manages other people's portfolios. `is_manager = true`.
- **Client** — a property owner managed by a manager. On accepting an invite the
  client becomes the **permission leader** (admin); the manager becomes a
  read-only viewer who proposes changes. See [[client-permission-leader]].
- **Org (`ORG-0001`, …)** — the tenancy boundary. Every property/user belongs to
  an org. The demo/seed org is `ORG-0001`.

## Entities
- **Property** — the core record. Has pillars, documents, financials, ownership.
- **Portfolio** — a client's set of properties (manager-facing grouping).
- **Lease / Tenant / Payment / Maintenance** — rental records (exposed via MCP tools).
- **Document** — an uploaded file on a property; can get an AI summary.
- **change_requests** — proposed edits from a read-only manager, approved by the
  client (permission-leader model).

## Product concepts
- **Progress** (was "health") — weighted-pillar completeness score: Location 15%,
  Financials 20%, Rental 20%, Ownership 15%, Valuation 10%, Safety 10%,
  Estate 5%, Docs 5%.
- **Added / In Progress / Valgate Verified** — the trust ladder. *Added* = wizard
  done, any data. *In Progress* = some pillars verified. *Valgate Verified* = the
  trust standard meaningful to lenders/lawyers/successors. See
  `docs/feature-requirements.md`.
- **Drafts** — server-side resumable add-property sessions.
- **View-as-client** — read-only preview of a client's owner view
  (`/pro/clients/[clientId]/as-client`).
- **Manager-led onboarding** — reverse handoff: the manager builds a portfolio +
  properties first, then invites the client by email.

## Infra
- **MCP** — the Model Context Protocol server exposing Valgate write tools to AI
  assistants. Shares `lib/services/*` via a `ctxFor()` seam.
- **`ctxFor()` seam** — transport-agnostic context factory so services work from
  both the web app and MCP.

## Links
- [[glossary]] anchors terms used across [[user-journeys]], [[gotchas]], and the decisions.
