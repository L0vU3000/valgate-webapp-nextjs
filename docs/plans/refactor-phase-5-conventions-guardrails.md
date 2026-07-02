# Refactor Phase 5 — Conventions & Guardrails

**Goal:** consolidate the small stragglers and add lint rules so the debt cleaned in Phases 1–4 cannot silently regrow.
**Risk:** Low. Mostly file moves and config.
**Effort:** Small (half a day).

## Targets

### 1. Utils consolidation
- Move loose root-level helpers (`lib/format.ts`, `lib/property-helpers.ts`, `lib/professional-form.ts`, `lib/property-form.ts`) into `lib/utils/` — or leave them and instead write one line in CLAUDE.md declaring where helpers live. **Recommendation: just move them**; it is a 10-minute `git mv` + import update and ends the ambiguity.
- Pick ONE logger: `lib/log.ts` vs `lib/logger.ts` vs `lib/utils/logger.ts` — keep the most-used, re-point the rest, delete.

### 2. Test layout — document, don't reshuffle
`lib/services/*.test.ts` (unit), `tests/authz/` (authz), `e2e/` (Playwright), `test/` (fixtures?). Moving tests breaks configured paths (vitest.config, vitest.config.db, playwright.config) for near-zero gain. Instead: add a short "Where tests live" section to CLAUDE.md, and only merge `test/` into `tests/` if it turns out to be leftover fixtures.

### 3. ESLint guardrails (the actual point of this phase)
Add to `eslint.config.mjs`:
- `max-lines`: warn at 800 per file (would have caught every god file in this refactor).
- `no-restricted-imports`: forbid `lib/db/client` (Drizzle) from being imported anywhere under `app/**` — locks in Phase 2's layering.
- `no-restricted-imports`: forbid `archive/*` and `imports/*` (belt-and-braces if Phase 1 moved rather than deleted).

### 4. CLAUDE.md refresh
Update the project rules to reflect the new reality: services own all Drizzle access (now enforced by lint), where helpers live, where tests live, and remove the `archive/convex/` paragraph once the directory is gone.

## Done when
- `npm run lint` passes with the new rules (existing violations either fixed in earlier phases or explicitly downgraded with a `ponytail:` comment naming the follow-up).
- One logger module remains.
- CLAUDE.md matches the post-refactor layout.
- `graphify update .` run; final `/ponytail-debt` sweep collects every `ponytail:` comment left across Phases 1–5 into a ledger appended to this file.

## Execution prompt (paste into Sonnet)
> Execute docs/plans/refactor-phase-5-conventions-guardrails.md. Move loose lib/ helpers into lib/utils/, unify to one logger, add the three ESLint rules (max-lines 800 warn, no app/** import of lib/db/client, no archive//imports imports), update CLAUDE.md. Finish with lint + tsc + tests, `graphify update .`, then run /ponytail-debt and append its ledger to this plan.
