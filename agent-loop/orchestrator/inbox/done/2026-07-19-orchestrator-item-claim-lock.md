---
category: maintenance
type: pipeline-improve
priority: normal
created: 2026-07-19
---

# The orchestrator has no in-progress claim, so concurrent ticks work the same item twice

Surfaced live on 2026-07-19: two `pipeline-improve` runs picked up the SAME high-priority ticket
(`2026-07-18-entity-scaffold-startup-crash.md`) and did divergent work. Run `2026-07-19-015254`
selected the e2e-regression `suiteGreen` false-pass guard, recorded the ticket pass, and moved it
to `inbox/done/`. Run `2026-07-19-023118` (started ~40 min later, unaware) independently selected a
different weakness (the `improvement-digest.mjs` startup-crash `else if` blind spot), passed its own
Eval 100/100, and landed commit `1882c2cc` — but could not record, because the ticket was already in
`done/`. Both fixes are real and non-overlapping, but one run's effort was spent against a ticket
another run had already claimed.

Root cause: `dispatch.mjs` emits the plan and `--record` moves the item at the END, but nothing marks
an item **in-progress at dispatch time**. Between "tick prints the action" and "run records the
outcome" the item still sits in the top-level inbox, so a second tick (or a parallel Conductor agent)
routes it again. The guardrail "mark it in-progress (move/annotate the item)" from
`orchestrator/orchestrator.md` step 2c exists in the spec but is not enforced in code.

"Done" = a dispatched item is atomically claimed so a second concurrent tick cannot select it (e.g.
`dispatch.mjs` gains a `--claim <file>` that moves it to an `inbox/in-progress/` holding area, or
stamps an owner+timestamp the planner then skips), with a focused red→green machinery regression
proving a second `planDispatch` no longer returns an already-claimed item. Machinery + full gates stay
green. A stale-claim recovery path (a claim older than the pipeline's max-time is reclaimable) should
be considered so a crashed run doesn't wedge an item forever.

## Evidence
- `agent-loop/orchestrator/dispatch-log.md` — the `2026-07-19-015254` pass line for the ticket.
- Commit `1882c2cc` — run `2026-07-19-023118`'s landed-but-unrecorded second fix.
- `agent-loop/orchestrator/orchestrator.md` step 2c ("mark it in-progress") — spec'd, not enforced.

## Do NOT
- Do NOT touch the two already-landed fixes — both are valid; this ticket is only about the missing
  claim/lock so future concurrent ticks don't duplicate work.
