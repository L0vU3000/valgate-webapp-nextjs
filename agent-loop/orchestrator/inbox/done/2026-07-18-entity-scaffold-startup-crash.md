---
category: maintenance
type: pipeline-improve
priority: high
created: 2026-07-18
---

# entity-scaffold run wf_62308c33-024 crashed at startup and was silently recorded as a failed run

"Done" = a focused machinery regression that reproduces the fault goes red→green, and the machinery self-check (`check-machinery.sh`) plus full repository gates (`tsc` + `eslint` + `vitest`) stay green. If explore proves with cited run evidence that the fault is already fixed and the signal is stale, the equivalent "Done" is a landed guard/assertion that would have caught the empty run (so a future 0-stage crash surfaces as a hard error, not a quietly logged `status: failed`), with the same gates green.

## Evidence / context
- `agent-loop/memory/run-metrics.jsonl` — run `wf_62308c33-024` (entity-scaffold): `status:"failed"`, `totalTokens:0`, `durationMs:8`, `totalToolCalls:0`, `agentCount:0`, `iterations:0`, `stages:[]`. It died ~8ms in, before any agent ran.
- The very next run on the identical ticket (`2026-07-16-entity-utility-accounts.md`), `wf_99b701c5-4ca`, completed normally (192k tok, 2 agents). So the crash is transient/startup-only — a machinery fault, not a modeling failure.
- Ranked 🔴 sev-100 in `agent-loop/memory/improvement-candidates.md`.
- The entity-scaffold run session (2026-07-16) already fixed 3 machinery bugs on this branch; this crash may be one of those already-resolved faults — explore must confirm current state before writing a fix.

## Do NOT
- Do NOT delete or edit the run-metrics line or the improvement-candidates entry to silence the signal — the digest is generated, hand-edits get overwritten and hide the fault.
- Do NOT touch the entity-scaffold modeling prompts (explore/plan/eval markdown) — this is a workflow-harness/startup fault, not a prompt-quality issue.
- Do NOT widen scope to the 🟡 cost-outlier signal (`wf_cf4ad006`) — that is a separate item, out of bounds here.
