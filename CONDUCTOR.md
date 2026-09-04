# Conductor workflow for this repo

## Session-end ritual

At the end of every Conductor session on the Mac, write a log file:

```
conductor-logs/YYYY-MM-DD-{project}-{brief-slug}.md
```

Use `conductor-logs/template.md` as the starting point. Fill in:
- `workspace_state`: repo, branch, commit, clean/dirty, Mac workspace path
- `session_summary`: one-paragraph summary
- `completed`: bullet list of concrete outcomes
- `blockers`: what is stuck and why
- `next_actions`: ordered next steps

Also mirror that file to your Obsidian vault for personal reference.

Commit and push the repo copy so the VPS watchdog picks it up.
