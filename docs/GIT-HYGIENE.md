# Git Hygiene Policy

Goal: keep a clean, auditable history where `staging` is the integration trunk
and `main` is production. Feature work never strays, and nothing reaches
production without passing staging first.

## Diagram

- [Git Hygiene State Machine](https://excalidraw.com/#json=c5ko43nsbtZV1sTlKjr23,HxlMY5xkOYf54hiMMO48xQ) — simple flow: branch → confirm → merge/rebase → no strays.
- [Valgate Multi-Team Feature Flow](https://excalidraw.com/#json=KncU8D3fGEYArgpsJy-0i,pxvTJGYDqcpa31gqLBB33g) — full iOS / Web / Backend scenario map with failure paths.

## 1. Trunk

- `staging` is the integration trunk. **Every feature PR targets `staging`.**
- `main` is **production**. It only receives `staging → main` promotion PRs.
- Both branches are protected: required checks (strict), PRs required, no force
  pushes, no deletions. Direct commits to either are blocked by the ruleset.
- `release/launch-readiness` is retired — do not route work through it.

```
feature branch ──PR──▶ staging ──PR──▶ main (production)
```

| | staging | main (production) |
|---|---|---|
| Neon | `ep-tiny-rice-aozn7g4j-pooler` | `ep-wild-violet-aot0pvt7` |
| Clerk | `pk_test_…` | `pk_live_…` |
| URL | `valgate-webapp-git-staging-*.vercel.app` | `www.valgate.co` |

Two traps:

- **`vercel.json` `buildCommand` runs `npm run db:migrate` on every deploy,
  Preview included.** A PR into `staging` migrates the staging Neon branch; a
  promotion to `main` migrates production. Never promote a PR carrying a
  destructive or half-written migration.
- **`STAGING_DEMO_MODE=true` short-circuits Clerk auth** (`lib/api/v1/auth.ts`,
  `lib/auth/ctx.ts`) and grants unauthenticated `ORG-0001` owner access. It
  belongs on the Vercel **Preview** scope only. Production must never set it.

## 2. Feature branches and worktrees

- Start every feature or investigation from the latest `staging`:
  ```bash
  git fetch origin
  git checkout -b feature/<name> origin/staging
  ```
- Use descriptive branch names: `feature/<short-name>`, `fix/<issue>`,
  `spike/<topic>`, `docs/<topic>`.
- Keep the branch focused. One branch = one logical change.
- Keep the branch up to date by rebasing **locally** on top of `origin/staging`
  before merging:
  ```bash
  git fetch origin
  git rebase origin/staging
  ```
  **Never rebase commits that have already been pushed to a shared branch.**

## 3. When to commit

Commit when a **self-contained logical unit** is complete:

- The code compiles / type-checks.
- Tests related to the change pass.
- The change has a clear, explanatory message.
- There are no unrelated edits in the same commit.

Bad reasons to commit:
- “End of day” dump of unrelated changes.
- Saving broken work in progress (use `git stash` or a local draft branch
  instead).

Commit message format:
```text
<type>: <short summary>

Optional body explaining why and what.
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

## 4. When to push

Push when:

- You want to share the branch with another agent or environment.
- You are done with the feature and ready for integration.
- You are ending a session and the branch is in a clean, reviewable state.

Do **not** push if:

- The branch contains broken or incomplete commits you will rebase later.
- You plan to rebase the pushed commits (this rewrites shared history).

## 5. Returning to staging, then production

A feature is not done until it is back in `staging`. Open the PR against `staging`:

```bash
gh pr create --base staging --head feature/<name> --fill
```

Once it is green and verified on the staging deployment, promote:

```bash
gh pr create --base main --head staging \
  --title "release: promote staging to production" --fill
```

`main` takes **only** promotion PRs. Never open a feature PR against `main`.

Delete the feature branch after the `staging` merge:
```bash
git branch -d feature/<name>
git push origin --delete feature/<name>
```

## 6. Stray detection

The VPS worktree scanner checks for:

- Non-`staging` branches that are not merged into `staging`.
- Branches older than 7 days with no recent Conductor log.
- Dirty worktrees.
- Worktrees behind `origin/staging`.

When the scanner reports a stray, the next action is to either:

1. Confirm and merge/rebase the branch back to `staging`.
2. Abandon and delete the branch if the work is obsolete.

## 7. Conductor-specific rule

When Conductor on the Mac creates a feature worktree, it must log the branch
and intended merge target in the Conductor log `workspace_state`. At the end of
the session the log must say whether the branch was merged, rebased, or remains
open with a next action.
