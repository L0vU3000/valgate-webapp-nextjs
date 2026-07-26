---
category: maintenance
type: pipeline-improve
priority: normal
created: 2026-07-19
---

# The claim primitive exists but nothing calls it — wire --claim into the dispatch flow

Follow-up to `2026-07-19-orchestrator-item-claim-lock.md` (landed as commit `aeb051db`). That
run added the atomic claim primitive — `claimItem()` / `--claim` moves an inbox item to
`inbox/in-progress/` so a second `planDispatch()` can't re-select it, plus `reclaimItem()` /
`STALE_CLAIM_MS` for crashed-run recovery and a `check-machinery.sh` wiring tripwire. All of it
is proven by a red→green regression.

But the primitive is dormant: `tick.mjs` still only prints the AGENT ACTIONS block, and the
printed steps go straight from "run the workflow" to "--record". Nothing invokes `--claim` between
dispatch and record, so in practice two concurrent ticks can still both route the same item — the
live race the parent ticket set out to close is only closed once a caller actually claims.

"Done" = the dispatch path claims an item at dispatch time before the run starts, so a second tick
in the same window cannot select it. Concretely: `tick.mjs`'s emitted actions (and/or the operator
protocol in `orchestrator.md`) call `dispatch.mjs --claim <file>` as the first step for each routed
item, `--record` still resolves the now-claimed (in-progress/) item, and a stale claim is reclaimed
on a later tick. A deterministic regression proves that after tick-time claiming, a second
`planDispatch()` in the same window returns the item as NOT routable. Machinery + full gates stay
green. One machinery behavior; do not re-open the parent ticket's already-landed primitive.

## Evidence
- Commit `aeb051db` — the landed claim primitive (`claimItem`/`reclaimItem`/`--claim`/`--reclaim`).
- `agent-loop/orchestrator/tick.mjs` — emits actions but never calls `--claim`.
- `agent-loop/orchestrator/orchestrator.md` step 2c ("mark it in-progress") — still only partly
  enforced: the mechanism exists, the caller does not.

## Do NOT
- Do NOT modify the landed `claimItem`/`reclaimItem` primitive or its regression — this ticket is
  only about wiring a caller to it.
