---
title: Decision — Client is the permission leader
type: decision
status: planned
source: agent memory, docs/plans/client-permission-leader.md
tags: [decision, auth, authorization, product]
added: 2026-07-15
---

## Decision
When a client accepts a manager's invite, the **client becomes admin** of their
own org, and the **manager becomes a read-only viewer** who can only *propose*
edits via `change_requests` that the client approves.

## Why
- The property owner should own their data and permissions — not the manager who
  onboarded them.
- Managers still contribute (propose changes) without unilateral write access,
  which matches the trust model of the product.

## Status
- 3-phase plan written (`docs/plans/client-permission-leader.md`), **not yet
  executed**. Decisions D1/D2/D3 = A/A/A.
- The `change_requests` table already exists but is currently unwired.

## Links
- [[glossary]] (client, manager, change_requests) · relates to manager-led onboarding
