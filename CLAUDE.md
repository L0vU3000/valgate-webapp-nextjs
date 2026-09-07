# Conductor SOP — Valgate Cross-Machine Sync

This file is loaded by Claude Code as project instructions.

## End every working session with

1. **Commit all code changes** to the current feature branch.
2. **Write a session log** in `conductor-logs/YYYY-MM-DD-<task>.md` with YAML frontmatter:
   ```yaml
   ---
   date: 2026-09-06
   task: short description
   status: in_progress | blocked | done
   blockers:
   next_actions:
   workspace_state:
     mac_path: /Users/mintrose/conductor/workspaces/<repo>/<worktree>
     branch: L0vU3000/<branch>
     commit: abc1234
     clean: true
   ---
   ```
3. **Push the feature branch** to GitHub.

## Shared memory

- `.claude/settings.json` registers the Hindsight MCP server at `http://100.77.9.23:8081/sse`.
- The `sessionstart` hook runs at session start and injects relevant Hindsight context.
- The `userpromptsubmit` hook injects delta context, throttled to once every 30 seconds.
- Use natural language to recall prior work; do not rely on exact ID lookups.

## Asking Hermes for help

- Hermes can query live Mac worktree state at `http://100.92.171.48:8082/state`.
- To update the canonical registry, ask Hermes to run `python3 /home/hermes/.hermes/scripts/update-worktree-state.py`.
- To verify the whole sync system, ask Hermes to run `python3 /home/hermes/.hermes/scripts/valgate-sync-evals.py`.

## Safety rules

- Do not merge `main` into a feature branch unless explicitly asked.
- When adding `.claude/` config to a new worktree, use `git checkout origin/main -- .claude/` and commit only those files.
- Keep commits focused; do not commit `__pycache__` or build artifacts.
