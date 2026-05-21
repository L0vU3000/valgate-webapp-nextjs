# Plan: Repeatable sync of `valgate-local-db-clean`

## Context

`valgate-local-db-clean` is a permanent companion branch to `valgate-local-db`. It always contains the exact same code as `valgate-local-db` but with `public/data/users/demo-user/` wiped — making it a clean empty-state reference for comparing against the populated branch and for manually walking user flows from a fresh-account state.

Every time new code lands on `valgate-local-db`, `valgate-local-db-clean` needs to be brought forward and re-wiped. This has been done manually and messily each time. The goal is a single command: `pnpm sync:clean`.

---

## Approach

Add two files:

### 1. `scripts/sync-clean.sh`

Shell script that does the full sync in one shot:

```bash
#!/bin/bash
set -e

echo "⟳ Syncing valgate-local-db-clean with origin/valgate-local-db..."

# Ensure we're on the clean branch (this script always runs in the porto worktree)
git checkout valgate-local-db-clean

# Pull latest source branch from remote
git fetch origin

# Reset this branch to match origin/valgate-local-db exactly
git reset --hard origin/valgate-local-db

# Wipe seed data — leave only the .gitkeep namespace anchor
rm -rf public/data/users/demo-user
mkdir -p public/data/users/demo-user
touch public/data/users/demo-user/.gitkeep

# Commit the wipe
git add public/data/users/demo-user/
git commit -m "chore: sync with valgate-local-db and wipe seed data"

# Force-push (clean branch always has one wipe commit on top of local-db tip)
git push --force-with-lease origin valgate-local-db-clean

echo "✓ Done — valgate-local-db-clean is up to date with no seed data."
```

### 2. `package.json` — add one script entry

```json
"sync:clean": "bash scripts/sync-clean.sh"
```

---

## Critical files

| File | Change |
|---|---|
| `scripts/sync-clean.sh` | **Create** — the sync script |
| `package.json` | **Edit** — add `sync:clean` script entry |

No other files touched.

---

## How it works each time

1. User commits + pushes new work on `valgate-local-db` (from `doha` or elsewhere)
2. In the `porto` worktree, run: `pnpm sync:clean`
3. Script fetches origin, resets this branch to `origin/valgate-local-db`, wipes `public/data/users/demo-user/`, commits, force-pushes

Result: `valgate-local-db-clean` is always exactly one commit ahead of `valgate-local-db` — the wipe commit.

---

## Verification

After running `pnpm sync:clean`:

```bash
git log --oneline -3
# Should show: wipe commit on top of latest valgate-local-db commit

ls public/data/users/demo-user/
# Should show: .gitkeep only

git diff origin/valgate-local-db...HEAD --stat
# Should show: only public/data/users/demo-user/ deletions
```
