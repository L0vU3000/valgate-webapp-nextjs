// e2e-regression — automated pipeline runtime (built-in Workflow, no external deps).
// Pattern: run the suite + classify failures by rerun (explore) → plan fixes/quarantines →
// execute → eval reruns everything (full suite twice), looped until green with every failure
// dispositioned. maker (execute) != verifier (eval); eval on a different model. One runId is
// minted in explore and threaded through every stage (lesson from memory/errors.md).

export const meta = {
  name: 'e2e-regression',
  description: 'Run the Playwright e2e suite, fix deterministic regressions, quarantine flakes',
  phases: [{ title: 'Triage' }, { title: 'Fix loop' }],
}

const P = 'agent-loop/pipelines/e2e-regression'
const LINT = 'npx eslint app lib components'
const MAX = 4

const TRIAGE = { type: 'object', required: ['runId', 'suiteGreen', 'regressionCount', 'flakeCount'],
  properties: {
    runId: { type: 'string' },
    suiteGreen: { type: 'boolean' },
    regressionCount: { type: 'number' },
    flakeCount: { type: 'number' },
    note: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'regressionsFixed', 'twoGreenRuns', 'dispositionsComplete', 'tscErrors'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    regressionsFixed: { type: 'boolean' },
    twoGreenRuns: { type: 'boolean' },
    dispositionsComplete: { type: 'boolean' },
    tscErrors: { type: 'number' },
    evidence: { type: 'string' },
    reason: { type: 'string' },
  } }

phase('Triage')
const triage = await agent(
  `You are the EXPLORE stage of the e2e-regression pipeline. Follow ${P}/explore.md.
   First mint ONE run-id for this whole execution: \`date "+%Y-%m-%d-%H%M%S"\`, then
   \`mkdir -p ${P}/runs/<run-id>\` — every later stage writes ONLY into that folder.
   Preflight: node >= 24, dev server (reuse 3002 or start \`npm run dev:e2e\` in background),
   .env.local not prod (ep-aged-cloud-*). Run the e2e suite once; rerun each failing spec up
   to 3x to classify regression vs flake; write the disposition table with trace evidence.
   Return runId, suiteGreen, regressionCount, flakeCount.`,
  { label: 'explore', schema: TRIAGE })

const RUN = triage.runId

if (triage.suiteGreen) {
  log(`run ${RUN} — suite green on the first run. Nothing to do.`)
  return { clean: true, runId: RUN }
}

log(`run ${RUN} — ${triage.regressionCount} regression(s), ${triage.flakeCount} flake(s). Entering fix loop.`)

phase('Fix loop')
let i = 0
let last = null
while (i < MAX) {
  i++

  await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Read the disposition table in \`${P}/runs/${RUN}/explore.md\`.
     ${last ? `Previous attempt failed eval: ${last}. Adjust.` : ''}
     Plan the smallest app-side fix per regression and the quarantine annotation + de-flake
     ticket per flake. Mark product-behavior questions as escalate.`,
    { label: `plan#${i}`, phase: 'Fix loop' })

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\`, the planned fix locations, and orchestrator/inbox/ (de-flake
     tickets). Apply exactly the plan. Never delete a test, never widen timeouts or loosen
     assertions to force a pass.`,
    { label: `execute#${i}`, phase: 'Fix loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\`. Checks: each regression's spec passes ·
     full suite green TWICE consecutively · every failure dispositioned (fixed, or annotated
     skip + ticket file in orchestrator/inbox/) · \`npx vitest run\` green · \`npx tsc --noEmit\`
     0 · \`${LINT}\` no new warnings. Diff changed spec files for weakened assertions/widened
     timeouts (anti-gaming). Return the verdict with cited evidence.`,
    { label: `eval#${i}`, phase: 'Fix loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: regressions ${v.regressionsFixed ? 'fixed' : 'OPEN'} · 2x green ${v.twoGreenRuns ? 'yes' : 'NO'} · dispositions ${v.dispositionsComplete ? 'complete' : 'INCOMPLETE'} · tsc ${v.tscErrors}`)

  if (v.verdict === 'pass' && v.regressionsFixed && v.twoGreenRuns && v.dispositionsComplete && v.tscErrors === 0) {
    log(`DONE: suite trustworthy — green twice, every failure dispositioned.`)
    return { done: true, iterations: i, runId: RUN }
  }
  last = v.reason || v.evidence || 'checks failed'
}

log(`STOP: not stable within ${MAX} iterations — handing back to a human.`)
return { done: false, iterations: i, runId: RUN }
