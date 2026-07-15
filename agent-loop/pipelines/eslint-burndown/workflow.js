// eslint-burndown — automated pipeline runtime (built-in Workflow, no external deps).
// Same four stages as the by-hand run: explore → (plan → execute → eval) looped.
// Control flow (when to loop / when to stop) is CODE. Judgment inside each stage is AGENTS.
// maker ≠ verifier: `execute` and `eval` are separate agent() calls; eval runs on a
// different model for extra separation.

export const meta = {
  name: 'eslint-burndown',
  description: 'Drive ESLint warnings down without breaking tsc or tests',
  phases: [{ title: 'Explore' }, { title: 'Burndown loop' }],
}

const LINT = 'npx eslint app lib components'
const P = 'agent-loop/pipelines/eslint-burndown'
const MAX = 6 // bound: never runs forever

const COUNT = { type: 'object', required: ['startCount', 'runId'],
  properties: { startCount: { type: 'number' }, runId: { type: 'string' } } }

const PLAN = { type: 'object', required: ['hasSafeBatch', 'batchDescription'],
  properties: {
    hasSafeBatch: { type: 'boolean' },
    batchSize: { type: 'number' },
    batchDescription: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'eslintCount', 'tscErrors', 'testsPass'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    eslintCount: { type: 'number' },
    tscErrors: { type: 'number' },
    testsPass: { type: 'boolean' },
    evidence: { type: 'string' },
  } }

phase('Explore')
const explore = await agent(
  `You are the EXPLORE stage. Follow ${P}/explore.md exactly.
   First, mint ONE run-id for this whole pipeline execution: \`date "+%Y-%m-%d-%H%M%S"\`, and
   \`mkdir -p ${P}/runs/<run-id>\`. Every later stage writes ONLY into that same folder.
   Then run \`${LINT}\`, report the starting warning count (use eslint's own summary total,
   not a grep of the word "warning"), and categorize warnings (mechanical/intentional/symptom).
   Return startCount and the runId you created.`,
  { label: 'explore', schema: COUNT })

const RUN = explore.runId
log(`run ${RUN} — start: ${explore.startCount} warnings`)

phase('Burndown loop')
let current = explore.startCount
let i = 0

while (current > 0 && i < MAX) {
  i++

  const plan = await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Current eslint count is ${current}.
     Pick the next small batch of ONLY unambiguous unused imports. DEFER every
     symptom/intentional/behavior-changing warning: NOT_IMPLEMENTED_UNTIL_B6 markers,
     scoped* ownership helpers (possible IDOR symptom), unused params, unused useState,
     react-hooks/exhaustive-deps, next/no-img-element, no-unused-expressions.
     If no safe mechanical batch remains, set hasSafeBatch=false.`,
    { label: `plan#${i}`, phase: 'Burndown loop', schema: PLAN })

  if (!plan.hasSafeBatch) {
    log('STOP: no safe batch left — remaining warnings need human decisions.')
    break
  }

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\`. Apply exactly this batch and nothing else: ${plan.batchDescription}.
     Stay strictly in scope — remove only the named unused imports; no refactors, no logic
     changes, no touching deferred items.`,
    { label: `execute#${i}`, phase: 'Burndown loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\` (overwrite each iteration is fine).
     Run \`${LINT}\`, \`npx tsc --noEmit\`, and \`npx vitest run\`. This iteration started at
     ${current} warnings. Return the verdict with real numbers and cited evidence. Do NOT
     suggest fixes — only rule pass/fail.`,
    { label: `eval#${i}`, phase: 'Burndown loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: eslint ${current}→${v.eslintCount} · tsc ${v.tscErrors} · tests ${v.testsPass ? 'green' : 'RED'}`)

  // guardrail: never trade green tests for a lower lint count
  if (v.verdict === 'fail' || v.tscErrors > 0 || !v.testsPass) {
    log(`STOP: regression — ${v.evidence || 'see eval'}. Human decides whether to revert.`)
    break
  }
  // loop-until-dry: nothing changed this pass
  if (v.eslintCount >= current) {
    log('STOP: no progress this iteration.')
    break
  }
  current = v.eslintCount
}

return { startCount: explore.startCount, finalCount: current, iterations: i }
