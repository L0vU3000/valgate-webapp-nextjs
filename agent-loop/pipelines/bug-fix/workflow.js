// bug-fix — automated pipeline runtime (built-in Workflow, no external deps).
// Pattern: reproduce with a failing test (explore) → plan → execute → eval, looped until the
// new test goes green with no regressions. maker (execute) != verifier (eval); eval on a
// different model. A single runId is minted once and threaded through every stage
// (lesson from memory/errors.md — do not let stages invent their own).
//
// Pass the ticket path as args, e.g. Workflow({scriptPath, args: 'agent-loop/orchestrator/inbox/<ticket>.md'})

export const meta = {
  name: 'bug-fix',
  description: 'Reproduce a bug with a failing test, fix the root cause, guard it with the test',
  phases: [{ title: 'Reproduce' }, { title: 'Fix loop' }],
}

const P = 'agent-loop/pipelines/bug-fix'
const LINT = 'npx eslint app lib components'
const TICKET = args || '(no ticket path passed — read the newest agent-loop/orchestrator/inbox/*.md with type: bug)'
const MAX = 6

const REPRO = { type: 'object', required: ['reproduced', 'runId'],
  properties: {
    reproduced: { type: 'boolean' },
    runId: { type: 'string' },
    testPath: { type: 'string' },
    rootCause: { type: 'string' },
    note: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'newTestPasses', 'suiteGreen', 'tscErrors'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    newTestPasses: { type: 'boolean' },
    suiteGreen: { type: 'boolean' },
    tscErrors: { type: 'number' },
    evidence: { type: 'string' },
    reason: { type: 'string' },
  } }

phase('Reproduce')
const repro = await agent(
  `You are the EXPLORE stage of the bug-fix pipeline. Follow ${P}/explore.md.
   Ticket: ${TICKET}.
   First mint ONE run-id for this whole execution: \`date "+%Y-%m-%d-%H%M%S"\`, then
   \`mkdir -p ${P}/runs/<run-id>\` — every later stage writes ONLY into that folder.
   Use \`graphify query\` to orient before reading code. Reproduce the bug and write a
   FAILING test that captures it (confirm it is red for the right reason). Locate the root
   cause. Return reproduced, runId, testPath, and rootCause. If you cannot reproduce it, set
   reproduced=false and explain in note.`,
  { label: 'explore', schema: REPRO })

if (!repro.reproduced) {
  log(`STOP: could not reproduce — ${repro.note || 'see explore notes'}. Not a verifiable bug yet.`)
  return { reproduced: false, note: repro.note }
}

const RUN = repro.runId
log(`run ${RUN} — reproduced. failing test: ${repro.testPath}`)

phase('Fix loop')
let i = 0
let last = null
while (i < MAX) {
  i++

  await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Root cause so far: ${repro.rootCause}. Failing test: ${repro.testPath}.
     ${last ? `Previous attempt failed: ${last}. Adjust.` : ''}
     Plan the smallest root-cause fix that makes the failing test pass.`,
    { label: `plan#${i}`, phase: 'Fix loop' })

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\`. Apply exactly the planned fix at the root cause. Do NOT modify the
     failing test to make it pass. If the plan is wrong, stop and report — don't improvise.`,
    { label: `execute#${i}`, phase: 'Fix loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\`. Run the new test at ${repro.testPath}
     (must go green, unmodified), \`npx vitest run\` (whole suite green), \`npx tsc --noEmit\`
     (0 errors), and \`${LINT}\` (no new warnings). Return the verdict with cited evidence.`,
    { label: `eval#${i}`, phase: 'Fix loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: newTest ${v.newTestPasses ? 'green' : 'RED'} · suite ${v.suiteGreen ? 'green' : 'RED'} · tsc ${v.tscErrors}`)

  if (v.verdict === 'pass' && v.newTestPasses && v.suiteGreen && v.tscErrors === 0) {
    log(`DONE: bug fixed and guarded by ${repro.testPath}`)
    return { fixed: true, iterations: i, testPath: repro.testPath, runId: RUN }
  }
  last = v.reason || v.evidence || 'checks failed'
}

log(`STOP: not fixed within ${MAX} iterations — handing back to a human.`)
return { fixed: false, iterations: i, runId: RUN }
