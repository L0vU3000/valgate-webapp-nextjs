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
| `plan-e40b6ac387ea480f` | Phase 4 — Shared Read Cache with Upstash (Vercel-native, client perf) | complete (all 17 wrappers on readThrough; bustCache wired into every mutating action; shipped 2026-06-29) | [client-perf-phase4-redis.md](./client-perf-phase4-redis.md) | [open](https://plan.agent-native.com/plans/plan-e40b6ac387ea480f) |
| `plan-0ddab424743d45dd` | Manager-led client onboarding — Phase 1 (create-on-behalf + invite) | approved (locked, ready) | [manager-led-client-onboarding-phase1.md](./manager-led-client-onboarding-phase1.md) | [open](https://plan.agent-native.com/plans/plan-0ddab424743d45dd) |
| `plan-5f2dec9315c9422e` | Manager-led onboarding — Phase 2: Rich property population | complete (P0–P2 shipped) | [manager-led-client-onboarding-phase2.md](./manager-led-client-onboarding-phase2.md) | [open](https://plan.agent-native.com/plans/plan-5f2dec9315c9422e) |
| `plan-32c33a89a3f34747` | Manager-led onboarding — Phase 3 finish line + ship | approved (locked; retainAccess reconciliation left) | [manager-led-client-onboarding-phase3-finish.md](./manager-led-client-onboarding-phase3-finish.md) | [open](https://plan.agent-native.com/plans/plan-32c33a89a3f34747) |
| `plan-c9fe358d379f4805` | Manager-led onboarding — Push, green tsc, Phase 3 lifecycle | review (ready) | [manager-led-client-onboarding-phase3-ship.md](./manager-led-client-onboarding-phase3-ship.md) | [open](https://plan.agent-native.com/plans/plan-c9fe358d379f4805) |
| `plan-facd0e1c8f29410c` | Manager-led onboarding — Phase 5: create portfolio before inviting | review (decisions locked) | [manager-led-client-onboarding-phase5.md](./manager-led-client-onboarding-phase5.md) | [open](https://plan.agent-native.com/plans/plan-facd0e1c8f29410c) |
| `plan-8de51d03a2de40d7` | Manager-led onboarding — Phase 6: multi-user portfolios & member roles | review (decisions locked) | [manager-led-client-onboarding-phase6.md](./manager-led-client-onboarding-phase6.md) | [open](https://plan.agent-native.com/plans/plan-8de51d03a2de40d7) |
| `plan-165eb8aa8364429a` | Unify Clients + Portfolios on /pro/clients (client↔org link + 20-invite cap) | complete (shipped, build green) | [unify-clients-portfolios.md](./unify-clients-portfolios.md) | [open](https://plan.agent-native.com/plans/plan-165eb8aa8364429a) |
| `plan-2ba8eb361caf494f` | Client as permission leader — Phase 1 (permission flip on accept + onboarding choice) | approved (locked, ready) | [phase1-client-permission-leader.md](./phase1-client-permission-leader.md) | [open](https://plan.agent-native.com/plans/plan-2ba8eb361caf494f) |
| `plan-5d5ce2f2a25b4fdd` | Client as permission leader — Phase 2 (change-request loop on Properties) | complete (shipped; defaults applied) | [phase2-change-request-loop.md](./phase2-change-request-loop.md) | [open](https://plan.agent-native.com/plans/plan-5d5ce2f2a25b4fdd) |
| `plan-75c88ebd725948db` | Client as permission leader — Phase 3 (generalize: all entities + create/update/delete) | review (2 open Qs, defaults recommended) | [phase3-generalize-change-requests.md](./phase3-generalize-change-requests.md) | [open](https://plan.agent-native.com/plans/plan-75c88ebd725948db) |
| `plan-5157d28c4ef143fc` | Notifications Panel — Empty State (quiet-beacon design) | review (decisions locked, not yet implemented) | [notifications-empty-state.md](./notifications-empty-state.md) | [open](https://plan.agent-native.com/plans/plan-5157d28c4ef143fc) |
| `plan-f51f6b5374e3461d` | Unified "Add Client" Modal — Phase 1 (merge Onboard + Add account behind a chooser) | approved (decisions locked, ready) | [unified-add-client-phase1.md](./unified-add-client-phase1.md) | [open](https://plan.agent-native.com/plans/plan-f51f6b5374e3461d) |
| `plan-e389da3d972b4a2a` | Properties register — group by owner (My Portfolio + per-client bands) | shipped (defaults A/A/A/A; tsc+eslint green, QA pending) | [pro-properties-group-by-owner.md](./pro-properties-group-by-owner.md) | [open](https://plan.agent-native.com/plans/plan-e389da3d972b4a2a) |
| `plan-c7d2f442eed74dff` | Edit Client / Portfolio Details — Pro cockpit CRUD (Edit drawer + updateClient) | review (4 open Qs, defaults recommended) | [edit-client-details.md](./edit-client-details.md) | [open](https://plan.agent-native.com/plans/plan-c7d2f442eed74dff) |
| `plan-be3fd434c3d145c7` | MCP User JIT-Provisioning | review (open decision: org strategy) | [mcp-jit-provisioning.md](./mcp-jit-provisioning.md) | [open](https://plan.agent-native.com/plans/plan-be3fd434c3d145c7) |
| `plan-f25c07c2625443d1` | MCP Connect — Login & Consent UI | review (4 decisions locked; 3 UI open questions) | [mcp-connect-login-consent-ui.md](./mcp-connect-login-consent-ui.md) | [open](https://plan.agent-native.com/plans/plan-f25c07c2625443d1) |
| `plan-5a3f987798d547de` | Connect Claude — in-app MCP setup (Settings entry + setup Sheet) | review (decisions locked; 1 open Q: connection status/disconnect) | [mcp-connect-inapp-page-execution.md](./mcp-connect-inapp-page-execution.md) | [open](https://plan.agent-native.com/plans/plan-5a3f987798d547de) |
| `plan-3deabd47a4584c60` | Align Client ↔ Manager — one audited write path + full parity | review (2 decisions locked; 3 open questions) — OpenSpec `align-client-manager-parity` | [align-client-manager-parity.md](./align-client-manager-parity.md) | [open](https://plan.agent-native.com/plans/plan-3deabd47a4584c60) |
| `plan-95de3067059e4a7b` | Revamp Client Financials Tab → Rent & Collections workspace | in_progress (defaults locked, implemented; tsc+eslint green, QA pending) — OpenSpec `revamp-client-financials-tab` | [revamp-client-financials-tab.md](./revamp-client-financials-tab.md) | [open](https://plan.agent-native.com/plans/plan-95de3067059e4a7b) |
| `plan-f0e4ae8b4dc74635` | Revamp Client Work Orders Tab → Maintenance workspace | in_progress (defaults locked, implemented; tsc+eslint green, QA pending) — OpenSpec `revamp-client-work-orders-tab` | [revamp-client-work-orders-tab.md](./revamp-client-work-orders-tab.md) | [open](https://plan.agent-native.com/plans/plan-f0e4ae8b4dc74635) |
| `plan-b85fc528225749b7` | Revamp Client Compliance Tab → Compliance workspace | in_progress (defaults locked, implemented; tsc+eslint green, QA pending) — OpenSpec `revamp-client-compliance-tab` | [revamp-client-compliance-tab.md](./revamp-client-compliance-tab.md) | [open](https://plan.agent-native.com/plans/plan-b85fc528225749b7) |
| `plan-9fbe4bdd5e7f4caa` | Revamp Client Activity Tab → day-grouped timeline + real audit log | review (4 open questions, defaults recommended; not yet implemented) — OpenSpec `revamp-client-activity-tab` | [revamp-client-activity-tab.md](./revamp-client-activity-tab.md) | [open](https://plan.agent-native.com/plans/plan-9fbe4bdd5e7f4caa) |

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
