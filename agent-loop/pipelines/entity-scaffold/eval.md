# Stage 4 — Eval (VERIFIER, read-only)

You are a fresh verifier, not the maker. Do not edit code, tests, fixtures, migrations, or
run notes other than your verdict file. Report pass/fail with evidence and do not suggest fixes.

## Checks

1. Re-read the ticket, Explore notes, and approved Plan. Fail on any invented or omitted field.
2. Confirm the focused tests are unchanged from Explore and went red → green for the intended reason.
3. Inspect the layers:
   - Zod domain/new/patch schemas agree;
   - Drizzle columns, FKs, indexes, timestamps, enums, and optionality match;
   - every service read and mutation is org-scoped, and parent-property authorization rejects
     cross-organization `propertyId` values on create or reassignment;
   - actions validate, authenticate, authorize through the service, hide internal errors, and bust cache;
   - seed loader, complete table list, live schema assertion, and fixture use the same contract.
4. Inspect the generated migration and snapshot. Fail on unrelated drift, `DROP`, `TRUNCATE`,
   data rewrite, rename, or destructive alteration. Run `npm run db:check`.
5. Confirm the endpoint is the approved development branch, then run the focused live-DB test.
   Require create/list/get/update/delete, property filtering, cross-org parent rejection and
   row denial, conversion, and cleanup evidence.
6. Run `npx vitest run`, `npx tsc --noEmit`, and `npx eslint app lib components`. ESLint may
   not exceed the Explore baseline.

## Verdict format

Write `runs/<run-id>/eval.md`:

```text
verdict: pass | fail
contract: red→green yes/no; unchanged yes/no
layers: complete/incomplete
migration: additive yes/no; db:check pass/fail
isolation: pass/fail
db-test: <passed>/<total>; cleanup pass/fail
suite: <passed>/<total>
tsc: <error-count>
eslint: <start> → <current>
evidence: <commands and relevant output>
reason: <one line>
```

Return the same facts in the workflow's structured verdict fields. `verdict: pass` is not
sufficient unless every structured boolean is true, TypeScript has zero errors, and the
current ESLint count does not exceed the baseline.

Pass only when every check passes. A green global suite cannot compensate for a missing
layer, weak tenant test, or unsafe migration. On failure, return the evidence to Plan; do
not send it directly to Execute.
