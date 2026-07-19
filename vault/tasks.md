---
title: Tasks — Valgate work board
type: doc
status: living
source: authored; synced from open-questions, roadmap, session handoffs
tags: [tasks, board, planning]
added: 2026-07-15
---

## Summary
The operational board: actual work items and their state. Sibling notes, kept
distinct:
- **This file** = *do* items (Active / Planned / Deferred / Done).
- [[roadmap]] = product *state* (shipped / dormant / next).
- [[open-questions]] = unresolved *decisions* (things needing a call, not a task yet).

An item can be cited in both (e.g. a bug is a risk in open-questions *and* an
active task here) — cross-link rather than duplicate the detail.

States: **Active** (in flight) · **Planned** (agreed, not started) ·
**Deferred** (intentionally paused, with a reason) · **Done** (recently shipped,
prune periodically).

---

## Active
- Build out the Obsidian vault knowledge system (framework, decisions, words-to-avoid,
  logs). — mostly complete; ongoing as new knowledge lands.
- Prove the remaining agent-loop E2E pipeline by hand, then build the scheduled
  orchestrator. QA is now proven.

## Planned
- **Consumer web release (single-owner, no-bug launch).** Full 6-phase plan in
  [[consumer-release-plan]]: Pro teardown → known bugs → product polish → data
  correctness → security → no-bug gate → prod ops. Pro side removed entirely.
- **Prove task-specific Eval scoring across all eight agent-loop pipelines.** The scoring contract
  is wired everywhere; real-run calibration starts with `bug-fix`, followed by the remaining
  pipelines. Checklist: [eval-scoring-rollout.md](../.context/todos/eval-scoring-rollout.md).
- **Reevaluate entities & fields after the scope reduction.** Map which
  entities/fields survive the cut vs. are now dead. Blocks the domain notes.
  See [[open-questions]].
- **Bring MCP write tools into the in-app AI.** Unify the two AI surfaces (both
  wrap `lib/services` via the `ctxFor` seam). See [[mcp-reuse-services-ctxfor]].
- **Prod hardening** — rotate Neon prod password; stand up Clerk prod instance;
  brand the MCP consent screen on the custom domain.

## Deferred
- **`domain/property-model.md`** — blocked on the entity/field reevaluation
  (don't document entities we're about to delete).
- **`domain/cambodia-property.md`** — needs a ~6-question interview with you;
  won't fabricate legal facts.
- **Client permission-leader build** — 3-phase plan written, not executed;
  `change_requests` table exists but is unwired. See [[client-permission-leader]].

## Done (recent)
- QA pipeline hand run: 8/8 flows verified; WebGL crash and duplicate React keys fixed;
  183/183 global tests retained.
- Co-owner data-loss fix, hand-proven and independently re-proven by the
  automated bug-fix pipeline.
- Test-coverage pipeline hand run: `portfolio-shared.ts` reached 100% coverage
  and a 100% mutation score.
- Repo-root Obsidian vault + `.obsidian/` config; MoC home note.
- `AGENTS.md` → `CLAUDE.md` symlink (one source of truth for all AI tools).
- Karpathy LLM-Wiki pattern ingested; Ingest/Query/Lint + `log.md` adopted.
- Core knowledge set: gotchas, glossary, user-journeys, runbook, changelog.
- `words-to-avoid.md` with the C/K/X category system, bound in `CLAUDE.md`.
- Promoted 4 decisions from memory into `decisions/` (7 ADRs total).

## Links
- [[roadmap]] · [[open-questions]] · [[obsidian]]
