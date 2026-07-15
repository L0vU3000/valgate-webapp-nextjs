// test-coverage — automated pipeline runtime (built-in Workflow, no external deps).
// Pattern: pick target + baseline (explore) → plan tests → write tests (execute) → eval,
// looped until coverage is up AND the mutation score meets the plan's threshold, with no
// regressions. maker (execute) != verifier (eval); eval on a different model. One runId is
// minted in explore and threaded through every stage (lesson from memory/errors.md).
//
// Optionally pass a target module as args, e.g.
// Workflow({scriptPath, args: 'lib/services/co-owners.ts'})

export const meta = {
  name: 'test-coverage',
  description: 'Write honest tests for an untested services module; verify with coverage + mutation score',
  phases: [{ title: 'Discover' }, { title: 'Test loop' }],
}

const P = 'agent-loop/pipelines/test-coverage'
const LINT = 'npx eslint app lib components'
const TARGET_HINT = args || '(no target passed — explore picks the highest-value untested lib/services module)'
const MAX = 5

const DISCOVERY = { type: 'object', required: ['viable', 'runId'],
  properties: {
    viable: { type: 'boolean' },
    runId: { type: 'string' },
    targetModule: { type: 'string' },
    baselineStatementPct: { type: 'number' },
    lane: { enum: ['default', 'live-db'] },
    note: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'newTestsPass', 'coverageUp', 'mutationScore', 'suiteGreen', 'tscErrors'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    newTestsPass: { type: 'boolean' },
    coverageUp: { type: 'boolean' },
    mutationScore: { type: 'number' },
    suiteGreen: { type: 'boolean' },
    tscErrors: { type: 'number' },
    evidence: { type: 'string' },
    reason: { type: 'string' },
  } }

phase('Discover')
const found = await agent(
  `You are the EXPLORE stage of the test-coverage pipeline. Follow ${P}/explore.md.
   Target hint: ${TARGET_HINT}.
   First mint ONE run-id for this whole execution: \`date "+%Y-%m-%d-%H%M%S"\`, then
   \`mkdir -p ${P}/runs/<run-id>\` — every later stage writes ONLY into that folder.
   Use \`graphify query\` to orient before reading code. Record the target module, its
   baseline statement coverage (cite the coverage output), the chosen test lane, and the
   behaviors worth testing. If the live-db lane is chosen, confirm DATABASE_URL in
   .env.local is NOT the prod endpoint (ep-aged-cloud-*) and cite that check.
   If nothing is worth testing, set viable=false and explain in note.`,
  { label: 'explore', schema: DISCOVERY })

if (!found.viable) {
  log(`STOP: nothing to do — ${found.note || 'see explore notes'}.`)
  return { viable: false, note: found.note }
}

const RUN = found.runId
log(`run ${RUN} — target ${found.targetModule} (baseline ${found.baselineStatementPct}% statements, lane ${found.lane})`)

phase('Test loop')
let i = 0
let last = null
while (i < MAX) {
  i++

  await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Target: ${found.targetModule} (lane ${found.lane}, baseline ${found.baselineStatementPct}%).
     ${last ? `Previous attempt failed eval: ${last}. Adjust the plan.` : ''}
     Enumerate concrete test cases and commit to coverage + mutation-score thresholds.`,
    { label: `plan#${i}`, phase: 'Test loop' })

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\` and the planned test file(s). Write exactly the planned tests.
     Do NOT change product code. Live-db lane: Neon dev branch only, create-then-clean-up,
     never seed:reset.`,
    { label: `execute#${i}`, phase: 'Test loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\`. Checks: new tests pass · target-module
     coverage strictly above ${found.baselineStatementPct}% (npx vitest run --coverage) ·
     Stryker mutation score meets the plan's threshold (npx stryker run scoped to the target)
     · \`npx vitest run\` whole suite green · \`npx tsc --noEmit\` 0 errors · \`${LINT}\` no new
     warnings. Also run the anti-gaming checks in eval.md (assertion-free tests, maker touched
     product code). Return the verdict with cited evidence.`,
    { label: `eval#${i}`, phase: 'Test loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: tests ${v.newTestsPass ? 'green' : 'RED'} · coverage ${v.coverageUp ? 'up' : 'NOT up'} · mutation ${v.mutationScore}% · suite ${v.suiteGreen ? 'green' : 'RED'} · tsc ${v.tscErrors}`)

  if (v.verdict === 'pass' && v.newTestsPass && v.coverageUp && v.suiteGreen && v.tscErrors === 0) {
    log(`DONE: ${found.targetModule} tested — mutation score ${v.mutationScore}%`)
    return { done: true, iterations: i, targetModule: found.targetModule, mutationScore: v.mutationScore, runId: RUN }
  }
  last = v.reason || v.evidence || 'checks failed'
}

log(`STOP: threshold not met within ${MAX} iterations — handing back to a human.`)
return { done: false, iterations: i, runId: RUN }
