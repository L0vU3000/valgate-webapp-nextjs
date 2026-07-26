---
name: "Orchestrate: state what you want, it runs the loop"
description: The single agent-loop door. Say what you want in plain language; it drafts a checked inbox item, files it, dispatches the pipeline, and records the outcome — stopping only at approval gates.
category: Workflow
tags: [agent-loop, orchestrator, inbox, dispatch]
---

The **one** command for the agent-loop. The user states what they want; you do the rest —
turn it into a checked work item, file it, dispatch the pipeline, record the result. The only
stops are the two human gates that are load-bearing by design.

**Read first:** `agent-loop/orchestrator/orchestrator.md` (dispatch contract) and
`agent-loop/categories.md` (valid category→type pairs, which pipelines are approval-gated).

**Input** — the argument after `/orchestrate`:
- **plain-language request** (the normal case) → intake it, file it, then run it.
- `plan` → dry-run: print the dispatch plan for the current inbox and stop. Change nothing.
- (nothing) → run one tick over whatever is already queued in the inbox.

---

## A) Request given → intake, file, dispatch (the main path)

1. **Understand the request. Ask only if you must.** Decide the single pipeline `type` it maps to
   (table below). If it is too vague to pick a type or write a testable "Done" line, ask **1–3
   targeted questions** (AskUserQuestion) — no more. If it clearly spans two pipelines, say so and
   split it into two items.

2. **Draft to a scratch path**, never straight to the inbox:
   `.context/inbox-drafts/YYYY-MM-DD-<slug>.md`
   ```markdown
   ---
   category: <category>     # must match the type
   type: <type>             # the routing key
   priority: <low|normal|high>
   created: <YYYY-MM-DD>
   ---

   # <one-line objective>

   "Done" = <a concrete exit condition a fresh verifier could check without the user>.

   ## Evidence / context
   - <file paths, a repro, a run id — where the worker should look>

   ## Do NOT
   - <the masking/gaming fixes to forbid>
   ```

3. **Check it deterministically** — the gate that guarantees the file has what routing needs:
   ```bash
   node agent-loop/orchestrator/check-work-item.mjs .context/inbox-drafts/<file> --json
   ```
   Fix and re-run until it PASSes. Then apply the judgment the checker can't: the "Done" line is
   actually **verifiable** (measurable, not "works better"), scope is **one** pipeline, and the
   boundaries forbid the obvious gaming shortcut.

4. **Confirm once.** Show the user the finished file and the PASS line. Use AskUserQuestion:
   **file & run / edit / cancel**. This single confirmation is the "approve the plan" gate — don't
   skip it, don't ask more than this.

5. **File it, then dispatch it.** On go-ahead:
   ```bash
   mv .context/inbox-drafts/<file> agent-loop/orchestrator/inbox/<file>
   node agent-loop/orchestrator/tick.mjs            # routes + refreshes board & backlog
   ```
   Then run the just-filed item's pipeline on the Workflow runtime:
   ```
   Workflow({ scriptPath: "agent-loop/pipelines/<pipeline>/workflow.js" })
   ```
   passing the inbox item path as `args` when the pipeline expects a ticket (the tick's AGENT
   ACTIONS block shows it). Honor that pipeline's `pipeline.md` bounds and its maker≠verifier split.

6. **Record the outcome.**
   ```bash
   node agent-loop/orchestrator/dispatch.mjs --record <inbox-file> <pass|fail> --summary "<one line>"
   ```

7. **Report:** what you filed, where it routed, the verdict, and anything paused awaiting approval.

## B) `plan` → dry-run
```bash
node agent-loop/orchestrator/dispatch.mjs
```
Print the plan (routable + invalid) and stop. Change nothing.

## C) No argument → run a tick over the existing inbox
```bash
node agent-loop/orchestrator/tick.mjs
```
Then, for each routable item in the printed AGENT ACTIONS block, do steps 5–6 above (dispatch +
record). Print each invalid item for correction; never guess a fix.

---

## The second gate: approval-gated pipelines

`entity-scaffold`, `pipeline-improve`, and the delivery four (`landing`, `deploy`, `canary`,
`release`) **stop after Plan** by design. When a run pauses awaiting approval:
- Surface the plan (or migration / merge / deploy / release request) to the user.
- **Do not** resume with the approval flag yourself. Wait for the user's explicit go, then resume
  with the same run id plus the pipeline's approval flag.

## Valid category → type pairs (routing keys — NOT pipeline folder names)

| category | type |
|---|---|
| `planning` | `spec` · `research` · `technical-plan` |
| `building` | `bug` · `feature` · `entity` · `wiring` · `migration` · `api-tool` |
| `testing` | `test` · `qa` · `e2e` |
| `maintenance` | `lint` · `pipeline-improve` · `dependency` · `perf` |
| `review` | `code-review` · `design-review` · `security-review` · `architecture-review` |
| `delivery` | `landing` · `deploy` · `canary` · `release` |

Gotcha: `type: bug` → `bug-fix`, `type: entity` → `entity-scaffold`, `type: lint` →
`eslint-burndown`, `type: perf` → `performance-burndown`. The checker lists valid types if you pick
a wrong one — trust it over memory.

## Guardrails (non-negotiable — from `orchestrator.md`)

- **Never file an item the checker fails.** The check is the gate, not a formality.
- **One bounded piece of work per item.** Split anything spanning two pipelines. Don't pad an item
  with scope the user didn't request.
- **Isolation:** every dispatched pipeline runs in its own git worktree. Never on the live branch,
  never two pipelines in one tree.
- **Data safety:** any pipeline that writes data uses a **Neon dev branch**, never prod, and
  **never `seed:reset`**.
- **Bounded:** honor each pipeline's max-iterations / max-time. No open-ended runs.
- **Two gates only:** the user confirms the drafted item (start) and reviews the result (end).
  Everything between is automated. Do not self-approve a gated pipeline.
- **One tick per invocation.** To run on a cadence: `/loop 30m /orchestrate` or a `/schedule`
  routine — each firing is still one gated pass.
