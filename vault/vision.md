---
title: Vision — what Valgate is and where it's going
type: doc
status: living
source: authored from code/docs/memory signals — DRAFT, owner to correct
tags: [vision, concept, strategy, product]
added: 2026-07-15
---

## Summary
The evolving concept of Valgate — what it is, why it exists, who it serves, and
how the idea is changing as we build. This is the "north star" note. It is a
**draft assembled from the code, docs, and decisions so far** — the founder is
the source of truth, so correct anything that's off.

> This note holds *judgment and direction*, not implementation. For "what exists
> today" see [[user-journeys]] and [[roadmap]].

## What Valgate is
A **property record system** — capture a property (with location/geotagging and
its documents), then build it into a **trusted, verifiable record** that matters
to the people who rely on property truth: lenders, lawyers, co-owners, and
successors. The working description on the branch is a *geotagging document-storage
app* for property.

## The core thesis
Property records in the target market are fragmented, informal, and hard to
trust. Valgate's bet:
1. **Capture must be frictionless** — the owner enters whatever they know, no
   accuracy required up front. (Anything that demands accuracy at capture kills
   adoption.)
2. **Trust is earned separately** — a property climbs a verification ladder over
   time, per data pillar, until it reaches **Valgate Verified**: a standard
   meaningful to third parties (see `docs/feature-requirements.md`).
3. **Completeness is measured, not assumed** — the **Progress** score (8 weighted
   pillars) shows how much verifiable data a property has. See
   `docs/property-progress-stat.md`.

## Who it's for
- **Owners (Standard)** — hold and grow their own property records.
- **Managers (Pro)** — manage portfolios of clients' properties; onboard clients
  by building the record first, then inviting them (see [[manager-led-onboarding]]).
- **Downstream trust consumers** — lenders, lawyers, co-owners, successors — the
  reason "Verified" has value.

## The two interfaces
- **Standard** — the owner app: add-property wizard, property detail, documents,
  financials, analytics.
- **Pro** — the manager cockpit (`/pro/*`): clients, owner-grouped portfolios,
  onboarding, view-as-client.
See [[user-journeys]] for the current surface map.

## Where it's focused
The **Cambodia** market (Khmer-language document scanning is a first-class
concern — see [[khmer-scan-self-consistency]]). The domain specifics (title
types, ownership/succession rules) are the biggest gap in this vault — captured
as a deferred domain note. See [[tasks]].

## How it's evolving (arc)
A dated log of how the *concept*, not just the code, has shifted.

- **Broad build** — full product: Pro cockpit, analytics, financials, AI chat,
  public docs, activity panel.
- **Ruthless MVP cut** — a Burbn-style narrowing to a focused consumer core, with
  the full product kept as a restore point (see [[ruthless-mvp-cut]]). Thesis:
  ship a sharp core, don't drown in surface.
- **Selective re-expansion** — analytics, financials, AI chat (decoupled from
  Pro), and public docs added back onto the MVP where they earned their place.
- **Ownership shift** — on invite acceptance the *client* becomes the permission
  leader, not the manager (see [[client-permission-leader]]). Signals a stance:
  the owner owns their data and their permissions.
- **AI as an interface** — two AI surfaces (the MCP connector and the in-app
  assistant), converging on the same `lib/services` seam. Direction: AI is a
  first-class way to *operate* Valgate, not a bolt-on.

## Open strategic questions
- What is the sharpest one-sentence definition of "Valgate Verified" for a lender?
- After the scope reduction, what is the irreducible core the product cannot cut?
- Consumer-first (owners) vs. manager-first (Pro) — which pulls the market?
See [[open-questions]].

## Links
- [[roadmap]] · [[user-journeys]] · [[tasks]] · decisions in `vault/decisions/`
