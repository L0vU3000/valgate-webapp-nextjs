# Changelog

Human-readable running log of notable changes. Newest at the top. Grouped by
what a person would care about, not every commit. Git has the full history — this
is the curated view.

> When a real release/`ship` flow is adopted, promote this to a root
> `CHANGELOG.md` tied to version tags.

---

## Unreleased
- **agent-loop:** the record doorway (`dispatch.mjs --record`) now re-verifies a claimed pass —
  a code-changing pipeline's pass is re-run through the fast objective gates (`check-machinery` +
  `tsc`) and downgraded to fail if they don't hold. One check for all 12 pipelines; only ever
  makes a verdict stricter. Follows the pipeline-improve eval hardening.
- **agent-loop:** hardened pipeline-improve's Eval with an independent gate runner that
  corroborates the objective gates (machinery/tsc/vitest/eslint) instead of trusting the verifier's
  self-report; ESLint measured against Explore's baseline.
- **agent-loop:** completed the scheduled-orchestrator machinery — per-tick heartbeat + dashboard
  liveness line, a half-open improvement digest that ranks the metrics ledger into one backlog, and
  a work-item gate reusing the router's own parser + registry. Added the `/orchestrate` door.
- **agent-loop:** completed the delivery library with approval-gated `landing`, `deploy`, `canary`,
  and `release` wrappers around installed delivery capabilities; all await genuine work before proof.
- **agent-loop:** completed the maintenance library with approval-gated dependency and performance
  burndown pipelines; both await genuine work before their first scored run.
- **agent-loop:** proved task-specific bug-fix scoring end to end at 100/100 against a locked
  85 threshold, including deterministic low-score, critical-failure, fingerprint-drift, and
  return-to-Plan paths.
- **agent-loop:** replaced fixed-only Eval verdicts with Plan-authored 100-point scorecards,
  locked thresholds, critical-failure protection, and deterministic runtime enforcement across
  all eight pipelines.
- **analytics:** replaced the stale revenue-chart date range with a timeline derived from
  real paid-rent and expense dates; the heading now follows the selected reporting period.
- **agent-loop:** built and proved the `feature` pipeline by hand — Sole-Ownership
  confirmed cleanup in the Ownership wizard (Keep default / explicit Remove), acceptance
  tests red→green, suite 187/187.
- **qa:** completed the first agent-loop browser QA run across eight route/interaction
  landmarks; fixed the WebGL dashboard crash and Add Property duplicate React keys.
- **agent-loop:** proved the QA pipeline by hand and corrected its server, route, browser
  fixture, network-verdict, and clean-run verifier contracts.
- **agent-loop:** proved the test-coverage pipeline by hand on
  `portfolio-shared.ts`: 12 focused tests, 100% coverage, and all 37 Stryker
  mutants killed; strengthened the mutation command and dashboard self-check.
- **ownership:** fixed the wizard path that deleted existing co-owners when the
  Co-owners step was skipped; protected by two regression tests.
- **db:** hardened the Neon pool against stale idle connections.
- **home:** collapsible left property rail on the map.
- **auth:** restored `/launch` as a Pro-free post-auth redirector.
- **scope:** expanded MVP — analytics, financials, AI chat, public docs,
  activity panel (see [[ruthless-mvp-cut]]).
- **docs:** initial OpenWiki repository wiki; Fumadocs user manual at `/docs`.
- **import:** map property name to a descriptive value (not an ID code); fixed
  silent spreadsheet-extraction failures.
- **add-property:** graceful map fallback + guard NaN on unset prices.
- **mvp:** ruthless cut to the consumer MVP core (see [[ruthless-mvp-cut]]).
