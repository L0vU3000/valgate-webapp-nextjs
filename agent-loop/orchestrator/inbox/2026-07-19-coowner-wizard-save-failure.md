---
category: building
type: bug
priority: normal
created: 2026-07-19
---

# Co-owner wizard intermittently fails to save with an in-app validation error

Surfaced by the e2e-regression run `2026-07-19-005931` (de-flake of the feature-unlock wizard).
While running `e2e/owners.spec.ts` **G2** (edit co-owner) with the tests un-skipped, the verifier's
first full-suite run failed with a **real in-app error**, not a timing flake: the co-owner step
showed *"Couldn't save your changes"* (an invalid-option validation error) and the flow stayed
stuck on step 1. The same test passed on the verifier's second run, so the failure is
**intermittent** — but the symptom is an application-level save/validation failure, which is a
product signal, not a Playwright artifact.

"Done" = reproduce the intermittent save failure, root-cause whether it is a real product bug
(e.g. a race or a validation mismatch in the co-owner add/edit path of `FeatureUnlockWizard`) or a
test-data artifact, and — if it is a real bug — a new regression test goes red→green with the fix,
full suite + `tsc` + `eslint` clean. If it proves to be a pure test/data artifact, the equivalent
"Done" is a cited explanation plus the smallest change that makes G2 deterministic without widening
timeouts or weakening assertions.

## Evidence
- Verifier eval: `agent-loop/pipelines/e2e-regression/runs/2026-07-19-005931/eval.md` (criterion B, 6/12).
- Run logs: `.../runs/2026-07-19-005931/eval-evidence/eval-run1.log` (the failing G2 run) and
  `eval-run2.log` (the passing one).
- The wizard is the shared lazy `FeatureUnlockWizard`; G2 drives the ownership flow
  (Structure → Loan → Co-owners).

## Do NOT
- Do NOT "fix" this by widening the 5s step waits or adding retries — that masks a possible real
  save bug. Reproduce and root-cause first.
