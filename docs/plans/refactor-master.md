# Codebase Refactor — Master Plan

> Created 2026-07-02 from a full-repo scan (graphify + file-level survey).
> Each phase is its own plan file. Execute in order — each phase leaves the repo shippable.

## Why refactor now

The scan found four classes of debt:

1. **~143 dead files** (`archive/convex/` 92 files, `imports/` 51 design exports) that confuse every future agent and reader.
2. **God files**: `app/(pro)/pro/queries.ts` (2,283 lines), `app/(pro)/pro/actions.ts` (935 lines), `lib/services/client-onboarding.ts` (1,772 lines) — these violate the project's own "actions → services → Drizzle" rule.
3. **Oversized components**: `PropertyDocumentsPage.tsx` (2,577 lines) plus 10 more pages over 800 lines, and a duplicated ownership page pair.
4. **Split-brain data layer**: `lib/data/db/_fs.ts` filesystem fallback + the deliberate clients FS/Drizzle dual-write that is now ready to retire.

Type safety is healthy (2 `as any`, 0 `@ts-ignore`) — no phase needed there.

## Phases

| # | Plan file | Theme | Risk | Effort |
|---|---|---|---|---|
| 1 | `refactor-phase-1-dead-weight.md` | Delete `archive/`, triage `imports/`, remove `lib/mock-data.ts` if unused | Low | S |
| 2 | `refactor-phase-2-backend-layering.md` | Split pro actions/queries into domain files + services layer | Medium | M |
| 3 | `refactor-phase-3-component-decomposition.md` | Break up the 5 giant page components, resolve OwnershipPage vs Page2 | Medium | L |
| 4 | `refactor-phase-4-data-layer-unification.md` | Retire FS fallback + clients dual-write, fix service import cycle, generic cache wrapper | High | M |
| 5 | `refactor-phase-5-conventions-guardrails.md` | Utils consolidation, test layout, ESLint max-lines + layering rules | Low | S |

Order rationale: delete first (everything after touches fewer files), backend layering before component work (components will import the new service seams), data-layer unification late (riskiest, benefits from the cleaner layering), guardrails last (lock the door after the house is clean).

## Standing rules for every phase

- **Never run `seed:reset`.**
- Done-when for each phase: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` green (26/26 authz), affected e2e specs pass.
- Plan in Opus, execute in Sonnet (paste-ready prompt at the bottom of each phase plan).
- Run `graphify update .` after each phase lands.

## Useful skills per stage

- Find/confirm targets: `/ponytail-audit`, `/health`, `/graphify`
- Tighten a phase before executing: `/spec`, `/plan-eng-review`
- During execution: `/simplify` (applies reuse/simplification fixes)
- Before landing: `/code-review`, `/review`; `/cso` or `security-review` for Phase 2 & 4 (they touch auth/ownership paths)
- Runtime check: `/qa`, `/verify`
- Ship: `/ship`
- Afterwards: `/ponytail-debt` to harvest deliberate shortcuts left behind
