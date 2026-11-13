# Quick Add property

The user adds a property without a form marathon: Quick Add from the shell,
address search (suggestions + building-name matching, not blindly the top
result), a property card before any pin, and the multi-step wizard finish with
a property code on success.

## Sub-features
- QA-1: landing step opens the wizard with no advisor dialog; manual entry works.
- QA-2: full multi-step flow completes with a success screen + property code.
- QA-3: per-step validation blocks an empty property name.
- QA-4: draft save + resume from Step 0.
- QA-5: draft delete with confirm modal.

## How to get to it (user POV)
Shell Add-Property button (`app/(shell)/add-property/`), or the landing CTA.

## Driving it with Playwright
Preconditions: server on 3001, seeded DB.
`npx playwright test e2e/add-property.spec.ts` — tests C0–C4+ cover the
opening path, full flow, validation, and draft lifecycle.

## Gotchas
Writes real seed-DB rows under "E2E …" names; teardown cleans them — never run
concurrent with another spec that reads PROP counts.
