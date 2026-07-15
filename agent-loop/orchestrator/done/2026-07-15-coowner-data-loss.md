---
type: bug
priority: high
created: 2026-07-15
---

Co-owner data loss in the Ownership edit wizard. Saving the wizard while the "Co-owners"
step is **Skipped** deletes the property's existing co-owners (QA: COOWN-0001/0002 were
wiped, Property Progress dropped 98%→93%). Expected: skipping the Co-owners step leaves
existing co-owners untouched. Likely root cause: a skipped step submits an *empty* co-owner
list and the ownership save treats "empty list" as "delete all" instead of "no change".
Data-loss bug that touches the DB — the fix must run against the **Neon dev branch**, never
prod, never `seed:reset`. Regression test: save ownership with the co-owners step skipped and
assert the existing co-owners still exist.
