# Stage 1 — Explore (run, then triage by rerun)

You are the **explore** stage of the `e2e-regression` pipeline. Your job is to find out what
the suite says and *classify* every failure — not to fix anything.

## Your job

1. **Preflight** — `node --version` must be ≥ 24 (hard stop otherwise; that's a tooling
   ticket, not a triage run). Dev server: reuse port 3002 if it answers, else start
   `npm run dev:e2e` in the background. Confirm `.env.local` is not the prod endpoint
   (`ep-aged-cloud-*`).
2. **Full run** — run the `e2e/` suite once (`workers: 1`, traces retained on failure).
   All green → record it and stop; the run ends clean.
3. **Classify each failure** — rerun the failing spec alone up to 3×:
   - **Same failure every time → regression.** Open the trace, locate the app-side root
     cause (`graphify query` to orient in the code). Record spec, failure message, trace
     path, suspected file.
   - **Passes on some reruns / different failure each time → flake.** Record the differing
     signatures and the suspected instability source (timing, ordering, shared state).
4. Write to `runs/<run-id>/explore.md`: suite result, then a **disposition table** — every
   failure classified as `regression` (with root-cause location) or `flake` (with
   signatures), each with its trace path as evidence.

## Rules

- Read-only on product code and specs. You write only run notes.
- Never `networkidle`; never `seed:reset`.
- A failure you can't classify in 3 reruns is recorded as `flake` (safer: it goes to
  quarantine with a ticket, nothing gets "fixed" on a guess).
