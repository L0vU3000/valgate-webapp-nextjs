---
category: building
type: feature
priority: normal
created: 2026-07-15
---

Sole-Ownership confirmed cleanup in the Ownership edit wizard. Follow-up to the co-owner
data-loss fix (2026-07-15): switching a co-owned property to "Sole Ownership" now leaves the
existing co-owner rows untouched, silently. Feature: when the user switches the holding type
**to** "Sole Ownership" while the property still has saved co-owners, show a confirm —
*"This removes N co-owners: [names]. Remove / Keep"* — **default Keep**. Acceptance criteria:
(1) with no explicit choice, saving keeps every existing co-owner (no silent deletion);
(2) only an explicit "Remove" choice deletes the existing co-owners, and exactly those;
(3) the choice defaults to Keep. Keep the UI minimal — correct behavior and the acceptance
test over polish. Touches co-owner rows, so any live-data check runs against the **Neon dev
branch**, never prod, never `seed:reset` (the acceptance tests should mock the server
actions like the existing co-owner regression test does).
