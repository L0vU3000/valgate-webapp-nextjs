# Visual Plans — registry & process

Visual plans (the interactive `/visual-plan` artifacts) are created via the Plan MCP
connector and **live hosted** at `plan.agent-native.com` — they are **not** saved to
this repo automatically. This folder is the in-git home where we mirror them so they
survive in version control and can be reopened or handed off.

## My planning process (documented)

I plan and design in **Opus**, then execute the locked plan in a **separate Sonnet 4.6
chat** — especially for visual plans. Standard flow:

1. **Opus**: research the codebase, design with **Mobbin** references + **/impeccable**
   design language (`.impeccable.md`), and author the plan with `/visual-plan`.
2. Lock all decisions in the plan (remove the open-questions form; record the choices
   in a "decisions" callout) so the executor never re-litigates.
3. **Sonnet 4.6 (new chat)**: hand off a paste-ready execution prompt (see each plan's
   mirror file). Two forms:
   - **Connector form** — short; tells Sonnet to fetch the plan via the Plan MCP
     (`get-visual-plan` with the plan id). Use when `claude mcp list` shows
     `plan … ✓ Connected`.
   - **Self-contained form** — full spec inline; fallback when a session lacks the
     connector.
4. Mirror the plan here in `docs/plans/` and verify (`tsc` + `eslint`).

## Registry

| Plan ID | Title | Status | Local mirror | Hosted |
|---|---|---|---|---|
| `plan-67c3cb0d0a124317` | Documents — Sort & Filter the files list | review (approved, ready) | [documents-sort-filter.md](./documents-sort-filter.md) | [open](https://plan.agent-native.com/plans/plan-67c3cb0d0a124317) |
| `plan-49495c6076174abb` | Folder Rename & Delete — wire the missing CRUD | complete (shipped) | [folder-rename-delete.md](./folder-rename-delete.md) | [open](https://plan.agent-native.com/plans/plan-49495c6076174abb) |
| `plan-e843871968a64a74` | Revamp the Document detail view (Phase 1) | in_progress (Phase 1 shipped) | [document-detail-revamp.md](./document-detail-revamp.md) | [open](https://plan.agent-native.com/plans/plan-e843871968a64a74) |
| `plan-17ebdccb34444429` | Phase 2 — Real AI document summaries | approved (locked, ready) | [ai-document-summaries.md](./ai-document-summaries.md) | [open](https://plan.agent-native.com/plans/plan-17ebdccb34444429) |
| `plan-4ca4bf0139004604` | Phase 1 — Push Filtering into the Database (client perf) | complete (shipped) | [client-perf-phase1-db-filtering.md](./client-perf-phase1-db-filtering.md) | [open](https://plan.agent-native.com/plans/plan-4ca4bf0139004604) |
| `plan-c6176354a2424ac5` | Phase 2 — Request-Dedup with React cache() (client perf) | complete (shipped) | [client-perf-phase2-react-cache.md](./client-perf-phase2-react-cache.md) | [open](https://plan.agent-native.com/plans/plan-c6176354a2424ac5) |
| `plan-f95de0eb04df4a79` | Phase 3 — Cross-Request Cache with unstable_cache + Tags (client perf) | complete (Cuts 1–3 shipped; `getProgressContext` deferred) | [client-perf-phase3-unstable-cache.md](./client-perf-phase3-unstable-cache.md) | [open](https://plan.agent-native.com/plans/plan-f95de0eb04df4a79) |

> The Plan MCP tools return only a link (or truncated text) for plans not authored in
> the current session, so full local mirrors are written **at authoring time**.

## How to back up a plan to this folder

- **Best:** write the mirror when the plan is created (full content is in context).
- **List all plans:** Plan MCP `list-visual-plans`.
- **Fetch one:** `get-visual-plan` / `get-plan-feedback` with the plan id (returns the
  plan markdown; the canvas/wireframes stay hosted).
- **True auto-local:** set `AGENT_NATIVE_PLANS_MODE=local-files` to author future plans
  as local MDX folders — but that drops the hosted review UI/commenting, so we keep
  hosted + mirror here instead.

## Auto-mirror reminder (hook)

A `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/plan-mirror-reminder.sh`)
fires when a visual plan is **created** or **finalized** (status set to `approved` /
`complete`) and reminds the agent to mirror it into this folder. It stays silent during
iterative edits. The Agent-Native CLI can't pull a hosted plan by id, so the hook nudges
the agent (which fetches via the Plan MCP and writes the file) rather than exporting
directly. Hooks load at session start — restart/reload Claude Code for changes to apply.
To make it personal-only instead of repo-shared, move the `hooks` block to
`.claude/settings.local.json`.
