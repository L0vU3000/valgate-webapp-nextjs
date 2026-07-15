# Decisions — agent-loop system (ADRs)

> Why the loop is built the way it is. Newest first. One entry per load-bearing choice.
> Format: `## [YYYY-MM-DD] <decision>` → **Context / Choice / Why / Revisit-if**.

## [2026-07-15] eslint-burndown is pipeline #1 (training wheels)
- **Context:** repo is healthy — `tsc` 0 errors, `vitest` 165/165 green, `eslint` 63
  warnings. Only lint has a real backlog.
- **Choice:** first pipeline drains eslint warnings, not a feature or the authz suite.
- **Why:** pipeline #1's real product is a *working, trusted loop* — not the fixes. Lint
  gives an airtight monotonic check (warning count ↓), zero DB risk, and a mistake costs
  nothing. A green suite (authz) is a good check but an empty backlog.
- **Revisit if:** lint hits 0 → promote to pipeline #2 (bug-fix, e.g. co-owner data-loss).

## [2026-07-15] Stay independent of external tools — drop `paseo-loop`
- **Context:** `paseo-loop` gave the strongest maker≠verifier separation, but it wraps the
  third-party **Paseo daemon** (`~/.local/bin/paseo`, installed separately). If Paseo is ever
  uninstalled, any pipeline depending on it breaks.
- **Choice:** agent-loop uses **built-in primitives only** — `Workflow` (execute→eval,
  loop-until pass, separate `agent()` per stage) as the runtime, `/loop`+`/schedule` as the
  trigger. No `paseo-loop`, no external daemon.
- **Why:** the system must survive the removal of any other tool. Independence > the marginal
  cross-provider benefit paseo offered.
- **How we keep the separation natively:** `execute` and `eval` are separate agent spawns
  (own context; verifier sees only the diff + check output). Optional extra separation: run
  eval on a different model via `agent(..., {model})`.
- **Revisit if:** a built-in engine offers stronger separation, or we decide a documented
  optional paseo dependency is worth it.

## [2026-07-15] Rank loop tools by maker≠verifier, not features
- **Context:** we own `/build-loop`, `/code-build-loop`, `/optimisation-loop`, `/loop`,
  `/schedule` (plus the built-in `Workflow` / `Task` primitives).
- **Choice:** author with `/build-loop`; `/optimisation-loop` for metric pipelines;
  `/code-build-loop` only with a bolted-on separate verifier; runtime = built-in `Workflow`.
- **Why:** the one principle all experts share is that the maker must not grade itself.
- **Revisit if:** a new engine offers stronger verification separation.

## [2026-07-15] Build one pipeline first, orchestrator second
- **Choice:** prove a single pipeline closes its loop by hand before building the
  always-on router over many pipelines.
- **Why:** the orchestrator is trivial once a pipeline works, and worthless before. Don't
  build the self-driving car on day one (autonomy slider).

## [2026-07-15] "Keep running" = scheduled heartbeat, not infinite loop
- **Choice:** orchestrator wakes on a cadence (`/loop` / `/schedule`), checks the inbox,
  dispatches, sleeps — it does not spin a raw `while(true)`.
- **Why:** ~100x cheaper and safer; matches Anthropic's time-based/proactive loop types.
