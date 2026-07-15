# Changelog — agent-loop system

> What changed in the loop machinery and when. Newest first. One entry per change.
> Format: `## [YYYY-MM-DD] <what changed>` + a line or two of why.

## [2026-07-16] entity-scaffold pipeline authored behind a product-scope gate
Added the seventh pipeline, `entity-scaffold` (`category: building`, `type: entity`). It handles
one approved org-scoped property child through Zod, Drizzle, an additive generated migration,
service, Server Actions, seed fixture, and tenant-isolation integration tests. The workflow
enforces a training stop after Plan and refuses speculative or structurally different entity
work. No product entity was added: the current scope review has not approved one, so the first
real proof remains pending instead of fabricating schema to exercise the machinery.

## [2026-07-15] Analytics timeline wired through the feature pipeline
Hand run `2026-07-15-233502` rejected four already-wired starting candidates, then found a
real stale claim on `/analytics`: `MARCH 2024 - AUGUST 2024` beside a chart built from
service-backed payment and expense records. Explore wrote a seed-render acceptance test red;
Execute added `computeRevenueTimelineLabel`, exposed one narrowed query field, and removed the
adjacent stale `(YTD)` marker; a separate verifier passed focused 4/4, suite 195/195, tsc 0,
and eslint 55→55. The `feature` pipeline fit wiring cleanly: its acceptance test expressed
data provenance directly and its existing eval gates were sufficient, so a dedicated `wiring`
pipeline is still not warranted.

## [2026-07-15] First wired surface shipped via the feature pipeline (WIRE-001)
The pivot from building the machine to building the app: ran a wiring ticket through the
already-proven `feature` pipeline (no new pipeline). Target surface — the `/settings` Profile
"Security Recommendation" banner, which rendered a fabricated `securityNote` ending in the dummy
literal `Next change suggested by Jan 15, 2024`. Hand run `2026-07-15-234f1656-securitynote` in a
worktree: acceptance test `lib/security-note.test.ts` red for the right reason ("Cannot find module
./security-note") → built pure `lib/security-note.ts` (`buildSecurityNote({ lastLogin, memberSince })`
+ `PASSWORD_ROTATION_DAYS`, deriving the date from a real `user_profiles` timestamp + policy, omitting
the sentence when no anchor exists) → wired `app/(shell)/profile/queries.ts` to call it → green. A
separate **sonnet** verifier (maker was opus) ruled PASS, independently reproducing the red state and
confirming provenance: acceptance 4/4, suite 191/191, tsc 0, eslint 55→55, `Jan 15, 2024` gone from
product code.

**Did the feature pipeline fit wiring, or fight it?** Mostly fit — `explore` writing the acceptance
test as the spec maps cleanly onto "prove the fake value is gone and the real one appears," and the
red→green + global gates are exactly right. One friction point: the criteria say *render the surface
with real seed data*, but this repo's vitest is node-only (no jsdom) and can't even import the query
layer (Clerk `auth()` → `server-only` throws at import), so a literal DOM render is impossible. The
honest altitude here was to extract the derivation into a pure function and test that — which also made
the wiring cleaner. Data-provenance was expressible as ordinary acceptance assertions (derived date
present + fabricated literal absent + omitted-when-empty). Conclusion: the `feature` pipeline covers
wiring well enough that a dedicated `wiring` pipeline is **not** warranted yet (YAGNI). The one thing a
future `wiring` pipeline would add is a first-class "no hardcoded value survives in the surface" grep
check and a render harness — fold those into `feature`'s eval if wiring tickets become common.

## [2026-07-15] e2e-regression authored; 2×-green proof deferred
The first hand run triaged 15 failures and found none were product regressions: they were
stale scope-cut specs (the Directory/Pro surfaces were cut to the MVP core, so their routes
intentionally 404) plus a flaky S3 HEAD check that probes a fabricated key in a private
bucket. Deferred the required reruns rather than chasing them. Excluded the Directory/Pro
specs from the active owner-facing Playwright project (kept in git with a `scope-cut`
comment) and defaulted `E2E_VERIFY_S3` off in `e2e/helpers/verify.ts`. Pipeline status:
**authored — proof deferred.**

## [2026-07-15] feature pipeline built and proven by hand (Sole-Ownership confirmed cleanup)
Sixth pipeline: `feature` (`category: building`, `type: feature`), copied from `bug-fix`
with `explore` reshaped to *specify* — the ticket's acceptance criteria become failing
tests before any product code changes. Hand run 2026-07-15-213903: acceptance test
("explicit Remove deletes exactly the saved co-owners") red for the right reason → built
the confirm in `OwnershipUnlock.tsx` (schema flag `removeCoOwnersOnSoleSwitch`, Keep/Remove
radios in the structure step, delete-only-on-explicit-true in the skipped-step branch) →
eval (separate sonnet verifier) iteration 1 ruled fail on suite pollution (stale
`.context/*-worktree-*` scratch repos matched vitest's glob), iteration 2 passed after the
one-line `**/.context/**` exclude: acceptance 4/4 red→green, suite 187/187, tsc 0, eslint
55→55. Registered `feature` in the routing table and pipelines README; ticket moved to
done/.

## [2026-07-15] Added pipeline categories and bound the agent entry points
Added `categories.md` as the routing-policy source of truth; classified the five current
pipelines; updated the orchestrator registry and inbox contract; and linked the decision
through the Obsidian vault. The shared Claude Code and Codex instructions now send both
agents to the agent-loop home, categories, pipeline contract, router, and memory before
they reason about the system.

## [2026-07-15] QA pipeline proven by hand
Completed run `2026-07-15-160345` across six routes and two interactive flows. Fixed a
WebGL capability crash and duplicate React keys; fresh-session verification passed 8/8
flows with 183/183 tests, tsc 0, and eslint 55→55. Corrected the pipeline to DEMO port
3001 and current nested property routes, reused the established browser fixture, required
physical worktree dependencies for Turbopack, added network cleanliness to the workflow
schema, and restored independent eval for clean exploration runs.

## [2026-07-15] test-coverage pipeline proven by hand
Completed run `2026-07-15-152837` against `lib/services/portfolio-shared.ts`. Added 12
focused tests; coverage moved 0%→100% across statements, branches, functions, and lines;
Stryker killed all 37 mutants (100%, threshold 80%). Full suite 180/180, tsc 0, eslint
55→55. The run taught the pipeline to pin both `--testRunner vitest` and the target's
dedicated `--testFiles` during mutation eval. Fixed the dashboard's hard-coded lint
summary after this run exposed it, and added a coverage-verdict regression fixture to the
machinery self-check.

## [2026-07-15] Dropped paseo-loop — built-in primitives only
Removed the `paseo-loop` dependency (it needs the external Paseo daemon). Runtime is now
the built-in `Workflow` (separate `execute`/`eval` agents, loop-until pass) + `/loop` for
the trigger. agent-loop is now self-contained — survives uninstalling any other tool. See
[decision](./decisions.md). Updated `skills-library.md`, `pipeline.md`, `agent-loop.md`.

## [2026-07-15] Scaffolded the orchestrator + first pipeline
Built the agreed design: an `orchestrator/` (router + `inbox/`), a `pipelines/`
folder, and the first pipeline **eslint-burndown** (explore → plan → execute →
eval, with eval as a *separate* verifier). Added `skills-library.md` (the toolkit
we assemble from) and this `memory/` mini-vault. Nothing runs unattended yet —
next step is the by-hand run to prove the loop closes.
Decision context: see [`decisions.md`](./decisions.md).

## [2026-07-14] Research + design phase
Built `agent-loop.md` (loop anatomy, 4 loop types, autonomy slider) and the
`resources/` library (8 authors: Willison, Karpathy, Cherny, Anthropic, Horthy,
vendor guides, IndyDevDan, ReAct). Chose the orchestrator-worker architecture.

## [2026-07-15] First by-hand run of eslint-burndown — loop closes
Ran explore→plan→execute→eval by hand (run 2026-07-15-01). Removed 8 unambiguous unused
imports; eval passed: eslint 65→57, tsc 0, vitest 165/165. Proved the loop closes with a
separate, evidence-backed verdict. Deferred (correctly): 17 NOT_IMPLEMENTED_UNTIL_B6
markers, scoped* helpers (possible IDOR symptom), symptom-class params/state, and
behavior-changing rules (exhaustive-deps, no-img-element). No regressions → errors.md stays empty.

## [2026-07-15] Automated eslint-burndown as a Workflow + added a live dashboard
Wrote `pipelines/eslint-burndown/workflow.js` (built-in Workflow: explore then plan→execute
→eval looped, code-driven bounds, eval on a separate model). First automated run passed on
its own (run 2026-07-15-02: eslint 63→55, no regressions). Added `dashboard.md` +
`scripts/update-dashboard.sh` — a generated live view (running/queued/completed) derived from
inbox + run folders, so it can't drift. dashboard.md is gitignored (regenerated view).

## [2026-07-15] Fixed run-folder fragmentation; first errors.md entries
Self-improvement loop caught 2 real issues on the first automated run: stage agents
invented separate run-ids (stray runs/03 fragment) and the dashboard misread it as running.
Threaded a shared runId through workflow.js (explore mints it, all stages use it). Logged
both in errors.md with prevention notes to fold into pipeline #2's authoring.

## [2026-07-15] Scaffolded pipeline #2 (bug-fix) + queued the co-owner bug
Built pipelines/bug-fix (explore=reproduce+failing test, plan, execute=maker,
eval=separate verifier that requires the new test red→green + full suite/tsc/eslint clean).
workflow.js threads a shared runId from the start (errors.md lesson applied). Queued the
first ticket: co-owner data loss in the Ownership wizard (skipped Co-owners step wipes
existing co-owners — data loss, DB-touching, Neon dev branch only). Registered `bug` in the
orchestrator routing table.

## [2026-07-15] bug-fix proven by hand; automation run started (Fable 5 executor session)
Hand run 2026-07-15-140108: reproduced the co-owner data-loss (OwnershipUnlock
`onSubmitData` deletes all co-owners whenever `holdingType === "Sole Ownership"` — the
exact condition that *skips* the Co-owners step). Regression test
`components/feature-unlock/pillars/OwnershipUnlock.test.ts` went red for the right reason
(removeCoOwner called for COOWN-0001/0002) → fix (skip = no reconcile) → green; suite
167/167, tsc 0, eslint 55→55. DB never touched (server actions mocked). Then reverted the
source fix (patch kept at `.context/coowner-fix-hand-run.patch`) and launched
`bug-fix/workflow.js` on the ticket — the automation independently reproduced the bug
(incl. live trigger-state evidence on the Neon dev branch, read-only), wrote its own
failing test (`tests/ownership-wizard-coowner-skip.test.ts`), and planned a stronger fix
(also guards the empty-list reconcile path). Run 2026-07-15-140731 in progress.

## [2026-07-15] Authored the three testing pipelines with researched verification
`test-coverage` (`type: test`), `qa` (`type: qa`), `e2e-regression` (`type: e2e`) — each
with the 4-stage + shared-run-id pattern, a workflow.js, and a researched "Verification
technique" section in pipeline.md (choices + why in decisions.md). Registered all three in
the orchestrator routing table. First by-hand runs still pending (the do-it-by-hand rule).

## [2026-07-15] Machinery self-check added
`scripts/check-machinery.sh`: validates every workflow.js parses (wrapped in an async fn —
the Workflow DSL allows top-level return), meta/stage files present, shared run-id + eval
model override present, runs/ gitignored, and round-trips a fixture run through
update-dashboard.sh. Found two real bugs in itself while being built (macOS mktemp suffix,
ESM vs DSL semantics) — logged in errors.md. All green.
