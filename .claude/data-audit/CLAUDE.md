# Data Audit — Folder Guide

This folder is the home for all data-point audits and the reference material that supports them.

---

## Structure

```
.claude/data-audit/
  CLAUDE.md          ← you are here
  INDEX.md           ← two tables: per-datapoint audits, page-level audits
  <slug>.md          ← per-datapoint audit reports (e.g. portfolio--properties-count.md)
  pages/<slug>/      ← per-page folder
    audit.md         ← analysis (Surface Inventory + Page-wide findings + source SHAs)
    plan.md          ← action (Entity Backlog + Audit Roadmap + Fix Log)
  pages/INDEX.md     ← master cross-page entity backlog (created in Phase 3)
  ref/               ← reference corpus for humans (entity catalog, wiring status, migration plan, open questions)
    INDEX.md         ← reading-order guide for ref/
  ai-data-ref/       ← distilled, table-only views of ref/ for AI agents (cheaper to read)
    CLAUDE.md        ← AI-agent guide for ai-data-ref/
```

## What lives where

### Audit reports (`*.md` in this folder)
- One file per data point, named `<route-slug>--<metric-slug>.md`
- Written and updated by the `/audit-datapoint` skill
- Never edit manually — re-run the skill instead; it detects source changes and bumps the revision
- Each section (§1–§8) opens with a plain-English blockquote (no jargon, anyone can read it), followed by technical tables and code. Plain first, detail after.

### `INDEX.md`
- Flat table: slug · route · data point · latest verdict · revision count
- Updated automatically on every audit run

### `ref/` — Reference corpus

The `ref/` folder has three tiers. Read in this order; stop when you have the answer.

**Tier 1 — Canonical (current truth, maintained):**

| File | Contents | When to read |
|---|---|---|
| `ref/09-page-wiring-status.md` | Per-page wiring state for all 15 routes — what's WIRED, HARDCODED, deferred | Before working on a page — tells you what's already done |
| `ref/07-entity-fields.md` | All 25 entities — full field tables, enums, relationships, anomalies | Before designing UI or touching schemas |
| `ref/08-backend-migration-readiness.md` | Convex migration plan — Q-blockers, Zod→Convex schema mapping, derivation registry, phase sequencing | Before any backend / Convex work |
| `ref/05-open-questions.md` | Q1–Q9 ambiguities, with resolution notes inline | Whenever you hit `Q3.X` / `Q5.Y` cross-references; append new questions here |

**Tier 2 — Narrative companions (older, partially current):**

| File | Status |
|---|---|
| `ref/00-entity-catalog.md` | Refreshed 2026-05-06; useful for provenance + drift narrative; superseded by `07` for current Zod state |
| `ref/03-data-flow-and-derivations.md` | §A flows mostly historical now (most are wired); §B derivation homes still useful conceptually |

**Tier 3 — Historical / frozen (do not maintain):**

| File | Why kept |
|---|---|
| `ref/01-read-map.md` | Pre-Phase-6 read inventory — historical context only |
| `ref/02-write-map.md` | Pre-Phase-6 write inventory — historical context only |
| `ref/04-convex-plan.md` | Old Convex schema sketch — superseded by `08` |
| `ref/06-simulated-backend-plan.md` | Plan that became reality (the FS layer) — historical context only |
| `ref/visualizer-input.md` | One-shot brief for an HTML visualizer — not a reference |

> **Rule:** `07`, `08`, `09`, `05` are the maintained set. When facts change, update those four. The Tier 2/3 files are frozen artifacts.

### `ai-data-ref/` — AI-optimised view

Distilled, table-only versions of Tier 1 files for AI agents that need to load reference data into context cheaply.

- `ai-data-ref/CLAUDE.md` — agent guide; read before any other file in this folder
- `ai-data-ref/entities.md` — distilled `ref/07-entity-fields.md`
- `ai-data-ref/pages.md` — distilled `ref/09-page-wiring-status.md`
- `ai-data-ref/migration.md` — distilled `ref/08-backend-migration-readiness.md`

**Source-of-truth precedence:** `ref/` (Tier 1) wins on conflict. `ai-data-ref/` is regenerated from `ref/` when the canonical files change. See `ai-data-ref/CLAUDE.md` for the update protocol.

---

## How to audit a data point

Run `/audit-datapoint` and describe the number you want audited. The skill handles the rest:
- Resolves the value back to its source files
- Checks whether a prior audit exists (re-audit) or this is fresh
- Writes a beginner-readable report with findings, golden-value check, and fix recommendations

## How to audit a whole page

Run `/audit-page-datapoints` against a route (e.g. `/property/PROP-0001/overview`). The skill produces one inventory report at `.claude/data-audit/pages/<route-slug>.md` that:

- Classifies every visible surface element as **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE**
- Files page-wide findings once with a `PFn` number (e.g. "full Property to Client Component"), so per-datapoint audits cite instead of restating
- Groups HARDCODED rows by the database concept they need (Entity Backlog), so wiring and schema work proceed together
- Recommends `template: full` or `template: lite` per row, so subsequent `/audit-datapoint` runs use the right depth

**When to use it:**
- First time looking at a route
- Before kicking off a batch of `/audit-datapoint` runs on the same page
- When a page gains/loses surfaces (re-run; bumps revision)

**Lite vs full template (per-datapoint):**
- **Lite (4 sections)** — for trivial direct-reads (`{property.name}`); skips formula/consistency/missing-safeties/meaning sections that are either trivially empty or filed at the page level
- **Full (9 sections)** — for derivations, aggregations, cross-card identities

The page audit's Audit Roadmap is the source of truth for which template `/audit-datapoint` should render. Don't re-decide in the per-datapoint run — honor what the page audit recommends.

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

---

## After database migration

See [`deferred-database-migration.md`](deferred-database-migration.md) for guidance on re-auditing verification commands after migrating to NeonDB / Convex.
