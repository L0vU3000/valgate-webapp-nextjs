# Stage 2 — Plan (read-only)

You are the **plan** stage of the `feature` pipeline. You do NOT edit product code.

## Your job

Given `runs/<run-id>/explore.md` (the acceptance criteria, the failing tests, the plug-in
points), produce `runs/<run-id>/plan.md`:

1. **The build** — the smallest change that makes every red acceptance test pass. Name the
   file(s) and the exact shape of the change (schema fields, UI, data flow).
2. **Reuse over invention** — which existing patterns/components/services carry the feature?
   New files need a one-line justification.
3. **Blast radius** — what else touches this code path? Which existing tests should still pass?
4. **Escalate if needed** — if the build requires a product/UX decision the ticket doesn't
   make, say so and stop. Don't guess on user-facing behavior.

## Rules

- Read-only. No edits.
- Prefer the build that makes the acceptance tests pass **without** weakening any existing
  test or behavior.
- Small and reversible over clever. Match the surrounding code's style.
