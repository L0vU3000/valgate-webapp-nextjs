# Git Hygiene Policy

Goal: keep a clean, auditable history where `main` is always the source of
truth and feature work never strays.

## Diagram

- [Git Hygiene State Machine](https://excalidraw.com/#json=c5ko43nsbtZV1sTlKjr23,HxlMY5xkOYf54hiMMO48xQ) — simple flow: branch → confirm → merge/rebase → no strays.
- [Valgate Multi-Team Feature Flow](https://excalidraw.com/#json=KncU8D3fGEYArgpsJy-0i,pxvTJGYDqcpa31gqLBB33g) — full iOS / Web / Backend scenario map with failure paths.

## 1. Trunk

- `main` is the single source of truth.
- `main` must stay green and deployable at all times.
- Direct commits to `main` are allowed only for trivial, safe, single-file
  changes (docs, templates, config comments). Anything risky or multi-file
  must go through a feature branch/worktree.

## 2. Feature branches and worktrees

- Start every feature or investigation from the latest `main`:
  ```bash
  git fetch origin
  git checkout -b feature/<name> origin/main
  ```
- Use descriptive branch names: `feature/<short-name>`, `fix/<issue>`,
  `spike/<topic>`, `docs/<topic>`.
- Keep the branch focused. One branch = one logical change.
- Keep the branch up to date by rebasing **locally** on top of `origin/main`
  before merging:
  ```bash
  git fetch origin
  git rebase origin/main
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

## 5. Returning to main

A feature is not done until it is back in `main`. Use:

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feature/<name>
git push origin main
```

`--no-ff` preserves the feature bubble in history so the merge point is easy to
find. For solo small fixes, a fast-forward merge is acceptable.

Delete the feature branch after merge:
```bash
git branch -d feature/<name>
git push origin --delete feature/<name>
```

## 6. Stray detection

The VPS worktree scanner checks for:

- Non-`main` branches that are not merged into `main`.
- Branches older than 7 days with no recent Conductor log.
- Dirty `main` worktrees.
- Worktrees behind `origin/main`.

When the scanner reports a stray, the next action is to either:

1. Confirm and merge/rebase the branch back to `main`.
2. Abandon and delete the branch if the work is obsolete.

## 7. Conductor-specific rule

When Conductor on the Mac creates a feature worktree, it must log the branch
and intended merge target in the Conductor log `workspace_state`. At the end of
the session the log must say whether the branch was merged, rebased, or remains
open with a next action.
