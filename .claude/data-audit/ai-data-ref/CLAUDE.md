# `ai-data-ref/` — AI Agent Guide

> Distilled, table-only views of the maintained `../ref/` reference corpus. **Optimised for low-token-cost lookups by AI agents.** Same facts as `ref/`, none of the prose.

---

## Source-of-truth precedence

**`../ref/` wins on conflict.** This folder is a derived view, not an independent source.

| AI-ref file | Distilled from | Source-of-truth |
|---|---|---|
| `entities.md` | `../ref/07-entity-fields.md` (~35 KB) | ← if conflict, `07` is correct |
| `pages.md` | `../ref/09-page-wiring-status.md` (~16 KB) | ← if conflict, `09` is correct |
| `migration.md` | `../ref/08-backend-migration-readiness.md` (~25 KB) | ← if conflict, `08` is correct |

If you spot a conflict between an AI-ref file and its source, **trust the source** and flag the AI-ref file as stale.

---

## When to use this folder vs `ref/`

| Situation | Read |
|---|---|
| You need a quick fact — entity fields, page wiring, migration step — and want to keep context budget tight | `ai-data-ref/` |
| You need the *why* — provenance narrative, decision rationale, anomaly explanation, drift notes | `../ref/` |
| You need open-question detail (`Q3.X` cross-reference) | `../ref/05-open-questions.md` (no AI-ref version — the Q deliberations are dev-only) |
| You're updating canonical truth | `../ref/07`, `08`, or `09` (then regenerate AI-ref — see below) |

---

## Update protocol (when source files change)

`ai-data-ref/` is **hand-curated**. Mechanical stripping of `ref/07/08/09` only saves ~17% (source is already mostly tables/code/lists). Hand curation saves ~50% by consolidating redundant tables and dropping per-entity prose intros.

A drift-detection tool exists: `npm run regen-ai-ref` (script: `scripts/regenerate-ai-data-ref.ts`). It writes `*.generated.md` siblings — these are NOT canonical; they are safety-net comparisons.

### Workflow when `ref/07`, `08`, or `09` changes

1. Run `npm run regen-ai-ref`. This rewrites `entities.generated.md`, `pages.generated.md`, `migration.generated.md`.
2. `diff entities.md entities.generated.md` (and the other two). The diff highlights any structural element (table row, heading, code block) the script saw in source that isn't in the live AI-ref file.
3. For each "missed" item, decide:
   - Mirror it into the live AI-ref file (keep same heading/table structure), OR
   - Skip it (e.g. per-entity prose intro the script kept but isn't valuable to AI)
4. Update the `_Last sync_` timestamp at the bottom of the live AI-ref file.

**Don't** treat `.generated.md` files as canonical. They're the drift detector. The hand-curated files are what AI agents read.

### Why hand-curated over auto-generated

- **Size**: generated `entities.md` is 33 KB vs hand-curated 18 KB. Hand wins on context budget.
- **Cross-tables**: hand-curated `entities.md` has an "entity → pages-consuming" map and a consolidated anomaly table that don't exist as a single block in source.
- **Trade-off**: hand curation requires discipline (this protocol). If discipline lapses, the diff workflow catches drift.

---

## What's NOT in `ai-data-ref/`

- ✗ `05-open-questions.md` distillation — the Q deliberations are deliberation; the resolved status is already in `08-backend-migration-readiness.md` §1 and inline in `07/09` notes. No separate AI-ref file needed.
- ✗ Tier 2/3 narrative files (`00`, `03`, etc.) — historical/frozen; no need for AI-optimised versions.
- ✗ Per-page audit reports (`pages/<slug>/`) — those are workflow artifacts, not reference. Read them via the audit skills.

---

## File map

- [`entities.md`](./entities.md) — 25 entities, field tables, sub-enums, anomaly list
- [`pages.md`](./pages.md) — 15 routes, wiring status, what's left HARDCODED
- [`migration.md`](./migration.md) — Q-blockers, Convex schemas, derivation registry, migration phases

---

_AI agents: read this guide first, then jump straight to whichever file matches your need. Don't read all three by default — context is precious._
