// feature — automated pipeline runtime (built-in Workflow, no external deps).
// Pattern: specify with failing acceptance tests (explore) → plan → execute → eval, looped
// until the acceptance tests go green with no regressions. maker (execute) != verifier
// (eval); eval on a different model. A single runId is minted once and threaded through
// every stage (lesson from memory/errors.md — do not let stages invent their own).
//
// Pass the ticket path as args, e.g. Workflow({scriptPath, args: 'agent-loop/orchestrator/inbox/<ticket>.md'})

export const meta = {
  name: 'feature',
  description: 'Turn a feature ticket into failing acceptance tests, build the smallest change that satisfies them, verify red-to-green',
  phases: [{ title: 'Specify' }, { title: 'Build loop' }],
}

const P = 'agent-loop/pipelines/feature'
const LINT = 'npx eslint app lib components'
const TICKET = args || '(no ticket path passed — read the newest agent-loop/orchestrator/inbox/*.md with type: feature)'
const MAX = 6

const SPEC = { type: 'object', required: ['specified', 'runId'],
  properties: {
    specified: { type: 'boolean' },
    runId: { type: 'string' },
    testPath: { type: 'string' },
    criteria: { type: 'string' },
    note: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'acceptancePasses', 'suiteGreen', 'tscErrors'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    acceptancePasses: { type: 'boolean' },
    suiteGreen: { type: 'boolean' },
    tscErrors: { type: 'number' },
    evidence: { type: 'string' },
    reason: { type: 'string' },
  } }

phase('Specify')
const spec = await agent(
  `You are the EXPLORE stage of the feature pipeline. Follow ${P}/explore.md.
   Ticket: ${TICKET}.
   First mint ONE run-id for this whole execution: \`date "+%Y-%m-%d-%H%M%S"\`, then
   \`mkdir -p ${P}/runs/<run-id>\` — every later stage writes ONLY into that folder.
   Use \`graphify query\` to orient before reading code. Extract the ticket's acceptance
   criteria and write FAILING acceptance test(s) that encode them (confirm they are red for
   the right reason — the feature is missing). Return specified, runId, testPath, and a
   one-line criteria summary. If the criteria are ambiguous, set specified=false and explain
   in note — do not invent product behavior.`,
  { label: 'explore', schema: SPEC })

if (!spec.specified) {
  log(`STOP: could not specify — ${spec.note || 'see explore notes'}. Ticket goes back for clarification.`)
  return { specified: false, note: spec.note }
}

const RUN = spec.runId
log(`run ${RUN} — specified. acceptance tests: ${spec.testPath}`)

phase('Build loop')
let i = 0
let last = null
while (i < MAX) {
  i++

  await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Acceptance criteria: ${spec.criteria}. Failing tests: ${spec.testPath}.
     ${last ? `Previous attempt failed: ${last}. Adjust.` : ''}
     Plan the smallest build that makes the acceptance tests pass.`,
    { label: `plan#${i}`, phase: 'Build loop' })

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\`. Build exactly what the plan describes. Do NOT modify the
     acceptance tests to make them pass. If the plan is wrong, stop and report — don't
     improvise.`,
    { label: `execute#${i}`, phase: 'Build loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\`. Run the acceptance tests at
     ${spec.testPath} (must go green, unmodified), \`npx vitest run\` (whole suite green),
     \`npx tsc --noEmit\` (0 errors), and \`${LINT}\` (no new warnings). Return the verdict
     with cited evidence.`,
    { label: `eval#${i}`, phase: 'Build loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: acceptance ${v.acceptancePasses ? 'green' : 'RED'} · suite ${v.suiteGreen ? 'green' : 'RED'} · tsc ${v.tscErrors}`)

  if (v.verdict === 'pass' && v.acceptancePasses && v.suiteGreen && v.tscErrors === 0) {
    log(`DONE: feature built and guarded by ${spec.testPath}`)
    return { built: true, iterations: i, testPath: spec.testPath, runId: RUN }
  }
  last = v.reason || v.evidence || 'checks failed'
}

log(`STOP: not built within ${MAX} iterations — handing back to a human.`)
return { built: false, iterations: i, runId: RUN }
