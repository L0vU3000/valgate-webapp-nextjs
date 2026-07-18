- 2026-07-16-entity-utility-accounts.md -> pass (utility_accounts scaffolded on sandbox branch, eval pass (16/16 live, 195/195 suite, tsc 0, eslint 55))
- 2026-07-16-deflake-documents-bulk-delete-bar.md -> fail (e2e-regression wf_752f0da4: 2 green suite runs + gates clean (vitest 231, tsc 0), 5 quarantines intact, but eval 80/90 critical fail — unintended skip-drift: property-tabs D5 (Rental edit/save) flipped skip->pass vs baseline, tripping the locked anti-drift rule)
  see memory/errors.md
