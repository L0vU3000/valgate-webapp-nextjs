---
title: User Journeys — Valgate interactive surface map
type: doc
source: authored; cross-check against openwiki/architecture/app-routes.md + graphify
tags: [product, ux, journeys, features]
added: 2026-07-15
---

## Summary
The **current** interactive map of Valgate — every surface a user touches and
how they move between them. This is the "what exists today" view. For "what we
intend to build + the verification model" see `docs/feature-requirements.md`.

> Keep this honest: when a flow changes, update it here. Cross-check route names
> against `openwiki/architecture/app-routes.md` (generated) rather than
> hand-tracking them.

## Actors
- **Owner (Standard)** — manages their own properties.
- **Manager (Pro)** — manages clients' portfolios via `/pro/*`.
- **Client** — an owner onboarded by a manager (becomes permission leader).

## Owner (Standard) journeys
- **Add a property** — the multi-step wizard: Location → details → Ownership →
  Financials → Review → Success. Frictionless (any data accepted). Resumable via
  **drafts**.
- **Property detail** — pillars, progress score, map pin, documents, financials,
  ownership, valuation, safety, estate.
- **Documents** — upload, real file viewer, click-to-generate AI summary (stored).
- **Analytics / Financials** — portfolio-level stats and money views.
- **AI chat** — in-app assistant (Anthropic tool-use); read-only + `propose_*`
  today; bringing MCP write tools in is a tracked next task.
- **Public docs** — shareable public property record.

## Manager (Pro) journeys — `/pro/*`
- **Dashboard** — cockpit overview.
- **Clients** (`/pro/clients`) — unified list, invite (20-cap), status badge,
  drill into `/pro/clients/[clientId]`.
- **Properties** (`/pro/properties`) — owner-grouped bands (My Portfolio + per
  client) with mini-stats + Group⇄Flat toggle.
- **Manager-led onboarding** — reverse handoff: build portfolio + properties,
  then invite the client by email (draft portfolios allowed with 0 invitees).
- **View-as-client** — read-only preview of a client's owner view.

## Auth / entry
- **Sign-in / sign-up** — Clerk **Future API** (see [[gotchas]]).
- **`/launch`** — post-auth redirector (Pro-free).
- **Invite accept** — client joins org, becomes permission leader
  (see [[client-permission-leader]]).

## Links
- [[glossary]] · [[roadmap]] · `docs/feature-requirements.md` (the spec) ·
  `docs/add-property-flow-spec.md`
