---
title: Decision — Ruthless MVP cut (valgate-mvp-v1)
type: decision
status: accepted
source: agent memory, branches valgate-mvp-v1 / valgate-pro
tags: [decision, scope, product, mvp]
added: 2026-07-15
---

## Decision
Maintain a **Burbn-style ruthless MVP cut** on branch `valgate-mvp-v1` (~234
files deleted, build green), with `valgate-pro` kept as the **full snapshot /
restore point**.

## Why
- The full product had grown broad (Pro cockpit, analytics, financials, AI chat,
  public docs). Shipping a focused core first de-risks launch.
- A clean restore point (`valgate-pro`) means the cut is reversible — no work is lost.

## Consequence
- Cut-feature backend services are left **dormant**, not deleted (e.g. feed
  progress stat, some auth paths) — they can be re-enabled from `valgate-pro`.
- Later, `expand-mvp-scope` re-added analytics / financials / AI chat (decoupled
  from Pro) / public docs / activity panel on `valgate-mvp-v1`.

## Links
- [[roadmap]] (what's shipped vs dormant) · [[changelog]]
