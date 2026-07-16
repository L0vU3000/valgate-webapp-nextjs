---
title: Plans define task-specific Eval scoring
type: decision
status: accepted
tags: [agent-loop, pipelines, evaluation, verification]
added: 2026-07-16
---

## Context

The eight agent-loop pipelines used fixed pass/fail checklists. Those checks were safe, but they
could not express that different tasks place different value on user outcomes, coverage gains,
browser flows, migrations, or machinery protections. The owner requested scoring chosen for the
actual task during Plan.

## Decision

Every Plan writes a task-specific 100-point Eval rubric before Execute. It names objective evidence,
weights, critical criteria, partial-credit bands when applicable, and a pass threshold from 80 to
100. The default threshold is 85.

Eval passes only when the score reaches the approved threshold, the rubric is valid and unchanged,
and critical failures are zero. Existing safety, regression, authorization, data, approval, and
anti-gaming checks stay critical, so a high score cannot offset a failed protection.

The exact rubric section is fingerprinted with SHA-256. Automated retries may revise the
implementation plan but cannot move the scoring target. A rubric change requires human approval.

## Consequences

- Feature acceptance outcomes and other task-specific quality signals can carry appropriate weight.
- Each Eval produces a comparable scorecard without pretending every pipeline has the same rubric.
- Failed scorecards return to Plan with criterion-level evidence; the next attempt is scored from
  zero.
- Missing, invalid, changed, below-threshold, or critically failed rubrics deterministically fail.
- A machinery regression check protects the scoring fields and runtime decisions in all pipelines.

## Links

- [[agent-loop-system]]
- [[agent-loop-pipeline-categories]]

