# Conductor Worklog

A disconnected-but-traceable log of Conductor sessions. One markdown file per session, written by Conductor on the Mac and read by Hermes on the VPS.

## How it works

1. **Conductor writes a log entry** at the end of every session using `template.md`.
2. **You sync it to the VPS** via Git (commit + push from Mac, pull on VPS worktree) or by copying the file.
3. **Hermes reads `conductor-logs/`** for context when you ask about Conductor work, blockers, or next steps.

## File naming

Use the pattern:

```
YYYY-MM-DD-{project}-{brief-slug}-{optional-sequence}.md
```

Examples:
- `2026-09-04-valgate-webapp-portfolio-table.md`
- `2026-09-05-valgate-webapp-documents-upload.md`

## Status values

- `completed` — session finished its goal
- `paused` — stopped mid-task, will resume
- `blocked` — needs input/approval/unblocking before continuing
- `spiked` — exploratory, outcome recorded but not shipped

## What to log

Keep it brief but searchable: goal, what changed, decisions, blockers, and next actions. Skip raw terminal output; this is a human-readable trace.

## Reading the log

Hermes can scan the folder chronologically or search by `project`, `task`, or `status` in the YAML frontmatter.
