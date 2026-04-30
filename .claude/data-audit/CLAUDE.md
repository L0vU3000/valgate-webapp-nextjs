# Data Audit — Folder Guide

This folder is the home for all data-point audits and the reference material that supports them.

---

## Structure

```
.context/data-audit/
  CLAUDE.md          ← you are here
  INDEX.md           ← one line per audit report, sorted by slug
  <slug>.md          ← individual audit reports (e.g. portfolio--properties-count.md)
  ref/               ← read-only reference corpus (entity catalog, derivations, open questions)
```

## What lives where

### Audit reports (`*.md` in this folder)
- One file per data point, named `<route-slug>--<metric-slug>.md`
- Written and updated by the `/audit-datapoint` skill
- Never edit manually — re-run the skill instead; it detects source changes and bumps the revision

### `INDEX.md`
- Flat table: slug · route · data point · latest verdict · revision count
- Updated automatically on every audit run

### `ref/` — Reference corpus (read-only)
These files were written during the initial codebase audit. They are the foundation the skill cross-links to. Do not overwrite them; append only.

| File | Contents |
|---|---|
| `ref/00-entity-catalog.md` | Every domain entity, all fields, provenance, proposed Convex schema |
| `ref/03-data-flow-and-derivations.md` | Every derived/aggregate value and its assigned home (server / materialized / client) |
| `ref/05-open-questions.md` | Open ambiguities Q1–Q9 — append new ones here, never in audit reports |

Other files in `ref/` (`01`, `02`, `04`, `06`) are supplementary — read them for context but they are not actively maintained.

---

## How to audit a data point

Run `/audit-datapoint` and describe the number you want audited. The skill handles the rest:
- Resolves the value back to its source files
- Checks whether a prior audit exists (re-audit) or this is fresh
- Writes a beginner-readable report with findings, golden-value check, and fix recommendations

## How to record a fix

When a finding from an audit report is implemented, **update the report** rather than waiting for a full re-audit:

1. Bump `revision` and `date` in the front-matter.
2. Update `verdict` to reflect the new state (e.g. `"✅ 3 resolved · 1 deferred"`).
3. Update the TL;DR bullets.
4. In §8 Findings, strike through the resolved finding header: `~~🔴 F1 — headline~~ — ✅ resolved in Revision N`
5. Append a `**Resolved:**` line below the **Fix:** block — include the commit SHA and a one-line summary of what changed.
6. For deferred findings, append a `**Deferred:**` line explaining why and when to revisit.
7. Update source file SHAs in the **🔍 Source files & hashes** `<details>` block (`git hash-object <path>`).
8. Append a new entry to the **📜 Revision history** `<details>` block listing which findings changed and why.
9. Update the matching row in `INDEX.md` (verdict + revision count).

Findings stay in §8 even when resolved — they are a permanent record. Never delete them.

---

## How to file a new open question

If an audit surfaces an ambiguity not already in `ref/05-open-questions.md`:
1. Pick the right Q-section and next free letter
2. Append to `ref/05-open-questions.md`
3. Cross-link from the finding in the audit report (`see Q5.X`)
