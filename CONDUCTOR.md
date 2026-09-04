# Conductor Session Logging

This repo uses `conductor-logs/` as the handoff surface between Conductor on the Mac and Hermes on the VPS.

## Rule

At the end of every Conductor session — including wireframes, spikes, bug fixes, refactors, and feature work — write a session log entry before closing the workspace.

## Required log location

Write the log in **both** places:

1. **This repository's `conductor-logs/` directory** (so Hermes on the VPS can read it after a pull)
2. **Your local Obsidian vault** at `/Users/mintrose/Dev/Projects/work/Valgate/Resources/Valgate Dev Vault/Conductor Logs/` (for your own reference)

Use the same filename in both locations.

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
   - `workspace_state` — object with:
     - `repo` — `valgate-ios`, `valgate`, or `valgate-webapp-nextjs`
     - `branch` — current branch name
     - `commit` — current short SHA
     - `clean` — `true`/`false`
     - `mac_path` — absolute workspace path on the Mac
3. Keep it brief but searchable. No raw terminal dumps.
4. **Commit and push** the log file from the repo worktree so Hermes can read it on the VPS.

## Diagrams and shared docs

If you create or update architecture diagrams (`.excalidraw` files) under `docs/diagrams/`,
mirror them to the Obsidian vault as well:

```
/Users/mintrose/Dev/Projects/work/Valgate/Resources/Valgate Dev Vault/Diagrams/
```

Use the same filename so the vault always matches the repo. This keeps the whole team
(Mac + VPS) looking at the same diagrams.

## Why

Conductor runs on a Mac workspace; Hermes runs on the VPS. These logs and diagrams are the
single source of truth for what changed, what was decided, and what is blocked across both
environments.

## See also

- `docs/GIT-HYGIENE.md`
- `conductor-logs/README.md`
- `conductor-logs/template.md`
- `vault/worktree-state.md` (cross-repo state registry)
