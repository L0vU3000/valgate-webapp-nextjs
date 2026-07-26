---
category: testing
type: e2e
priority: normal
created: 2026-07-19
---

# Stabilize D5 (Rental tab) — a runtime-gated skip that drifts the suite skip count

Surfaced by the e2e-regression run `2026-07-19-005931`. `e2e/property-tabs.spec.ts` **D5** (Rental —
edit → save) is a **dynamic, in-test** skip: `test.skip(true, 'Rental tab has no edit mode or is
not yet wired')` reached only after an ~8s wait on a Rental "Edit" button. Because the skip is gated
on a runtime timing wait rather than declared statically, D5 **non-deterministically runs or skips**
run-to-run. In the verifier's two consecutive full-suite runs it flipped **passed (run 1) → skipped
(run 2)**, moving the total skip count 13 → 14. That skip-count drift is exactly the failure mode
that tripped critical criterion E on this run — and it is the same class of drift recorded in
`agent-loop/memory/errors.md` (2026-07-18, D5). It will keep failing the skip-discipline check on
every future e2e run until D5 stops drifting.

"Done" = D5 no longer drifts the skip inventory across two consecutive full active-suite runs —
either by converting it to a **stable static quarantine** (an unconditional `test.skip('name', fn)`
with a reason pointing at the underlying Rental-edit gap) so it is deterministically skipped, or by
properly wiring the Rental edit flow so D5 runs green deterministically. No widened timeouts, no
deleted tests. Global gates stay green.

## Evidence
- `agent-loop/pipelines/e2e-regression/runs/2026-07-19-005931/eval.md` (criterion E, 0/12, critical).
- `.../eval-evidence/eval-run1.log` (D5 ran) vs `eval-run2.log` (D5 skipped) — the drift.
- Spec location: `e2e/property-tabs.spec.ts:160`.

## Do NOT
- Do NOT silence the drift by editing the skip inventory or the disposition table — fix the skip's
  determinism at the spec (static quarantine) or wire the feature.
