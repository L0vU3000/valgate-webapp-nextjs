# Vault Log

Append-only ledger of what entered or changed in the vault. Newest at the
bottom. Greppable timestamps — one line per entry:

`## [YYYY-MM-DD] <ingest|decision|lint> | <title>`

Adapted from Karpathy's LLM Wiki pattern — see
[[karpathy-llm-wiki-pattern]].

---

## [2026-07-15] ingest | Karpathy LLM Wiki Pattern
Saved the gist as `resources/karpathy-llm-wiki-pattern.md`. Adopted its
Ingest/Query/Lint workflow and this `log.md` into the vault framework
(`obsidian.md`).

## [2026-07-15] ingest | Core knowledge set seeded
Created the first pass of authored vault notes from agent memory + docs +
commit history: `resources/{gotchas,glossary,user-journeys,runbook}.md`,
`error-log.md`, `changelog.md`, `roadmap.md`, `open-questions.md`, and
`decisions/{neon-not-convex,client-permission-leader,ruthless-mvp-cut}.md`.
All linked from the `obsidian.md` Map of Content. Seeds — expand as you go.

## [2026-07-15] ingest | Words to avoid
Created `resources/words-to-avoid.md` — three bans (AI-slop vocab, dev-framing
leak words like MVP/v1, hype/overpromise) with scope table + alternatives.
Linked from the MoC. Needs a `CLAUDE.md` reference to actually bind AI output.

## [2026-07-15] decision | Bound words-to-avoid to AI output
Expanded `words-to-avoid.md` with more researched terms (business jargon,
intensity modifiers, opening/hedging phrases) and structural tells ("not just
X but Y", weak conclusions, em-dash overuse). Added a **Writing & copy** section
to `CLAUDE.md` referencing it — the ban now governs agent output, not just sits
in the vault. Slop ban also covers commits/PRs/comments/docstrings.

## [2026-07-15] ingest | words-to-avoid restructured + codebase categories
Rebuilt `words-to-avoid.md` around a **category system** (C1–C3 copy, K1–K6
codebase, X1 inclusive). Researched + added the codebase side: naming
anti-patterns (meaningless names, vague suffixes, Hungarian, confusing
booleans), comment/commit smells, and non-inclusive language replacements
(blacklist→denylist, master→primary/replica, sanity check→confidence check).
Updated the `CLAUDE.md` rule to cite categories by ID.

## [2026-07-15] ingest | Promoted 4 decisions from memory
Wrote ADRs from agent memory into `decisions/`:
`mcp-reuse-services-ctxfor`, `drizzle-only-hand-authored-migrations`,
`manager-led-onboarding`, `khmer-scan-self-consistency`. Linked from the MoC.
Also logged an open question: **reevaluate entities & fields after the scope
reduction** — it blocks `domain/property-model.md`, so domain ingest stays
deferred until that pass is done.

## [2026-07-15] ingest | Tasks board + Vision note
Added `tasks.md` (work board: active/planned/deferred/done, distinct from
roadmap + open-questions) and `vision.md` (Valgate concept + a dated "how it's
evolving" arc). Vision is a DRAFT assembled from code/docs/memory — owner to
correct. Both linked from the MoC.

## [2026-07-15] ingest | Agent-loop system scaffolded
Built `agent-loop/` — the agentic-engineering home: hub doc + `skills-library.md`
(installed loop toolkit, ranked by maker≠verifier), `orchestrator/` (router spec +
`inbox/`), first pipeline `pipelines/eslint-burndown/` (explore→plan→execute→eval,
eval = separate verifier), and `memory/` (changelog·decisions·errors) as the
self-improvement substrate. Vault pointer: [[agent-loop-system]] (linked from MoC).
Nothing runs unattended yet — next is the by-hand run to prove the loop closes.

## [2026-07-15] decision | Automated layer-freshness
Added a `Stop` hook in `.claude/settings.json` running `graphify update .` after
each turn (free/AST — verified it runs). Added explicit **vault update triggers**
and a "keeping the layers current" block to `CLAUDE.md`: graphify = auto (hook),
OpenWiki = manual `openwiki code --update` (LLM/tokens, never automated), vault =
by judgment. Rule inherited by all AI tools via the `AGENTS.md` symlink.

## [2026-07-15] error | OpenWiki manual run failed (401) + freshness correction
Ran `openwiki code --update`; failed 401 "User not found" (no local
`OPENROUTER_API_KEY`). Discovered OpenWiki is actually refreshed by CI
(`openwiki-update.yml`, daily 08:00 UTC, PR-based) — corrected the earlier
"manual only" claim in `CLAUDE.md`. Logged the incident in `error-log.md` and a
new watch item: OpenWiki CI writes `AGENTS.md`, which is now a symlink — may break
the single-source-of-truth (`open-questions.md`).

## [2026-07-16] decision | First task-specific scored Eval proven
Recorded bug-fix run `2026-07-16-144138`: 100/100 at a locked 85 threshold, zero critical
failures, unchanged rubric, and deterministic checks for every required failure route.

**2026-07-15 (Fable 5 executor).** Agent-loop build session: proved the bug-fix
pipeline on the co-owner data-loss ticket (hand run red→green, then the automated
workflow independently reproduced + fixed it); authored test-coverage / qa /
e2e-regression pipelines with researched verification techniques (coverage+mutation,
fresh-session browser re-drive, rerun-triage+quarantine); added
`check-machinery.sh` self-check. Error-log entry for the co-owner wipe; new
open-question on the Sole-Ownership switch behavior.

## [2026-07-15] ingest | Test-coverage pipeline proven
Completed the first test-coverage hand run on `portfolio-shared.ts`: 12 tests,
100% coverage, 100% mutation score (37/37 killed), and all global gates green.
Recorded the exact focused Stryker command and strengthened the dashboard check.

## [2026-07-15] decision | QA pipeline reuses the e2e browser fixture
Completed the first browser QA run, fixed the Mapbox WebGL crash and duplicate React keys,
and recorded the shared Playwright browser contract in an ADR. Logged the two bugs, the
remaining Add Property copy question, and the QA pipeline milestone.

## [2026-07-15] decision | Agent-loop pipeline categories
Defined planning, building, review, testing, maintenance, and delivery as routing metadata
over peer pipelines. Added the authoritative category contract, linked it from the vault,
and bound Claude Code and Codex to the agent-loop entry points through their shared root
instructions.

## [2026-07-15] shipped | feature pipeline + Sole-Ownership confirmed cleanup
Sixth agent-loop pipeline (`feature`, category building) proven by hand: acceptance tests
first, confirm dialog for co-owner cleanup on the Sole-Ownership switch (default Keep),
separate sonnet verifier passed 187/187 / tsc 0 / eslint 55→55.

## [2026-07-15] shipped | Service-backed analytics timeline
Ran the analytics wiring ticket through the existing feature pipeline. A seed-render test
proved the stale 2024 label red→green; the independent verifier passed 195/195 tests, tsc 0,
and eslint 55→55. The run confirmed that feature's acceptance-test contract covers wiring,
so no dedicated wiring pipeline is needed.

## [2026-07-16] decision | Entity scaffold requires an approved contract
Authored the `entity-scaffold` pipeline around one ordinary organization-scoped property
child. Recorded the boundary that automation implements an approved domain contract but
cannot choose entities or fields while the product scope review remains open.

## [2026-07-16] decision | Pipeline frontmatter is the registry source
Added [[pipeline-frontmatter-is-registry-source]] after a controlled registry mismatch passed
the old machinery check. The new pipeline-improve proof makes registry drift fail deterministically.

## [2026-07-16] decision | Plans define task-specific Eval scoring
Added `decisions/task-specific-eval-scoring.md`: every pipeline Plan now owns a locked 100-point
rubric; Eval passes only at threshold with zero critical failures.

## [2026-07-16] task | Eval scoring rollout checklist
Added a per-pipeline checklist under `.context/todos/` and linked the planned real-run calibration
work from `tasks.md`; `bug-fix` is next.

## [2026-07-16] shipped | Maintenance pipeline category completed
Registered `dependency-maintenance` and `performance-burndown` as the nineteenth and twentieth
agent-loop pipelines. Both remain approval-gated and await genuine work before proof.

## [2026-07-17] decision | Delivery pipelines wrap installed capabilities
Registered `landing`, `deploy`, `canary`, and `release` as risk-separated wrappers around installed
delivery skills. Added [[delivery-pipelines-wrap-installed-capabilities]] and kept every live action
behind explicit approval; all four await genuine work before proof.

## [2026-07-18] decision | Consumer release plan authored
Captured the single-owner, no-bug launch plan (6 phases: Pro teardown → known bugs →
product polish → data correctness → security → no-bug gate → prod ops) in
[[consumer-release-plan]]. Pro side is being removed entirely; iOS track planned
separately (Capacitor-wrap recommended).

## [2026-07-19] blocked | First supervised agent-loop shakedown halted at preflight
Machinery was RED at the door — `check-machinery.sh` → `FAIL pipeline-improve: executable
bounds are incomplete`, not the "all good" the brief assumed. Cause: an uncommitted edit to
`pipelines/pipeline-improve/workflow.js` removed `MAX_RUNTIME_MS` (Workflow runtime bans
`Date.now()`), but `check-machinery.sh:197` still greps for that literal token. Check and
workflow are out of sync — a real machinery bug, so the run stopped per the shakedown rule.
Also: the brief's inbox picture was stale — the documents-bulk-delete-bar item already ran
(wf_752f0da4) and FAILED eval (80/90, critical anti-drift: property-tabs D5 skip→pass), now in
`inbox/failed/`; only `feature-unlock-wizard` is genuinely queued. Wrote
[[agent-loop-operator-preflight]] — the checklist that catches exactly this.

## [2026-07-19] shakedown | First supervised agent-loop e2e-regression run — loop verified, item FAILed
Ran the first human-at-the-gates end-to-end pass on `feature-unlock-wizard` (run
`2026-07-19-005931`) after the preflight machinery fix. Staged by hand (the e2e-regression
workflow has no built-in plan gate) in worktree `e2e-run/feature-unlock-20260719-005654`:
explore→plan→[approve]→execute(opus)→eval(sonnet). Verdict FAIL 76/100 vs 85, 1 critical
(D5 skip-drift). The machinery passed its own test — the independent verifier correctly
rejected an incomplete fix. Two machinery gaps caught (verification-only short-circuits
de-flake tickets; worktree `--record` doesn't reach the live branch) and one real product
signal (G2 co-owner-wizard save error) — all in [[agent-loop-operator-preflight]] follow-ups
and agent-loop/memory/errors.md. Filed 2 follow-up inbox items (coowner-wizard save bug,
D5 Rental de-flake).

## [2026-07-19] shakedown | Second supervised run PASSED — and exposed a concurrency gap
Ran `entity-scaffold-startup-crash` through pipeline-improve (run `2026-07-19-023118`) under the
gated protocol: explore→plan→[approve]→execute(opus)→eval(sonnet)→independent gate-runner. Eval
100/100 vs 85, gate-runner corroborated (machinery green, vitest 231/231, tsc 0, eslint 47). The
fix — shape-based startup-crash detection in `improvement-digest.mjs` — landed as `1882c2cc`, the
clean-PASS half of the shakedown (the e2e run proved honest FAIL; this proved honest PASS with a
3-agent fail-closed check). Recording exposed a real machinery gap: a PARALLEL run
(`2026-07-19-015254`) had already claimed the same ticket and made a different valid fix — the
orchestrator has no in-progress claim/lock, so concurrent ticks duplicate work. Filed
[[2026-07-19-orchestrator-item-claim-lock]]. Two worktree-setup gotchas also logged: fresh
worktrees lack fumadocs-generated `.source` (breaks tsc), and node_modules symlink panics Turbopack
(use npm ci). See [[agent-loop-operator-preflight]].
