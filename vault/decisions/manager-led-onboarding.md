---
title: Decision — Manager-led onboarding (reverse handoff)
type: decision
status: accepted
source: agent memory (manager-led onboarding plan), docs/plans/manager-led-client-onboarding-*
tags: [decision, onboarding, pro, product]
added: 2026-07-15
---

## Decision
A manager onboards a client by **building the portfolio first, then inviting**:
the manager creates the client's org + properties, and only afterwards invites
the client by email. Portfolios can be created as **drafts with zero invitees**
and the invitation deferred.

## Why
- Managers already hold the property data; making them enter it up front (before
  the client even has an account) removes friction and matches how the business
  actually works.
- Deferring the invite lets a manager prep several clients, then send invites
  when ready — instead of an empty-account-first flow.

## Consequence
- The org is created up front; draft portfolios show a "Draft" badge and count
  toward the 20-invite cap.
- Mirrors the `managers.ts` service patterns.
- On accept, the client becomes the permission leader — see
  [[client-permission-leader]].

## Links
- [[user-journeys]] (Pro onboarding) · [[glossary]] (portfolio, draft) · [[roadmap]]
