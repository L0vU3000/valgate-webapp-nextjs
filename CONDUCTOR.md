# Conductor Session Logging

This repo uses `conductor-logs/` as the handoff surface between Conductor on the Mac and Hermes on the VPS.

## Rule

At the end of every Conductor session — including wireframes, spikes, bug fixes, refactors, and feature work — write a session log entry before closing the workspace.

## How

1. Copy `conductor-logs/template.md` to a new file named:
   ```
   conductor-logs/YYYY-MM-DD-{project}-{brief-slug}.md
   ```
2. Fill in the YAML frontmatter:
   - `date`
   - `project` — e.g. `valgate-ios` or `valgate-webapp`
   - `task` — short human-readable name
   - `status` — `completed`, `paused`, `blocked`, or `spiked`
   - `related_files` — every file, branch, PR, or deliverable created or changed
   - `blockers` — empty array if none
   - `next_actions` — what happens next, even if nothing
3. Keep it brief but searchable. No raw terminal dumps.
4. Commit the log file and push it so Hermes can read it on the VPS worktree.

## Why

Conductor runs on a Mac workspace; Hermes runs on the VPS. These logs are the single source of truth for what changed, what was decided, and what is blocked across both environments.

## See also

- `conductor-logs/README.md`
- `conductor-logs/template.md`
