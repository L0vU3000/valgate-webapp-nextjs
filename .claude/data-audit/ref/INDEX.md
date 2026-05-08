# `ref/` — Reading Order

> Quick-lookup index for the reference corpus. The canonical reading order is `09` → `07` → `08`. Consult `05` for any `Q#.X` reference. Everything else is historical.

---

## Tier 1 — Canonical (current truth, maintained)

Read first. These four files are kept in sync with the running code.

| Order | File | Use when |
|---|---|---|
| 1 | [`09-page-wiring-status.md`](./09-page-wiring-status.md) | You're about to touch a page and need to know what's already wired vs hardcoded |
| 2 | [`07-entity-fields.md`](./07-entity-fields.md) | You're designing UI or touching a schema and need the full field table for an entity |
| 3 | [`08-backend-migration-readiness.md`](./08-backend-migration-readiness.md) | You're planning Convex / backend work — Q-blockers, schema mapping, phase sequence |
| ✚ | [`05-open-questions.md`](./05-open-questions.md) | Anytime an audit cites `Q3.X` or `Q5.Y` — read for context + resolution status |

## Tier 2 — Narrative companions (older, partially current)

Read for prose context the Tier 1 tables don't carry.

| File | Status |
|---|---|
| [`00-entity-catalog.md`](./00-entity-catalog.md) | Last refreshed 2026-05-06. Drift narrative + provenance per field. Superseded by `07` for current Zod state. |
| [`03-data-flow-and-derivations.md`](./03-data-flow-and-derivations.md) | §A "Today" descriptions are mostly historical now (most flows are wired). §B derivation-home framework still applies. |

## Tier 3 — Historical / frozen (do not maintain)

Snapshots from the initial audit. Useful for understanding *why* the FS layer exists, but not current truth.

- [`01-read-map.md`](./01-read-map.md) — pre-Phase-6 read inventory
- [`02-write-map.md`](./02-write-map.md) — pre-Phase-6 write inventory
- [`04-convex-plan.md`](./04-convex-plan.md) — old Convex schema sketch (uses outdated 3-value Property.type enum); superseded by `08`
- [`06-simulated-backend-plan.md`](./06-simulated-backend-plan.md) — plan that became reality (the FS layer). Keep for historical context.
- [`visualizer-input.md`](./visualizer-input.md) — one-shot brief for an HTML visualizer; not a maintained reference

---

## Update rule

When code changes affect data shapes, page wiring, or backend strategy:
- update `07`, `08`, or `09` (whichever applies)
- if a new ambiguity surfaces, append to `05` per the Q-numbering convention
- regenerate `../ai-data-ref/*.md` from the updated Tier 1 files (see `../ai-data-ref/CLAUDE.md`)
- do **not** edit Tier 2 or Tier 3 files — they are frozen
