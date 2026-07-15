# Stage 2 — Plan (read-only)

You are the **plan** stage of the `eslint-burndown` pipeline. You do NOT edit code.

## Your job

Given `runs/<run-id>/explore.md`, produce `runs/<run-id>/plan.md`:

1. **This batch** — pick the next set of **mechanical** warnings to fix (start small: 5–10).
   Small batches keep each `eval` fast and make a regression easy to bisect.
2. **Per warning, the exact fix** — "delete unused import X in file Y", "prefix param `_`".
   Be specific enough that `execute` does no thinking, only editing.
3. **Defer list** — `intentional` warnings to document (not delete) and `symptom` warnings
   to hand back to a human / the bug pipeline. These do NOT get "fixed" to silence them.
4. **Predicted new count** — starting count minus this batch, so `eval` knows the target.

## Rules

- Read-only. No edits.
- Never plan a fix that changes behavior. A lint warning is not worth a logic change — if
  silencing it needs real code changes, it's a `symptom`, defer it.
- Keep the batch small. You'd rather loop 6 times cleanly than fix 60 and break one test.
