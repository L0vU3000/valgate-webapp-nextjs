# Refactor Phase 1 — Dead Weight Deletion

**Goal:** remove ~143 dead files (~2.7MB) so every later phase — and every future agent — reads a smaller, truthful repo.
**Risk:** Low. Everything deleted stays recoverable in git history.
**Effort:** Small (half a day including verification).

## Targets

### 1. `archive/convex/` — delete (92 files, 828KB)
The old Convex backend. CLAUDE.md already declares it dead; the scan found **zero imports** from live code. The graphify "inferred" edges from `app/(pro)/pro/actions.ts` into archive files are name-collision guesses, not real imports — verify with the grep below, then delete the whole `archive/` directory.

```bash
# must print nothing before deleting:
grep -rn "archive/convex" app lib components scripts --include="*.ts" --include="*.tsx"
git rm -r archive/
```

### 2. `imports/` — DECISION NEEDED, then move or delete (51 files, ~1.9MB)
Design-tool exports (`OwnershipPage-7-31741.tsx`, `AddPropertyFlowStep*.tsx`, etc.). Not imported by app code.
**Decision for you (the designer):** are these still reference material?
- **Recommendation: delete.** The shipped components have long since diverged from these exports, and git history keeps them if you ever want to look back. If you do still open them, move to `design-reference/` and add to `.gitignore` + `tsconfig.json` `exclude` instead.

### 3. `lib/mock-data.ts` — delete if unimported
CLAUDE.md forbids mocks in UI. Verify no imports, then remove:
```bash
grep -rn "mock-data" app lib components --include="*.ts" --include="*.tsx"
```

### 4. TODO/FIXME triage (12 files)
Do not fix them in this phase. Just list each marker with file:line in a short section appended to this plan after execution, so Phase 2/4 can pick up the relevant ones (e.g. `lib/data/auth-shim.ts:13`).

### 5. Root cleanup
- `tsconfig.tsbuildinfo` — confirm it is gitignored (build artifact).
- `summary-for-presentation.md` — keep or move to `docs/`; do not delete without asking.

## Explicitly NOT in this phase
- `public/data/users/demo-user/` seed data — it is the dev/demo source of truth. **Never touch. Never `seed:reset`.**
- `lib/data/db/_fs.ts` and the clients dual-write — deliberate transitional code, handled in Phase 4.

## Done when
- The two grep checks above print nothing before their deletions.
- `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` green (26/26 authz).
- `npm run build` succeeds (proves nothing dead was actually load-bearing).
- `graphify update .` run after landing.

## Execution prompt (paste into Sonnet)
> Execute docs/plans/refactor-phase-1-dead-weight.md in this repo. Run each verification grep BEFORE its deletion; abort that item if the grep finds live imports and report instead. Decision already made for imports/: [delete | move to design-reference/]. Finish with tsc, lint, test, build, then `graphify update .`. Commit as `chore(refactor): phase 1 — remove dead archive and design exports`.
